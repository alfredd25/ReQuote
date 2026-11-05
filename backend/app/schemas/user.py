"""
user.py – Pydantic schemas for user registration, authentication, and responses.
"""

from datetime import datetime
import re
from typing import Any
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


class UserSignupRequest(BaseModel):
    """Schema for user account registration."""

    email: str = Field(
        ...,
        max_length=255,
        description="User email address for login",
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password (minimum 8 characters)",
    )
    full_name: str | None = Field(
        default=None,
        max_length=255,
        description="Optional full name or display name",
    )

    @field_validator("email")
    @classmethod
    def validate_and_normalize_email(cls, v: str) -> str:
        trimmed = v.strip().lower()
        if not trimmed:
            raise ValueError("Email cannot be empty")
        if not EMAIL_REGEX.match(trimmed):
            raise ValueError("Invalid email address format")
        return trimmed

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if len(v.strip()) == 0:
            raise ValueError("Password cannot be solely whitespace")
        return v

    @field_validator("full_name")
    @classmethod
    def sanitize_full_name(cls, v: str | None) -> str | None:
        if v is not None:
            trimmed = v.strip()
            return trimmed if trimmed else None
        return None


class UserLoginRequest(BaseModel):
    """Schema for user login credentials."""

    email: str = Field(
        ...,
        description="User login email",
    )
    password: str = Field(
        ...,
        description="User login password",
    )

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserResponse(BaseModel):
    """Public user response schema — never exposes password or hash."""

    id: uuid.UUID
    email: str
    full_name: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """Access token payload returned upon successful login/signup."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse

