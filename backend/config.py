from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./smartstock.db"
    SECRET_KEY: str = "dev-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    GMAIL_USER: Optional[str] = None
    GMAIL_APP_PASSWORD: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    APP_NAME: str = "SmartStock Pro"
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
