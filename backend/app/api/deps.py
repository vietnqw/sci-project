from uuid import UUID

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.security import verify_token
from app.models.user import User, UserRole
from app.core.errors import (
    AuthorizationError,
    InactiveUserError,
    InvalidTokenError,
    NotAuthenticatedError,
)


def _parse_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise NotAuthenticatedError()
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise NotAuthenticatedError("Invalid authorization header")
    return parts[1].strip()


async def get_current_user(
    authorization: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve current active user from Authorization: Bearer <uuid>."""
    token = _parse_bearer_token(authorization)
    user_id_str = verify_token(token)
    if user_id_str is None:
        raise InvalidTokenError()
    try:
        user_id = UUID(user_id_str)
    except Exception:
        raise InvalidTokenError("Invalid token subject")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise InvalidTokenError("User not found")
    if not user.is_active:
        raise InactiveUserError()
    return user


async def get_current_admin_user(
    user: User = Depends(get_current_user),
) -> User:
    """Require current user to be an admin."""
    if user.role != UserRole.ADMIN:
        raise AuthorizationError("Admin access required")
    return user


async def require_anonymous(
    authorization: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Ensure the request is anonymous (not logged-in)."""
    if authorization is None:
        return
    # If an Authorization header is present, treat as already logged-in if token is valid
    token = _parse_bearer_token(authorization)
    if verify_token(token) is not None:
        # Treat as bad request when trying to register while authenticated
        from app.core.errors import BadRequestError

        raise BadRequestError("Already logged in")
    # Otherwise invalid/expired token -> unauthorized
    raise NotAuthenticatedError("Invalid credentials")


async def ensure_self_user(
    user_id: UUID,
    user: User = Depends(get_current_user),
) -> User:
    """Require that the current user matches the path user_id."""
    if user.id != user_id:
        raise AuthorizationError("Operation allowed only for the resource owner")
    return user


