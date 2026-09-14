import { RiskLevel, RiskEvent } from '../types';

export function computeCorridorRisk(
  terrain: number,
  rainfall: number,
  forecastRain: number,
  floodProx: number,
  historyIncidents: number,
  roadCondition: number,
  gpsAnomalies: number,
  nesdrSusceptibility: number = 75
): { score: number; level: RiskLevel; contributors: { name: string; impact: number; source?: string }[] } {
  // Weighted Operational Risk Calculation incorporating NESDR/NESAC GIS Baseline Evidence
  const wNesdr = nesdrSusceptibility * 0.20; // NESDR Baseline GIS Exposure (20%)
  const wRain = rainfall * 0.20;             // Real-time Weather (20%)
  const wTerrain = terrain * 0.10;           // Terrain Slope Grade (10%)
  const wForecast = forecastRain * 0.15;     // IMD Weather Forecast (15%)
  const wFlood = floodProx * 0.15;           // CWC/FLEWS Flood Proximity (15%)
  const wHistory = historyIncidents * 0.05;  // Field History (5%)
  const wCondition = roadCondition * 0.10;   // Highway Pavement Index (10%)
  const wGps = gpsAnomalies * 0.05;          // Fleet Pulse Anomaly (5%)

  const total = Math.min(Math.round(wNesdr + wRain + wTerrain + wForecast + wFlood + wHistory + wCondition + wGps), 100);

  let level: RiskLevel = 'Low';
  if (total >= 75) level = 'Critical';
  else if (total >= 50) level = 'High';
  else if (total >= 30) level = 'Moderate';

  const contributors = [
    { name: 'NESDR Hazard Susceptibility', impact: Math.round(wNesdr), source: 'NESAC / NESDR (ISRO Baseline)' },
    { name: 'Rainfall Intensity', impact: Math.round(wRain), source: 'Live Weather Core' },
    { name: 'Flood Inundation Proximity', impact: Math.round(wFlood), source: 'NESAC FLEWS & CWC' },
    { name: 'Forecast Rainfall Exposure', impact: Math.round(wForecast), source: 'IMD Monsoon Forecast' },
    { name: 'Terrain Gradient & Slope', impact: Math.round(wTerrain), source: 'NESAC Cartosat DEM' },
    { name: 'Road Pavement Condition', impact: Math.round(wCondition), source: 'SISDP Road Network' },
    { name: 'Historical Disruption Count', impact: Math.round(wHistory), source: 'PRAVAHA FieldLink' },
    { name: 'GPS Telemetry Anomaly', impact: Math.round(wGps), source: 'PRAVAHA FleetPulse' },
  ].sort((a, b) => b.impact - a.impact);

  return { score: total, level, contributors };
}
