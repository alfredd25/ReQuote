"""
auth.py – Authentication router (signup, login, token validation).

Implements Phase 4 Step 1:
- POST /auth/signup: Register a new user account with hashed password.
- POST /auth/login: Authenticate user and issue signed JWT access token.
- GET /auth/me: Retrieve current authenticated user profile using JWT.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    TokenResponse,
    UserLoginRequest,
    UserResponse,
    UserSignupRequest,
)
from app.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/signup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
    description="Create a new user with a unique email and securely hashed password.",
)
async def signup(
    payload: UserSignupRequest,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Register a new user account."""
    # Check if email is already taken
    existing = await db.scalar(select(User.id).where(User.email == payload.email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    # Securely hash the password with bcrypt
    hashed = hash_password(payload.password)

    user = User(
        email=payload.email,
        hashed_password=hashed,
        full_name=payload.full_name,
        is_active=True,
    )

    try:
        db.add(user)
        await db.commit()
        await db.refresh(user)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        ) from exc

    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User login",
    description="Authenticate with email and password to receive a JWT access token.",
)
async def login(
    payload: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate user credentials and return a signed JWT access token."""
    user = await db.scalar(select(User).where(User.email == payload.email))

    # Constant-time-like or safe rejection without revealing account existence
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    access_token = create_access_token(
        subject=user.id,
        extra_claims={"email": user.email},
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user,
    )


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user profile",
    description="Retrieve profile details of the currently authenticated user.",
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> User:
    """Return the profile of the user identified by the Bearer access token."""
    return current_user

