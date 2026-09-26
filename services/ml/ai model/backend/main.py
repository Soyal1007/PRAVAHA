"""NER-SHIELD FastAPI application.

AI-powered satellite image analysis backend for
North-East Region border security monitoring.
"""

from __future__ import annotations

import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from inference import inference_engine
from routers import analysis

# ── Logging ──────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger("ner-shield")

# ── Lifespan ─────────────────────────────────────────────────────────
START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("Starting %s v%s", settings.app_name, settings.version)
    loaded = inference_engine.load_model()
    logger.info(
        "Real analysis engine ready (OpenCV + NumPy). Demo mode: %s",
        inference_engine.demo_mode,
    )
    yield


# ── App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=(
        "AI-powered satellite image analysis API for monitoring "
        "India's North-Eastern Region borders. Provides change detection "
        "between before/after satellite image pairs."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ──────────────────────────────────────────────────────────
app.include_router(analysis.router, prefix="/api/v1")


# ── Root-level endpoints ─────────────────────────────────────────────
@app.get("/api/v1/health", tags=["System"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "demo_mode": inference_engine.demo_mode,
        "version": settings.version,
        "model_loaded": inference_engine.model_loaded,
        "uptime_seconds": round(time.time() - START_TIME, 2),
    }


# ── Main ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
