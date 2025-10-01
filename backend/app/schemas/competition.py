from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl, ConfigDict
from pydantic import field_validator

from app.models.competition import Competition


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


class CompetitionResponse(CompetitionBase):
    id: UUID
    owner_id: UUID | None = None
    is_active: bool
    is_featured: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_model(cls, comp: Competition) -> "CompetitionResponse":
        return cls(
            id=comp.id,
            title=comp.title,
            description=comp.description,
            competition_link=comp.competition_link,  # type: ignore[assignment]
            registration_deadline=comp.registration_deadline,
            background_image_url=comp.background_image_url,  # type: ignore[assignment]
            detail_image_urls=comp.detail_image_urls_list,
            location=comp.location,
            format=comp.format,
            scale=comp.scale,
            owner_id=comp.owner_id,
            is_active=comp.is_active,
            is_featured=comp.is_featured,
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
