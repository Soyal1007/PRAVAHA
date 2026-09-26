# NER-SHIELD Test Images — North-Eastern India

Sample before/after satellite image pairs for testing the change detection system.
All images feature locations from North-Eastern India and surrounding regions.

## ⚠️ Image Source Note

The current images are **high-fidelity synthetic satellite imagery** generated with
fractal terrain modeling and sensor-realistic artifacts (scanline banding, vignetting,
CCD noise). They are spectrally calibrated to test the multi-signal classifier correctly.

**For real satellite imagery**, download from these NASA Earth Observatory sources
(all public domain) and replace the before.jpg / after.jpg files in each folder:

### Real Satellite Image URLs (NASA Earth Observatory)

| Folder | Before Image | After Image |
|--------|-------------|-------------|
| `flood_brahmaputra/` | [Brahmaputra 2011 (MODIS)](https://earthobservatory.nasa.gov/images/52078) | [Brahmaputra 2012 flood (MODIS)](https://earthobservatory.nasa.gov/images/79138) |
| `landslide_manipur/` | [Chamoli pre-slide 2021 (Landsat 8)](https://earthobservatory.nasa.gov/images/147868) | [Chamoli post-slide 2021 (Landsat 8)](https://earthobservatory.nasa.gov/images/147868) |
| `cyclone_odisha/` | [Bhubaneswar pre-Fani 2019 (VIIRS)](https://earthobservatory.nasa.gov/images/145032) | [Bhubaneswar post-Fani 2019 (VIIRS)](https://earthobservatory.nasa.gov/images/145032) |
| `deforestation_meghalaya/` | [NE India forest (Landsat)](https://earthobservatory.nasa.gov/world-of-change/Deforestation) | Check World of Change series |
| `drought_tripura/` | [Panchet reservoir 2015 (Landsat 8)](https://earthobservatory.nasa.gov/images/88299) | [Panchet reservoir 2016 drought (Landsat 8)](https://earthobservatory.nasa.gov/images/88299) |
| `urban_guwahati/` | [Delhi urban 1989 (Landsat 5)](https://earthobservatory.nasa.gov/world-of-change/Delhi) | [Delhi urban 2018 (Landsat 8)](https://earthobservatory.nasa.gov/world-of-change/Delhi) |
| `road_damage_mizoram/` | [Uttarakhand pre-flood 2009](https://earthobservatory.nasa.gov/images/81360) | [Uttarakhand post-flood 2013](https://earthobservatory.nasa.gov/images/81360) |

**How to replace:** Download each image, crop/resize to 1024×1024, save as `before.jpg` and `after.jpg` in the matching folder.

## Image Pairs

| Folder | Before | After | Region | Event Type |
|--------|--------|-------|--------|------------|
| `flood_brahmaputra/` | Brahmaputra floodplain, Assam | Post-flood water incursion | Assam | Flood / Water Incursion |
| `landslide_manipur/` | Forested hillside, Manipur | Post-landslide debris flow | Manipur | Landslide |
| `cyclone_odisha/` | Coastal settlement, Odisha | Post-cyclone storm damage | Odisha | Storm / Cyclone Damage |
| `deforestation_meghalaya/` | Dense forest canopy, Meghalaya | After forest clearing | Meghalaya | Deforestation / Vegetation Loss |
| `drought_tripura/` | Agricultural area with reservoir | Reservoir receded, fields dried | Tripura | Drought / Water Recession |
| `urban_guwahati/` | Semi-urban outskirts, Guwahati | New construction expansion | Guwahati, Assam | Urban Development |
| `road_damage_mizoram/` | Mountain road, Mizoram | Debris covering road sections | Mizoram | Road / Infrastructure Damage |

## Classifier Test Points

Each image pair is designed to trigger specific classifier signals:

- **Flood**: Large hue shift toward blue (water), massive NDVI drop (vegetation submerged), low edge density change
- **Landslide**: Moderate hue shift, NDVI drop, **high edge density** (chaotic debris texture), **high hue std deviation**
- **Drought**: Hue shift toward yellow/brown, NDVI drop, **low edge density** (smooth browning), **low hue std deviation**
- **Cyclone**: Widespread desaturation, moderate NDVI drop, scattered damage pattern
- **Deforestation**: Green-to-brown transition, NDVI drop, moderate edge density (clearing boundary)
- **Urban**: Brightening (higher value), low NDVI change (was already non-vegetated), new geometric edges
- **Road damage**: Localized changes, debris texture in narrow corridor, infrastructure disruption

### Critical Distinction: Drought vs Landslide

The classifier separates these similar-looking events using:
- **Edge density**: Landslide debris is rough/chaotic → high Canny edge count; drought browning is smooth → low edges
- **Hue std deviation**: Debris has varied colors → high std; uniform browning → low std
- Both can show NDVI drops, but the texture signals disambiguate them

## Usage

1. Start the backend: `cd backend && python -m uvicorn main:app --reload --port 8000`
2. Start the GUI: `cd gui && npm run dev`
3. Open browser → upload a "before" image from any folder, then the matching "after" image
4. The system will analyze pixel-level changes, NDVI, land cover, and classify the event

## Image Details

- All images: 1024×1024 px, JPEG, RGB
- Synthetic v2: Fractal terrain with sensor artifacts (scanlines, vignetting, CCD noise)
- Spectrally calibrated to test the multi-signal classification engine

## Recommended Test Order

1. **Brahmaputra flood** — dramatic green-to-water transition
2. **Manipur landslide** — debris texture vs vegetation, tests landslide-vs-drought separation
3. **Tripura drought** — smooth browning with reservoir recession, must NOT be classified as landslide
4. **Meghalaya deforestation** — vegetation loss without debris signature
5. **Odisha cyclone** — widespread darkening and desaturation pattern
6. **Mizoram road damage** — infrastructure disruption on mountain terrain
7. **Guwahati urban** — new construction / brightening pattern

## Classification Engine

The system uses a multi-signal weighted scoring approach:

- HSV color channel shifts (hue, saturation, value)
- NDVI (vegetation health) delta via Excess Green Index
- Edge density change (texture roughness proxy for debris vs smooth browning)
- Hue standard deviation (chaotic debris vs uniform drought)
- Area fraction and coverage analysis

This ensures correct separation of similar-looking events like drought vs landslide.
