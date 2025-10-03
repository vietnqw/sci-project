from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin_user, get_current_user, get_optional_user
from app.config.database import get_db
from app.core.errors import (
    ForbiddenCompetitionAccessError,
    ForbiddenCompetitionOwnerFilterError,
    CompetitionNotFoundError,
)
from app.models.competition import Competition
from app.models.user import User, UserRole
from app.schemas.competition import (
    CompetitionCreate,
    CompetitionFilterParams,
    CompetitionList,
    CompetitionResponse,
    CompetitionUpdate,
    CompetitionActiveUpdate,
    CompetitionFeaturedUpdate,
    CompetitionRejectPayload,
)
from app.schemas.user import UserSummary


router = APIRouter(prefix="/competitions", tags=["competitions"])


async def _get_competition_or_404(db: AsyncSession, comp_id: UUID) -> Competition:
    result = await db.execute(select(Competition).where(Competition.id == comp_id))
    comp = result.scalar_one_or_none()
    if comp is None:
        raise CompetitionNotFoundError()
    return comp


@router.get("", response_model=CompetitionList)
async def list_competitions(
    params: CompetitionFilterParams = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """
    List competitions with filters and pagination.

    Permissions:
        - Public (no authentication required)
        - If authenticated as admin, may filter by `owner_id`

    Notes:
        - Unknown fields in query string are rejected
        - Default ordering: most recent first (created_at DESC)
    """

    conditions = []

    # Visibility rules: everyone sees approved competitions, admins and owners see unapproved ones
    user_role = getattr(current_user, "role", None)
    user_id = getattr(current_user, "id", None)

    if user_role == UserRole.ADMIN:
        # Admins can see all competitions (including inactive ones)
        pass
    elif user_id:
        # Authenticated users (creators) can see their own competitions + approved active ones
        conditions.append(
            or_(
                and_(Competition.is_approved, Competition.is_active),
                Competition.owner_id == user_id,
            )
        )
    else:
        # Unauthenticated users can only see approved and active competitions
        conditions.append(Competition.is_active)

    if params.location:
        conditions.append(Competition.location == params.location)
    if params.format is not None:
        conditions.append(Competition.format == params.format)
    if params.scale is not None:
        conditions.append(Competition.scale == params.scale)
    if params.is_active is not None:
        conditions.append(Competition.is_active == params.is_active)
    if params.is_featured is not None:
        conditions.append(Competition.is_featured == params.is_featured)
    if params.is_approved is not None:
        conditions.append(Competition.is_approved == params.is_approved)
    if params.is_rejected is not None:
        conditions.append(Competition.is_rejected == params.is_rejected)
    if params.search:
        like = f"%{params.search}%"
        conditions.append(
            or_(Competition.title.ilike(like), Competition.description.ilike(like))
        )

    # owner constraint
    if user_role == UserRole.ADMIN:
        if params.owner_id is not None:
            conditions.append(Competition.owner_id == params.owner_id)
    else:
        # Non-admins cannot filter by owner_id at all on the public listing
        if params.owner_id is not None:
            raise ForbiddenCompetitionOwnerFilterError()

    stmt = (
        select(Competition, User)
        .outerjoin(User, Competition.owner_id == User.id)
        .where(and_(*conditions) if conditions else True)
        .order_by(Competition.created_at.desc())
        .offset(params.skip)
        .limit(params.limit)
    )

    results = (await db.execute(stmt)).all()

    count_stmt = select(func.count()).select_from(
        select(Competition).where(and_(*conditions) if conditions else True).subquery()
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    competitions_with_owners = []
    for comp, owner in results:
        owner_summary = None
        if owner:
            owner_summary = UserSummary(
                id=owner.id,
                full_name=owner.full_name,
                email=owner.email,
            )
        competitions_with_owners.append(
            CompetitionResponse.from_model(comp, owner_summary)
        )

    return CompetitionList(
        competitions=competitions_with_owners,
        total=total,
    )


@router.get("/{user_id}", response_model=CompetitionList)
async def list_competitions_by_user(
    user_id: UUID,
    params: CompetitionFilterParams = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    List competitions for a specific user.

    Permissions:
        - Admin: list for any `user_id`
        - Non-admin: only for themselves

    Notes:
        - Default ordering: most recent first (created_at DESC)
    """
    if (
        getattr(current_user, "role", None) != UserRole.ADMIN
        and getattr(current_user, "id", None) != user_id
    ):
        raise ForbiddenCompetitionOwnerFilterError(
            "Not allowed to list competitions for another user"
        )

    conditions = [Competition.owner_id == user_id]
    if params.location:
        conditions.append(Competition.location == params.location)
    if params.format is not None:
        conditions.append(Competition.format == params.format)
    if params.scale is not None:
        conditions.append(Competition.scale == params.scale)
    if params.is_active is not None:
        conditions.append(Competition.is_active == params.is_active)
    if params.is_featured is not None:
        conditions.append(Competition.is_featured == params.is_featured)
    if params.is_approved is not None:
        conditions.append(Competition.is_approved == params.is_approved)
    if params.is_rejected is not None:
        conditions.append(Competition.is_rejected == params.is_rejected)
    if params.search:
        like = f"%{params.search}%"
        conditions.append(
            or_(Competition.title.ilike(like), Competition.description.ilike(like))
        )

    stmt = (
        select(Competition, User)
        .outerjoin(User, Competition.owner_id == User.id)
        .where(and_(*conditions))
        .order_by(Competition.created_at.desc())
        .offset(params.skip)
        .limit(params.limit)
    )

    results = (await db.execute(stmt)).all()
    count_stmt = select(func.count()).select_from(
        select(Competition).where(and_(*conditions)).subquery()
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    competitions_with_owners = []
    for comp, owner in results:
        owner_summary = None
        if owner:
            owner_summary = UserSummary(
                id=owner.id,
                full_name=owner.full_name,
                email=owner.email,
            )
        competitions_with_owners.append(
            CompetitionResponse.from_model(comp, owner_summary)
        )

    return CompetitionList(competitions=competitions_with_owners, total=total)


@router.get("/detail/{competition_id}", response_model=CompetitionResponse)
async def get_competition(
    competition_id: UUID, db: AsyncSession = Depends(get_db)
) -> CompetitionResponse:
    """
    Get competition detail by ID.

    Permissions:
        - Public
    """
    comp = await _get_competition_or_404(db, competition_id)

    # Get owner information if exists
    owner_summary = None
    if comp.owner_id:
        owner_result = await db.execute(select(User).where(User.id == comp.owner_id))
        owner = owner_result.scalar_one_or_none()
        if owner:
            owner_summary = UserSummary(
                id=owner.id,
                full_name=owner.full_name,
                email=owner.email,
            )

    return CompetitionResponse.from_model(comp, owner_summary)


@router.get(
    "/admin/pending",
    response_model=CompetitionList,
    dependencies=[Depends(get_current_admin_user)],
)
async def list_pending_competitions(
    params: CompetitionFilterParams = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """
    List competitions pending approval.

    Permissions:
        - Admin only

    Notes:
        - Default ordering: most recent first (created_at DESC)
    """

    conditions = [
        ~Competition.is_approved,  # Not approved
        ~Competition.is_rejected,  # Not rejected (still pending)
    ]

    if params.location:
        conditions.append(Competition.location == params.location)
    if params.format is not None:
        conditions.append(Competition.format == params.format)
    if params.scale is not None:
        conditions.append(Competition.scale == params.scale)
    if params.is_active is not None:
        conditions.append(Competition.is_active == params.is_active)
    if params.is_featured is not None:
        conditions.append(Competition.is_featured == params.is_featured)
    if params.is_approved is not None:
        conditions.append(Competition.is_approved == params.is_approved)
    if params.is_rejected is not None:
        conditions.append(Competition.is_rejected == params.is_rejected)
    if params.search:
        like = f"%{params.search}%"
        conditions.append(
            or_(Competition.title.ilike(like), Competition.description.ilike(like))
        )

    stmt = (
        select(Competition, User)
        .outerjoin(User, Competition.owner_id == User.id)
        .where(and_(*conditions))
        .order_by(Competition.created_at.desc())
        .offset(params.skip)
        .limit(params.limit)
    )

    results = (await db.execute(stmt)).all()

    count_stmt = select(func.count()).select_from(
        select(Competition).where(and_(*conditions)).subquery()
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    competitions_with_owners = []
    for comp, owner in results:
        owner_summary = None
        if owner:
            owner_summary = UserSummary(
                id=owner.id,
                full_name=owner.full_name,
                email=owner.email,
            )
        competitions_with_owners.append(
            CompetitionResponse.from_model(comp, owner_summary)
        )

    return CompetitionList(competitions=competitions_with_owners, total=total)


@router.post(
    "",
    response_model=CompetitionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_user)],
)
async def create_competition(
    payload: CompetitionCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CompetitionResponse:
    """
    Create a new competition owned by the current user.

    Permissions:
        - Authenticated users
    """
    comp = Competition(
        title=payload.title,
        description=payload.description,
        competition_link=(
            str(payload.competition_link) if payload.competition_link else None
        ),
        registration_deadline=payload.registration_deadline,
        background_image_url=(
            str(payload.background_image_url) if payload.background_image_url else None
        ),
        location=payload.location,
        format=payload.format,
        scale=payload.scale,
        owner_id=current_user.id,
        is_active=True,
        is_featured=False,
        is_approved=False,  # New competitions need admin approval
        is_rejected=False,  # New competitions are not rejected
        rejection_reason=None,  # No rejection reason initially
    )
    # handle detail image urls
    if payload.detail_image_urls:
        comp.detail_image_urls_list = payload.detail_image_urls

    db.add(comp)
    await db.flush()
    await db.refresh(comp)

    # Get owner information for response
    owner_summary = UserSummary(
        id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
    )

    return CompetitionResponse.from_model(comp, owner_summary)


@router.put("/{competition_id}", response_model=CompetitionResponse)
async def update_competition(
    competition_id: UUID,
    payload: CompetitionUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CompetitionResponse:
    """
    Update competition information.

    Permissions:
        - Owner or Admin
    """
    comp = await _get_competition_or_404(db, competition_id)
    # owner or admin
    if (
        getattr(current_user, "role", None) != UserRole.ADMIN
        and getattr(current_user, "id", None) != comp.owner_id
    ):
        raise ForbiddenCompetitionAccessError("Not allowed to update this competition")

    data = payload.model_dump(exclude_unset=True)
    # detail_image_urls handled via helper
    if "detail_image_urls" in data and data["detail_image_urls"] is not None:
        comp.detail_image_urls_list = data.pop("detail_image_urls")
    for field in (
        "title",
        "description",
        "registration_deadline",
        "location",
        "format",
        "scale",
    ):
        if field in data:
            setattr(comp, field, data[field])
    # Optional URL fields
    if "competition_link" in data:
        comp.competition_link = (
            str(data["competition_link"])
            if data["competition_link"] is not None
            else None
        )
    if "background_image_url" in data:
        comp.background_image_url = (
            str(data["background_image_url"])
            if data["background_image_url"] is not None
            else None
        )

    await db.flush()
    await db.refresh(comp)

    # Get owner information for response
    owner_summary = None
    if comp.owner_id:
        owner_result = await db.execute(select(User).where(User.id == comp.owner_id))
        owner = owner_result.scalar_one_or_none()
        if owner:
            owner_summary = UserSummary(
                id=owner.id,
                full_name=owner.full_name,
                email=owner.email,
            )

    return CompetitionResponse.from_model(comp, owner_summary)


@router.put("/{competition_id}/status/active", status_code=status.HTTP_204_NO_CONTENT)
async def set_active_status(
    competition_id: UUID,
    payload: CompetitionActiveUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Toggle the `is_active` flag.

    Permissions:
        - Owner or Admin
    """
    comp = await _get_competition_or_404(db, competition_id)
    if (
        getattr(current_user, "role", None) != UserRole.ADMIN
        and getattr(current_user, "id", None) != comp.owner_id
    ):
        raise ForbiddenCompetitionAccessError("Not allowed to update is_active")
    comp.is_active = payload.is_active
    await db.flush()


@router.put(
    "/{competition_id}/status/featured",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_admin_user)],
)
async def set_featured_status(
    competition_id: UUID,
    payload: CompetitionFeaturedUpdate,
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Toggle the `is_featured` flag.

    Permissions:
        - Admin only
    """
    comp = await _get_competition_or_404(db, competition_id)
    comp.is_featured = payload.is_featured
    await db.flush()


@router.delete(
    "/{competition_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_competition(
    competition_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Delete a competition.

    Permissions:
        - Owner or Admin
    """
    comp = await _get_competition_or_404(db, competition_id)
    if (
        getattr(current_user, "role", None) != UserRole.ADMIN
        and getattr(current_user, "id", None) != comp.owner_id
    ):
        raise ForbiddenCompetitionAccessError("Not allowed to delete this competition")
    await db.delete(comp)
    await db.flush()


# Admin-only endpoints for competition management
@router.put(
    "/admin/{competition_id}/approve",
    response_model=dict,
    dependencies=[Depends(get_current_admin_user)],
)
async def approve_competition(
    competition_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Approve a competition.

    Permissions:
        - Admin only
    """
    comp = await _get_competition_or_404(db, competition_id)
    comp.is_approved = True
    await db.flush()
    return {"message": "Competition approved successfully"}


@router.put(
    "/admin/{competition_id}/reject",
    response_model=dict,
    dependencies=[Depends(get_current_admin_user)],
)
async def reject_competition(
    competition_id: UUID,
    payload: CompetitionRejectPayload,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Reject a competition.

    Permissions:
        - Admin only
    """
    comp = await _get_competition_or_404(db, competition_id)
    comp.is_approved = False
    comp.is_rejected = True
    comp.rejection_reason = payload.rejection_reason
    await db.flush()
    return {"message": "Competition rejected successfully"}


@router.put(
    "/admin/{competition_id}/feature",
    response_model=dict,
    dependencies=[Depends(get_current_admin_user)],
)
async def admin_feature_competition(
    competition_id: UUID,
    payload: CompetitionFeaturedUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Feature a competition (admin only).

    Permissions:
        - Admin only
    """
    comp = await _get_competition_or_404(db, competition_id)
    comp.is_featured = payload.is_featured
    await db.flush()
    return {"message": "Competition featured successfully"}


@router.put(
    "/admin/{competition_id}/unfeature",
    response_model=dict,
    dependencies=[Depends(get_current_admin_user)],
)
async def admin_unfeature_competition(
    competition_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Unfeature a competition (admin only).

    Permissions:
        - Admin only
    """
    comp = await _get_competition_or_404(db, competition_id)
    comp.is_featured = False
    await db.flush()
    return {"message": "Competition unfeatured successfully"}


@router.put(
    "/admin/{competition_id}/deactivate",
    response_model=dict,
    dependencies=[Depends(get_current_admin_user)],
)
async def admin_deactivate_competition(
    competition_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Deactivate a competition (admin only).

    Permissions:
        - Admin only
    """
    comp = await _get_competition_or_404(db, competition_id)
    comp.is_active = False
    await db.flush()
    return {"message": "Competition deactivated successfully"}
