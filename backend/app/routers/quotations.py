"""
quotations.py – Quotation API router.

Implements Phase 3:
- POST /quotations: Create a quotation with line items and calculated totals.
- GET /quotations: List quotations with pagination.
- GET /quotations/{quotation_id}: Retrieve single quotation by UUID.
- PUT /quotations/{quotation_id}: Update existing quotation details and line items.
- DELETE /quotations/{quotation_id}: Delete a quotation and cascade-delete its items.
- PATCH /quotations/{quotation_id}/status: Transition quotation lifecycle status.
"""

from datetime import datetime, timezone
from decimal import Decimal
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.quotation import (
    Quotation,
    QuotationItem,
    QuotationStatus,
    VALID_STATUS_TRANSITIONS,
)
from app.schemas.quotation import (
    QuotationCreate,
    QuotationListResponse,
    QuotationResponse,
    QuotationStatusUpdate,
    QuotationUpdate,
)

router = APIRouter(prefix="/quotations", tags=["Quotations"])


async def _generate_unique_quotation_number(db: AsyncSession) -> str:
    """Generate a collision-resistant quotation identifier like RQ-20261030-A1B2."""
    date_part = datetime.now(timezone.utc).strftime("%Y%m%d")
    for _ in range(10):
        suffix = secrets.token_hex(3).upper()
        candidate = f"RQ-{date_part}-{suffix}"
        exists = await db.scalar(
            select(Quotation.id).where(Quotation.quotation_number == candidate)
        )
        if not exists:
            return candidate
    # Fallback to random UUID suffix if needed
    return f"RQ-{date_part}-{uuid.uuid4().hex[:8].upper()}"


@router.post(
    "",
    response_model=QuotationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a quotation",
    description=(
        "Create a new quotation along with line items. "
        "Line totals and quotation totals are always computed on the backend."
    ),
)
async def create_quotation(
    payload: QuotationCreate,
    db: AsyncSession = Depends(get_db),
) -> Quotation:
    """Create a new quotation with line items and computed Decimal totals."""
    # 1. Resolve or generate quotation_number
    if payload.quotation_number:
        existing = await db.scalar(
            select(Quotation.id).where(
                Quotation.quotation_number == payload.quotation_number
            )
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Quotation with number '{payload.quotation_number}' already exists.",
            )
        quotation_num = payload.quotation_number
    else:
        quotation_num = await _generate_unique_quotation_number(db)

    # 2. Build quotation model
    quotation = Quotation(
        quotation_number=quotation_num,
        title=payload.title,
        description=payload.description,
        status=QuotationStatus.DRAFT.value,
        customer_name=payload.customer_name,
        customer_email=str(payload.customer_email) if payload.customer_email else None,
        customer_phone=payload.customer_phone,
        customer_company=payload.customer_company,
        customer_address=payload.customer_address,
        currency=payload.currency,
        tax_rate=payload.tax_rate,
        notes=payload.notes,
        terms_and_conditions=payload.terms_and_conditions,
        subtotal=Decimal("0.0000"),
        tax_amount=Decimal("0.0000"),
        total_amount=Decimal("0.0000"),
    )

    # 3. Build line items with server-side line_total calculation
    items: list[QuotationItem] = []
    for idx, item_in in enumerate(payload.items):
        item_pos = item_in.position if item_in.position is not None else idx + 1
        qty = item_in.quantity
        price = item_in.unit_price
        line_total = (qty * price).quantize(Decimal("0.0001"))

        item = QuotationItem(
            position=item_pos,
            description=item_in.description,
            unit=item_in.unit,
            quantity=qty,
            unit_price=price,
            line_total=line_total,
        )
        items.append(item)

    quotation.items = items

    # 4. Compute subtotal, tax_amount, total_amount using Decimal arithmetic
    quotation.recalculate_totals()

    # 5. Persist to database
    try:
        db.add(quotation)
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Quotation with number '{quotation_num}' already exists.",
        ) from exc

    # 6. Re-fetch with eager loaded items
    result = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.items))
        .where(Quotation.id == quotation.id)
    )
    return result.scalar_one()


@router.get(
    "",
    response_model=QuotationListResponse,
    status_code=status.HTTP_200_OK,
    summary="List quotations",
    description="Retrieve a paginated list of quotations ordered by newest first.",
)
async def list_quotations(
    page: int = Query(default=1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
) -> QuotationListResponse:
    """List quotations with pagination."""
    # Count total
    total = await db.scalar(select(func.count()).select_from(Quotation))
    total = total or 0

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    offset = (page - 1) * page_size

    result = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.items))
        .order_by(Quotation.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = list(result.scalars().all())

    return QuotationListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/{quotation_id}",
    response_model=QuotationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a quotation by ID",
    description="Retrieve a single quotation by its UUID, including its line items.",
)
async def get_quotation(
    quotation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> Quotation:
    """Retrieve single quotation by UUID."""
    result = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.items))
        .where(Quotation.id == quotation_id)
    )
    quotation = result.scalar_one_or_none()

    if quotation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with ID '{quotation_id}' not found.",
        )

    return quotation


