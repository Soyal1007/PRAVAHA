import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "PRAVAHA Core Logistics & Intelligence API"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database (PostgreSQL/PostGIS by default, SQLite fallback for dev)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./pravaha.db"
    )
    
    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "pravaha_super_secret_jwt_key_2026_ner_hackathon")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # External APIs
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")
    GOOGLE_ROUTES_API_KEY: str = os.getenv("GOOGLE_ROUTES_API_KEY", "")
    NASA_FIRMS_API_KEY: str = os.getenv("NASA_FIRMS_API_KEY", "")

    class Config:
        case_sensitive = True

settings = Settings()
