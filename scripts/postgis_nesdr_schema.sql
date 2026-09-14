-- ============================================================================
-- PRAVAHA Platform - NESDR / NESAC Spatial Database Architecture (PostGIS)
-- Official Source: North Eastern Spatial Data Repository (NESAC / ISRO, MDoNER)
-- Website: https://www.nesdr.gov.in/
-- ============================================================================

-- Enable PostGIS & Spatial Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. NESDR Dataset Catalog & Metadata Provenance Table
CREATE TABLE IF NOT EXISTS nesdr_datasets_metadata (
    dataset_id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    domain VARCHAR(64) NOT NULL, -- Disaster, Terrain, Infrastructure, Land Resource, etc.
    source_agency VARCHAR(128) DEFAULT 'NESAC / NESDR (ISRO & MDoNER)',
    source_url TEXT NOT NULL,
    ogc_service_url TEXT,
    layer_name VARCHAR(128),
    dataset_classification VARCHAR(32) NOT NULL CHECK (
        dataset_classification IN ('BASELINE', 'OBSERVED', 'REAL-TIME', 'HISTORICAL', 'PREDICTIVE', 'REFERENCE')
    ),
    original_crs VARCHAR(32) DEFAULT 'EPSG:4326',
    processed_crs VARCHAR(32) DEFAULT 'EPSG:4326',
    coverage_area VARCHAR(128) DEFAULT 'Northeast India (8 States)',
    publication_date DATE,
    last_ingested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_format VARCHAR(32) NOT NULL, -- WMS, Shapefile, GeoJSON, GeoTIFF, CSV
    license_type VARCHAR(128) DEFAULT 'Government of India Open Data / NESDR Public Services',
    total_features INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    processing_version VARCHAR(16) DEFAULT 'v1.0.4'
);

-- 2. NESDR Landslide Susceptibility & Hazard Zones (Polygon / MultiPolygon)
CREATE TABLE IF NOT EXISTS nesdr_landslide_susceptibility (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_code VARCHAR(64) NOT NULL,
    state VARCHAR(64) NOT NULL,
    district VARCHAR(64) NOT NULL,
    susceptibility_level VARCHAR(32) NOT NULL CHECK (
        susceptibility_level IN ('Very High', 'High', 'Moderate', 'Low', 'Very Low')
    ),
    slope_angle_deg NUMERIC(5,2),
    geology_type VARCHAR(128),
    affected_corridors TEXT[],
    confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
    geom GEOMETRY(MultiPolygon, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial GIST Index for Fast Route Intersection & Bounding Box Queries
CREATE INDEX IF NOT EXISTS idx_nesdr_landslide_geom ON nesdr_landslide_susceptibility USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_nesdr_landslide_state_district ON nesdr_landslide_susceptibility(state, district);

-- 3. NESDR Flood Inundation & Bank Erosion Zones (Polygon / MultiPolygon)
CREATE TABLE IF NOT EXISTS nesdr_flood_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(64) NOT NULL,
    state VARCHAR(64) NOT NULL,
    river_basin VARCHAR(128) NOT NULL, -- Brahmaputra, Barak, Teesta, etc.
    flood_extent_type VARCHAR(64) NOT NULL, -- FLEWS Inundation, Bank Erosion 2018-19, Embankment Breach
    water_depth_m NUMERIC(4,2),
    return_period_years INTEGER,
    susceptibility_class VARCHAR(32) DEFAULT 'High',
    geom GEOMETRY(MultiPolygon, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nesdr_flood_geom ON nesdr_flood_zones USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_nesdr_flood_river ON nesdr_flood_zones(river_basin);

-- 4. NESDR SISDP Road & Infrastructure Networks (LineString / MultiLineString)
CREATE TABLE IF NOT EXISTS nesdr_road_infrastructure (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    road_id VARCHAR(64) NOT NULL,
    road_name VARCHAR(128) NOT NULL,
    highway_number VARCHAR(32),
    state VARCHAR(64) NOT NULL,
    surface_type VARCHAR(64) DEFAULT 'Paved Bitumen',
    terrain_type VARCHAR(64) DEFAULT 'Mountainous Pass',
    vulnerability_index NUMERIC(3,2), -- 0.0 to 1.0 hazard exposure score
    geom GEOMETRY(MultiLineString, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nesdr_road_geom ON nesdr_road_infrastructure USING GIST (geom);

-- 5. Ingestion Processing Audit Logs
CREATE TABLE IF NOT EXISTS nesdr_ingestion_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id VARCHAR(64) REFERENCES nesdr_datasets_metadata(dataset_id),
    source_file VARCHAR(255) NOT NULL,
    records_processed INTEGER DEFAULT 0,
    invalid_geometries_repaired INTEGER DEFAULT 0,
    status VARCHAR(32) NOT NULL, -- SUCCESS, WARNING, FAILED
    error_message TEXT,
    execution_time_ms INTEGER,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Function: Compute Spatial Hazard Intersection between a Route Polyline and NESDR Hazard Layers
CREATE OR REPLACE FUNCTION fn_evaluate_route_nesdr_risk(
    p_route_geom GEOMETRY(LineString, 4326),
    p_buffer_meters NUMERIC DEFAULT 200.0
)
RETURNS TABLE (
    hazard_type VARCHAR(64),
    hazard_level VARCHAR(32),
    source_dataset VARCHAR(128),
    intersection_length_km NUMERIC(8,3)
) AS $$
BEGIN
    RETURN QUERY
    -- Check Landslide Susceptibility Intersections
    SELECT 
        'Landslide Susceptibility'::VARCHAR(64) AS hazard_type,
        l.susceptibility_level::VARCHAR(32) AS hazard_level,
        'NESAC NESDR LHS 2023'::VARCHAR(128) AS source_dataset,
        ROUND((ST_Length(ST_Intersection(p_route_geom, l.geom)::geography) / 1000.0)::numeric, 3) AS intersection_length_km
    FROM nesdr_landslide_susceptibility l
    WHERE ST_Intersects(p_route_geom, l.geom)
    
    UNION ALL
    
    -- Check Flood Extent Intersections
    SELECT 
        'Flood Inundation'::VARCHAR(64) AS hazard_type,
        f.susceptibility_class::VARCHAR(32) AS hazard_level,
        'NESAC FLEWS Assam 2023'::VARCHAR(128) AS source_dataset,
        ROUND((ST_Length(ST_Intersection(p_route_geom, f.geom)::geography) / 1000.0)::numeric, 3) AS intersection_length_km
    FROM nesdr_flood_zones f
    WHERE ST_Intersects(p_route_geom, f.geom);
END;
$$ LANGUAGE plpgsql;