@router.put(
    "/{quotation_id}",
    response_model=QuotationResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a quotation",
    description=(
        "Update an existing quotation including customer details and line items. "
        "Line totals, subtotal, tax amount, and total amount are always recalculated server-side."
    ),
)
@router.patch(
    "/{quotation_id}",
    response_model=QuotationResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def update_quotation(
    quotation_id: uuid.UUID,
    payload: QuotationUpdate,
    db: AsyncSession = Depends(get_db),
) -> Quotation:
    """Update quotation details and line items with server-side Decimal recalculation."""
    result = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.items))
        .where(Quotation.id == quotation_id)
    )
    quotation = result.scalar_one_or_none()

    if quotation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with ID '{quotation_id}' not found.",
        )

    # Protect finalized/cancelled quotations from modification
    if quotation.status in (
        QuotationStatus.ACCEPTED.value,
        QuotationStatus.CANCELLED.value,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update quotation in '{quotation.status}' status.",
        )

    # Update scalar fields if provided
    if payload.title is not None:
        quotation.title = payload.title
    if payload.description is not None:
        quotation.description = payload.description
    if payload.customer_name is not None:
        quotation.customer_name = payload.customer_name
    if payload.customer_email is not None:
        quotation.customer_email = payload.customer_email
    if payload.customer_phone is not None:
        quotation.customer_phone = payload.customer_phone
    if payload.customer_company is not None:
        quotation.customer_company = payload.customer_company
    if payload.customer_address is not None:
        quotation.customer_address = payload.customer_address
    if payload.currency is not None:
        quotation.currency = payload.currency
    if payload.tax_rate is not None:
        quotation.tax_rate = payload.tax_rate
    if payload.notes is not None:
        quotation.notes = payload.notes
    if payload.terms_and_conditions is not None:
        quotation.terms_and_conditions = payload.terms_and_conditions

    # Update line items if provided (transaction-safe replacement)
    if payload.items is not None:
        quotation.items.clear()
        for idx, item_in in enumerate(payload.items):
            item_pos = item_in.position if item_in.position is not None else idx + 1
            qty = item_in.quantity
            price = item_in.unit_price
            line_total = (qty * price).quantize(Decimal("0.0001"))

            item = QuotationItem(
                position=item_pos,
                description=item_in.description,
                unit=item_in.unit,
                quantity=qty,
                unit_price=price,
                line_total=line_total,
            )
            quotation.items.append(item)

    # Always recalculate totals using Decimal arithmetic
    quotation.recalculate_totals()

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    # Re-fetch with eager loaded items
    refresh_result = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.items))
        .where(Quotation.id == quotation.id)
    )
    return refresh_result.scalar_one()


@router.delete(
    "/{quotation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a quotation",
    description="Delete a quotation and all associated line items.",
)
async def delete_quotation(
    quotation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Delete quotation and cascade delete its line items."""
    result = await db.execute(
        select(Quotation).where(Quotation.id == quotation_id)
    )
    quotation = result.scalar_one_or_none()

    if quotation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with ID '{quotation_id}' not found.",
        )

    await db.delete(quotation)
    await db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch(
    "/{quotation_id}/status",
    response_model=QuotationResponse,
    status_code=status.HTTP_200_OK,
    summary="Change quotation status",
    description="Transition quotation to a new lifecycle status following strict lifecycle rules.",
)
@router.put(
    "/{quotation_id}/status",
    response_model=QuotationResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def update_quotation_status(
    quotation_id: uuid.UUID,
    payload: QuotationStatusUpdate,
    db: AsyncSession = Depends(get_db),
) -> Quotation:
    """Transition quotation status according to the valid lifecycle state machine."""
    result = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.items))
        .where(Quotation.id == quotation_id)
    )
    quotation = result.scalar_one_or_none()

    if quotation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with ID '{quotation_id}' not found.",
        )

    current_status = QuotationStatus(quotation.status)
    new_status = payload.status

    if current_status == new_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Quotation is already in '{current_status.value}' status.",
        )

    allowed_transitions = VALID_STATUS_TRANSITIONS.get(current_status, set())
    if new_status not in allowed_transitions:
        allowed_list = sorted([s.value for s in allowed_transitions])
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid status transition from '{current_status.value}' to '{new_status.value}'. "
                f"Allowed transitions: {allowed_list}."
            ),
        )

    quotation.status = new_status.value

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    refresh_result = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.items))
        .where(Quotation.id == quotation.id)
    )
    return refresh_result.scalar_one()

