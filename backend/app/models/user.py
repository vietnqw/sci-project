from enum import Enum as PyEnum
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, Enum as SAEnum, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


class UserRole(str, PyEnum):
    ADMIN = "ADMIN"
    CREATOR = "CREATOR"


class User(Base):
    """User model representing competition platform users."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid4)
    email = Column(String(255), nullable=False, unique=True, index=True)
    full_name = Column(String(255), nullable=False)
    phone_number = Column(String(16), nullable=False)
    organization = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(
        SAEnum(UserRole, name="userrole"), nullable=False, default=UserRole.CREATOR
    )
    is_active = Column(Boolean(), nullable=False, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"
