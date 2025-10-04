"""Test CloudFront integration with S3 service."""

import os
import pytest
from unittest.mock import patch, MagicMock
from uuid import uuid4

from app.config.settings import Settings
from app.services.s3_service import S3Service


class TestCloudFrontIntegration:
    """Test CloudFront integration functionality."""

    def test_settings_with_cloudfront_url(self):
        """Test that settings correctly uses CloudFront URL when configured."""
        with patch.dict(
            os.environ,
            {
                "CLOUDFRONT_BASE_URL": "https://d1234567890.cloudfront.net",
                "S3_BUCKET_NAME": "test-bucket",
                "AWS_REGION": "us-east-1",
            },
        ):
            # Force reload of settings
            settings = Settings()
            assert settings.CLOUDFRONT_BASE_URL == "https://d1234567890.cloudfront.net"
            assert settings.S3_BASE_URL == "https://d1234567890.cloudfront.net"

    def test_settings_without_cloudfront_url(self):
        """Test that settings automatically generates S3 URL when CloudFront not configured."""
        with patch.dict(
            os.environ,
            {"S3_BUCKET_NAME": "test-bucket", "AWS_REGION": "us-east-1"},
            clear=True,
        ):
            settings = Settings()
            assert settings.CLOUDFRONT_BASE_URL is None
            assert (
                settings.S3_BASE_URL == "https://test-bucket.s3.us-east-1.amazonaws.com"
            )

    def test_settings_auto_s3_url_generation(self):
        """Test that S3 URL is automatically generated from bucket name and region."""
        with patch.dict(
            os.environ,
            {"S3_BUCKET_NAME": "my-production-bucket", "AWS_REGION": "eu-west-1"},
            clear=True,
        ):
            settings = Settings()
            assert (
                settings.S3_BASE_URL
                == "https://my-production-bucket.s3.eu-west-1.amazonaws.com"
            )

    @patch("app.services.s3_service.settings")
    def test_s3_service_cloudfront_url_generation(self, mock_settings):
        """Test that S3 service generates CloudFront URLs when configured."""
        mock_settings.CLOUDFRONT_BASE_URL = "https://d1234567890.cloudfront.net"
        mock_settings.S3_BUCKET_NAME = "test-bucket"
        mock_settings.AWS_REGION = "us-east-1"
        mock_settings.AWS_ACCESS_KEY_ID = "test-key"
        mock_settings.AWS_SECRET_ACCESS_KEY = "test-secret"
        mock_settings.S3_BASE_URL = "https://d1234567890.cloudfront.net"

        # Mock boto3 client
        with patch("app.services.s3_service.boto3.client"):
            s3_service = S3Service()

            # Test URL generation
            competition_id = uuid4()
            s3_key = f"competitions/{competition_id}/images/test-image.jpg"
            public_url = s3_service._get_public_url(s3_key)

            expected_url = f"https://d1234567890.cloudfront.net/{s3_key}"
            assert public_url == expected_url

    @patch("app.services.s3_service.settings")
    def test_s3_service_direct_s3_url_generation(self, mock_settings):
        """Test that S3 service generates direct S3 URLs when CloudFront not configured."""
        mock_settings.CLOUDFRONT_BASE_URL = None
        mock_settings.S3_BUCKET_NAME = "test-bucket"
        mock_settings.AWS_REGION = "us-east-1"
        mock_settings.AWS_ACCESS_KEY_ID = "test-key"
        mock_settings.AWS_SECRET_ACCESS_KEY = "test-secret"
        mock_settings.S3_BASE_URL = "https://test-bucket.s3.us-east-1.amazonaws.com"

        # Mock boto3 client
        with patch("app.services.s3_service.boto3.client"):
            s3_service = S3Service()

            # Test URL generation
            competition_id = uuid4()
            s3_key = f"competitions/{competition_id}/images/test-image.jpg"
            public_url = s3_service._get_public_url(s3_key)

            expected_url = f"https://test-bucket.s3.us-east-1.amazonaws.com/{s3_key}"
            assert public_url == expected_url

    @pytest.mark.asyncio
    @patch("app.services.s3_service.settings")
    async def test_upload_with_cloudfront_private_acl(self, mock_settings):
        """Test that upload uses private ACL when CloudFront is configured."""
        mock_settings.CLOUDFRONT_BASE_URL = "https://d1234567890.cloudfront.net"
        mock_settings.S3_BUCKET_NAME = "test-bucket"
        mock_settings.AWS_REGION = "us-east-1"
        mock_settings.AWS_ACCESS_KEY_ID = "test-key"
        mock_settings.AWS_SECRET_ACCESS_KEY = "test-secret"
        mock_settings.S3_BASE_URL = "https://d1234567890.cloudfront.net"

        # Mock boto3 client
        mock_client = MagicMock()
        with patch("app.services.s3_service.boto3.client", return_value=mock_client):
            s3_service = S3Service()

            # Create a mock file
            mock_file = MagicMock()
            mock_file.seek = MagicMock()

            # Test upload
            competition_id = uuid4()
            await s3_service.upload_image(competition_id, mock_file, "test.jpg")

            # Verify upload was called without ACL
            mock_client.upload_fileobj.assert_called_once()
            call_args = mock_client.upload_fileobj.call_args
            extra_args = call_args[1]["ExtraArgs"]
            assert "ACL" not in extra_args
            assert extra_args["ContentType"] == "image/jpeg"

    @pytest.mark.asyncio
    @patch("app.services.s3_service.settings")
    async def test_upload_without_cloudfront_public_acl(self, mock_settings):
        """Test that upload uses public ACL when CloudFront is not configured."""
        mock_settings.CLOUDFRONT_BASE_URL = None
        mock_settings.S3_BUCKET_NAME = "test-bucket"
        mock_settings.AWS_REGION = "us-east-1"
        mock_settings.AWS_ACCESS_KEY_ID = "test-key"
        mock_settings.AWS_SECRET_ACCESS_KEY = "test-secret"
        mock_settings.S3_BASE_URL = "https://test-bucket.s3.us-east-1.amazonaws.com"

        # Mock boto3 client
        mock_client = MagicMock()
        with patch("app.services.s3_service.boto3.client", return_value=mock_client):
            s3_service = S3Service()

            # Create a mock file
            mock_file = MagicMock()
            mock_file.seek = MagicMock()

            # Test upload
            competition_id = uuid4()
            await s3_service.upload_image(competition_id, mock_file, "test.jpg")

            # Verify upload was called with public ACL
            mock_client.upload_fileobj.assert_called_once()
            call_args = mock_client.upload_fileobj.call_args
            extra_args = call_args[1]["ExtraArgs"]
            assert extra_args["ACL"] == "public-read"
            assert extra_args["ContentType"] == "image/jpeg"

    @pytest.mark.asyncio
    @patch("app.services.s3_service.settings")
    async def test_delete_image_with_cloudfront_url(self, mock_settings):
        """Test that delete_image correctly handles CloudFront URLs."""
        mock_settings.CLOUDFRONT_BASE_URL = "https://d1234567890.cloudfront.net"
        mock_settings.S3_BUCKET_NAME = "test-bucket"
        mock_settings.AWS_REGION = "us-east-1"
        mock_settings.AWS_ACCESS_KEY_ID = "test-key"
        mock_settings.AWS_SECRET_ACCESS_KEY = "test-secret"
        mock_settings.S3_BASE_URL = "https://d1234567890.cloudfront.net"

        # Mock boto3 client
        mock_client = MagicMock()
        with patch("app.services.s3_service.boto3.client", return_value=mock_client):
            s3_service = S3Service()

            # Test delete with CloudFront URL
            cloudfront_url = (
                "https://d1234567890.cloudfront.net/competitions/123/images/test.jpg"
            )
            await s3_service.delete_image(cloudfront_url)

            # Verify delete was called with correct key
            mock_client.delete_object.assert_called_once()
            call_args = mock_client.delete_object.call_args
            assert call_args[1]["Bucket"] == "test-bucket"
            assert call_args[1]["Key"] == "competitions/123/images/test.jpg"
