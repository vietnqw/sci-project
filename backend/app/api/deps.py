"""Auth/permission dependencies for API routes.

This module provides lightweight dependencies to:
- require anonymous requests
- load current user from a simple Bearer token (UUID)
- require admin users
- require that the current user matches a path user_id

Note: This is a minimal implementation to enforce permissions without
introducing a full authentication system. The Authorization header is
interpreted as: "Bearer <user_uuid>".
"""

from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.models.user import User, UserRole


def _parse_bearer_user_id(authorization: str | None) -> UUID:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
        )
    token = parts[1].strip()
    try:
        return UUID(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format",
        )


async def get_current_user(
    authorization: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve current active user from Authorization: Bearer <uuid>."""
    user_id = _parse_bearer_user_id(authorization)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive"
        )
    return user


async def get_current_admin_user(
    user: User = Depends(get_current_user),
) -> User:
    """Require current user to be an admin."""
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )
    return user


async def require_anonymous(
    authorization: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Ensure the request is anonymous (not logged-in)."""
    if authorization is None:
        return
    # If an Authorization header is present and valid, reject as already logged-in
    try:
        user_id = _parse_bearer_user_id(authorization)
        result = await db.execute(select(User.id).where(User.id == user_id))
        if result.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already logged in",
            )
    except HTTPException:
        # Invalid tokens are treated as authentication errors
        raise
    # If header existed but user not found, treat as unauthorized rather than anonymous
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
    )


async def ensure_self_user(
    user_id: UUID,
    user: User = Depends(get_current_user),
) -> User:
    """Require that the current user matches the path user_id."""
    if user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation allowed only for the resource owner",
        )
    return user


