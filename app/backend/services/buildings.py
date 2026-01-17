# Building feature extraction (Overpass)
import httpx
OVERPASS_URL = "https://overpass-api.de/api/interpreter"


def _buildings_query(lat: float, lon: float, radius_m: int) -> str:
    return f"""
    [out:json][timeout:25];
    (
      way(around:{radius_m},{lat},{lon})["building"];
      relation(around:{radius_m},{lat},{lon})["building"];
    );
    out center;
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
    return {
        "building_count_40m": len(elements),
        "building_area_m2_40m": None,
        "source": "overpass",
    }

    

