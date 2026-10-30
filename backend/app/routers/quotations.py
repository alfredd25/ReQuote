"""
quotations.py – Quotation API router.

Implements Phase 3 Step 1:
- POST /quotations: Create a quotation with line items and calculated totals.
- GET /quotations: List quotations with pagination.
- GET /quotations/{quotation_id}: Retrieve single quotation by UUID.
"""

from datetime import datetime, timezone
from decimal import Decimal
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.quotation import Quotation, QuotationItem, QuotationStatus
from app.schemas.quotation import (
    QuotationCreate,
    QuotationListResponse,
    QuotationResponse,
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

