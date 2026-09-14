import { RouteOption, RiskLevel } from '../types';
import { ROUTE_POLYLINES, CITIES } from '../data/mapCoordinates';

export interface RouteScoreDetails {
  travelTimeScore: number;
  riskExposureScore: number;
  closurePenalties: number;
  weatherExposureScore: number;
  totalCompositeScore: number;
  riskLevel: RiskLevel;
}

export function evaluateRouteOption(
  optionName: string,
  type: 'Recommended' | 'Fastest' | 'Safer Alternate',
  distanceKm: number,
  avgSpeedKmH: number,
  baseRisk: number,
  isBlocked: boolean,
  hasRain: boolean,
  hasLandslide: boolean,
  polylinesKey: string
): RouteOption {
  const baseTravelHours = distanceKm / Math.max(avgSpeedKmH, 15);

  // Deterministic formula
  const travelTimeScore = baseTravelHours * 5; // 5 pts per hour
  const riskExposureScore = baseRisk * 0.4;
  const closurePenalty = isBlocked ? 200 : 0;
  const weatherScore = hasRain ? 15 : 0;
  const incidentScore = hasLandslide ? 35 : 0;

  const compositeScore = Math.round(travelTimeScore + riskExposureScore + closurePenalty + weatherScore + incidentScore);
  const normalizedRisk = Math.min(Math.max(Math.round(baseRisk + (hasRain ? 12 : 0) + (hasLandslide ? 25 : 0)), 0), 100);

  let riskLevel: RiskLevel = 'Low';
  if (normalizedRisk >= 75 || isBlocked) riskLevel = 'Critical';
  else if (normalizedRisk >= 50) riskLevel = 'High';
  else if (normalizedRisk >= 30) riskLevel = 'Moderate';

  let reason = '';
  if (type === 'Recommended') {
    reason = isBlocked
      ? 'Selected alternate corridor due to active road closure on primary highway.'
      : 'Lowest disruption exposure and balanced travel time score.';
  } else if (type === 'Fastest') {
    reason = 'Shortest physical distance, but subject to weather delay vulnerability.';
  } else {
    reason = 'Bypasses high-vulnerability mountain passes with maximum safety buffer.';
  }

  return {
    id: `opt-${type.toLowerCase()}-${Math.floor(Math.random() * 1000)}`,
    name: optionName,
    type,
    distanceKm,
    estimatedDurationHours: Number(baseTravelHours.toFixed(2)),
    riskScore: normalizedRisk,
    riskLevel,
    roadSegments: [],
    waypoints: ROUTE_POLYLINES[polylinesKey] || [CITIES.Guwahati, CITIES.Imphal],
    recommendationReason: reason,
    weatherExposure: hasRain ? 'Heavy Monsoon Rain' : 'Normal Conditions',
    incidentExposureCount: (isBlocked ? 1 : 0) + (hasLandslide ? 1 : 0),
  };
}
