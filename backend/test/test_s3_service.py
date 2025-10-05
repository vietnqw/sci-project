"""Test S3 service functionality with presigned URLs."""

import pytest
from unittest.mock import Mock, patch
from uuid import uuid4

from app.services.s3_service import S3Service


class TestS3Service:
    """Test cases for S3Service with presigned URLs."""

    @pytest.fixture
    def s3_service(self):
        """Create S3Service instance for testing."""
        with patch("app.services.s3_service.boto3.client"):
            service = S3Service()
            service.s3_client = Mock()
            service.bucket_name = "test-bucket"
            service.cloudfront_url = "https://d1234567890.cloudfront.net"
            return service

    def test_generate_s3_key_user_avatar(self, s3_service):
        """Test S3 key generation for user avatar."""
        user_id = str(uuid4())
        filename = "avatar.jpg"

        key = s3_service._generate_s3_key("user", user_id, "avatar", filename)
        expected = f"users/{user_id}/avatar/"
        assert key.startswith(expected)
        assert key.endswith(".jpg")
        assert len(key.split("/")[-1]) == 40  # UUID + .jpg

    def test_generate_s3_key_competition_background(self, s3_service):
        """Test S3 key generation for competition background."""
        competition_id = str(uuid4())
        filename = "background.png"

        key = s3_service._generate_s3_key(
            "competition", competition_id, "background", filename
        )
        expected = f"competitions/{competition_id}/background_image/"
        assert key.startswith(expected)
        assert key.endswith(".png")

    def test_generate_s3_key_competition_detail(self, s3_service):
        """Test S3 key generation for competition detail image."""
        competition_id = str(uuid4())
        filename = "detail.webp"

        key = s3_service._generate_s3_key(
            "competition", competition_id, "detail", filename
        )
        expected = f"competitions/{competition_id}/detail_images/"
        assert key.startswith(expected)
        assert key.endswith(".webp")

    def test_generate_s3_key_invalid_entity(self, s3_service):
        """Test S3 key generation with invalid entity."""
        with pytest.raises(ValueError, match="Invalid entity"):
            s3_service._generate_s3_key("invalid", "123", "avatar", "test.jpg")

    def test_generate_s3_key_invalid_purpose_user(self, s3_service):
        """Test S3 key generation with invalid purpose for user."""
        with pytest.raises(ValueError, match="Invalid purpose"):
            s3_service._generate_s3_key("user", "123", "background", "test.jpg")

    def test_generate_s3_key_invalid_purpose_competition(self, s3_service):
        """Test S3 key generation with invalid purpose for competition."""
        with pytest.raises(ValueError, match="Invalid purpose"):
            s3_service._generate_s3_key("competition", "123", "avatar", "test.jpg")

    def test_generate_s3_key_no_extension(self, s3_service):
        """Test S3 key generation with filename without extension."""
        user_id = str(uuid4())
        key = s3_service._generate_s3_key("user", user_id, "avatar", "filename")
        assert key.endswith(".jpg")  # Should default to .jpg

    def test_get_public_url_cloudfront(self, s3_service):
        """Test public URL generation with CloudFront."""
        s3_key = "users/123/avatar/test.jpg"
        url = s3_service._get_public_url(s3_key)
        expected = f"https://d1234567890.cloudfront.net/{s3_key}"
        assert url == expected

    def test_get_public_url_direct_s3(self, s3_service):
        """Test public URL generation with direct S3."""
        s3_service.cloudfront_url = None
        s3_key = "users/123/avatar/test.jpg"
        url = s3_service._get_public_url(s3_key)
        expected = "https://test-bucket.s3.ap-southeast-1.amazonaws.com/users/123/avatar/test.jpg"
        assert url == expected

    def test_generate_presigned_url_success(self, s3_service):
        """Test successful presigned URL generation."""
        user_id = str(uuid4())
        filename = "avatar.jpg"
        content_type = "image/jpeg"

        # Mock the generate_presigned_url method
        mock_url = "https://test-bucket.s3.amazonaws.com/presigned-url"
        s3_service.s3_client.generate_presigned_url = Mock(return_value=mock_url)

        result = s3_service.generate_presigned_url(
            "user", user_id, "avatar", filename, content_type
        )

        # Verify the result
        assert result is not None
        assert "presignedUrl" in result
        assert "s3Key" in result
        assert "publicUrl" in result
        assert result["presignedUrl"] == mock_url

        # Verify S3 client was called correctly
        s3_service.s3_client.generate_presigned_url.assert_called_once()
        call_args = s3_service.s3_client.generate_presigned_url.call_args
        assert call_args[1]["Params"]["Bucket"] == "test-bucket"
        assert call_args[1]["Params"]["ContentType"] == content_type
        assert call_args[1]["ExpiresIn"] == 300

    def test_generate_presigned_url_no_client(self):
        """Test presigned URL generation when S3 client is not initialized."""
        with patch("app.services.s3_service.boto3.client"):
            service = S3Service()
            service.s3_client = None
            service.bucket_name = None

            result = service.generate_presigned_url(
                "user", "123", "avatar", "test.jpg", "image/jpeg"
            )
            assert result is None

    def test_generate_batch_presigned_urls_success(self, s3_service):
        """Test successful batch presigned URL generation."""
        competition_id = str(uuid4())
        filenames = ["image1.jpg", "image2.png"]
        content_types = ["image/jpeg", "image/png"]

        # Mock the generate_presigned_url method
        mock_url = "https://test-bucket.s3.amazonaws.com/presigned-url"
        s3_service.s3_client.generate_presigned_url = Mock(return_value=mock_url)

        result = s3_service.generate_batch_presigned_urls(
            "competition", competition_id, "detail", filenames, content_types
        )

        # Verify the result
        assert result is not None
        assert len(result) == 2
        for item in result:
            assert "presignedUrl" in item
            assert "s3Key" in item
            assert "publicUrl" in item

    def test_generate_batch_presigned_urls_mismatched_lengths(self, s3_service):
        """Test batch presigned URL generation with mismatched lengths."""
        result = s3_service.generate_batch_presigned_urls(
            "user", "123", "avatar", ["file1.jpg"], ["image/jpeg", "image/png"]
        )
        assert result is None

    @pytest.mark.asyncio
    async def test_verify_upload_success(self, s3_service):
        """Test successful upload verification."""
        s3_key = "users/123/avatar/test.jpg"

        # Mock head_object to not raise an exception (file exists)
        s3_service.s3_client.head_object = Mock()

        result = await s3_service.verify_upload(s3_key)
        assert result is True

        # Verify head_object was called
        s3_service.s3_client.head_object.assert_called_once_with(
            Bucket="test-bucket", Key=s3_key
        )

    @pytest.mark.asyncio
    async def test_verify_upload_not_found(self, s3_service):
        """Test upload verification when file doesn't exist."""
        s3_key = "users/123/avatar/test.jpg"

        # Mock head_object to raise 404 error
        from botocore.exceptions import ClientError

        error_response = {"Error": {"Code": "404"}}
        s3_service.s3_client.head_object = Mock(
            side_effect=ClientError(error_response, "HeadObject")
        )

        result = await s3_service.verify_upload(s3_key)
        assert result is False

    @pytest.mark.asyncio
    async def test_verify_upload_no_client(self):
        """Test upload verification when S3 client is not initialized."""
        with patch("app.services.s3_service.boto3.client"):
            service = S3Service()
            service.s3_client = None
            service.bucket_name = None

            result = await service.verify_upload("test-key")
            assert result is False

    @pytest.mark.asyncio
    async def test_delete_object_success(self, s3_service):
        """Test successful object deletion."""
        s3_key = "users/123/avatar/test.jpg"

        # Mock delete_object
        s3_service.s3_client.delete_object = Mock()

        result = await s3_service.delete_object(s3_key)
        assert result is True

        # Verify delete_object was called
        s3_service.s3_client.delete_object.assert_called_once_with(
            Bucket="test-bucket", Key=s3_key
        )

    @pytest.mark.asyncio
    async def test_delete_object_failure(self, s3_service):
        """Test object deletion failure."""
        s3_key = "users/123/avatar/test.jpg"

        # Mock delete_object to raise an exception
        from botocore.exceptions import ClientError

        s3_service.s3_client.delete_object = Mock(
            side_effect=ClientError({}, "DeleteObject")
        )

        result = await s3_service.delete_object(s3_key)
        assert result is False

    @pytest.mark.asyncio
    async def test_delete_objects_success(self, s3_service):
        """Test successful batch object deletion."""
        s3_keys = ["users/123/avatar/test1.jpg", "users/123/avatar/test2.jpg"]

        # Mock delete_objects
        s3_service.s3_client.delete_objects = Mock(return_value={})

        result = await s3_service.delete_objects(s3_keys)
        assert result is True

        # Verify delete_objects was called
        s3_service.s3_client.delete_objects.assert_called_once()
        call_args = s3_service.s3_client.delete_objects.call_args
        assert call_args[1]["Bucket"] == "test-bucket"
        assert len(call_args[1]["Delete"]["Objects"]) == 2

    @pytest.mark.asyncio
    async def test_delete_objects_with_errors(self, s3_service):
        """Test batch object deletion with errors."""
        s3_keys = ["users/123/avatar/test1.jpg", "users/123/avatar/test2.jpg"]

        # Mock delete_objects to return errors
        error_response = {
            "Errors": [
                {"Key": "test1.jpg", "Code": "NoSuchKey", "Message": "Not found"}
            ]
        }
        s3_service.s3_client.delete_objects = Mock(return_value=error_response)

        result = await s3_service.delete_objects(s3_keys)
        assert result is False

    @pytest.mark.asyncio
    async def test_delete_objects_empty_list(self, s3_service):
        """Test batch object deletion with empty list."""
        result = await s3_service.delete_objects([])
        assert result is True

    def test_get_public_url_method(self, s3_service):
        """Test the public get_public_url method."""
        s3_key = "users/123/avatar/test.jpg"
        url = s3_service.get_public_url(s3_key)
        expected = f"https://d1234567890.cloudfront.net/{s3_key}"
        assert url == expected
