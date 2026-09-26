"""Analysis endpoints: single, before-after, and batch."""

from __future__ import annotations

from fastapi import APIRouter, UploadFile, File, HTTPException
from inference import inference_engine
from config import settings

router = APIRouter(prefix="/analyze", tags=["Analysis"])


def _validate_file(upload: UploadFile) -> None:
    if not upload.filename:
        raise HTTPException(400, "No filename provided")
    ext = "." + upload.filename.rsplit(".", 1)[-1].lower() if "." in upload.filename else ""
    if ext not in settings.allowed_extensions:
        raise HTTPException(
            400,
            f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(settings.allowed_extensions))}",
        )


@router.post("/single")
async def analyze_single(file: UploadFile = File(...)):
    """Analyze a single satellite image.

    Returns classification, segmentation, anomaly detection,
    and severity assessment results.
    """
    _validate_file(file)
    contents = await file.read()

    if len(contents) > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(413, f"File exceeds {settings.max_file_size_mb}MB limit")

    result = inference_engine.predict_single(contents, file.filename or "unknown.tif")
    return result


@router.post("/before-after")
async def analyze_before_after(
    before: UploadFile = File(...),
    after: UploadFile = File(...),
):
    """Compare before/after satellite image pair for change detection.

    Returns change map, changed regions, area statistics,
    and severity per region.
    """
    _validate_file(before)
    _validate_file(after)

    before_data = await before.read()
    after_data = await after.read()

    result = inference_engine.predict_change(before_data, after_data)
    return result


@router.post("/batch")
async def analyze_batch(files: list[UploadFile] = File(...)):
    """Batch-analyze multiple satellite images.

    Accepts up to 50 images and returns per-image results.
    """
    if len(files) > settings.max_batch_size:
        raise HTTPException(
            400,
            f"Batch size {len(files)} exceeds maximum of {settings.max_batch_size}",
        )

    images: list[tuple[bytes, str]] = []
    for f in files:
        _validate_file(f)
        data = await f.read()
        images.append((data, f.filename or "unknown.tif"))

    results = inference_engine.predict_batch(images)
    return results
