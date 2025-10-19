from pydantic_settings import BaseSettings
from typing import Optional

#The configuration file - all important settings in one place.
class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite:///./notes.db"
    
    # Security
    SECRET_KEY: str = "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"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours (24 * 60 minutes)
    
    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    
    # CORS - Allow all origins for development
    ALLOWED_ORIGINS: list = ["*"]
    
    class Config:
        env_file = ".env"

settings = Settings()
