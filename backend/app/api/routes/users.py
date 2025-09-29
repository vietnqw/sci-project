from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.models.user import User
from app.schemas.user import UserList, UserResponse


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=UserList)
async def list_users(db: AsyncSession = Depends(get_db)):
    """List all users."""

    query = select(User)

    result = await db.execute(query)
    users = result.scalars().all()
    users_response = [UserResponse.model_validate(user) for user in users]

    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total_count = count_result.scalar() or 0

    return UserList(users=users_response, total=total_count)
