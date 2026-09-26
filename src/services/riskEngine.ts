import { RiskLevel } from '../types';
import { predictDisruptionRiskLocal } from './mlService';

export interface MLRiskEvidence {
  score: number;
  level: string;
  probability: number;
  modelName: string;
  modelVersion: string;
}

export function computeCorridorRisk(
  terrain: number,
  rainfall: number,
  forecastRain: number,
  floodProx: number,
  historyIncidents: number,
  roadCondition: number,
  gpsAnomalies: number,
  nesdrSusceptibility: number = 75,
  mlDisruptionScoreOverride?: number
): {
  score: number;
  level: RiskLevel;
  mlEvidence: MLRiskEvidence;
  contributors: { name: string; impact: number; source?: string }[];
} {
  // Compute ML Model disruption risk prediction using PravahaDisruptionRiskModel logic
  const mlResult = predictDisruptionRiskLocal({
    rainfall_24h_mm: rainfall,
    slope_degrees: (terrain / 100) * 45,
    terrain_susceptibility: nesdrSusceptibility / 100,
    satellite_change_score: floodProx / 100,
    gps_speed_anomaly_ratio: gpsAnomalies / 100,
  });

  const mlScore = mlDisruptionScoreOverride !== undefined ? mlDisruptionScoreOverride : mlResult.risk_score;

  // Multi-signal Weighted Calculation (PRAVAHA Risk Engine + ML Model Evidence)
  const wMlModel = mlScore * 0.20;               // PRAVAHA Trained Disruption ML Model Evidence (20%)
  const wNesdr = nesdrSusceptibility * 0.15;     // NESDR Baseline GIS Exposure (15%)
  const wRain = rainfall * 0.15;                 // Real-time Weather (15%)
  const wTerrain = terrain * 0.10;               // Terrain Slope Grade (10%)
  const wForecast = forecastRain * 0.15;         // IMD Weather Forecast (15%)
  const wFlood = floodProx * 0.10;               // CWC/FLEWS Flood Proximity (10%)
  const wHistory = historyIncidents * 0.05;      // Field History (5%)
  const wCondition = roadCondition * 0.05;       // Highway Pavement Index (5%)
  const wGps = gpsAnomalies * 0.05;              // Fleet Pulse Anomaly (5%)

  const total = Math.min(
    Math.round(wMlModel + wNesdr + wRain + wTerrain + wForecast + wFlood + wHistory + wCondition + wGps),
    100
  );

  let level: RiskLevel = 'Low';
  if (total >= 75) level = 'Critical';
  else if (total >= 50) level = 'High';
  else if (total >= 30) level = 'Moderate';

  const mlEvidence: MLRiskEvidence = {
    score: mlScore,
    level: mlResult.risk_level,
    probability: mlResult.confidence,
    modelName: mlResult.model_name,
    modelVersion: mlResult.model_version,
  };

  const contributors = [
    { name: 'Pravaha Disruption ML Model', impact: Math.round(wMlModel), source: 'PRAVAHA ML Engine (v1.0.0)' },
    { name: 'NESDR Hazard Susceptibility', impact: Math.round(wNesdr), source: 'NESAC / NESDR (ISRO Baseline)' },
    { name: 'Rainfall Intensity', impact: Math.round(wRain), source: 'Live Weather Core' },
    { name: 'Forecast Rainfall Exposure', impact: Math.round(wForecast), source: 'IMD Monsoon Forecast' },
    { name: 'Terrain Gradient & Slope', impact: Math.round(wTerrain), source: 'NESAC Cartosat DEM' },
    { name: 'Flood Inundation Proximity', impact: Math.round(wFlood), source: 'NESAC FLEWS & CWC' },
    { name: 'Historical Disruption Count', impact: Math.round(wHistory), source: 'PRAVAHA FieldLink' },
    { name: 'Road Pavement Condition', impact: Math.round(wCondition), source: 'SISDP Road Network' },
    { name: 'GPS Telemetry Anomaly', impact: Math.round(wGps), source: 'PRAVAHA FleetPulse' },
  ].sort((a, b) => b.impact - a.impact);

  return { score: total, level, mlEvidence, contributors };
}
