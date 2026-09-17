import json
import math

class PravahaDisruptionRiskModel:
    def __init__(self):
        self.feature_names = [
            "rainfall_24h_mm",
            "rainfall_72h_mm",
            "slope_degrees",
            "elevation_m",
            "distance_to_river_m",
            "terrain_susceptibility",
            "satellite_change_score",
            "historical_incidents_count",
            "road_condition_score",
            "gps_speed_anomaly_ratio"
        ]

    def predict_risk(self, features_dict: dict):
        rainfall_24h = features_dict.get("rainfall_24h_mm", 0.0)
        slope = features_dict.get("slope_degrees", 0.0)
        susceptibility = features_dict.get("terrain_susceptibility", 0.5)
        sat_change = features_dict.get("satellite_change_score", 0.0)
        gps_anomaly = features_dict.get("gps_speed_anomaly_ratio", 0.0)

        # Mathematical feature score weighting equation
        score = (
            min(1.0, rainfall_24h / 120.0) * 35.0 +
            min(1.0, slope / 45.0) * 25.0 +
            susceptibility * 20.0 +
            sat_change * 12.0 +
            gps_anomaly * 8.0
        )
        risk_score = int(min(100, round(score)))

        if risk_score >= 80:
            level = "CRITICAL"
        elif risk_score >= 60:
            level = "HIGH"
        elif risk_score >= 40:
            level = "ELEVATED"
        else:
            level = "LOW"

        return {
            "risk_score": risk_score,
            "risk_level": level,
            "probability": round(risk_score / 100.0, 4)
        }

if __name__ == "__main__":
    model = PravahaDisruptionRiskModel()
    result = model.predict_risk({
        "rainfall_24h_mm": 85.0,
        "slope_degrees": 28.0,
        "terrain_susceptibility": 0.75,
        "satellite_change_score": 0.62,
        "gps_speed_anomaly_ratio": 0.40
    })
    print(f"Pravaha Disruption ML Model Evaluation output: {json.dumps(result, indent=2)}")
