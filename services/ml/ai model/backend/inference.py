"""Real image analysis engine for NER-SHIELD.

Uses OpenCV + NumPy for genuine pixel-level analysis.
No trained model required — works with any image pair and produces
results that genuinely vary based on the actual image content.
"""

from __future__ import annotations

import base64
import io
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any

import cv2
import numpy as np
from PIL import Image

from config import settings

logger = logging.getLogger(__name__)

# ── Color ranges (HSV) for land-cover classification ──────────────
# Each entry: (class_name, lower_hsv, upper_hsv, display_color)
LAND_COVER_CLASSES = [
    ("vegetation",        np.array([25, 30, 30]),   np.array([90, 255, 255]),  "#10B981"),
    ("water",             np.array([90, 40, 30]),   np.array([130, 255, 255]), "#3B82F6"),
    ("bare_soil",         np.array([8, 30, 50]),    np.array([25, 200, 200]),  "#D97706"),
    ("built_up",          np.array([0, 0, 80]),     np.array([180, 30, 200]),  "#6366F1"),
    ("road_surface",      np.array([0, 0, 60]),     np.array([180, 25, 160]),  "#94A3B8"),
    ("snow_cloud",        np.array([0, 0, 200]),    np.array([180, 30, 255]),  "#E2E8F0"),
]

DISASTER_CLASSES = [
    "normal", "landslide", "flood", "road_damage",
    "infrastructure_damage", "vegetation_loss",
]

CLASS_COLORS = {
    "normal": "#10B981",
    "landslide": "#F59E0B",
    "flood": "#3B82F6",
    "road_damage": "#6366F1",
    "infrastructure_damage": "#F43F5E",
    "vegetation_loss": "#84CC16",
}


def _bytes_to_cv2(data: bytes) -> np.ndarray:
    """Convert raw image bytes to an OpenCV BGR image."""
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")
    return img


def _resize_match(img: np.ndarray, target_h: int, target_w: int) -> np.ndarray:
    """Resize image to match target dimensions."""
    if img.shape[:2] != (target_h, target_w):
        img = cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_AREA)
    return img


def _cv2_to_data_url(img: np.ndarray) -> str:
    """Encode a BGR image as a base64 data URL (PNG)."""
    _, buf = cv2.imencode(".png", img)
    b64 = base64.b64encode(buf.tobytes()).decode()
    return f"data:image/png;base64,{b64}"


# ── Single-Image Analysis ─────────────────────────────────────────

def _classify_image(hsv: np.ndarray, bgr: np.ndarray) -> dict[str, Any]:
    """Classify image content based on color distribution."""
    total_pixels = hsv.shape[0] * hsv.shape[1]

    # Compute land-cover percentages
    cover: dict[str, float] = {}
    for name, lo, hi, _ in LAND_COVER_CLASSES:
        mask = cv2.inRange(hsv, lo, hi)
        cover[name] = float(np.count_nonzero(mask)) / total_pixels

    # Classify disaster type by heuristics
    probabilities: dict[str, float] = {}

    # Brown/tan dominance → landslide
    brown_mask = cv2.inRange(hsv, np.array([8, 40, 50]), np.array([25, 200, 220]))
    brown_pct = np.count_nonzero(brown_mask) / total_pixels

    # Blue dominance → flood
    blue_pct = cover.get("water", 0)

    # Grey dominance + fragmented → road damage
    grey_mask = cv2.inRange(hsv, np.array([0, 0, 50]), np.array([180, 40, 170]))
    grey_pct = np.count_nonzero(grey_mask) / total_pixels

    # Texture roughness (edge density) for infrastructure damage
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    edge_density = np.count_nonzero(edges) / total_pixels

    # Green loss
    green_pct = cover.get("vegetation", 0)

    # Compute scores
    probabilities["landslide"] = min(0.95, brown_pct * 2.5 + edge_density * 0.3)
    probabilities["flood"] = min(0.95, blue_pct * 2.8)
    probabilities["road_damage"] = min(0.95, grey_pct * 1.2 + edge_density * 0.8)
    probabilities["infrastructure_damage"] = min(0.95, edge_density * 3.0 + (1 - green_pct) * 0.2)
    probabilities["vegetation_loss"] = min(0.95, max(0, (0.6 - green_pct)) * 2.5)
    probabilities["normal"] = min(0.95, green_pct * 1.5 + (1 - edge_density) * 0.3)

    # Normalize to sum ≈ 1
    total = sum(probabilities.values())
    if total > 0:
        probabilities = {k: round(v / total, 4) for k, v in probabilities.items()}

    predicted = max(probabilities, key=probabilities.get)  # type: ignore[arg-type]
    confidence = probabilities[predicted]

    return {
        "predictedClass": predicted,
        "confidence": round(confidence, 4),
        "probabilities": [
            {"className": cls, "probability": round(probabilities.get(cls, 0), 4), "color": CLASS_COLORS[cls]}
            for cls in DISASTER_CLASSES
        ],
    }


