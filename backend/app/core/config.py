"""Centralized application settings using Pydantic Settings."""

from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration settings."""

    # Project metadata
    APP_NAME: str = "AI Lost and Found Matcher"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = "sqlite:///./lost_and_found.db"

    # Server settings (Railway injects PORT)
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # CORS settings (comma-separated list of origins)
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8081,http://localhost:19006,http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_url(cls, v: str) -> str:
        """
        Normalize database URLs for SQLAlchemy 2.x compatibility.
        Supabase provides URLs with 'postgres://' or 'postgresql://'.
        SQLAlchemy with psycopg 3 requires 'postgresql+psycopg://'.
        """
        if not v:
            return "sqlite:///./lost_and_found.db"

        url = str(v).strip()
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+psycopg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse comma-separated CORS origins into a clean list."""
        if not self.CORS_ORIGINS:
            return ["*"]
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        return origins if origins else ["*"]

    @property
    def is_sqlite(self) -> bool:
        """Check if the current database URL is SQLite."""
        return self.DATABASE_URL.startswith("sqlite")


settings = Settings()
