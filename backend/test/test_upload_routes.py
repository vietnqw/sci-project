"""Test upload routes functionality."""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4

from app.main import app
from app.models.user import User
from app.models.competition import Competition


class TestUploadRoutes:
    """Test cases for upload routes."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)

    @pytest.fixture
    def mock_user(self):
        """Create mock user."""
        user = User()
        user.id = uuid4()
        user.email = "test@example.com"
        user.first_name = "Test"
        user.last_name = "User"
        return user

    @pytest.fixture
    def mock_competition(self, mock_user):
        """Create mock competition."""
        competition = Competition()
        competition.id = uuid4()
        competition.owner_id = mock_user.id
        competition.title = "Test Competition"
        return competition

    @pytest.fixture
    def mock_db(self):
        """Create mock database session."""
        db = AsyncMock(spec=AsyncSession)
        return db

    def test_generate_presigned_url_user_avatar_success(
        self, client, mock_user, mock_db
    ):
        """Test successful presigned URL generation for user avatar."""
        with (
            patch("app.api.routes.upload.get_current_user", return_value=mock_user),
            patch("app.api.routes.upload.get_db", return_value=mock_db),
            patch(
                "app.api.routes.upload.s3_service.generate_presigned_url"
            ) as mock_generate,
        ):
            # Mock S3 service response
            mock_generate.return_value = {
                "presignedUrl": "https://test-bucket.s3.amazonaws.com/presigned-url",
                "s3Key": "users/123/avatar/test.jpg",
                "publicUrl": "https://cloudfront.net/users/123/avatar/test.jpg",
            }

            response = client.post(
                "/api/v1/uploads/presigned-url",
                json={
                    "entity": "user",
                    "entity_id": str(mock_user.id),
                    "purpose": "avatar",
                    "filename": "avatar.jpg",
                    "content_type": "image/jpeg",
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert "presignedUrl" in data
            assert "s3Key" in data
            assert "publicUrl" in data

    def test_generate_presigned_url_competition_background_success(
        self, client, mock_user, mock_competition, mock_db
    ):
        """Test successful presigned URL generation for competition background."""
        with (
            patch("app.api.routes.upload.get_current_user", return_value=mock_user),
            patch("app.api.routes.upload.get_db", return_value=mock_db),
            patch.object(mock_db, "get", return_value=mock_competition),
            patch(
                "app.api.routes.upload.s3_service.generate_presigned_url"
            ) as mock_generate,
        ):
            # Mock S3 service response
            mock_generate.return_value = {
                "presignedUrl": "https://test-bucket.s3.amazonaws.com/presigned-url",
                "s3Key": "competitions/123/background_image/test.jpg",
                "publicUrl": "https://cloudfront.net/competitions/123/background_image/test.jpg",
            }

            response = client.post(
                "/api/v1/uploads/presigned-url",
                json={
                    "entity": "competition",
                    "entity_id": str(mock_competition.id),
                    "purpose": "background",
                    "filename": "background.jpg",
                    "content_type": "image/jpeg",
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert "presignedUrl" in data
            assert "s3Key" in data
            assert "publicUrl" in data

    def test_generate_presigned_url_invalid_entity(self, client, mock_user, mock_db):
        """Test presigned URL generation with invalid entity."""
        with (
            patch("app.api.routes.upload.get_current_user", return_value=mock_user),
            patch("app.api.routes.upload.get_db", return_value=mock_db),
        ):
            response = client.post(
                "/api/v1/uploads/presigned-url",
                json={
                    "entity": "invalid",
                    "entity_id": str(mock_user.id),
                    "purpose": "avatar",
                    "filename": "avatar.jpg",
                    "content_type": "image/jpeg",
                },
            )

            assert response.status_code == 400
            assert "Entity must be 'user' or 'competition'" in response.json()["detail"]

    def test_generate_presigned_url_invalid_purpose(self, client, mock_user, mock_db):
        """Test presigned URL generation with invalid purpose."""
        with (
            patch("app.api.routes.upload.get_current_user", return_value=mock_user),
            patch("app.api.routes.upload.get_db", return_value=mock_db),
        ):
            response = client.post(
                "/api/v1/uploads/presigned-url",
                json={
                    "entity": "user",
                    "entity_id": str(mock_user.id),
                    "purpose": "invalid",
                    "filename": "avatar.jpg",
                    "content_type": "image/jpeg",
                },
            )

            assert response.status_code == 400
            assert (
                "Purpose must be 'avatar', 'background', or 'detail'"
                in response.json()["detail"]
            )

    def test_generate_presigned_url_invalid_content_type(
        self, client, mock_user, mock_db
    ):
        """Test presigned URL generation with invalid content type."""
        with (
            patch("app.api.routes.upload.get_current_user", return_value=mock_user),
            patch("app.api.routes.upload.get_db", return_value=mock_db),
        ):
            response = client.post(
                "/api/v1/uploads/presigned-url",
                json={
                    "entity": "user",
                    "entity_id": str(mock_user.id),
                    "purpose": "avatar",
                    "filename": "avatar.jpg",
                    "content_type": "text/plain",
                },
            )

            assert response.status_code == 400
            assert "Invalid content type" in response.json()["detail"]

    def test_generate_presigned_url_unauthorized_user(self, client, mock_user, mock_db):
        """Test presigned URL generation for another user's account."""
        other_user_id = uuid4()

        with (
            patch("app.api.routes.upload.get_current_user", return_value=mock_user),
            patch("app.api.routes.upload.get_db", return_value=mock_db),
        ):
            response = client.post(
                "/api/v1/uploads/presigned-url",
                json={
                    "entity": "user",
                    "entity_id": str(other_user_id),
                    "purpose": "avatar",
                    "filename": "avatar.jpg",
                    "content_type": "image/jpeg",
                },
            )

            assert response.status_code == 403
            assert (
                "You can only upload images for your own account"
                in response.json()["detail"]
            )

    def test_generate_presigned_url_competition_not_found(
        self, client, mock_user, mock_db
    ):
        """Test presigned URL generation for non-existent competition."""
        competition_id = uuid4()

        with (
            patch("app.api.routes.upload.get_current_user", return_value=mock_user),
            patch("app.api.routes.upload.get_db", return_value=mock_db),
            patch.object(mock_db, "get", return_value=None),
        ):
            response = client.post(
                "/api/v1/uploads/presigned-url",
                json={
                    "entity": "competition",
                    "entity_id": str(competition_id),
                    "purpose": "background",
                    "filename": "background.jpg",
                    "content_type": "image/jpeg",
                },
            )

            assert response.status_code == 404
            assert "Competition not found" in response.json()["detail"]

    def test_generate_presigned_url_competition_unauthorized(
        self, client, mock_user, mock_competition, mock_db
    ):
        """Test presigned URL generation for competition user doesn't own."""
        other_user_id = uuid4()
        mock_competition.owner_id = other_user_id

        with (
            patch("app.api.routes.upload.get_current_user", return_value=mock_user),
            patch("app.api.routes.upload.get_db", return_value=mock_db),
            patch.object(mock_db, "get", return_value=mock_competition),
        ):
            response = client.post(
                "/api/v1/uploads/presigned-url",
                json={
                    "entity": "competition",
                    "entity_id": str(mock_competition.id),
                    "purpose": "background",
                    "filename": "background.jpg",
                    "content_type": "image/jpeg",
                },
            )

            assert response.status_code == 403
            assert (
                "You can only upload images for competitions you own"
                in response.json()["detail"]
            )

    def test_generate_batch_presigned_urls_success(
        self, client, mock_user, mock_competition, mock_db
    ):
        """Test successful batch presigned URL generation."""
        with (
            patch("app.api.routes.upload.get_current_user", return_value=mock_user),
            patch("app.api.routes.upload.get_db", return_value=mock_db),
            patch.object(mock_db, "get", return_value=mock_competition),
            patch(
                "app.api.routes.upload.s3_service.generate_batch_presigned_urls"
            ) as mock_generate,
        ):
            # Mock S3 service response
            mock_generate.return_value = [
                {
                    "presignedUrl": "https://test-bucket.s3.amazonaws.com/presigned-url-1",
                    "s3Key": "competitions/123/detail_images/test1.jpg",
                    "publicUrl": "https://cloudfront.net/competitions/123/detail_images/test1.jpg",
                },
                {
                    "presignedUrl": "https://test-bucket.s3.amazonaws.com/presigned-url-2",
                    "s3Key": "competitions/123/detail_images/test2.jpg",
                    "publicUrl": "https://cloudfront.net/competitions/123/detail_images/test2.jpg",
                },
            ]

            response = client.post(
                "/api/v1/uploads/presigned-urls/batch",
                json={
                    "entity": "competition",
                    "entity_id": str(mock_competition.id),
                    "purpose": "detail",
                    "filenames": ["test1.jpg", "test2.jpg"],
                    "content_types": ["image/jpeg", "image/jpeg"],
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert "presignedUrls" in data
            assert len(data["presignedUrls"]) == 2

    def test_confirm_upload_user_avatar_success(self, client, mock_user, mock_db):
        """Test successful upload confirmation for user avatar."""
        with (
            patch("app.api.routes.upload.get_current_user", return_value=mock_user),
            patch("app.api.routes.upload.get_db", return_value=mock_db),
            patch("app.api.routes.upload.s3_service.verify_upload", return_value=True),
            patch(
                "app.api.routes.upload.s3_service.get_public_url",
                return_value="https://cloudfront.net/avatar.jpg",
            ),
        ):
            # Mock database operations
            mock_db.commit = AsyncMock()
            mock_db.refresh = AsyncMock()

            response = client.post(
                "/api/v1/uploads/confirm",
                json={
                    "entity": "user",
                    "entity_id": str(mock_user.id),
                    "purpose": "avatar",
                    "s3_key": "users/123/avatar/test.jpg",
                    "mime_type": "image/jpeg",
                    "size": 1024,
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            assert "url" in data
            assert "s3Key" in data

    def test_confirm_upload_competition_background_success(
        self, client, mock_user, mock_competition, mock_db
    ):
        """Test successful upload confirmation for competition background."""
        with (
            patch("app.api.routes.upload.get_current_user", return_value=mock_user),
            patch("app.api.routes.upload.get_db", return_value=mock_db),
            patch.object(mock_db, "get", return_value=mock_competition),
            patch("app.api.routes.upload.s3_service.verify_upload", return_value=True),
            patch(
                "app.api.routes.upload.s3_service.get_public_url",
                return_value="https://cloudfront.net/background.jpg",
            ),
        ):
            # Mock database operations
            mock_db.commit = AsyncMock()
            mock_db.refresh = AsyncMock()

            response = client.post(
                "/api/v1/uploads/confirm",
                json={
                    "entity": "competition",
                    "entity_id": str(mock_competition.id),
                    "purpose": "background",
                    "s3_key": "competitions/123/background_image/test.jpg",
                    "mime_type": "image/jpeg",
                    "size": 2048,
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            assert "url" in data
            assert "s3Key" in data

    def test_confirm_upload_verification_failed(self, client, mock_user, mock_db):
        """Test upload confirmation when verification fails."""
        with (
            patch("app.api.routes.upload.get_current_user", return_value=mock_user),
            patch("app.api.routes.upload.get_db", return_value=mock_db),
            patch("app.api.routes.upload.s3_service.verify_upload", return_value=False),
        ):
            response = client.post(
                "/api/v1/uploads/confirm",
                json={
                    "entity": "user",
                    "entity_id": str(mock_user.id),
                    "purpose": "avatar",
                    "s3_key": "users/123/avatar/test.jpg",
                    "mime_type": "image/jpeg",
                    "size": 1024,
                },
            )

            assert response.status_code == 400
            assert "Upload verification failed" in response.json()["detail"]

    def test_delete_upload_success(self, client, mock_user, mock_db):
        """Test successful file deletion."""
        with (
            patch("app.api.routes.upload.get_current_user", return_value=mock_user),
            patch("app.api.routes.upload.get_db", return_value=mock_db),
            patch("app.api.routes.upload.s3_service.delete_object", return_value=True),
        ):
            response = client.delete("/api/v1/uploads/users/123/avatar/test.jpg")

            assert response.status_code == 200
            data = response.json()
            assert "message" in data

    def test_delete_upload_failure(self, client, mock_user, mock_db):
        """Test file deletion failure."""
        with (
            patch("app.api.routes.upload.get_current_user", return_value=mock_user),
            patch("app.api.routes.upload.get_db", return_value=mock_db),
            patch("app.api.routes.upload.s3_service.delete_object", return_value=False),
        ):
            response = client.delete("/api/v1/uploads/users/123/avatar/test.jpg")

            assert response.status_code == 500
            assert "Failed to delete file" in response.json()["detail"]

    def test_get_upload_status_ok(self, client):
        """Test upload status when service is available."""
        with (
            patch("app.api.routes.upload.s3_service.s3_client", return_value=Mock()),
            patch(
                "app.api.routes.upload.s3_service.bucket_name",
                return_value="test-bucket",
            ),
            patch(
                "app.api.routes.upload.s3_service.cloudfront_url",
                return_value="https://cloudfront.net",
            ),
        ):
            response = client.get("/api/v1/uploads/status")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "ok"
            assert "bucket" in data
            assert "cloudfront" in data

    def test_get_upload_status_unavailable(self, client):
        """Test upload status when service is unavailable."""
        with patch("app.api.routes.upload.s3_service.s3_client", return_value=None):
            response = client.get("/api/v1/uploads/status")

            assert response.status_code == 503
            data = response.json()
            assert data["status"] == "unavailable"
