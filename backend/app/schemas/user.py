from datetime import datetime
from uuid import UUID
import re

from pydantic import BaseModel, Field, EmailStr
from pydantic import field_validator
from pydantic import ConfigDict

from app.models.user import UserRole


PHONE_REGEX = re.compile(r"^\+?[1-9]\d{9,14}$")  # E.164: 10-15 digits


class UserValidationMixin:
    """
    UserValidationMixin adds reusable validators for user fields.

    It can be inherited by Pydantic schemas to keep validation
    consistent across create/update models. Optional fields pass
    through if None; provided values are validated for format,
    non-emptiness, or strength.
    """

    @staticmethod
    def validate_password_strength(value: str | None) -> str | None:
        if value is None:
            return value
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in value):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in value):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in value):
            raise ValueError("Password must contain at least one digit")
        return value

    @field_validator("full_name", check_fields=False)
    @classmethod
    def _validate_full_name_not_blank(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not value.strip():
            raise ValueError("Full name cannot be empty")
        return value

    @field_validator("organization", check_fields=False)
    @classmethod
    def _validate_organization_not_blank(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not value.strip():
            raise ValueError("Organization cannot be empty")
        return value

    @field_validator("phone_number", check_fields=False)
    @classmethod
    def _validate_phone_number(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not value.strip():
            raise ValueError("Phone number cannot be empty")
        if not PHONE_REGEX.match(value):
            raise ValueError("Invalid phone number format")
        return value

    @field_validator("password", check_fields=False)
    @classmethod
    def _validate_password_strength(cls, value: str | None) -> str | None:
        return cls.validate_password_strength(value)


class UserBase(UserValidationMixin, BaseModel):
    """Minimal shared fields used across user schemas."""

    email: EmailStr = Field(..., max_length=255, description="User email address")
    full_name: str = Field(
        ..., min_length=1, max_length=255, description="Full name of the user"
    )


class UserProfileBase(UserBase):
    """Shared profile fields used by create/response schemas."""

    phone_number: str = Field(
        ..., min_length=10, max_length=16, description="Phone number in E.164 format"
    )
    organization: str = Field(
        ..., min_length=1, max_length=255, description="Organization of the user"
    )


class UserCreate(UserProfileBase):
    """Payload for creating a new user."""

    password: str = Field(
        ..., min_length=8, max_length=255, description="User password (to be hashed)"
    )

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class UserResponse(UserProfileBase):
    """User response schema."""

    id: UUID = Field(..., description="Unique identifier of the user")
    role: UserRole = Field(..., description="Role of the user")
    is_active: bool = Field(..., description="Active status of the user")
    created_at: datetime = Field(..., description="Timestamp when the user was created")
    updated_at: datetime = Field(
        ..., description="Timestamp when the user information was last updated"
    )

    model_config = ConfigDict(from_attributes=True)


class UserList(BaseModel):
    """User list response schema."""

    users: list[UserResponse] = Field(..., description="List of users")
    total: int = Field(..., description="Total users count")


class UserUpdate(UserValidationMixin, BaseModel):
    """Payload for updating user profile fields (partial)."""

    email: EmailStr | None = Field(None, max_length=255, description="User email")
    full_name: str | None = Field(
        None, min_length=1, max_length=255, description="Full name of the user"
    )
    phone_number: str | None = Field(
        None, min_length=10, max_length=16, description="Phone number in E.164 format"
    )
    organization: str | None = Field(
        None, min_length=1, max_length=255, description="Organization of the user"
    )

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class UserRoleUpdate(BaseModel):
    """Admin-only payload for updating user role."""

    role: UserRole = Field(..., description="Role of the user")

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class UserStatusUpdate(BaseModel):
    """Admin-only payload for activating/deactivating a user."""

    is_active: bool = Field(..., description="Active status of the user")

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class PasswordChange(UserValidationMixin, BaseModel):
    """Payload for changing password."""

    current_password: str = Field(..., description="Current password")
    new_password: str = Field(
        ..., min_length=8, max_length=255, description="New password (to be hashed)"
    )

    @field_validator("new_password")
    @classmethod
    def _validate_new_password_strength(cls, value: str) -> str:
        # Reuse the shared password strength logic
        return cls.validate_password_strength(value)

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class UserFilterParams(BaseModel):
    """Query parameters for filtering/paginating user list."""

    skip: int = Field(default=0, ge=0, description="Number of users to skip")
    limit: int = Field(
        default=100, ge=1, le=1000, description="Number of users to return"
    )
    role: UserRole | None = Field(None, description="Filter by user role")
    is_active: bool | None = Field(None, description="Filter by active status")
    search: str | None = Field(None, description="Search by name or email")

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
