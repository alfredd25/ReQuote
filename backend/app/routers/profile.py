"""
profile.py – Business Profile & Settings API router.

Endpoints:
- GET /profile: Retrieve authenticated user's business profile.
- PUT /profile: Create or update authenticated user's business profile.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.business_profile import BusinessProfile
from app.models.user import User
from app.schemas.business_profile import (
    BusinessProfileResponse,
    BusinessProfileUpdate,
)
from app.security import get_current_user

router = APIRouter(prefix="/profile", tags=["Business Profile"])


@router.get(
    "",
    response_model=BusinessProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get business profile",
    description="Retrieve the authenticated user's business profile and settings.",
)
async def get_business_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BusinessProfileResponse:
    """Retrieve the business profile belonging to the authenticated user."""
    result = await db.execute(
        select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if profile is not None:
        return BusinessProfileResponse.model_validate(profile)

    # Return default empty profile prefilled with user identity
    return BusinessProfileResponse(
        id=None,
        user_id=current_user.id,
        business_name=None,
        contact_person=current_user.full_name,
        email=current_user.email,
        phone=None,
        address=None,
        website=None,
        logo_url=None,
        tax_id=None,
        default_currency="USD",
        default_notes=None,
        default_terms=None,
        created_at=None,
        updated_at=None,
    )


@router.put(
    "",
    response_model=BusinessProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Update business profile",
    description="Create or update the authenticated user's business profile and settings.",
)
async def update_business_profile(
    payload: BusinessProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BusinessProfileResponse:
    """Create or update business profile for the authenticated user only."""
    result = await db.execute(
        select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if profile is None:
        profile = BusinessProfile(
            user_id=current_user.id,
            business_name=payload.business_name,
            contact_person=payload.contact_person,
            email=str(payload.email) if payload.email else None,
            phone=payload.phone,
            address=payload.address,
            website=payload.website,
            logo_url=payload.logo_url,
            tax_id=payload.tax_id,
            default_currency=payload.default_currency,
            default_notes=payload.default_notes,
            default_terms=payload.default_terms,
        )
        db.add(profile)
    else:
        profile.business_name = payload.business_name
        profile.contact_person = payload.contact_person
        profile.email = str(payload.email) if payload.email else None
        profile.phone = payload.phone
        profile.address = payload.address
        profile.website = payload.website
        profile.logo_url = payload.logo_url
        profile.tax_id = payload.tax_id
        profile.default_currency = payload.default_currency
        profile.default_notes = payload.default_notes
        profile.default_terms = payload.default_terms

    await db.commit()
    await db.refresh(profile)

    return BusinessProfileResponse.model_validate(profile)

