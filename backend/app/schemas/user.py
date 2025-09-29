from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class UserBase(BaseModel):
    """Base user schema."""

    email: str = Field(..., min_length=5, max_length=255, description="User email")
    full_name: str = Field(
        ..., min_length=1, max_length=255, description="Full name of the user"
    )


class UserResponse(UserBase):
    """User response schema."""

    id: UUID = Field(..., description="Unique identifier of the user")
    created_at: datetime = Field(..., description="Timestamp when the user was created")
    updated_at: datetime = Field(
        ..., description="Timestamp when the user information was last updated"
    )

    class Config:
        from_attributes = True


class UserList(BaseModel):
    """User list response schema."""

    users: list[UserResponse] = Field(..., description="List of users")
    total: int = Field(..., description="Total users count")
