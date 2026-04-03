from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./smartstock.db"
    SECRET_KEY: str = "dev-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Resend (replaces Gmail SMTP — Railway blocks all outbound SMTP ports)
    RESEND_API_KEY: Optional[str] = None
    # "from" address — defaults to Resend shared domain (no DNS setup needed)
    # To use your own domain: verify it at resend.com/domains then set e.g. alerts@yourdomain.com
    RESEND_FROM: Optional[str] = None
    # Who receives alerts. Defaults to GMAIL_USER if set, otherwise must be set explicitly.
    ALERT_EMAIL: Optional[str] = None

    # Kept for backward compat (used as fallback recipient if ALERT_EMAIL not set)
    GMAIL_USER: Optional[str] = None
    GMAIL_APP_PASSWORD: Optional[str] = None

    GROQ_API_KEY: Optional[str] = None
    APP_NAME: str = "SmartStock Pro"
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()