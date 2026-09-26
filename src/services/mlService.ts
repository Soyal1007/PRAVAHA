/**
 * PRAVAHA ML Intelligence Service Client
 * 
 * Interacts with the backend ML Service (FastAPI) and provides
 * seamless client-side fallback execution for disruption risk models.
 */

export interface MLPredictionPayload {
  rainfall_24h_mm: number;
  rainfall_72h_mm?: number;
  slope_degrees: number;
  elevation_m?: number;
  distance_to_river_m?: number;
  terrain_susceptibility: number;
  satellite_change_score: number;
  historical_incidents_count?: number;
  road_condition_score?: number;
  gps_speed_anomaly_ratio: number;
  latitude?: number;
  longitude?: number;
}

export interface MLPredictionResult {
  prediction_id: string;
  prediction: {
    risk_score: number;
    risk_level: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'LOW';
    probability: number;
  };
  confidence: number;
  risk_level: string;
  risk_score: number;
  model_name: string;
  model_version: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  source: 'ONLINE_SERVICE' | 'CLIENT_SIDE_FALLBACK';
}

export interface MLHealthStatus {
  status: string;
  service: string;
  uptime_seconds: number;
  models: Record<string, { loaded: boolean; version: string; type: string }>;
}

const API_BASE_URL = 'http://localhost:8000/api/v1/ml';

/**
 * Local client-side implementation of PravahaDisruptionRiskModel
 * strictly matching services/ml/risk_model.py equation.
 */
export function predictDisruptionRiskLocal(payload: MLPredictionPayload): MLPredictionResult {
  const rainfall24 = payload.rainfall_24h_mm ?? 0.0;
  const slope = payload.slope_degrees ?? 0.0;
  const susceptibility = payload.terrain_susceptibility ?? 0.5;
  const satChange = payload.satellite_change_score ?? 0.0;
  const gpsAnomaly = payload.gps_speed_anomaly_ratio ?? 0.0;

  const score = Math.min(
    100,
    Math.round(
      Math.min(1.0, rainfall24 / 120.0) * 35.0 +
      Math.min(1.0, slope / 45.0) * 25.0 +
      susceptibility * 20.0 +
      satChange * 12.0 +
      gpsAnomaly * 8.0
    )
  );

  let level: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'LOW' = 'LOW';
  if (score >= 80) level = 'CRITICAL';
  else if (score >= 60) level = 'HIGH';
  else if (score >= 40) level = 'ELEVATED';

  const prob = Number((score / 100.0).toFixed(4));
  const predId = `PRED-LOC-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  return {
    prediction_id: predId,
    prediction: {
      risk_score: score,
      risk_level: level,
      probability: prob,
    },
    confidence: prob,
    risk_level: level,
    risk_score: score,
    model_name: 'PravahaDisruptionRiskModel',
    model_version: '1.0.0',
    timestamp: new Date().toISOString(),
    latitude: payload.latitude,
    longitude: payload.longitude,
    source: 'CLIENT_SIDE_FALLBACK',
  };
}

/**
 * Call backend ML Service for risk prediction, falling back to local model if unavailable.
 */
export async function predictDisruptionRisk(payload: MLPredictionPayload): Promise<MLPredictionResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        ...data,
        source: 'ONLINE_SERVICE',
      };
    }
  } catch (err) {
    console.warn('PRAVAHA ML Backend unreachable, using client-side model fallback:', err);
  }

  return predictDisruptionRiskLocal(payload);
}

/**
 * Fetch ML Backend Health status
 */
export async function getMLHealthStatus(): Promise<MLHealthStatus | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // Offline
  }
  return null;
}

/**
 * Analyze pairwise satellite image change
 */
export async function analyzeBeforeAfterImages(beforeFile: File, afterFile: File): Promise<any> {
  const formData = new FormData();
  formData.append('before', beforeFile);
  formData.append('after', afterFile);

  const response = await fetch(`${API_BASE_URL}/analyze/before-after`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Satellite Analysis Failed: ${response.statusText}`);
  }

  return await response.json();
}
