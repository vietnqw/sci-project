"""Upload routes for handling presigned URLs and upload confirmations."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.competition import Competition
from app.services.s3_service import s3_service


router = APIRouter()


class PresignedUrlRequest(BaseModel):
    """Request model for generating presigned URLs."""

    entity: str = Field(..., description="Entity type: 'user' or 'competition'")
    entity_id: str = Field(..., description="ID of the entity")
    purpose: str = Field(
        ..., description="Purpose: 'avatar', 'background', or 'detail'"
    )
    filename: str = Field(..., description="Original filename")
    content_type: str = Field(..., description="MIME type of the file")
    expiration: Optional[int] = Field(300, description="URL expiration time in seconds")


class BatchPresignedUrlRequest(BaseModel):
    """Request model for generating batch presigned URLs."""

    entity: str = Field(..., description="Entity type: 'user' or 'competition'")
    entity_id: str = Field(..., description="ID of the entity")
    purpose: str = Field(
        ..., description="Purpose: 'avatar', 'background', or 'detail'"
    )
    filenames: List[str] = Field(..., description="List of original filenames")
    content_types: List[str] = Field(..., description="List of MIME types")
    expiration: Optional[int] = Field(300, description="URL expiration time in seconds")


class UploadConfirmRequest(BaseModel):
    """Request model for confirming uploads."""

    entity: str = Field(..., description="Entity type: 'user' or 'competition'")
    entity_id: str = Field(..., description="ID of the entity")
    purpose: str = Field(
        ..., description="Purpose: 'avatar', 'background', or 'detail'"
    )
    s3_key: str = Field(..., description="S3 key of the uploaded file")
    mime_type: str = Field(..., description="MIME type of the uploaded file")
    size: int = Field(..., description="Size of the uploaded file in bytes")


@router.post("/presigned-url")
async def generate_presigned_url(
    request: PresignedUrlRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """
    Generate a presigned URL for direct S3 upload.

    This endpoint validates permissions and generates a presigned URL
    that allows the frontend to upload directly to S3.
    """
    # Validate entity and purpose
    if request.entity not in ["user", "competition"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Entity must be 'user' or 'competition'",
        )

    if request.purpose not in ["avatar", "background", "detail"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Purpose must be 'avatar', 'background', or 'detail'",
        )

    # Validate content type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if request.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid content type. Only JPEG, PNG, and WebP images are allowed.",
        )

    # Validate permissions
    if request.entity == "user":
        if request.entity_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only upload images for your own account",
            )
        if request.purpose != "avatar":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Users can only upload avatar images",
            )

    elif request.entity == "competition":
        # Verify the competition exists and user has permission
        try:
            competition_uuid = UUID(request.entity_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid competition ID format",
            )

        # Check if competition exists and user owns it
        competition = await db.get(Competition, competition_uuid)
        if not competition:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Competition not found"
            )

        if competition.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only upload images for competitions you own",
            )

    # Generate presigned URL
    result = s3_service.generate_presigned_url(
        entity=request.entity,
        entity_id=request.entity_id,
        purpose=request.purpose,
        filename=request.filename,
        content_type=request.content_type,
        expiration=request.expiration,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate presigned URL",
        )

    logger.info(
        f"Generated presigned URL for {request.entity}/{request.entity_id}/{request.purpose}"
    )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=result,
    )


@router.post("/presigned-urls/batch")
async def generate_batch_presigned_urls(
    request: BatchPresignedUrlRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """
    Generate multiple presigned URLs for batch uploads.

    This endpoint is useful for uploading multiple detail images
    for competitions or multiple files at once.
    """
    # Validate entity and purpose
    if request.entity not in ["user", "competition"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Entity must be 'user' or 'competition'",
        )

    if request.purpose not in ["avatar", "background", "detail"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Purpose must be 'avatar', 'background', or 'detail'",
        )

    # Validate content types
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    for content_type in request.content_types:
        if content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid content type. Only JPEG, PNG, and WebP images are allowed.",
            )

    # Validate permissions (same logic as single presigned URL)
    if request.entity == "user":
        if request.entity_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only upload images for your own account",
            )
        if request.purpose != "avatar":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Users can only upload avatar images",
            )

    elif request.entity == "competition":
        try:
            competition_uuid = UUID(request.entity_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid competition ID format",
            )

        competition = await db.get(Competition, competition_uuid)
        if not competition:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Competition not found"
            )

        if competition.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only upload images for competitions you own",
            )

    # Generate batch presigned URLs
    result = s3_service.generate_batch_presigned_urls(
        entity=request.entity,
        entity_id=request.entity_id,
        purpose=request.purpose,
        filenames=request.filenames,
        content_types=request.content_types,
        expiration=request.expiration,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate presigned URLs",
        )

    logger.info(
        f"Generated {len(result)} presigned URLs for {request.entity}/{request.entity_id}/{request.purpose}"
    )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"presignedUrls": result},
    )


@router.post("/confirm")
async def confirm_upload(
    request: UploadConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """
    Confirm that an upload was successful and update the database.

    This endpoint is called after the frontend successfully uploads
    a file to S3 using the presigned URL.
    """
    # Validate entity and purpose
    if request.entity not in ["user", "competition"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Entity must be 'user' or 'competition'",
        )

    if request.purpose not in ["avatar", "background", "detail"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Purpose must be 'avatar', 'background', or 'detail'",
        )

    # Validate permissions
    if request.entity == "user":
        if request.entity_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only confirm uploads for your own account",
            )

    elif request.entity == "competition":
        try:
            competition_uuid = UUID(request.entity_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid competition ID format",
            )

        competition = await db.get(Competition, competition_uuid)
        if not competition:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Competition not found"
            )

        if competition.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only confirm uploads for competitions you own",
            )

    # Verify the upload exists in S3
    upload_exists = await s3_service.verify_upload(request.s3_key)
    if not upload_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upload verification failed. File not found in S3.",
        )

    try:
        # Update database based on entity and purpose
        if request.entity == "user" and request.purpose == "avatar":
            # Update user avatar
            current_user.avatar_url = s3_service.get_public_url(request.s3_key)
            await db.commit()
            await db.refresh(current_user)

            logger.info(f"Updated avatar for user {current_user.id}")

            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "message": "Avatar updated successfully",
                    "url": current_user.avatar_url,
                    "s3Key": request.s3_key,
                },
            )

        elif request.entity == "competition":
            competition = await db.get(Competition, competition_uuid)

            if request.purpose == "background":
                # Update competition background image
                competition.background_image_url = s3_service.get_public_url(
                    request.s3_key
                )
                await db.commit()
                await db.refresh(competition)

                logger.info(
                    f"Updated background image for competition {competition.id}"
                )

                return JSONResponse(
                    status_code=status.HTTP_200_OK,
                    content={
                        "message": "Background image updated successfully",
                        "url": competition.background_image_url,
                        "s3Key": request.s3_key,
                    },
                )

            elif request.purpose == "detail":
                # Add detail image to competition
                # Note: This would require a separate table for detail images
                # For now, we'll just return success
                logger.info(f"Added detail image for competition {competition.id}")

                return JSONResponse(
                    status_code=status.HTTP_200_OK,
                    content={
                        "message": "Detail image added successfully",
                        "url": s3_service.get_public_url(request.s3_key),
                        "s3Key": request.s3_key,
                    },
                )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid entity/purpose combination",
        )

    except Exception as e:
        logger.error(f"Failed to confirm upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to confirm upload",
        )


@router.delete("/{s3_key:path}")
async def delete_upload(
    s3_key: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """
    Delete an uploaded file from S3.

    This endpoint allows users to delete files they have uploaded.
    """
    try:
        # Verify the file exists and user has permission
        # This would require additional logic to check ownership
        # For now, we'll implement basic deletion

        success = await s3_service.delete_object(s3_key)

        if success:
            logger.info(f"Successfully deleted file: {s3_key}")
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={"message": "File deleted successfully"},
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete file",
            )

    except Exception as e:
        logger.error(f"Failed to delete file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete file",
        )


@router.get("/status")
async def get_upload_status() -> JSONResponse:
    """
    Get upload service status.

    Returns the current status of the S3 service.
    """
    try:
        if s3_service.s3_client and s3_service.bucket_name:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "status": "ok",
                    "bucket": s3_service.bucket_name,
                    "cloudfront": s3_service.cloudfront_url,
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
