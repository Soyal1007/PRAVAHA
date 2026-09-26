"""
Geospatial utility functions for NER-SHIELD.

Handles CRS transformations, area calculations from pixel masks,
and coordinate conversions needed when working with georeferenced
satellite imagery.
"""

from __future__ import annotations

import math
from typing import Dict, List, Optional, Tuple, Union

import numpy as np

try:
    import rasterio
    from rasterio.transform import from_bounds
    from rasterio.crs import CRS
    from pyproj import Transformer
    from shapely.geometry import Polygon, MultiPolygon, shape, mapping
    import geopandas as gpd

    GEO_AVAILABLE = True
except ImportError:
    GEO_AVAILABLE = False

from src.utils.logger import get_logger

logger = get_logger(__name__)


class GeoUtils:
    """Geospatial helper for satellite imagery analysis.

    Provides methods for computing real-world areas from pixel masks,
    reprojecting coordinates, and extracting geospatial metadata from
    raster files.
    """

    # Default Ground Sampling Distance (metres per pixel) for Sentinel-2
    DEFAULT_GSD = 10.0

    # UTM zones covering Northeast India
    NE_INDIA_UTM_ZONES = {
        "EPSG:32646": (90.0, 96.0),  # Zone 46N
        "EPSG:32647": (96.0, 102.0),  # Zone 47N
    }

    def __init__(self, default_gsd: float = DEFAULT_GSD) -> None:
        self.default_gsd = default_gsd

    # ------------------------------------------------------------------
    # Area calculation
    # ------------------------------------------------------------------

    def pixels_to_area_km2(
        self,
        pixel_count: int,
        gsd_meters: Optional[float] = None,
    ) -> float:
        """Convert a pixel count to area in square kilometres.

        Args:
            pixel_count: Number of pixels in the mask region.
            gsd_meters: Ground sampling distance in metres. Falls back to
                ``self.default_gsd`` when *None*.

        Returns:
            Area in km^2.
        """
        gsd = gsd_meters if gsd_meters is not None else self.default_gsd
        area_m2 = pixel_count * (gsd ** 2)
        return area_m2 / 1_000_000.0

    def mask_to_area_km2(
        self,
        mask: np.ndarray,
        gsd_meters: Optional[float] = None,
    ) -> float:
        """Compute the area in km^2 of non-zero pixels in a binary mask.

        Args:
            mask: 2-D array where non-zero values mark the region of interest.
            gsd_meters: Ground sampling distance in metres.

        Returns:
            Area in km^2.
        """
        pixel_count = int(np.count_nonzero(mask))
        return self.pixels_to_area_km2(pixel_count, gsd_meters)

    def mask_to_area_per_class(
        self,
        mask: np.ndarray,
        class_names: List[str],
        gsd_meters: Optional[float] = None,
    ) -> Dict[str, float]:
        """Compute area for each class in a multi-class segmentation mask.

        Args:
            mask: 2-D integer array with class indices.
            class_names: Ordered list of class names.
            gsd_meters: Ground sampling distance in metres.

        Returns:
            Mapping of class name to area in km^2.
        """
        areas: Dict[str, float] = {}
        for idx, name in enumerate(class_names):
            count = int(np.sum(mask == idx))
            areas[name] = self.pixels_to_area_km2(count, gsd_meters)
        return areas

    # ------------------------------------------------------------------
    # GSD estimation
    # ------------------------------------------------------------------

    def estimate_gsd_from_raster(self, raster_path: str) -> float:
        """Estimate GSD from a georeferenced raster file.

        Args:
            raster_path: Path to a GeoTIFF or other ``rasterio``-readable file.

        Returns:
            Estimated GSD in metres.

        Raises:
            RuntimeError: If ``rasterio`` is not installed.
        """
        if not GEO_AVAILABLE:
            raise RuntimeError("rasterio is required for GSD estimation from raster files")

        with rasterio.open(raster_path) as src:
            transform = src.transform
            crs = src.crs

            pixel_width = abs(transform.a)
            pixel_height = abs(transform.e)

            if crs and crs.is_geographic:
                # Convert degrees to approximate metres at image centre
                center_lat = (src.bounds.bottom + src.bounds.top) / 2.0
                lat_rad = math.radians(center_lat)
                m_per_deg_lat = 111_132.92 - 559.82 * math.cos(2 * lat_rad)
                m_per_deg_lon = 111_412.84 * math.cos(lat_rad)
                gsd = (pixel_width * m_per_deg_lon + pixel_height * m_per_deg_lat) / 2.0
            else:
                gsd = (pixel_width + pixel_height) / 2.0

        logger.info("Estimated GSD: %.2f m/pixel from %s", gsd, raster_path)
        return gsd

    # ------------------------------------------------------------------
    # Coordinate transforms
    # ------------------------------------------------------------------

    def pixel_to_geo(
        self,
        row: int,
        col: int,
        transform: "rasterio.Affine",
    ) -> Tuple[float, float]:
        """Convert pixel coordinates to geographic coordinates.

        Args:
            row: Row index (y).
            col: Column index (x).
            transform: Affine transform of the raster.

        Returns:
            ``(longitude, latitude)`` tuple.
        """
        x, y = rasterio.transform.xy(transform, row, col)
        return (x, y)

    def reproject_coords(
        self,
        coords: List[Tuple[float, float]],
        src_crs: str = "EPSG:4326",
        dst_crs: str = "EPSG:32646",
    ) -> List[Tuple[float, float]]:
        """Reproject a list of (x, y) coordinate pairs.

        Args:
            coords: Input coordinates in the source CRS.
            src_crs: Source CRS string (e.g. ``"EPSG:4326"``).
            dst_crs: Destination CRS string.

        Returns:
            Reprojected coordinates.

        Raises:
            RuntimeError: If ``pyproj`` is not installed.
        """
        if not GEO_AVAILABLE:
            raise RuntimeError("pyproj is required for coordinate reprojection")

        transformer = Transformer.from_crs(src_crs, dst_crs, always_xy=True)
        reprojected = []
        for x, y in coords:
            rx, ry = transformer.transform(x, y)
            reprojected.append((rx, ry))
        return reprojected

    # ------------------------------------------------------------------
    # Mask to vector
    # ------------------------------------------------------------------

    def mask_to_polygons(
        self,
        mask: np.ndarray,
        transform: Optional["rasterio.Affine"] = None,
        crs: str = "EPSG:4326",
        min_area_pixels: int = 100,
    ) -> Optional["gpd.GeoDataFrame"]:
        """Convert a binary mask to vector polygons.

        Args:
            mask: 2-D binary array.
            transform: Affine transform for georeferencing.  When *None*
                a simple identity transform scaled by ``self.default_gsd``
                is used.
            crs: Coordinate reference system string.
            min_area_pixels: Ignore regions smaller than this many pixels.

        Returns:
            A ``GeoDataFrame`` of polygons, or *None* if ``rasterio`` / ``shapely``
            are not installed.
        """
        if not GEO_AVAILABLE:
            logger.warning("Geospatial libraries not available; skipping vectorisation")
            return None

        from rasterio.features import shapes as rasterio_shapes

        if transform is None:
            transform = from_bounds(0, 0, mask.shape[1] * self.default_gsd,
                                    mask.shape[0] * self.default_gsd,
                                    mask.shape[1], mask.shape[0])

        mask_uint8 = mask.astype(np.uint8)
        polygons = []
        values = []
        for geom, val in rasterio_shapes(mask_uint8, transform=transform):
            if val == 0:
                continue
            poly = shape(geom)
            if poly.area >= min_area_pixels * (self.default_gsd ** 2):
                polygons.append(poly)
                values.append(int(val))

        if not polygons:
            return None

        gdf = gpd.GeoDataFrame(
            {"class_value": values, "geometry": polygons},
            crs=crs,
        )
        return gdf

    # ------------------------------------------------------------------
    # Bounding box helpers
    # ------------------------------------------------------------------

    @staticmethod
    def get_utm_zone(longitude: float) -> str:
        """Return the EPSG code for the UTM zone containing *longitude*.

        Only northern-hemisphere zones are returned (suitable for India).

        Args:
            longitude: Longitude in decimal degrees.

        Returns:
            EPSG string such as ``"EPSG:32646"``.
        """
        zone_number = int((longitude + 180) / 6) + 1
        return f"EPSG:326{zone_number:02d}"

    @staticmethod
    def bbox_from_center(
        lat: float,
        lon: float,
        size_km: float = 10.0,
    ) -> Tuple[float, float, float, float]:
        """Compute a bounding box around a centre point.

        Args:
            lat: Centre latitude in degrees.
            lon: Centre longitude in degrees.
            size_km: Side length of the square box in km.

        Returns:
            ``(min_lon, min_lat, max_lon, max_lat)``
        """
        delta_lat = (size_km / 2.0) / 111.0
        delta_lon = (size_km / 2.0) / (111.0 * math.cos(math.radians(lat)))
        return (
            lon - delta_lon,
            lat - delta_lat,
            lon + delta_lon,
            lat + delta_lat,
        )
