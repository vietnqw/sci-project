"""Test S3 service functionality."""

import pytest
from unittest.mock import Mock, patch
from app.services.s3_service import S3Service


class TestS3Service:
    """Test cases for S3Service."""

    @pytest.fixture
    def s3_service(self):
        """Create S3Service instance for testing."""
        with patch("app.services.s3_service.boto3.client"):
            service = S3Service()
            service.s3_client = Mock()
            service.bucket_name = "test-bucket"
            service.base_url = "https://test-bucket.s3.us-east-1.amazonaws.com"
            return service

    def test_get_s3_key_background_image(self, s3_service):
        """Test S3 key generation for background image."""
        from uuid import uuid4

        competition_id = uuid4()
        filename = "test.jpg"

        key = s3_service._get_s3_key(competition_id, filename, is_detail_image=False)
        expected = f"competitions/{competition_id}/images/{filename}"
        assert key == expected

    def test_get_s3_key_detail_image(self, s3_service):
        """Test S3 key generation for detail image."""
        from uuid import uuid4

        competition_id = uuid4()
        filename = "test.jpg"

        key = s3_service._get_s3_key(competition_id, filename, is_detail_image=True)
        expected = f"competitions/{competition_id}/images/detail_images/{filename}"
        assert key == expected

    def test_get_public_url(self, s3_service):
        """Test public URL generation."""
        s3_key = "competitions/123/images/test.jpg"
        url = s3_service._get_public_url(s3_key)
        expected = "https://test-bucket.s3.us-east-1.amazonaws.com/competitions/123/images/test.jpg"
        assert url == expected

    @pytest.mark.asyncio
    async def test_upload_image_success(self, s3_service):
        """Test successful image upload."""
        from uuid import uuid4
        from io import BytesIO

        competition_id = uuid4()
        file_content = BytesIO(b"fake image content")
        filename = "test.jpg"

        # Mock the upload_fileobj method
        s3_service.s3_client.upload_fileobj = Mock()

        result = await s3_service.upload_image(
            competition_id, file_content, filename, False
        )

        # Verify upload was called
        s3_service.s3_client.upload_fileobj.assert_called_once()

        # Verify result is a URL
        assert result is not None
        assert result.startswith("https://test-bucket.s3.us-east-1.amazonaws.com")

    @pytest.mark.asyncio
    async def test_upload_image_no_client(self):
        """Test upload when S3 client is not initialized."""
        with patch("app.services.s3_service.boto3.client"):
            service = S3Service()
            service.s3_client = None
            service.bucket_name = None

            result = await service.upload_image("test-id", Mock(), "test.jpg", False)
            assert result is None

    @pytest.mark.asyncio
    async def test_delete_image_success(self, s3_service):
        """Test successful image deletion."""
        image_url = "https://test-bucket.s3.us-east-1.amazonaws.com/competitions/123/images/test.jpg"

        # Mock the delete_object method
        s3_service.s3_client.delete_object = Mock()

        result = await s3_service.delete_image(image_url)

        # Verify delete was called
        s3_service.s3_client.delete_object.assert_called_once()
        assert result is True

    @pytest.mark.asyncio
    async def test_delete_image_no_client(self):
        """Test delete when S3 client is not initialized."""
        with patch("app.services.s3_service.boto3.client"):
            service = S3Service()
            service.s3_client = None
            service.bucket_name = None

            result = await service.delete_image("https://example.com/image.jpg")
            assert result is False

    @pytest.mark.asyncio
    async def test_delete_images_success(self, s3_service):
        """Test successful deletion of multiple images."""
        urls = [
            "https://test-bucket.s3.us-east-1.amazonaws.com/competitions/123/images/test1.jpg",
            "https://test-bucket.s3.us-east-1.amazonaws.com/competitions/123/images/test2.jpg",
        ]

        # Mock the delete_object method
        s3_service.s3_client.delete_object = Mock()

        result = await s3_service.delete_images(urls)

        # Verify delete was called for each URL
        assert s3_service.s3_client.delete_object.call_count == 2
        assert result is True

    @pytest.mark.asyncio
    async def test_delete_images_empty_list(self, s3_service):
        """Test deletion with empty URL list."""
        result = await s3_service.delete_images([])
        assert result is True

    @pytest.mark.asyncio
    async def test_upload_multiple_images_success(self, s3_service):
        """Test successful upload of multiple images."""
        from uuid import uuid4
        from io import BytesIO

        competition_id = uuid4()
        files = [BytesIO(b"fake content 1"), BytesIO(b"fake content 2")]
        filenames = ["test1.jpg", "test2.jpg"]

        # Mock the upload_fileobj method
        s3_service.s3_client.upload_fileobj = Mock()

        result = await s3_service.upload_multiple_images(
            competition_id, files, filenames, True
        )

        # Verify upload was called for each file
        assert s3_service.s3_client.upload_fileobj.call_count == 2
        assert len(result) == 2
        assert all(
            url.startswith("https://test-bucket.s3.us-east-1.amazonaws.com")
            for url in result
        )
