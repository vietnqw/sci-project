"""Upload routes for handling file uploads."""

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status, Form
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services.s3_service import s3_service
from uuid import uuid4

router = APIRouter()


@router.post("/images")
async def upload_image(
    file: UploadFile = File(...),
    category: str = Form("user-image"),
    competition_id: str = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """
    Upload an image file to S3.

    Args:
        file: The image file to upload
        category: Category of the upload (user-image, competition-background, competition-asset)
        competition_id: Competition ID for competition-related uploads
        current_user: Current authenticated user
        db: Database session

    Returns:
        JSON response with upload details
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
        )

    # Validate file size (10MB max)
    max_size = 10 * 1024 * 1024  # 10MB
    if file.size and file.size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size too large. Maximum size is 10MB.",
        )

    # Validate category
    allowed_categories = ["user-image", "competition-background", "competition-asset"]
    if category not in allowed_categories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category. Must be one of: user-image, competition-background, competition-asset",
        )

    # Validate competition_id for competition-related uploads
    if (
        category in ["competition-background", "competition-asset"]
        and not competition_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Competition ID is required for competition-related uploads.",
        )

    try:
        # Generate unique filename
        file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        unique_filename = f"{uuid4()}.{file_extension}"

        # Upload to S3
        if category == "competition-background":
            # Upload as background image for competition
            s3_key = f"competitions/{competition_id}/images/{unique_filename}"
            is_detail_image = False
        elif category == "competition-asset":
            # Upload as detail image for competition
            s3_key = (
                f"competitions/{competition_id}/images/detail_images/{unique_filename}"
            )
            is_detail_image = True
        else:
            # Upload as user image
            s3_key = f"users/{current_user.id}/images/{unique_filename}"
            is_detail_image = False

        # Use S3 service to upload
        from uuid import UUID

        if category in ["competition-background", "competition-asset"]:
            # For competition uploads, use the provided competition ID
            competition_uuid = UUID(competition_id)
            public_url = await s3_service.upload_image(
                competition_uuid, file.file, unique_filename, is_detail_image
            )
        else:
            # For user uploads, we need to create a different S3 structure
            # Since we don't have a competition ID for user uploads, we'll handle this differently
            # For now, let's use a dummy competition ID but with a different path structure
            dummy_competition_id = UUID("00000000-0000-0000-0000-000000000000")
            public_url = await s3_service.upload_image(
                dummy_competition_id, file.file, unique_filename, is_detail_image
            )

        if not public_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload image to S3.",
            )

        logger.info(f"Successfully uploaded image: {public_url}")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "url": public_url,
                "key": s3_key,
                "filename": unique_filename,
                "content_type": file.content_type,
                "size": file.size or 0,
            },
        )

    except Exception as e:
        logger.error(f"Failed to upload image: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}",
        )


@router.delete("/images/{key:path}")
async def delete_image(
    key: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """
    Delete an image from S3.

    Args:
        key: S3 key of the image to delete
        current_user: Current authenticated user
        db: Database session

    Returns:
        JSON response with deletion status
    """
    try:
        # Construct the full URL from the key
        # This is a simplified approach - in production you'd want more validation
        base_url = (
            s3_service.base_url
            or f"https://{s3_service.bucket_name}.s3.{s3_service.bucket_name}.amazonaws.com"
        )
        full_url = f"{base_url}/{key}"

        success = await s3_service.delete_image(full_url)

        if success:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={"message": "Image deleted successfully"},
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete image",
            )

    except Exception as e:
        logger.error(f"Failed to delete image: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Delete failed: {str(e)}",
        )


@router.get("/images/status")
async def get_upload_status() -> JSONResponse:
    """
    Get upload service status.

    Returns:
        JSON response with service status
    """
    try:
        # Check if S3 service is available
        if s3_service.s3_client and s3_service.bucket_name:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "status": "ok",
                    "bucket": s3_service.bucket_name,
                    "region": s3_service.base_url,
                },
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={"status": "unavailable"},
            )
    except Exception as e:
        logger.error(f"Failed to check upload status: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unavailable"},
        )
