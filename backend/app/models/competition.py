from uuid import uuid4
import json

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    String,
    Integer,
    CheckConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.models.base import Base


class Competition(Base):
    """Simple Competition model."""

    __tablename__ = "competitions"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid4)
    title = Column(String(255), nullable=False, index=True)
    overview = Column(String(255), nullable=True)
    description = Column(String(8000), nullable=True)
    competition_link = Column(String(500), nullable=True)
    registration_deadline = Column(DateTime(timezone=True), nullable=True)
    background_image_url = Column(String(500), nullable=True)
    detail_image_urls = Column(String(5000), nullable=False, default="[]")
    location_country = Column(String(255), nullable=False)
    location_city = Column(String(255), nullable=False)
    format = Column(String(20), nullable=True)
    scale = Column(String(20), nullable=True)
    min_age = Column(Integer, nullable=True)
    max_age = Column(Integer, nullable=True)

    # Ownership and status
    owner_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    is_active = Column(Boolean(), nullable=False, default=True)
    is_featured = Column(Boolean(), nullable=False, default=False)
    is_approved = Column(Boolean(), nullable=False, default=False)
    is_rejected = Column(Boolean(), nullable=False, default=False)
    rejection_reason = Column(String(1000), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )

    # Relationship
    owner = relationship("User", back_populates="competitions", foreign_keys=[owner_id])

    # Table constraints
    __table_args__ = (
        CheckConstraint(
            "LENGTH(title) >= 1 AND LENGTH(title) <= 255", name="ck_title_length"
        ),
        CheckConstraint(
            "overview IS NULL OR (LENGTH(overview) >= 0 AND LENGTH(overview) <= 255)",
            name="ck_overview_length",
        ),
        CheckConstraint(
            "description IS NULL OR (LENGTH(description) >= 0 AND LENGTH(description) <= 8000)",
            name="ck_description_length",
        ),
        CheckConstraint(
            "LENGTH(location_country) >= 1 AND LENGTH(location_country) <= 255",
            name="ck_location_country_length",
        ),
        CheckConstraint(
            "LENGTH(location_city) >= 1 AND LENGTH(location_city) <= 255",
            name="ck_location_city_length",
        ),
        CheckConstraint(
            "min_age IS NULL OR (min_age >= 1 AND min_age <= 128)",
            name="ck_min_age_range",
        ),
        CheckConstraint(
            "max_age IS NULL OR (max_age >= 1 AND max_age <= 128)",
            name="ck_max_age_range",
        ),
        CheckConstraint(
            "min_age IS NULL OR max_age IS NULL OR max_age >= min_age",
            name="ck_max_age_gte_min_age",
        ),
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
