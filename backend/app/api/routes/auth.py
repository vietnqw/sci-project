from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.user import UserResponse
from app.api.deps import get_current_user
from app.core.errors import BadRequestError, InactiveUserError


router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class TokenResponse(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    user: UserResponse


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise BadRequestError("Incorrect email or password")
    if not user.is_active:
        raise InactiveUserError()

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)
