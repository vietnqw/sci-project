from uuid import uuid4
import json

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


class Competition(Base):
    """Simple Competition model."""

    __tablename__ = "competitions"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid4)
    title = Column(String(255), nullable=False, index=True)
    description = Column(String(2000), nullable=True)
    competition_link = Column(String(500), nullable=True)
    registration_deadline = Column(DateTime(timezone=True), nullable=True)
    background_image_url = Column(String(500), nullable=True)
    detail_image_urls = Column(String(5000), nullable=False, default="[]")
    location = Column(String(100), nullable=True)
    format = Column(String(20), nullable=True)
    scale = Column(String(20), nullable=True)

    # Ownership and status
    owner_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    is_active = Column(Boolean(), nullable=False, default=True)
    is_featured = Column(Boolean(), nullable=False, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )

    @property
    def detail_image_urls_list(self) -> list[str]:
        """Get detail image URLs as a list."""
        try:
            return json.loads(self.detail_image_urls)
        except (json.JSONDecodeError, TypeError):
            return []

    @detail_image_urls_list.setter
    def detail_image_urls_list(self, value: list[str]):
        """Set detail image URLs from a list."""
        self.detail_image_urls = json.dumps(value)

    def __repr__(self) -> str:  # pragma: no cover - repr is simple
        return f"<Competition(id={self.id}, title={self.title!r})>"