def _segment_image(hsv: np.ndarray, bgr: np.ndarray) -> dict[str, Any]:
    """Produce pixel-level segmentation based on color ranges."""
    h, w = hsv.shape[:2]
    total = h * w
    mask_overlay = np.zeros((h, w, 3), dtype=np.uint8)
    classes_found = []

    for name, lo, hi, color in LAND_COVER_CLASSES:
        mask = cv2.inRange(hsv, lo, hi)
        px_count = int(np.count_nonzero(mask))
        if px_count < total * 0.005:
            continue
        # Color the overlay
        hex_color = color.lstrip("#")
        r, g, b = int(hex_color[:2], 16), int(hex_color[2:4], 16), int(hex_color[4:], 16)
        mask_overlay[mask > 0] = [b, g, r]  # BGR
        classes_found.append({
            "name": name,
            "percentage": round(px_count / total * 100, 2),
            "color": color,
            "pixelCount": px_count,
        })

    # Sort by percentage descending
    classes_found.sort(key=lambda x: x["percentage"], reverse=True)

    # Blend overlay with original
    blended = cv2.addWeighted(bgr, 0.5, mask_overlay, 0.5, 0)
    mask_url = _cv2_to_data_url(blended)

    return {"classes": classes_found, "maskUrl": mask_url}


def _detect_anomalies(bgr: np.ndarray) -> dict[str, Any]:
    """Detect anomalous regions via texture and color outlier analysis."""
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    # Compute local standard deviation as anomaly proxy
    blur = cv2.GaussianBlur(gray, (21, 21), 0)
    diff = cv2.absdiff(gray, blur)
    _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)

    # Morphological cleanup
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)

    # Find contours
    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    min_area = h * w * 0.005
    regions = []
    for cnt in contours:
        x, y, cw, ch = cv2.boundingRect(cnt)
        area = cv2.contourArea(cnt)
        if area < min_area:
            continue
        region_score = min(100, int(area / (h * w) * 500))
        regions.append({
            "id": f"AR-{uuid.uuid4().hex[:6]}",
            "x": int(x), "y": int(y),
            "width": int(cw), "height": int(ch),
            "score": region_score,
            "label": "texture_anomaly",
        })

    # Overall anomaly score (0-100)
    anomaly_pixels = np.count_nonzero(cleaned)
    score = min(100, int(anomaly_pixels / (h * w) * 300))
    is_anomalous = score > 20

    # Generate heatmap
    heatmap = cv2.applyColorMap(diff * 3, cv2.COLORMAP_JET)
    blended = cv2.addWeighted(bgr, 0.55, heatmap, 0.45, 0)
    heatmap_url = _cv2_to_data_url(blended)

    return {
        "score": score,
        "heatmapUrl": heatmap_url,
        "regions": regions[:10],
        "isAnomalous": is_anomalous,
    }


def _assess_severity(classification: dict, anomaly: dict) -> dict[str, Any]:
    """Determine overall severity based on classification + anomaly."""
    predicted = classification["predictedClass"]
    confidence = classification["confidence"]
    anomaly_score = anomaly["score"]

    # Base severity from class
    class_severity = {
        "normal": 0, "vegetation_loss": 25, "road_damage": 50,
        "flood": 65, "landslide": 75, "infrastructure_damage": 80,
    }
    base = class_severity.get(predicted, 30)
    combined = int(base * 0.6 + anomaly_score * 0.4)
    combined = min(100, int(combined * (0.5 + confidence)))

    if combined >= 75:
        level = "critical"
    elif combined >= 50:
        level = "high"
    elif combined >= 25:
        level = "medium"
    else:
        level = "low"

    recommendations_map = {
        "critical": [
            "Immediate field team deployment recommended",
            "Activate emergency response protocol",
            "Notify NDRF and state disaster management authority",
        ],
        "high": [
            "Schedule priority field inspection within 24 hours",
            "Monitor area with increased satellite revisit frequency",
            "Alert district administration",
        ],
        "medium": [
            "Flag for routine inspection within 1 week",
            "Continue satellite monitoring at current frequency",
        ],
        "low": [
            "No immediate action required",
            "Include in next scheduled review cycle",
        ],
    }

    risk_factors = []
    if predicted != "normal":
        risk_factors.append(f"{predicted.replace('_', ' ').title()} detected ({confidence:.0%} confidence)")
    if anomaly_score > 30:
        risk_factors.append(f"Elevated anomaly score: {anomaly_score}/100")
    if len(anomaly["regions"]) > 3:
        risk_factors.append(f"{len(anomaly['regions'])} anomalous regions identified")

    return {
        "level": level,
        "score": combined,
        "recommendations": recommendations_map[level],
        "riskFactors": risk_factors,
    }


# ── NDVI Approximation (Excess Green Index from RGB) ─────────────

def _compute_ndvi_approx(bgr: np.ndarray) -> dict[str, Any]:
    """Approximate NDVI from RGB using Excess Green Index (ExG).

    Real NDVI requires a near-infrared band.  From standard RGB imagery
    we compute ExG = 2·Gn − Rn − Bn (normalised channels).
    Positive values correlate with healthy vegetation.
    """
    b = bgr[:, :, 0].astype(np.float32)
    g = bgr[:, :, 1].astype(np.float32)
    r = bgr[:, :, 2].astype(np.float32)
    total = r + g + b + 1e-6

    rn, gn, bn = r / total, g / total, b / total
    exg = 2.0 * gn - rn - bn  # roughly −1 … +1

    # Map to 0-1 for visualisation
    exg_01 = np.clip((exg + 1.0) / 2.0, 0, 1)

    # Build green-to-red overlay
    vis = np.zeros_like(bgr)
    vis[:, :, 1] = (exg_01 * 255).astype(np.uint8)          # G high → healthy
    vis[:, :, 2] = ((1.0 - exg_01) * 255).astype(np.uint8)  # R high → stressed
    vis[:, :, 0] = 30                                         # slight blue base

    blended = cv2.addWeighted(bgr, 0.35, vis, 0.65, 0)

    h_img, w_img = bgr.shape[:2]
    total_px = h_img * w_img
    healthy   = np.count_nonzero(exg > 0.10)
    stressed  = np.count_nonzero(exg <= -0.05)

    return {
        "ndviMap":        _cv2_to_data_url(blended),
        "vegetationPct":  round(healthy / total_px * 100, 1),
        "stressedPct":    round(stressed / total_px * 100, 1),
        "healthScore":    round(float(np.mean(exg_01)) * 100, 1),
    }


