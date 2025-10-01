from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl, ConfigDict
from pydantic import field_validator

from app.models.competition import Competition
from app.schemas.user import UserSummary


class CompetitionFormat(str, Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    HYBRID = "HYBRID"


class CompetitionScale(str, Enum):
    PROVINCIAL = "PROVINCIAL"
    REGIONAL = "REGIONAL"
    INTERNATIONAL = "INTERNATIONAL"


class CompetitionValidationMixin:
    """Validation mixin for competition schemas."""

    @field_validator("registration_deadline", check_fields=False)
    @classmethod
    def _validate_registration_deadline_tz(
        cls, value: datetime | None
    ) -> datetime | None:
        if value is None:
            return value
        if value.tzinfo is None:
            raise ValueError("registration_deadline must be timezone-aware")
        return value


class CompetitionBase(CompetitionValidationMixin, BaseModel):
    """Base competition schema."""

    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    competition_link: HttpUrl | None = Field(default=None)
    registration_deadline: datetime | None = None
    background_image_url: HttpUrl | None = None
    detail_image_urls: list[str] = Field(
        default_factory=list, description="List of detail image URLs"
    )
    location: str | None = Field(default=None, max_length=100)
    format: CompetitionFormat | None = Field(default=None)
    scale: CompetitionScale | None = Field(default=None)


class CompetitionCreate(CompetitionBase):
    """Payload for creating a new competition."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class CompetitionUpdate(CompetitionValidationMixin, BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    competition_link: HttpUrl | None = Field(default=None)
    registration_deadline: datetime | None = None
    background_image_url: HttpUrl | None = None
    detail_image_urls: list[str] | None = None
    location: str | None = Field(default=None, max_length=100)
    format: CompetitionFormat | None = Field(default=None)
    scale: CompetitionScale | None = Field(default=None)

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class CompetitionResponse(BaseModel):
    """Response schema for competition details."""

    id: UUID
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    competition_link: HttpUrl | None = Field(default=None)
    registration_deadline: datetime | None = None
    background_image_url: HttpUrl | None = None
    detail_image_urls: list[str] = Field(
        default_factory=list, description="List of detail image URLs"
    )
    location: str | None = Field(default=None, max_length=100)
    format: CompetitionFormat | None = Field(default=None)
    scale: CompetitionScale | None = Field(default=None)
    owner_id: UUID | None = None
    owner: UserSummary | None = None
    is_active: bool
    is_featured: bool
    is_approved: bool
    is_rejected: bool
    rejection_reason: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_model(
        cls, comp: Competition, owner: UserSummary | None = None
    ) -> "CompetitionResponse":
        # Convert string URLs to HttpUrl objects if they exist
        competition_link = None
        if comp.competition_link:
            try:
                competition_link = HttpUrl(comp.competition_link)
            except Exception:
                competition_link = None

        background_image_url = None
        if comp.background_image_url:
            try:
                background_image_url = HttpUrl(comp.background_image_url)
            except Exception:
                background_image_url = None

        return cls(
            id=comp.id,
            title=comp.title,
            description=comp.description,
            competition_link=competition_link,
            registration_deadline=comp.registration_deadline,
            background_image_url=background_image_url,
            detail_image_urls=comp.detail_image_urls_list,
            location=comp.location,
            format=comp.format,  # type: ignore[assignment]
            scale=comp.scale,  # type: ignore[assignment]
            owner_id=comp.owner_id,
            owner=owner,
            is_active=comp.is_active,
            is_featured=comp.is_featured,
            is_approved=comp.is_approved,
            is_rejected=comp.is_rejected,
            rejection_reason=comp.rejection_reason,
            created_at=comp.created_at,
            updated_at=comp.updated_at,
        )


class CompetitionList(BaseModel):
    """Competition list response schema."""

    competitions: list[CompetitionResponse] = Field(
        ..., description="List of competitions"
    )
    total: int = Field(..., description="Total number of competitions")


class CompetitionFilterParams(BaseModel):
    """Query parameters for filtering/paginating competition list."""

    skip: int = Field(default=0, ge=0, description="Number of competitions to skip")
    limit: int = Field(
        default=100, ge=1, le=1000, description="Number of competitions to return"
    )
    location: str | None = Field(
        default=None, description="Location of the competition"
    )
    format: CompetitionFormat | None = Field(
        default=None, description="Format of the competition"
    )
    scale: CompetitionScale | None = Field(
        default=None, description="Scale of the competition"
    )
    is_active: bool | None = Field(
        default=None, description="Active status of the competition"
    )
    is_featured: bool | None = Field(
        default=None, description="Featured status of the competition"
    )
    is_approved: bool | None = Field(
        default=None, description="Approval status of the competition"
    )
    is_rejected: bool | None = Field(
        default=None, description="Rejection status of the competition"
    )
    owner_id: UUID | None = Field(
        default=None, description="Owner ID of the competition"
    )
    search: str | None = Field(
        default=None, description="Search in title and description"
    )

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class CompetitionActiveUpdate(BaseModel):
    is_active: bool


class CompetitionFeaturedUpdate(BaseModel):
    is_featured: bool


class CompetitionRejectPayload(BaseModel):
    """Payload for rejecting a competition (optional reason)."""

    rejection_reason: str | None = None
