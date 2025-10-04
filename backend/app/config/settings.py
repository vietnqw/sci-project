from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Use top level .env file (one level above ./backend/)
        env_file="../.env",
        env_ignore_empty=True,
        extra="ignore",
    )

    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "SCI"
    ENVIRONMENT: Literal["local", "production"] = "local"

    # Server Configuration
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"

    # Database Configuration
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "sci_db"

    # Datbase Connection Pool Configuration
    POSTGRES_POOL_SIZE: int = Field(
        default=5, description="Database connection pool size"
    )
    POSTGRES_MAX_OVERFLOW: int = Field(
        default=10, description="Database max overflow connections"
    )
    POSTGRES_POOL_TIMEOUT: int = Field(
        default=30, description="Database pool time out in seconds"
    )
    POSTGRES_POOL_RECYCLE: int = Field(
        default=3600, description="Database pool recycle time in seconds"
    )

    # Auth / JWT Configuration
    SECRET_KEY: str = Field(min_length=32, description="JWT secret key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # CORS Configuration
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        description="Comma-separated list of allowed origins for CORS",
    )

    # AWS S3 Configuration
    AWS_ACCESS_KEY_ID: str | None = Field(default=None, description="AWS Access Key ID")
    AWS_SECRET_ACCESS_KEY: str | None = Field(
        default=None, description="AWS Secret Access Key"
    )
    AWS_REGION: str = Field(default="us-east-1", description="AWS Region")
    S3_BUCKET_NAME: str | None = Field(default=None, description="S3 Bucket Name")

    # CloudFront Configuration
    CLOUDFRONT_BASE_URL: str | None = Field(
        default=None, description="CloudFront distribution URL for caching S3 content"
    )

    # Initial admin bootstrap (manage_database.py)
    ADMIN_EMAIL: str | None = None
    ADMIN_PASSWORD: str | None = None
    ADMIN_FULL_NAME: str | None = None
    ADMIN_PHONE_NUMBER: str | None = None
    ADMIN_ORGANIZATION: str | None = None

    @property
    def POSTGRES_URL(self) -> str:
        """Asynchronous PostgreSQL URL for SQLAlchemy"""
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def POSTGRES_URL_SYNC(self) -> str:
        """Synchronous PostgreSQL URL for Alembic"""
        return self.POSTGRES_URL.replace("asyncpg", "psycopg2")

    @property
    def S3_BASE_URL(self) -> str | None:
        """Build S3 Base URL from CloudFront or AWS region and bucket name"""
        # Use CloudFront URL if configured, otherwise generate S3 URL from bucket and region
        if self.CLOUDFRONT_BASE_URL:
            return self.CLOUDFRONT_BASE_URL.rstrip("/")

        if not self.S3_BUCKET_NAME or not self.AWS_REGION:
            return None
        return f"https://{self.S3_BUCKET_NAME}.s3.{self.AWS_REGION}.amazonaws.com"

    # add check for secret key
    @field_validator("SECRET_KEY")
    @classmethod
    def check_secret_key(cls, v: str) -> str:
        if not v:
            raise ValueError("SECRET_KEY is required")
        if len(v) < 32:  # noqa: PLR2004
            raise ValueError(
                "SECRET_KEY must be at least 32 characters long, use openssl rand -hex 32"
            )
        return v

    @property
    def CORS_ORIGINS_LIST(self) -> list[str]:
        """Return CORS origins as a clean list, parsed from comma-separated env."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()  # type: ignore
