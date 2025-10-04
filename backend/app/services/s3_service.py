"""S3 service for handling image uploads and deletions."""

import os
import uuid
from typing import BinaryIO, List, Optional
from uuid import UUID

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from loguru import logger

from app.config.settings import settings


class S3Service:
    """Service for handling S3 operations."""

    def __init__(self):
        """Initialize S3 client."""
        self.s3_client = None
        self.bucket_name = settings.S3_BUCKET_NAME
        self.base_url = settings.S3_BASE_URL

        if not self.bucket_name:
            logger.warning("S3_BUCKET_NAME not configured")
            return

        # Log CloudFront configuration
        if settings.CLOUDFRONT_BASE_URL:
            logger.info(
                f"Using CloudFront for S3 content: {settings.CLOUDFRONT_BASE_URL}"
            )
        else:
            logger.info("Using direct S3 URLs (CloudFront not configured)")

        try:
            self.s3_client = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )
            logger.info("S3 client initialized successfully")
        except NoCredentialsError:
            logger.error("AWS credentials not found")
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")

    def _get_s3_key(
        self, competition_id: UUID, filename: str, is_detail_image: bool = False
    ) -> str:
        """Generate S3 key for the file."""
        if is_detail_image:
            return f"competitions/{competition_id}/images/detail_images/{filename}"
        return f"competitions/{competition_id}/images/{filename}"

    def _get_public_url(self, s3_key: str) -> str:
        """Generate public URL for the S3 object."""
        if self.base_url:
            return f"{self.base_url.rstrip('/')}/{s3_key}"
        return f"https://{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"

    async def upload_image(
        self,
        competition_id: UUID,
        file: BinaryIO,
        filename: str,
        is_detail_image: bool = False,
    ) -> Optional[str]:
        """
        Upload an image to S3.

        Args:
            competition_id: Competition UUID
            file: File object to upload
            content_type: MIME type of the file
            is_detail_image: Whether this is a detail image or background image

        Returns:
            Public URL of the uploaded image or None if upload failed
        """
        if not self.s3_client or not self.bucket_name:
            logger.error("S3 client not initialized or bucket name not configured")
            return None

        # Generate unique filename to avoid conflicts
        file_extension = os.path.splitext(filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        s3_key = self._get_s3_key(competition_id, unique_filename, is_detail_image)

        try:
            # Reset file pointer to beginning
            file.seek(0)

            # Upload file to S3
            # When using CloudFront, files should be private (no ACL)
            # When using direct S3 URLs, files should be public
            extra_args = {
                "ContentType": "image/jpeg",  # Default to JPEG, could be made configurable
            }

            # Only set ACL to public-read if not using CloudFront
            if not settings.CLOUDFRONT_BASE_URL:
                extra_args["ACL"] = "public-read"

            self.s3_client.upload_fileobj(
                file, self.bucket_name, s3_key, ExtraArgs=extra_args
            )

            public_url = self._get_public_url(s3_key)
            logger.info(f"Successfully uploaded image to S3: {public_url}")
            return public_url

        except ClientError as e:
            logger.error(f"Failed to upload image to S3: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error uploading image: {e}")
            return None

    async def delete_image(self, image_url: str) -> bool:
        """
        Delete an image from S3.

        Args:
            image_url: Public URL of the image to delete

        Returns:
            True if deletion was successful, False otherwise
        """
        if not self.s3_client or not self.bucket_name:
            logger.error("S3 client not initialized or bucket name not configured")
            return False

        try:
            # Extract S3 key from the URL
            if self.base_url and image_url.startswith(self.base_url):
                s3_key = image_url.replace(f"{self.base_url.rstrip('/')}/", "")
            else:
                # Try to extract from standard S3 URL format
                s3_key = image_url.split(
                    f"{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/"
                )[-1]

            # Delete the object from S3
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            logger.info(f"Successfully deleted image from S3: {s3_key}")
            return True

        except ClientError as e:
            logger.error(f"Failed to delete image from S3: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error deleting image: {e}")
            return False

    async def delete_images(self, image_urls: List[str]) -> bool:
        """
        Delete multiple images from S3.

        Args:
            image_urls: List of public URLs of images to delete

        Returns:
            True if all deletions were successful, False otherwise
        """
        if not image_urls:
            return True

        success = True
        for url in image_urls:
            if not await self.delete_image(url):
                success = False

        return success

    async def upload_multiple_images(
        self,
        competition_id: UUID,
        files: List[BinaryIO],
        filenames: List[str],
        is_detail_images: bool = False,
    ) -> List[str]:
        """
        Upload multiple images to S3.

        Args:
            competition_id: Competition UUID
            files: List of file objects to upload
            filenames: List of original filenames
            is_detail_images: Whether these are detail images or background images

        Returns:
            List of public URLs of successfully uploaded images
        """
        uploaded_urls = []

        for file, filename in zip(files, filenames):
            url = await self.upload_image(
                competition_id, file, filename, is_detail_images
            )
            if url:
                uploaded_urls.append(url)

        return uploaded_urls


# Global S3 service instance
s3_service = S3Service()
