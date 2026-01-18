# Building feature extraction (Overpass)
import httpx
import re

_NUM = re.compile(r"(-?\d+(\.\d+)?)")
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

def _parse_number(val: str): # extracts a number from strings like "12", "12m"
    if not val:
        return None
    m = _NUM.search(val)
    if not m:
        return None
    try:
        return float(m.group(1))
    except ValueError:
        return None
    
def _estimate_height_m(tags: dict) -> float | None:
    # direct height (meters)
    h = _parse_number(tags.get("height", ""))
    if h and h > 0:
        return h

    # building levels (floors) -> meters
    levels = _parse_number(tags.get("building:levels", ""))
    if levels and levels > 0:
        return levels * 3.0  # ~3m per floor (estimation)

    return None


def _buildings_query(lat: float, lon: float, radius_m: int) -> str:
    return f"""
    [out:json][timeout:25];
    (
      way(around:{radius_m},{lat},{lon})["building"];
      relation(around:{radius_m},{lat},{lon})["building"];
    );
    out tags center;
    """

async def get_building_features(lat: float, lon: float, radius_m: int = 40):
    query = _buildings_query(lat, lon, radius_m)
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(OVERPASS_URL, content=query) # holds what overpass sent
            response.raise_for_status() # throws an exception if overpass returned an error code
            data = response.json() # parses response body as json
    except Exception:
        return {
        "building_count_40m": 0,
        "building_area_m2_40m": None,
        "source": "overpass_error_default",
    }
    elements = data.get("elements", []) # elements is where overpass stores buildings, if key is missing it uses an empty list
    heights = []
    for el in elements:
        tags = el.get("tags") or {}
        h = _estimate_height_m(tags)
        if h is not None:
            heights.append(h)
    
    avg_height = (sum(heights) / len(heights)) if heights else None
    
    return {
        "building_count_40m": len(elements),
        "avg_building_height_m": avg_height,
        "height_samples": len(heights),
        "building_area_m2_40m": None, # planned shelter metric (total building footprint area)
                                      # not computed in the MVP, left as None intentionally
        "source": "overpass",
    }