"""Auth schemas for the v2 NMS API."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """Payload for registering a new NMS user."""

    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    country: str = Field(default="", max_length=100)
    state: str = Field(default="", max_length=100)
    phone_number: str = Field(default="", max_length=30)
    password: str = Field(min_length=8, max_length=255)


class LoginRequest(BaseModel):
    """Login payload."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=255)


class RefreshTokenRequest(BaseModel):
    """Request payload for refreshing a token pair."""

    refresh_token: str


class TokenResponse(BaseModel):
    """Authentication token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    """Request password reset."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Reset password with token."""

    token: str
    new_password: str = Field(min_length=8, max_length=255)


class VerifyEmailRequest(BaseModel):
    """Verify email with token."""

    token: str
