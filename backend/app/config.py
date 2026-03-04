from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Any
import json


class Settings(BaseSettings):
    # Core
    ENVIRONMENT: str = "development"
    SECRET_KEY: str
    DOMAIN: str = "localhost"
    SERVER_URL: str = "http://localhost"

    # Admin Account
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str

    # JWT
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:////app/data/driftlock.db"

    # Encryption
    ENCRYPTION_SALT: str

    # CORS — stored as a plain string so pydantic-settings doesn't
    # attempt JSON parsing on the env var.  Use .cors_origins_list
    # everywhere you need the actual list.
    CORS_ORIGINS: str = "http://localhost,http://localhost:3000,http://localhost:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into a list at access time."""
        v = self.CORS_ORIGINS.strip()
        if not v:
            return ["http://localhost"]
        if v.startswith("["):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                pass
        return [o.strip() for o in v.split(",") if o.strip()]

    # Rate Limiting
    UPDATE_RATE_LIMIT: str = "60/minute"
    LOGIN_RATE_LIMIT: str = "5/minute"

    # Agent
    AGENT_VERSION: str = "1.0.0"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
