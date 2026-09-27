"""
Download real satellite imagery from NASA GIBS for PRAVAHA — Fixed version.
Uses proven dates with good MODIS coverage over Northeast India.
"""

import os
import urllib.request
from datetime import datetime, timedelta

OUTPUT_BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'test_images')
GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
IMG_W, IMG_H = 1024, 1024

# bbox: minx,miny,maxx,maxy (lng,lat order for CRS:84)
def bbox(lat, lng, span):
    return f"{lng-span},{lat-span},{lng+span},{lat+span}"

# ── Proven working GIBS dates for Northeast India (MODIS Terra) ──────────────
# Strategy: Use late October / November (post-monsoon) for clear baseline views
# and July/August for flood/event views (monsoon peak)

PAIRS = [
    {
        "folder": "landslide_manipur",
        "lat": 25.018, "lng": 93.734, "span": 1.2,
        # Nov = post-monsoon clear (green forests, dry roads)
        "before_date": "2023-11-15",
        # Sep = during monsoon, potential landslide signatures
        "after_date": "2023-08-25",
        "layer": "MODIS_Terra_CorrectedReflectance_TrueColor",
    },
    {
        "folder": "flood_brahmaputra",
        "lat": 26.184, "lng": 91.748, "span": 1.8,
        # Nov = clear, river normal
        "before_date": "2023-11-20",
        # July = Assam floods (Brahmaputra at peak; brown floodwater clearly visible)
        "after_date": "2023-07-10",
        "layer": "MODIS_Terra_CorrectedReflectance_TrueColor",
    },
    {
        "folder": "deforestation_meghalaya",
        "lat": 25.578, "lng": 91.893, "span": 1.4,
        # 2019 = dense forest cover
        "before_date": "2019-11-10",
        # 2023 = post-clearing
        "after_date": "2023-11-10",
        "layer": "MODIS_Terra_CorrectedReflectance_TrueColor",
    },
    {
        "folder": "cyclone_odisha",
        "lat": 20.296, "lng": 85.825, "span": 1.5,
        # Before cyclone Michaung (Dec 2023)
        "before_date": "2023-11-25",
        # After Cyclone Michaung landfall (Dec 4-5 2023)
        "after_date": "2023-12-06",
        "layer": "MODIS_Terra_CorrectedReflectance_TrueColor",
    },
    {
        "folder": "drought_tripura",
        "lat": 23.502, "lng": 91.752, "span": 1.3,
        # After monsoon - water reservoirs full
        "before_date": "2023-10-20",
        # Pre-monsoon - reservoirs depleted, fields dry
        "after_date": "2024-05-10",
        "layer": "MODIS_Terra_CorrectedReflectance_TrueColor",
    },
    {
        "folder": "road_damage_mizoram",
        "lat": 23.165, "lng": 92.938, "span": 1.2,
        # Dry season clear
        "before_date": "2023-12-15",
        # Monsoon season (roads prone to damage, lush but hazardous)
        "after_date": "2023-09-05",
        "layer": "MODIS_Terra_CorrectedReflectance_TrueColor",
    },
    {
        "folder": "urban_guwahati",
        "lat": 26.144, "lng": 91.736, "span": 1.0,
        # 2013 - less urban
        "before_date": "2013-11-15",
        # 2023 - much more developed
        "after_date": "2023-11-15",
        "layer": "MODIS_Terra_CorrectedReflectance_TrueColor",
    },
]

def build_url(layer, date, lat, lng, span):
    bb = bbox(lat, lng, span)
    return (
        f"{GIBS_WMS}"
        f"?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap"
        f"&FORMAT=image/jpeg&TRANSPARENT=false"
        f"&LAYERS={layer}&CRS=CRS:84&STYLES="
        f"&WIDTH={IMG_W}&HEIGHT={IMG_H}"
        f"&BBOX={bb}&TIME={date}"
    )

def is_valid_jpeg(data):
    """Check if downloaded data is a real JPEG (not black/empty/error)."""
    if not data or len(data) < 5000:
        return False
    if data[:2] != b'\xff\xd8':
        return False
    # Check it's not a nearly-black image by sampling a few bytes mid-file
    # Real satellite images have varied pixel values
    sample = data[len(data)//4 : len(data)//4 + 200]
    unique_bytes = len(set(sample))
    return unique_bytes > 10  # Black tiles have very few unique byte values

def download(url, out_path, fallback_dates=None, lat=None, lng=None, span=None, layer=None):
    dates_to_try = [None] + (fallback_dates or [])
    current_url = url
    
    for i, fallback_date in enumerate(dates_to_try):
        if fallback_date and lat and lng and span and layer:
            current_url = build_url(layer, fallback_date, lat, lng, span)
        
        print(f"  GET {current_url[current_url.find('TIME='):][:30]}")
        try:
            req = urllib.request.Request(
                current_url,
                headers={"User-Agent": "PRAVAHA-SatelliteDownloader/2.0"}
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
                if is_valid_jpeg(data):
                    with open(out_path, 'wb') as f:
                        f.write(data)
                    print(f"  ✅ {len(data)//1024} KB  → {os.path.basename(out_path)}")
                    return True
                else:
                    print(f"  ⚠  Bad image ({len(data)} bytes, likely night/cloud), trying next date...")
        except Exception as e:
            print(f"  ✗  {e}")
    
    print(f"  ❌ All dates failed for {out_path}")
    return False

def main():
    print("\n🛰️  PRAVAHA NASA GIBS Real Satellite Imagery Downloader v2\n")
    ok, fail = 0, 0

    for p in PAIRS:
        folder = p["folder"]
        out_dir = os.path.normpath(os.path.join(OUTPUT_BASE, folder))
        os.makedirs(out_dir, exist_ok=True)
        lat, lng, span, layer = p["lat"], p["lng"], p["span"], p["layer"]

        print(f"\n📍 {folder}")

        # Generate fallback dates: +/- 1, 2, 3 days to find cloud-free pass
        def fallbacks(date_str, n=6):
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            result = []
            for delta in [1, -1, 2, -2, 3, -3, 5, -5, 7, -7]:
                result.append((dt + timedelta(days=delta)).strftime("%Y-%m-%d"))
            return result[:n]

        # Before
        before_url = build_url(layer, p["before_date"], lat, lng, span)
        before_path = os.path.join(out_dir, "before.jpg")
        if download(before_url, before_path, fallbacks(p["before_date"]), lat, lng, span, layer):
            ok += 1
        else:
            fail += 1

        # After
        after_url = build_url(layer, p["after_date"], lat, lng, span)
        after_path = os.path.join(out_dir, "after.jpg")
        if download(after_url, after_path, fallbacks(p["after_date"]), lat, lng, span, layer):
            ok += 1
        else:
            fail += 1

    print(f"\n{'='*55}")
    print(f"✅ Success: {ok}   ❌ Failed: {fail}")
    print(f"Output:    {os.path.normpath(OUTPUT_BASE)}")

if __name__ == "__main__":
    main()