# ── Risk Severity Heatmap ────────────────────────────────────────

def _generate_risk_heatmap(
    change_mask: np.ndarray,
    regions: list[dict],
    h: int, w: int,
    after_bgr: np.ndarray,
) -> str:
    """Build a colour-coded risk heatmap weighted by region severity."""
    risk = np.zeros((h, w), dtype=np.float32)
    sev_w = {"low": 0.30, "medium": 0.55, "high": 0.80, "critical": 1.0}

    for region in regions:
        c = region["coordinates"]
        wt = sev_w.get(region["severity"], 0.5)
        cx = c["x"] + c["width"] // 2
        cy = c["y"] + c["height"] // 2
        radius = max(c["width"], c["height"])
        layer = np.zeros((h, w), dtype=np.float32)
        cv2.circle(layer, (cx, cy), radius, float(wt), -1)
        sigma = max(radius * 0.6, 1)
        layer = cv2.GaussianBlur(layer, (0, 0), sigmaX=sigma)
        risk = np.maximum(risk, layer)

    # Include change mask at lower weight
    risk = np.maximum(risk, change_mask.astype(np.float32) / 255 * 0.4)

    mx = risk.max()
    if mx > 0:
        risk_u8 = (risk / mx * 255).astype(np.uint8)
    else:
        risk_u8 = np.zeros((h, w), dtype=np.uint8)

    heatmap = cv2.applyColorMap(risk_u8, cv2.COLORMAP_JET)
    alpha = np.clip(risk_u8.astype(np.float32) / 255 * 0.7, 0, 0.7)
    a3 = np.stack([alpha] * 3, axis=-1)
    blended = (
        after_bgr.astype(np.float32) * (1 - a3)
        + heatmap.astype(np.float32) * a3
    ).astype(np.uint8)

    return _cv2_to_data_url(blended)


# ── RGB Histogram ────────────────────────────────────────────────

def _compute_histogram(bgr: np.ndarray) -> dict[str, list[int]]:
    """Return 64-bin histogram per R/G/B channel."""
    out: dict[str, list[int]] = {}
    for i, ch in enumerate(("b", "g", "r")):
        hist = cv2.calcHist([bgr], [i], None, [64], [0, 256]).flatten()
        out[ch] = [int(v) for v in hist]
    return out


# ── Land-Cover Breakdown ─────────────────────────────────────────

def _land_cover_breakdown(hsv: np.ndarray) -> list[dict[str, Any]]:
    """Return percentage of each land-cover class in the image."""
    h, w = hsv.shape[:2]
    total = h * w
    out = []
    for name, lo, hi, color in LAND_COVER_CLASSES:
        mask = cv2.inRange(hsv, lo, hi)
        pct = round(np.count_nonzero(mask) / total * 100, 2)
        if pct >= 0.5:
            out.append({"name": name, "percentage": pct, "color": color})
    out.sort(key=lambda x: x["percentage"], reverse=True)
    return out


# ── Before / After Change Detection ──────────────────────────────

