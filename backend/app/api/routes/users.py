from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.api.deps import (
    require_anonymous,
    get_current_user,
    get_current_admin_user,
    ensure_self_user,
)
from app.models.user import User, UserRole
from app.schemas.user import (
    PasswordChange,
    UserCreate,
    UserFilterParams,
    UserList,
    UserResponse,
    UserRoleUpdate,
    UserStatusUpdate,
    UserUpdate,
)
from app.core.security import hash_password, verify_password


router = APIRouter(prefix="/users", tags=["users"])




async def _get_user_or_404(db: AsyncSession, user_id: UUID) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.get("/", response_model=UserList, dependencies=[Depends(get_current_admin_user)])
async def list_users(
    params: UserFilterParams = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """
    List users with optional filters and pagination.

    Permissions:
        - Requires admin privileges.
    """

    conditions = []
    if params.role is not None:
        conditions.append(User.role == params.role)
    if params.is_active is not None:
        conditions.append(User.is_active == params.is_active)
    if params.search:
        like = f"%{params.search}%"
        conditions.append(or_(User.full_name.ilike(like), User.email.ilike(like)))

    stmt = select(User)
    if conditions:
        stmt = stmt.where(and_(*conditions))
    stmt = stmt.offset(params.skip).limit(params.limit)

    result = await db.execute(stmt)
    users = result.scalars().all()

    count_stmt = select(func.count()).select_from(
        select(User).where(and_(*conditions) if conditions else True).subquery()
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    return UserList(users=[UserResponse.model_validate(u) for u in users], total=total)

@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_anonymous)],
)
async def create_user(payload: UserCreate, db: AsyncSession = Depends(get_db)) -> UserResponse:
    """
    Register a new user.

    Permissions:
        - Only anonymous (not logged-in) users can register.
    """
    # Unique email check
    exists = await db.execute(select(User).where(User.email == payload.email))
    if exists.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        email=str(payload.email),
        full_name=payload.full_name,
        phone_number=payload.phone_number,
        organization=payload.organization,
        hashed_password=hash_password(payload.password),
        role=UserRole.CREATOR,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.put(
    "/{user_id}",
    response_model=UserResponse,
    dependencies=[Depends(get_current_user)],
)
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Update user profile information.

    Permissions:
        - Only the user themselves or an admin can update user information.
    """
    user = await _get_user_or_404(db, user_id)

    # Permission: admin or self
    if getattr(current_user, "role", None) != UserRole.ADMIN and getattr(current_user, "id", None) != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    update_data = payload.model_dump(exclude_unset=True)

    # If changing email, ensure uniqueness
    new_email = update_data.get("email")
    if new_email and new_email != user.email:
        exists = await db.execute(select(User).where(User.email == new_email))
        if exists.scalar_one_or_none() is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    for field in ("email", "full_name", "phone_number", "organization"):
        if field in update_data:
            setattr(user, field, update_data[field])

    await db.flush()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.put(
    "/{user_id}/password",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(ensure_self_user)],
)
async def change_password(
    user_id: UUID,
    payload: PasswordChange,
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Change the password for the current user.

    Permissions:
        - Only the user themselves can change their password.
    """
    user = await _get_user_or_404(db, user_id)

    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    user.hashed_password = hash_password(payload.new_password)
    await db.flush()


@router.put(
    "/{user_id}/role",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_admin_user)],
)
async def update_role(
    user_id: UUID,
    payload: UserRoleUpdate,
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Update the role of a user.

    Permissions:
        - Only admins can update user roles.
    """
    user = await _get_user_or_404(db, user_id)
    user.role = payload.role
    await db.flush()


@router.put(
    "/{user_id}/status",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_admin_user)],
)
async def update_status(
    user_id: UUID,
    payload: UserStatusUpdate,
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Update the active status of a user.

    Permissions:
        - Only admins can activate or deactivate users.
    """
    user = await _get_user_or_404(db, user_id)
    user.is_active = payload.is_active
    await db.flush()


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_admin_user)],
)
async def delete_user(user_id: UUID, db: AsyncSession = Depends(get_db)) -> None:
    """
    Delete a user.

    Permissions:
        - Only admins can delete users.
    """
    user = await _get_user_or_404(db, user_id)
    await db.delete(user)
    await db.flush()
