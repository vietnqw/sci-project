"""S3 service for handling presigned URLs and direct uploads."""

import os
import uuid
from typing import Dict, List, Optional

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from loguru import logger

from app.config.settings import settings


class S3Service:
    """Service for handling S3 operations with presigned URLs."""

    def __init__(self):
        """Initialize S3 client."""
        self.s3_client = None
        self.bucket_name = settings.S3_BUCKET_NAME
        self.cloudfront_url = settings.CLOUDFRONT_BASE_URL

        if not self.bucket_name:
            logger.warning("S3_BUCKET_NAME not configured")
            return

        # Log CloudFront configuration
        if self.cloudfront_url:
            logger.info(f"Using CloudFront for S3 content: {self.cloudfront_url}")
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

    def _generate_s3_key(
        self, entity: str, entity_id: str, purpose: str, filename: str
    ) -> str:
        """
        Generate S3 key following the naming convention.

        Args:
            entity: 'user' or 'competition'
            entity_id: ID of the entity
            purpose: 'avatar', 'background', or 'detail'
            filename: Original filename with extension

        Returns:
            S3 key string
        """
        # Extract file extension
        file_extension = os.path.splitext(filename)[1].lower()
        if not file_extension:
            file_extension = ".jpg"  # Default to jpg

        # Generate unique filename with UUID
        unique_filename = f"{uuid.uuid4()}{file_extension}"

        if entity == "user":
            if purpose == "avatar":
                return f"users/{entity_id}/avatar/{unique_filename}"
            else:
                raise ValueError(f"Invalid purpose '{purpose}' for user entity")
        elif entity == "competition":
            if purpose == "background":
                return f"competitions/{entity_id}/background_image/{unique_filename}"
            elif purpose == "detail":
                return f"competitions/{entity_id}/detail_images/{unique_filename}"
            else:
                raise ValueError(f"Invalid purpose '{purpose}' for competition entity")
        else:
            raise ValueError(
                f"Invalid entity '{entity}'. Must be 'user' or 'competition'"
            )

    def _get_public_url(self, s3_key: str) -> str:
        """Generate public URL for the S3 object."""
        if self.cloudfront_url:
            return f"{self.cloudfront_url.rstrip('/')}/{s3_key}"
        return f"https://{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"

    def generate_presigned_url(
        self,
        entity: str,
        entity_id: str,
        purpose: str,
        filename: str,
        content_type: str,
        expiration: int = 300,  # 5 minutes default
    ) -> Optional[Dict[str, str]]:
        """
        Generate presigned URL for direct S3 upload.

        Args:
            entity: 'user' or 'competition'
            entity_id: ID of the entity
            purpose: 'avatar', 'background', or 'detail'
            filename: Original filename
            content_type: MIME type of the file
            expiration: URL expiration time in seconds

        Returns:
            Dictionary with presigned URL, S3 key, and public URL
        """
        if not self.s3_client or not self.bucket_name:
            logger.error("S3 client not initialized or bucket name not configured")
            return None

        try:
            # Generate S3 key
            s3_key = self._generate_s3_key(entity, entity_id, purpose, filename)

            # Generate presigned URL for PUT operation
            presigned_url = self.s3_client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": s3_key,
                    "ContentType": content_type,
                },
                ExpiresIn=expiration,
            )

            # Generate public URL
            public_url = self._get_public_url(s3_key)

            logger.info(f"Generated presigned URL for {s3_key}")

            return {
                "presignedUrl": presigned_url,
                "s3Key": s3_key,
                "publicUrl": public_url,
            }

        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error generating presigned URL: {e}")
            return None

    def generate_batch_presigned_urls(
        self,
        entity: str,
        entity_id: str,
        purpose: str,
        filenames: List[str],
        content_types: List[str],
        expiration: int = 300,
    ) -> Optional[List[Dict[str, str]]]:
        """
        Generate multiple presigned URLs for batch uploads.

        Args:
            entity: 'user' or 'competition'
            entity_id: ID of the entity
            purpose: 'avatar', 'background', or 'detail'
            filenames: List of original filenames
            content_types: List of MIME types
            expiration: URL expiration time in seconds

        Returns:
            List of dictionaries with presigned URLs, S3 keys, and public URLs
        """
        if len(filenames) != len(content_types):
            logger.error("Number of filenames must match number of content types")
            return None

        presigned_urls = []

        for filename, content_type in zip(filenames, content_types):
            result = self.generate_presigned_url(
                entity, entity_id, purpose, filename, content_type, expiration
            )
            if result:
                presigned_urls.append(result)
            else:
                logger.error(f"Failed to generate presigned URL for {filename}")
                return None

        return presigned_urls

    async def verify_upload(self, s3_key: str) -> bool:
        """
        Verify that an object exists in S3.

        Args:
            s3_key: S3 key to verify

        Returns:
            True if object exists, False otherwise
        """
        if not self.s3_client or not self.bucket_name:
            logger.error("S3 client not initialized or bucket name not configured")
            return False

        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            logger.error(f"Error verifying upload: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error verifying upload: {e}")
            return False

    async def delete_object(self, s3_key: str) -> bool:
        """
        Delete an object from S3.

        Args:
            s3_key: S3 key to delete

        Returns:
            True if deletion was successful, False otherwise
        """
        if not self.s3_client or not self.bucket_name:
            logger.error("S3 client not initialized or bucket name not configured")
            return False

        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            logger.info(f"Successfully deleted object: {s3_key}")
            return True
        except ClientError as e:
            logger.error(f"Failed to delete object {s3_key}: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error deleting object {s3_key}: {e}")
            return False

    async def delete_objects(self, s3_keys: List[str]) -> bool:
        """
        Delete multiple objects from S3.

        Args:
            s3_keys: List of S3 keys to delete

        Returns:
            True if all deletions were successful, False otherwise
        """
        if not s3_keys:
            return True

        if not self.s3_client or not self.bucket_name:
            logger.error("S3 client not initialized or bucket name not configured")
            return False

        try:
            # Delete objects in batch (up to 1000 objects per request)
            objects_to_delete = [{"Key": key} for key in s3_keys]

            response = self.s3_client.delete_objects(
                Bucket=self.bucket_name, Delete={"Objects": objects_to_delete}
            )

            # Check for any errors
            if "Errors" in response and response["Errors"]:
                logger.error(f"Some objects failed to delete: {response['Errors']}")
                return False

            logger.info(f"Successfully deleted {len(s3_keys)} objects")
            return True

        except ClientError as e:
            logger.error(f"Failed to delete objects: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error deleting objects: {e}")
            return False

    def get_public_url(self, s3_key: str) -> str:
        """Get public URL for an S3 key."""
        return self._get_public_url(s3_key)


# Global S3 service instance
s3_service = S3Service()
