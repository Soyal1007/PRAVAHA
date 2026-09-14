import { RiskLevel, RiskEvent } from '../types';

export function computeCorridorRisk(
  terrain: number,
  rainfall: number,
  forecastRain: number,
  floodProx: number,
  historyIncidents: number,
  roadCondition: number,
  gpsAnomalies: number
): { score: number; level: RiskLevel; contributors: { name: string; impact: number }[] } {
  // Weighted calculation
  const wTerrain = terrain * 0.15;
  const wRain = rainfall * 0.20;
  const wForecast = forecastRain * 0.15;
  const wFlood = floodProx * 0.15;
  const wHistory = historyIncidents * 0.10;
  const wCondition = roadCondition * 0.15;
  const wGps = gpsAnomalies * 0.10;

  const total = Math.min(Math.round(wTerrain + wRain + wForecast + wFlood + wHistory + wCondition + wGps), 100);

  let level: RiskLevel = 'Low';
  if (total >= 75) level = 'Critical';
  else if (total >= 50) level = 'High';
  else if (total >= 30) level = 'Moderate';

  const contributors = [
    { name: 'Rainfall', impact: Math.round(wRain) },
    { name: 'Terrain Susceptibility', impact: Math.round(wTerrain) },
    { name: 'Forecast Rainfall', impact: Math.round(wForecast) },
    { name: 'Flood Proximity', impact: Math.round(wFlood) },
    { name: 'Road Condition', impact: Math.round(wCondition) },
    { name: 'GPS Anomaly', impact: Math.round(wGps) },
    { name: 'Historical Incidents', impact: Math.round(wHistory) },
  ].sort((a, b) => b.impact - a.impact);

  return { score: total, level, contributors };
}
