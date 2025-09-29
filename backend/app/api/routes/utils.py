from fastapi import APIRouter

from app.config.settings import settings


router = APIRouter(tags=["utils"])


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
    }