def _analyze_changes(before_bgr: np.ndarray, after_bgr: np.ndarray) -> dict[str, Any]:
    """Real pixel-level change detection between two images."""
    t0 = time.perf_counter()

    h, w = before_bgr.shape[:2]
    after_bgr = _resize_match(after_bgr, h, w)
    total_pixels = h * w

    # Compute absolute difference
    diff = cv2.absdiff(before_bgr, after_bgr)
    diff_gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)

    # Adaptive threshold to find changed regions
    _, change_mask = cv2.threshold(diff_gray, 30, 255, cv2.THRESH_BINARY)

    # Morphological cleanup
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    change_mask = cv2.morphologyEx(change_mask, cv2.MORPH_CLOSE, kernel)
    change_mask = cv2.morphologyEx(change_mask, cv2.MORPH_OPEN, kernel)

    changed_pixels = int(np.count_nonzero(change_mask))
    change_pct = round(changed_pixels / total_pixels * 100, 2)

    # Find contiguous change regions
    contours, _ = cv2.findContours(change_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    min_area = total_pixels * 0.003

    # Classify each region by multi-signal analysis
    before_hsv = cv2.cvtColor(before_bgr, cv2.COLOR_BGR2HSV)
    after_hsv = cv2.cvtColor(after_bgr, cv2.COLOR_BGR2HSV)

    # Pre-compute grayscale edge maps for texture analysis
    before_gray = cv2.cvtColor(before_bgr, cv2.COLOR_BGR2GRAY)
    after_gray = cv2.cvtColor(after_bgr, cv2.COLOR_BGR2GRAY)
    before_edges = cv2.Canny(before_gray, 50, 150)
    after_edges = cv2.Canny(after_gray, 50, 150)

    # Pre-compute ExG (NDVI proxy) for both images
    def _exg(bgr: np.ndarray) -> np.ndarray:
        b = bgr[:, :, 0].astype(np.float32)
        g = bgr[:, :, 1].astype(np.float32)
        r = bgr[:, :, 2].astype(np.float32)
        tot = r + g + b + 1e-6
        return 2.0 * (g / tot) - (r / tot) - (b / tot)

    before_exg = _exg(before_bgr)
    after_exg = _exg(after_bgr)

    regions = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area:
            continue
        x, y, cw, ch = cv2.boundingRect(cnt)

        # Build region mask
        region_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.drawContours(region_mask, [cnt], -1, 255, -1)
        mask_bool = region_mask > 0

        # HSV means
        before_hue = float(np.mean(before_hsv[:, :, 0][mask_bool]))
        after_hue = float(np.mean(after_hsv[:, :, 0][mask_bool]))
        before_sat = float(np.mean(before_hsv[:, :, 1][mask_bool]))
        after_sat = float(np.mean(after_hsv[:, :, 1][mask_bool]))
        before_val = float(np.mean(before_hsv[:, :, 2][mask_bool]))
        after_val = float(np.mean(after_hsv[:, :, 2][mask_bool]))

        # Edge density per region (texture roughness proxy)
        region_px = max(1, int(np.count_nonzero(mask_bool)))
        edge_before = float(np.count_nonzero(before_edges[mask_bool])) / region_px
        edge_after = float(np.count_nonzero(after_edges[mask_bool])) / region_px

        # NDVI (ExG) means per region
        ndvi_b = float(np.mean(before_exg[mask_bool]))
        ndvi_a = float(np.mean(after_exg[mask_bool]))

        # Hue standard deviation in after image (uniformity check)
        hue_std_a = float(np.std(after_hsv[:, :, 0][mask_bool]))

        # Classify change type using all signals
        change_type, description, severity = _classify_change(
            before_hue, after_hue, before_sat, after_sat,
            before_val, after_val, area, total_pixels,
            edge_density_before=edge_before,
            edge_density_after=edge_after,
            ndvi_before=ndvi_b,
            ndvi_after=ndvi_a,
            hue_std_after=hue_std_a,
        )

        # Area in approximate sq meters (assuming ~1m/pixel for satellite)
        area_sqm = round(area * 1.0, 1)

        regions.append({
            "id": f"CR-{uuid.uuid4().hex[:6]}",
            "type": change_type,
            "area": area_sqm,
            "severity": severity,
            "coordinates": {"x": int(x), "y": int(y), "width": int(cw), "height": int(ch)},
            "description": description,
        })

    # Sort by area descending
    regions.sort(key=lambda r: r["area"], reverse=True)
    regions = regions[:15]

    # Generate change map overlay
    change_vis = after_bgr.copy()
    # Red overlay on changed pixels
    red_overlay = np.zeros_like(change_vis)
    red_overlay[:, :] = [0, 0, 255]  # BGR red
    mask_3ch = cv2.merge([change_mask, change_mask, change_mask])
    change_vis = np.where(mask_3ch > 0,
                          cv2.addWeighted(change_vis, 0.5, red_overlay, 0.5, 0),
                          change_vis)
    # Draw bounding boxes
    for region in regions:
        c = region["coordinates"]
        color = (0, 255, 0) if region["severity"] == "low" else \
                (0, 200, 255) if region["severity"] == "medium" else \
                (0, 100, 255) if region["severity"] == "high" else (0, 0, 255)
        cv2.rectangle(change_vis, (c["x"], c["y"]),
                      (c["x"] + c["width"], c["y"] + c["height"]), color, 2)

    change_map_url = _cv2_to_data_url(change_vis)

    total_changed_area = sum(r["area"] for r in regions)

    # ── Classify the overall disaster event ──────────────────────
    event = _classify_event(regions, change_pct)

    # ── NDVI (vegetation health) maps ────────────────────────────
    ndvi_before = _compute_ndvi_approx(before_bgr)
    ndvi_after  = _compute_ndvi_approx(after_bgr)

    # ── Risk severity heatmap ────────────────────────────────────
    risk_heatmap_url = _generate_risk_heatmap(
        change_mask, regions, h, w, after_bgr,
    )

    # ── RGB histograms ───────────────────────────────────────────
    hist_before = _compute_histogram(before_bgr)
    hist_after  = _compute_histogram(after_bgr)

    # ── Land-cover breakdown ─────────────────────────────────────
    before_hsv_full = cv2.cvtColor(before_bgr, cv2.COLOR_BGR2HSV)
    after_hsv_full  = cv2.cvtColor(after_bgr, cv2.COLOR_BGR2HSV)
    land_cover_before = _land_cover_breakdown(before_hsv_full)
    land_cover_after  = _land_cover_breakdown(after_hsv_full)

    elapsed_ms = round((time.perf_counter() - t0) * 1000)

    return {
        "id": f"CD-{uuid.uuid4().hex[:8]}",
        "beforeImage": _cv2_to_data_url(before_bgr),
        "afterImage": _cv2_to_data_url(after_bgr),
        "changeMap": change_map_url,
        "totalChangedArea": round(total_changed_area, 1),
        "changePercentage": change_pct,
        "regions": regions,
        "event": event,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        # ── New realism fields ───────────────────────────────────
        "ndviBefore": ndvi_before,
        "ndviAfter": ndvi_after,
        "riskHeatmap": risk_heatmap_url,
        "histogramBefore": hist_before,
        "histogramAfter": hist_after,
        "landCoverBefore": land_cover_before,
        "landCoverAfter": land_cover_after,
        "metadata": {
            "imageWidth": w,
            "imageHeight": h,
            "totalPixels": total_pixels,
            "analysisTimeMs": elapsed_ms,
            "engine": "OpenCV + NumPy pixel-level analysis",
            "version": "2.0.0",
        },
    }


def _classify_change(
    bh: float, ah: float, bs: float, as_: float,
    bv: float, av: float, area: float, total: float,
    *,
    edge_density_before: float = 0.0,
    edge_density_after: float = 0.0,
    ndvi_before: float = 0.0,
    ndvi_after: float = 0.0,
    hue_std_after: float = 0.0,
) -> tuple[str, str, str]:
    """Classify a changed region using multi-signal weighted scoring.

    Uses HSV shifts, NDVI delta, edge/texture density, hue uniformity,
    and area context to produce a weighted score across all disaster
    categories.  The highest-scoring category wins.

    Signals used:
    - HSV channel shifts (hue, saturation, value)
    - NDVI (vegetation health) change
    - Edge density change (proxy for texture roughness / debris)
    - Hue standard deviation (uniformity vs chaotic debris)
    - Area fraction of total image
    - Before/after color-range membership (green, water, brown, grey)
    """
    hue_shift = ah - bh
    sat_shift = as_ - bs
    val_shift = av - bv
    area_pct = area / total * 100
    ndvi_delta = ndvi_after - ndvi_before
    edge_delta = edge_density_after - edge_density_before

    # ── Severity from area ──────────────────────────────────────
    if area_pct > 5:
        severity = "critical"
    elif area_pct > 2:
        severity = "high"
    elif area_pct > 0.5:
        severity = "medium"
    else:
        severity = "low"

    # ── Boolean colour-range helpers ────────────────────────────
    before_is_green = 25 <= bh <= 85 and bs > 25
    before_is_water = 90 <= bh <= 130 and bs > 35
    before_is_brown = 8 <= bh < 25
    before_is_grey  = bs < 40

    after_is_green  = 25 <= ah <= 85 and as_ > 25
    after_is_water  = 90 <= ah <= 130 and as_ > 35
    after_is_brown  = 8 <= ah < 25
    after_is_grey   = as_ < 40
    after_is_dark   = av < 80

    # ── Weighted scoring across all categories ──────────────────
    scores: dict[str, float] = {
        "Flood / Water Incursion": 0.0,
        "Landslide": 0.0,
        "Vegetation Loss": 0.0,
        "Water Recession": 0.0,
        "Road / Infrastructure Damage": 0.0,
        "New Construction / Clearing": 0.0,
        "Structural Collapse / Shadow": 0.0,
        "Storm / Cyclone Damage": 0.0,
        "Surface Change": 0.05,  # tiny baseline — fallback
    }

    # ── 1) FLOOD scoring ────────────────────────────────────────
    # Non-water → water transition is the primary flood signal
    if not before_is_water and after_is_water:
        scores["Flood / Water Incursion"] += 4.0
    # Hue moving into blue range (90-130) even if not fully "water"
    if ah > 85 and ah < 135 and as_ > 30 and bh < 85:
        scores["Flood / Water Incursion"] += 2.0
    # Saturation increase (muddy water is more saturated than dry ground)
    if sat_shift > 10 and ah > 80:
        scores["Flood / Water Incursion"] += 0.5
    # Green land → water (vegetation submerged)
    if before_is_green and after_is_water:
        scores["Flood / Water Incursion"] += 2.0
    # Large area coverage boosts flood likelihood
    if area_pct > 3:
        scores["Flood / Water Incursion"] += 0.5

    # ── 2) LANDSLIDE scoring ────────────────────────────────────
    # KEY INSIGHT: Landslides = vegetation → debris with HIGH texture
    # change + significant darkening + chaotic hue variance.
    # Drought = vegetation → brown but SMOOTH, LOW texture, uniform hue.
    if before_is_green and after_is_brown:
        scores["Landslide"] += 2.0
    # Significant darkening (debris covers sunlit vegetation)
    if val_shift < -30 and before_is_green:
        scores["Landslide"] += 1.5
    # High edge density increase → chaotic debris texture
    if edge_delta > 0.03:
        scores["Landslide"] += 2.0
    elif edge_delta > 0.01:
        scores["Landslide"] += 1.0
    # High hue variance in after image → mixed debris/soil
    if hue_std_after > 25:
        scores["Landslide"] += 1.0
    # Moderate area (landslides aren't usually >15% of frame)
    if 0.5 < area_pct < 15:
        scores["Landslide"] += 0.3
    # CRITICAL: If texture is smooth (low edge change), this is
    # drought/deforestation, NOT a landslide — penalize heavily
    if edge_delta < 0.005 and before_is_green and after_is_brown:
        scores["Landslide"] -= 1.5

    # ── 3) VEGETATION LOSS (deforestation / drought browning) ───
    # Green → brown/yellow with SMOOTH texture (no debris)
    if before_is_green and (after_is_brown or (not after_is_green and not after_is_water)):
        scores["Vegetation Loss"] += 2.0
    # NDVI dropped significantly
    if ndvi_delta < -0.10:
        scores["Vegetation Loss"] += 1.5
    elif ndvi_delta < -0.05:
        scores["Vegetation Loss"] += 0.8
    # LOW edge change = smooth browning (drought / clearing), not debris
    # Only apply when vegetation actually transitioned away
    if edge_delta < 0.01 and before_is_green and not after_is_green:
        scores["Vegetation Loss"] += 1.5
    # Moderate darkening (dried vegetation is slightly darker)
    if -30 < val_shift < 0 and before_is_green and not after_is_green:
        scores["Vegetation Loss"] += 0.5
    # Gradual saturation drop (drying out)
    if sat_shift < -10 and before_is_green and not after_is_green:
        scores["Vegetation Loss"] += 0.5
    # Low hue variance → uniform browning (drought pattern)
    if hue_std_after < 15 and after_is_brown:
        scores["Vegetation Loss"] += 1.0

    # ── 4) WATER RECESSION (drought) ────────────────────────────
    # Water → non-water is the definitive signal
    if before_is_water and not after_is_water:
        scores["Water Recession"] += 4.0
    # Hue moving out of blue range
    if bh > 85 and bh < 135 and bs > 30 and ah < 85:
        scores["Water Recession"] += 2.0
    # Exposed ground is often brighter than water
    if val_shift > 10 and before_is_water:
        scores["Water Recession"] += 0.5
    # After image is brown/tan (exposed lakebed)
    if before_is_water and after_is_brown:
        scores["Water Recession"] += 1.0

    # ── 5) ROAD / INFRASTRUCTURE DAMAGE ─────────────────────────
    # Grey → grey with large brightness change
    if before_is_grey and as_ < 50 and abs(val_shift) > 25:
        scores["Road / Infrastructure Damage"] += 2.5
    # Low-saturation surfaces with texture disruption
    if bs < 50 and as_ < 50 and edge_delta > 0.02:
        scores["Road / Infrastructure Damage"] += 1.5
    # Brown/grey before, darker + rougher after
    if (before_is_grey or before_is_brown) and val_shift < -20 and edge_delta > 0.01:
        scores["Road / Infrastructure Damage"] += 1.0

    # ── 6) STORM / CYCLONE DAMAGE ───────────────────────────────
    # Widespread darkening + desaturation across large area
    if val_shift < -25 and sat_shift < -15 and area_pct > 2:
        scores["Storm / Cyclone Damage"] += 2.5
    # Green vegetation damaged by wind (green → dark/grey)
    if before_is_green and after_is_dark and after_is_grey:
        scores["Storm / Cyclone Damage"] += 2.0
    # High edge increase (debris scatter from wind damage)
    if edge_delta > 0.02 and val_shift < -15:
        scores["Storm / Cyclone Damage"] += 1.0
    # Very large affected area (cyclones hit broad areas)
    if area_pct > 8:
        scores["Storm / Cyclone Damage"] += 0.5

    # ── 7) NEW CONSTRUCTION / CLEARING ──────────────────────────
    if val_shift > 35 and sat_shift < 0:
        scores["New Construction / Clearing"] += 2.5
    if before_is_green and after_is_grey and val_shift > 20:
        scores["New Construction / Clearing"] += 2.0
    # Brightening + desaturation = concrete / cleared land
    if val_shift > 20 and as_ < 40:
        scores["New Construction / Clearing"] += 1.0

    # ── 8) STRUCTURAL COLLAPSE / SHADOW ─────────────────────────
    if val_shift < -50 and not before_is_green:
        scores["Structural Collapse / Shadow"] += 3.0
    if val_shift < -40 and edge_delta > 0.02:
        scores["Structural Collapse / Shadow"] += 1.5
    if before_is_grey and val_shift < -35:
        scores["Structural Collapse / Shadow"] += 1.5
    # Extreme darkening (>60 units) is more collapse than road damage
    if val_shift < -60:
        scores["Structural Collapse / Shadow"] += 1.0

    # ── Pick winner ─────────────────────────────────────────────
    best_type = max(scores, key=scores.get)  # type: ignore[arg-type]
    best_score = scores[best_type]

    # If best score is too low, fall back to Surface Change
    if best_score < 0.5:
        best_type = "Surface Change"

    # ── Build description ───────────────────────────────────────
    DESC_TEMPLATES: dict[str, str] = {
        "Flood / Water Incursion": (
            f"Area transitioned to water. After-hue {ah:.0f}° indicates "
            f"water body. Covers {area_pct:.1f}% of image."
        ),
        "Landslide": (
            f"Green vegetation replaced by exposed soil/debris with "
            f"high texture roughness (edge Δ={edge_delta:+.3f}). "
            f"Hue shifted {hue_shift:+.0f}°, area covers {area_pct:.1f}%."
        ),
        "Vegetation Loss": (
            f"Vegetation cover reduced (NDVI Δ={ndvi_delta:+.2f}). "
            f"Smooth transition with low debris signature. "
            f"Saturation dropped {sat_shift:.0f} across {area_pct:.1f}%."
        ),
        "Water Recession": (
            f"Water body receded revealing ground. "
            f"Hue shifted from {bh:.0f}° to {ah:.0f}°. Covers {area_pct:.1f}%."
        ),
        "Road / Infrastructure Damage": (
            f"Surface brightness changed by {val_shift:+.0f} units "
            f"suggesting structural disruption across {area_pct:.1f}%."
        ),
        "Storm / Cyclone Damage": (
            f"Widespread darkening ({val_shift:+.0f}) and desaturation "
            f"({sat_shift:+.0f}) across {area_pct:.1f}%. "
            f"Consistent with wind/storm damage pattern."
        ),
        "New Construction / Clearing": (
            f"Significant brightening ({val_shift:+.0f} value units) with "
            f"desaturation. Possible land clearing or new structures "
            f"across {area_pct:.1f}%."
        ),
        "Structural Collapse / Shadow": (
            f"Darkening of {val_shift:+.0f} value units across "
            f"{area_pct:.1f}% may indicate collapse or new shadow."
        ),
        "Surface Change": (
            f"Color shift detected (ΔH={hue_shift:+.0f}°, "
            f"ΔS={sat_shift:+.0f}, ΔV={val_shift:+.0f}). "
            f"Area: {area_pct:.1f}%."
        ),
    }

    description = DESC_TEMPLATES.get(best_type, DESC_TEMPLATES["Surface Change"])
    return best_type, description, severity


# ── Event Classification (aggregate disaster detection) ──────────

def _classify_event(regions: list[dict], change_pct: float) -> dict[str, Any]:
    """Aggregate region-level changes into an overall disaster event type.

    Looks at all detected change regions, tallies area by category, and
    determines the dominant disaster event — flood, landslide, road blockage,
    deforestation, etc.  Returns a structured verdict with confidence,
    severity, description, actionable recommendations and evidence lines.
    """

    # ── No significant change ────────────────────────────────────
    if not regions or change_pct < 0.5:
        return {
            "type": "No Significant Change",
            "icon": "check_circle",
            "confidence": round(min(0.95, (1 - change_pct / 100) * 1.2), 4),
            "severity": "low",
            "description": (
                "No significant environmental changes detected between "
                "the two images."
            ),
            "recommendations": [
                "No immediate action required",
                "Continue routine satellite monitoring schedule",
            ],
            "evidence": [],
        }

    # ── Map region-level types → event categories ────────────────
    EVENT_MAP: dict[str, str] = {
        "Flood / Water Incursion": "flood",
        "Landslide":              "landslide",
        "Vegetation Loss":        "deforestation",
        "Road / Infrastructure Damage": "road_blockage",
        "Water Recession":        "drought",
        "New Construction / Clearing": "urban_development",
        "Structural Collapse / Shadow": "infrastructure_damage",
        "Storm / Cyclone Damage":  "storm_cyclone",
        "Surface Change":         "surface_change",
    }

    category_area:    dict[str, float] = {}
    category_regions: dict[str, list]  = {}

    for region in regions:
        cat = EVENT_MAP.get(region["type"], "surface_change")
        category_area[cat] = category_area.get(cat, 0) + region["area"]
        category_regions.setdefault(cat, []).append(region)

    # Dominant event = largest total area
    dominant   = max(category_area, key=category_area.get)  # type: ignore[arg-type]
    dom_area   = category_area[dominant]
    total_area = sum(category_area.values())
    dominance  = dom_area / total_area if total_area > 0 else 0

    confidence = min(0.95, dominance * 0.7 + min(change_pct / 30, 0.3))

    # ── Per-event details ────────────────────────────────────────
    DETAILS: dict[str, dict[str, Any]] = {
        "flood": {
            "type": "Flood Detected",
            "icon": "flood",
            "severity_boost": 1.3,
            "description": (
                f"Water incursion detected across {dom_area:.0f} sq m "
                f"({dominance * 100:.0f}% of changed area). "
                "Indicates potential flooding event."
            ),
            "recommendations": [
                "Alert NDRF (National Disaster Response Force) immediately",
                "Issue flood warning to downstream settlements",
                "Deploy rescue boats and evacuation teams",
                "Monitor water level rise with hourly satellite revisits",
                "Activate emergency shelters in affected zone",
                "Coordinate with District Disaster Management Authority",
            ],
        },
        "landslide": {
            "type": "Landslide Detected",
            "icon": "landslide",
            "severity_boost": 1.4,
            "description": (
                f"Terrain displacement across {dom_area:.0f} sq m. "
                "Vegetation replaced by exposed soil/debris — "
                "indicates mass earth movement."
            ),
            "recommendations": [
                "Evacuate settlements in the debris-flow path",
                "Deploy geological survey for slope-stability assessment",
                "Block roads leading to the affected area",
                "Alert NDRF and state disaster management authority",
                "Monitor for secondary slides with repeat imagery",
                "Establish exclusion zone around unstable slopes",
            ],
        },
        "road_blockage": {
            "type": "Road Blockage / Damage Detected",
            "icon": "road_damage",
            "severity_boost": 1.1,
            "description": (
                f"Road surface disruption across {dom_area:.0f} sq m. "
                "Structural changes suggest road damage or blockage."
            ),
            "recommendations": [
                "Notify NHAI / PWD for immediate road assessment",
                "Divert traffic to alternate routes",
                "Deploy road clearance and repair teams",
                "Check for stranded vehicles or people",
                "Set up temporary signage and barriers",
            ],
        },
        "deforestation": {
            "type": "Deforestation / Vegetation Loss",
            "icon": "vegetation_loss",
            "severity_boost": 0.9,
            "description": (
                f"Vegetation cover lost across {dom_area:.0f} sq m. "
                "Green canopy replaced by bare ground."
            ),
            "recommendations": [
                "Report to Forest Department for investigation",
                "Check for illegal logging or encroachment",
                "Assess impact on wildlife habitat & water catchment",
                "Schedule ground survey for reforestation planning",
                "Monitor adjacent areas for further clearing",
            ],
        },
        "drought": {
            "type": "Drought / Water Recession",
            "icon": "drought",
            "severity_boost": 0.8,
            "description": (
                f"Water body receded across {dom_area:.0f} sq m. "
                "Previously submerged area now exposed."
            ),
            "recommendations": [
                "Alert Water Resources Department",
                "Monitor reservoir / lake levels for drinking water",
                "Assess agricultural irrigation dependency",
                "Plan tanker-water supply for affected villages",
            ],
        },
        "urban_development": {
            "type": "New Construction / Development",
            "icon": "construction",
            "severity_boost": 0.6,
            "description": (
                f"New structures or land clearing across {dom_area:.0f} sq m."
            ),
            "recommendations": [
                "Verify construction permits and land-use compliance",
                "Check for encroachment on protected / forest land",
                "Update land-use database and GIS records",
            ],
        },
        "infrastructure_damage": {
            "type": "Infrastructure Damage",
            "icon": "infrastructure_damage",
            "severity_boost": 1.3,
            "description": (
                f"Structural collapse/damage signatures across "
                f"{dom_area:.0f} sq m."
            ),
            "recommendations": [
                "Deploy structural assessment team immediately",
                "Evacuate buildings in the affected zone",
                "Alert NDRF for search-and-rescue operations",
                "Check gas lines and electrical infrastructure",
                "Establish safety perimeter around damaged structures",
            ],
        },
        "storm_cyclone": {
            "type": "Storm / Cyclone Damage",
            "icon": "storm",
            "severity_boost": 1.4,
            "description": (
                f"Widespread storm/cyclone damage across {dom_area:.0f} sq m "
                f"({dominance * 100:.0f}% of changed area). "
                "Darkening and structural disruption indicate severe wind damage."
            ),
            "recommendations": [
                "Alert NDRF and state disaster management authority",
                "Deploy search-and-rescue teams to affected areas",
                "Assess structural integrity of buildings and bridges",
                "Check power lines and communication infrastructure",
                "Establish relief camps and supply distribution points",
                "Monitor for post-storm flooding and landslides",
            ],
        },
        "surface_change": {
            "type": "General Surface Change",
            "icon": "surface_change",
            "severity_boost": 0.7,
            "description": (
                f"Unclassified surface changes across {dom_area:.0f} sq m. "
                "May need ground-level verification."
            ),
            "recommendations": [
                "Schedule ground-truth verification",
                "Compare with additional temporal imagery",
                "Monitor for further change in next satellite pass",
            ],
        },
    }

    det = DETAILS.get(dominant, DETAILS["surface_change"])

    # ── Overall severity ─────────────────────────────────────────
    sev_order = {"low": 0, "medium": 1, "high": 2, "critical": 3}
    max_sev = max((sev_order.get(r["severity"], 0) for r in regions), default=0)
    boosted = max_sev * det["severity_boost"]
    if boosted >= 3:
        overall_sev = "critical"
    elif boosted >= 2:
        overall_sev = "high"
    elif boosted >= 1:
        overall_sev = "medium"
    else:
        overall_sev = "low"

    # ── Evidence lines ───────────────────────────────────────────
    evidence = []
    for cat, area in sorted(category_area.items(), key=lambda x: x[1], reverse=True):
        count = len(category_regions[cat])
        nice  = cat.replace("_", " ").title()
        evidence.append(f"{nice}: {count} region(s), {area:.0f} sq m affected")

    return {
        "type":            det["type"],
        "icon":            det["icon"],
        "confidence":      round(confidence, 4),
        "severity":        overall_sev,
        "description":     det["description"],
        "recommendations": det["recommendations"],
        "evidence":        evidence,
    }


# ── Public API ────────────────────────────────────────────────────

class ModelInference:
    """Real image analysis engine — no trained model needed."""

    def __init__(self) -> None:
        self.model = None
        self.model_loaded = False
        self.demo_mode = False  # Always real analysis now

    def load_model(self, model_path: str | None = None) -> bool:
        """Check for ONNX model. Analysis works without one."""
        path = model_path or settings.model_path
        logger.info(
            "Real image analysis engine ready. "
            "Using OpenCV + NumPy pixel-level analysis. "
            "ONNX model path: %s (not required for analysis)",
            path,
        )
        self.model_loaded = False
        self.demo_mode = False
        return True

    def predict_single(self, image_bytes: bytes, filename: str) -> dict:
        """Run full single-image analysis pipeline."""
        bgr = _bytes_to_cv2(image_bytes)
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)

        classification = _classify_image(hsv, bgr)
        segmentation = _segment_image(hsv, bgr)
        anomaly = _detect_anomalies(bgr)
        severity = _assess_severity(classification, anomaly)

        return {
            "id": f"SAR-{uuid.uuid4().hex[:8]}",
            "filename": filename,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "demoMode": False,
            "classification": classification,
            "segmentation": segmentation,
            "anomaly": anomaly,
            "severity": severity,
        }

    def predict_change(self, before_bytes: bytes, after_bytes: bytes) -> dict:
        """Run real before/after change detection."""
        before_bgr = _bytes_to_cv2(before_bytes)
        after_bgr = _bytes_to_cv2(after_bytes)
        return _analyze_changes(before_bgr, after_bgr)

    def predict_batch(self, images: list[tuple[bytes, str]]) -> list[dict]:
        """Batch analysis — runs real analysis on each image."""
        return [self.predict_single(data, name) for data, name in images]


# Singleton
inference_engine = ModelInference()
