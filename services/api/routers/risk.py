from fastapi import APIRouter
from ..schemas import RiskCalculateRequest, RiskCalculateResponse

router = APIRouter(prefix="/risk", tags=["Risk Engine"])

@router.post("/evaluate", response_model=RiskCalculateResponse)
def evaluate_road_risk(req: RiskCalculateRequest):
    # PRAVAHA Risk Feature Model Equation
    base_score = 15
    factors = []

    if req.rainfall_24h_mm and req.rainfall_24h_mm > 50:
        base_score += 35
        factors.append(f"Heavy 24h Rainfall ({req.rainfall_24h_mm} mm)")
    elif req.rainfall_24h_mm and req.rainfall_24h_mm > 20:
        base_score += 15
        factors.append(f"Moderate Rainfall ({req.rainfall_24h_mm} mm)")

    if req.slope_degrees and req.slope_degrees > 20:
        base_score += 30
        factors.append(f"Steep Terrain Slope ({req.slope_degrees}°)")
    elif req.slope_degrees and req.slope_degrees > 10:
        base_score += 15
        factors.append(f"Elevated Terrain Slope ({req.slope_degrees}°)")

    # Normalize score 0-100
    risk_score = min(100, base_score)
    
    if risk_score >= 80:
        level = "CRITICAL"
        rec = "Reroute all heavy logistical traffic immediately. Deploy field assessment team."
    elif risk_score >= 60:
        level = "HIGH"
        rec = "Exercise extreme caution. Speed restrictions active."
    elif risk_score >= 40:
        level = "ELEVATED"
        rec = "Monitor weather radar updates and slope sensors."
    else:
        level = "LOW"
        rec = "Road segment operational under normal parameters."

    return RiskCalculateResponse(
        risk_score=risk_score,
        risk_level=level,
        contributing_factors=factors or ["Normal weather and topography"],
        recommendation=rec
    )
