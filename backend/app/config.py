from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Any
import json


class Settings(BaseSettings):
    # Core
    ENVIRONMENT: str = "development"
    # Secret keys - providing defaults to prevent crash loops, 
    # but production use should ALWAYS set these via env vars.
    SECRET_KEY: str = "insecure-default-key-please-change-in-production"
    DOMAIN: str = "localhost"
    SERVER_URL: str = "http://localhost"
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"
    ENCRYPTION_SALT: str = "default-salt-change-me"

    # JWT
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:////app/data/driftlock.db"

    # CORS
    CORS_ORIGINS: str = "http://localhost,http://localhost:3000,http://localhost:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into a list at access time."""
        v = self.CORS_ORIGINS.strip()
        if not v:
            return ["http://localhost"]
        
        # Split by comma and clean
        origins = [o.strip() for o in v.split(",") if o.strip()]
        
        # Auto-add the main SERVER_URL if it's not already there
        if self.SERVER_URL and self.SERVER_URL not in origins:
            origins.append(self.SERVER_URL)
            
        return list(set(origins))

    # Rate Limiting
    UPDATE_RATE_LIMIT: str = "60/minute"
    LOGIN_RATE_LIMIT: str = "5/minute"

    # Agent
    AGENT_VERSION: str = "1.0.0"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
