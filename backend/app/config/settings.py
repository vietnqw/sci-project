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

    @property
    def DEVELOPMENT_MODE(self) -> bool:
        """Derive development mode from environment."""
        return self.ENVIRONMENT == "local"

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

    # add check for secret key
    @field_validator("SECRET_KEY")
    @classmethod
    def check_secret_key(cls, v: str) -> str:
        if not v:
            raise ValueError("SECRET_KEY is required")
        if len(v) != 32:    # noqa: PLR2004
            raise ValueError("SECRET_KEY must be 32 characters long, use openssl rand -hex 32")
        return v


settings = Settings()  # type: ignore
