"""Application configuration."""

from pathlib import Path
from pydantic import BaseModel


class Settings(BaseModel):
    """NER-SHIELD backend configuration."""

    app_name: str = "NER-SHIELD API"
    version: str = "2.1.0"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000

    # Model settings
    model_path: str = ""  # Empty = demo mode
    model_input_size: int = 512
    model_classes: list[str] = [
        "Natural Terrain",
        "Unauthorized Construction",
        "Road Development",
        "Military Installation",
        "Agricultural Land",
        "Landslide Zone",
    ]

    # Upload settings
    upload_dir: Path = Path("/tmp/ner-shield-uploads")
    max_file_size_mb: int = 50
    max_batch_size: int = 50
    allowed_extensions: set[str] = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp"}

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]


settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
