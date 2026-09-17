# PRAVAHA Machine Learning Disruption Risk Engine

## Feature Model Architecture
The Disruption Risk Engine (`services/ml/risk_model.py`) predicts road segment vulnerability using a multi-feature regression & classification model.

### Feature Vectors
1. `rainfall_24h_mm`: Cumulative 24-hour rainfall in millimeters.
2. `rainfall_72h_mm`: Cumulative 72-hour antecedent rainfall in millimeters.
3. `slope_degrees`: Terrain slope angle derived from SRTM DEM elevation model.
4. `elevation_m`: Absolute altitude above sea level.
5. `distance_to_river_m`: Proximity to nearest hydrological body.
6. `terrain_susceptibility`: Geological landslide vulnerability index.
7. `satellite_change_score`: Surface anomaly score from Earth Intelligence change detection.
8. `historical_incidents_count`: Historical disruption frequency for the road segment.
9. `road_condition_score`: Surface quality rating.
10. `gps_speed_anomaly_ratio`: Speed reduction ratio detected via FleetPulse GPS telemetry.

## Risk Classification Scale
- **0 - 39**: LOW RISK (Normal operations)
- **40 - 59**: ELEVATED RISK (Active monitoring)
- **60 - 79**: HIGH RISK (Speed limits & driver alerts active)
- **80 - 100**: CRITICAL RISK (RouteGuard detour forced)
