# Building feature extraction (Overpass)
'''import httpx
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
    }'''

# Building feature extraction (Overpass)
import httpx
import re
from services.scoring.interfaces import BuildingServiceInterface

_NUM = re.compile(r"(-?\d+(\.\d+)?)")
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Add caching to reduce API calls
_BUILDING_CACHE = {}
_CACHE_GRID_SIZE = 0.002  # ~100m grid (points within 100m share cache)

def _get_cache_key(lat: float, lon: float) -> str:
    """Round coordinates to cache grid"""
    lat_rounded = round(lat / _CACHE_GRID_SIZE) * _CACHE_GRID_SIZE
    lon_rounded = round(lon / _CACHE_GRID_SIZE) * _CACHE_GRID_SIZE
    return f"{lat_rounded:.4f},{lon_rounded:.4f}"

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

def _compute_shelter_score(building_count: int, avg_height: float | None) -> float:
    """
    Compute shelter score (0-1) based on building count and height.
    More buildings + taller buildings = higher shelter score.
    """
    if building_count == 0:
        return 0.0
    
    # Base score from count (0-0.6 range)
    count_score = min(building_count / 20.0, 0.6)  # Cap at 0.6 for count
    
    # Height bonus (0-0.4 range)
    height_bonus = 0.0
    if avg_height is not None:
        height_bonus = min(avg_height / 30.0, 0.4)  # Cap at 0.4 for height
    
    return min(count_score + height_bonus, 1.0)

async def get_building_features(lat: float, lon: float, radius_m: int = 40):
    # Check cache first
    cache_key = _get_cache_key(lat, lon)
    if cache_key in _BUILDING_CACHE:
        return _BUILDING_CACHE[cache_key]
    
    query = _buildings_query(lat, lon, radius_m)
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(OVERPASS_URL, content=query) # holds what overpass sent
            response.raise_for_status() # throws an exception if overpass returned an error code
            data = response.json() # parses response body as json
    except Exception:
        result = {
            "building_count_40m": 0,
            "building_area_m2_40m": None,
            "source": "overpass_error_default",
        }
        _BUILDING_CACHE[cache_key] = result  # Cache even errors
        return result
    
    elements = data.get("elements", []) # elements is where overpass stores buildings, if key is missing it uses an empty list
    heights = []
    for el in elements:
        tags = el.get("tags") or {}
        h = _estimate_height_m(tags)
        if h is not None:
            heights.append(h)
    
    avg_height = (sum(heights) / len(heights)) if heights else None
    
    result = {
        "building_count_40m": len(elements),
        "avg_building_height_m": avg_height,
        "height_samples": len(heights),
        "building_area_m2_40m": None, # planned shelter metric (total building footprint area)
                                      # not computed in the MVP, left as None intentionally
        "source": "overpass",
    }
    
    # Cache the result
    _BUILDING_CACHE[cache_key] = result
    return result

class BuildingService(BuildingServiceInterface):
        
    async def get_building_density(self, lat: float, lon: float) -> dict:
        """
        Returns building density info matching the interface.
        """
        features = await get_building_features(lat, lon, radius_m=40)
        
        building_count = features.get("building_count_40m", 0)
        avg_height = features.get("avg_building_height_m")
        area = features.get("building_area_m2_40m")  # None for now
        
        # Compute shelter score
        shelter_score = _compute_shelter_score(building_count, avg_height)
        
        return {
            "count": building_count,
            "area": area if area is not None else 0.0,
            "shelter_score": shelter_score,
        }