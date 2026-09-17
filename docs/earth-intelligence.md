# PRAVAHA Earth Intelligence & Satellite Processing Pipeline

## Overview
PRAVAHA Earth Intelligence monitors environmental disruptions across the North Eastern Region using multi-spectral and Synthetic Aperture Radar (SAR) earth observation data.

## Integrated Satellite Constellations
1. **Copernicus Sentinel-1 (SAR)**: C-band Synthetic Aperture Radar providing cloud-penetrating imagery during heavy monsoon storms.
2. **Copernicus Sentinel-2 (MSI)**: High-resolution optical imagery for NDVI (Normalized Difference Vegetation Index) and NDWI (Normalized Difference Water Index) change analysis.
3. **ISRO MOSDAC / NESAC**: Regional meteorological radar and flood inundation maps tailored for Assam, Meghalaya, and Sikkim.

## Change Detection Methodology
```
Area of Interest (AOI)
        ↓
Pre-Disruption Sentinel Scene (T0)
        ↓
Post-Disruption Sentinel Scene (T1)
        ↓
Band Co-registration & Normalization
        ↓
Differential Backscatter / Index Ratio Calculation
        ↓
Surface Anomaly Mask Generation
        ↓
Risk Engine Scoring Input
```
