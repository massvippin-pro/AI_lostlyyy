"""Centralized application settings using Pydantic Settings."""

import urllib.parse
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
        Normalize database URLs for SQLAlchemy 2.x and psycopg 3 compatibility.
        - Strips extraneous surrounding quotes and whitespace.
        - Converts 'postgres://' or 'postgresql://' to 'postgresql+psycopg://'.
        - Safely URL-encodes special characters (e.g. '@', '?', '#', ':') in credentials
          so that unencoded passwords (standard in Supabase) do not break URL parsing.
        """
        if not v:
            return "sqlite:///./lost_and_found.db"

        url = str(v).strip().strip('"').strip("'")

        # Recognize PostgreSQL schemes
        pg_schemes = ("postgres://", "postgresql://", "postgresql+psycopg://")
        matching_scheme = None
        for s in pg_schemes:
            if url.startswith(s):
                matching_scheme = s
                break

        if matching_scheme:
            rest = url[len(matching_scheme):]

            # Split path and query parameters from authority
            if "/" in rest:
                authority, path_query = rest.split("/", 1)
                path_query = "/" + path_query
            elif "?" in rest:
                authority, path_query = rest.split("?", 1)
                path_query = "?" + path_query
            else:
                authority, path_query = rest, ""

            # In authority: username:password@host:port
            # The host is always after the LAST '@' in the authority component
            if "@" in authority:
                userinfo, hostinfo = authority.rsplit("@", 1)
                if ":" in userinfo:
                    username, password = userinfo.split(":", 1)
                    # Unquote first to prevent double-encoding % if already encoded, then quote
                    encoded_password = urllib.parse.quote(urllib.parse.unquote(password), safe="")
                    encoded_username = urllib.parse.quote(urllib.parse.unquote(username), safe="")
                    authority = f"{encoded_username}:{encoded_password}@{hostinfo}"

            return f"postgresql+psycopg://{authority}{path_query}"

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
