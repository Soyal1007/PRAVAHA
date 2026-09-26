"""Automated test suite for PRAVAHA ML Model Service & Risk Engine integration.
"""

import sys
import unittest
import io
import cv2
import numpy as np
from pathlib import Path

# Add services/ml to python path
ML_DIR = Path(__file__).resolve().parent.parent
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

from risk_model import PravahaDisruptionRiskModel
from server import app
from fastapi.testclient import TestClient


class TestPravahaMLService(unittest.TestCase):
    def setUp(self):
        self.model = PravahaDisruptionRiskModel()
        self.client = TestClient(app)

    def _generate_test_image_bytes(self, color=(0, 255, 0)):
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        img[:, :] = color
        _, buf = cv2.imencode(".jpg", img)
        return buf.tobytes()

    def test_model_initialization(self):
        """1. Model loading test."""
        self.assertIsNotNone(self.model)
        self.assertEqual(len(self.model.feature_names), 10)
        self.assertIn("rainfall_24h_mm", self.model.feature_names)

    def test_valid_inference(self):
        """2. Valid tabular inference test with realistic data."""
        features = {
            "rainfall_24h_mm": 85.0,
            "slope_degrees": 28.0,
            "terrain_susceptibility": 0.75,
            "satellite_change_score": 0.62,
            "gps_speed_anomaly_ratio": 0.40,
        }
        res = self.model.predict_risk(features)
        self.assertIn("risk_score", res)
        self.assertIn("risk_level", res)
        self.assertIn("probability", res)
        self.assertIsInstance(res["risk_score"], int)
        self.assertGreaterEqual(res["risk_score"], 0)
        self.assertLessEqual(res["risk_score"], 100)
        self.assertEqual(res["risk_level"], "HIGH")

    def test_critical_inference(self):
        """3. High severity inference test."""
        features = {
            "rainfall_24h_mm": 150.0,
            "slope_degrees": 45.0,
            "terrain_susceptibility": 0.90,
            "satellite_change_score": 0.85,
            "gps_speed_anomaly_ratio": 0.80,
        }
        res = self.model.predict_risk(features)
        self.assertEqual(res["risk_level"], "CRITICAL")
        self.assertGreaterEqual(res["risk_score"], 80)

    def test_low_inference(self):
        """4. Low risk inference test."""
        features = {
            "rainfall_24h_mm": 5.0,
            "slope_degrees": 2.0,
            "terrain_susceptibility": 0.10,
            "satellite_change_score": 0.05,
            "gps_speed_anomaly_ratio": 0.0,
        }
        res = self.model.predict_risk(features)
        self.assertEqual(res["risk_level"], "LOW")
        self.assertLess(res["risk_score"], 40)

    def test_api_health_endpoint(self):
        """5. Model health endpoint test."""
        response = self.client.get("/api/v1/ml/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("models", data)

    def test_api_version_endpoint(self):
        """6. Model version endpoint test."""
        response = self.client.get("/api/v1/ml/version")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["service_name"], "PRAVAHA ML Service")

    def test_api_predict_endpoint_valid(self):
        """7. API prediction endpoint valid test."""
        payload = {
            "rainfall_24h_mm": 95.0,
            "rainfall_72h_mm": 180.0,
            "slope_degrees": 32.0,
            "elevation_m": 450.0,
            "distance_to_river_m": 120.0,
            "terrain_susceptibility": 0.80,
            "satellite_change_score": 0.70,
            "historical_incidents_count": 5,
            "road_condition_score": 0.4,
            "gps_speed_anomaly_ratio": 0.5,
            "latitude": 27.1767,
            "longitude": 88.5122,
        }
        response = self.client.post("/api/v1/ml/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["prediction_id"].startswith("PRED-"))
        self.assertEqual(data["model_name"], "PravahaDisruptionRiskModel")
        self.assertIn(data["risk_level"], ["HIGH", "CRITICAL"])

    def test_api_predict_invalid_input(self):
        """8. Invalid input handling test."""
        payload = {
            "rainfall_24h_mm": -10.0,
            "slope_degrees": 120.0,
        }
        response = self.client.post("/api/v1/ml/predict", json=payload)
        self.assertEqual(response.status_code, 422)  # Validation Error

    def test_api_analyze_single_image(self):
        """9. Single satellite image analysis endpoint test."""
        img_bytes = self._generate_test_image_bytes(color=(0, 200, 0))
        files = {"file": ("test.jpg", img_bytes, "image/jpeg")}
        response = self.client.post("/api/v1/ml/analyze/single", files=files)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("classification", data["result"])
        self.assertIn("segmentation", data["result"])

    def test_api_analyze_before_after(self):
        """10. Pairwise change detection analysis endpoint test."""
        before_bytes = self._generate_test_image_bytes(color=(0, 200, 0))
        after_bytes = self._generate_test_image_bytes(color=(0, 0, 200))
        files = {
            "before": ("before.jpg", before_bytes, "image/jpeg"),
            "after": ("after.jpg", after_bytes, "image/jpeg"),
        }
        response = self.client.post("/api/v1/ml/analyze/before-after", files=files)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("changePercentage", data["result"])
        self.assertIn("event", data["result"])


if __name__ == "__main__":
    unittest.main()
