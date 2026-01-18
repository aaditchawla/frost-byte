  
        
# Snow status service (fallback-first)
'''from __future__ import annotations
import time
from typing import Any, Dict, Optional, Tuple

import httpx

# caching the data
PLANIF_URL = "https://raw.githubusercontent.com/ludodefgh/planif-neige-public-api/main/data/planif-neige.json" # "live" snow status feed
GEOMAP_URL = "https://raw.githubusercontent.com/ludodefgh/planif-neige-public-api/main/data/geobase-map.json" # mapping that tells you what cote_rue_id corresponds to what street and address range

_planif_by_cote: Dict[str, Dict[str, Any]] = {} # lookup table: cote_rue_id -> planif record
_geomap: Dict[str, Dict[str, Any]] = {} # geobase map loaded as-is
_last_loaded_ts: float = 0.0 # when we last downloaded the data

REFRESH_EVERY = 20 * 60  # 20 minutes



async def load_planif_data(force: bool = False) -> None:
    """
    Loads data set into memory
    Refreshes every REFRESH_EVERY seconds unless force=True
    """
    global _planif_by_cote, _geomap, _last_loaded_ts
    now = time.time()
    if not force and _last_loaded_ts and (now-_last_loaded_ts) < REFRESH_EVERY:
        return
    async with httpx.AsyncClient(timeout = 30) as client:
        planif_resp = await client.get(PLANIF_URL)
        planif_resp.raise_for_status()
        planif_data = planif_resp.json()

        geomap_resp = await client.get(GEOMAP_URL)
        geomap_resp.raise_for_status()
        geomap_data = geomap_resp.json()
    planif_by_cote: Dict[str, Dict[str, Any]] = {}
    for rec in planif_data.get("planifications", []):
        cid = str(rec.get("cote_rue_id"))
        if cid:
            planif_by_cote[cid] = rec
    _planif_by_cote = planif_by_cote
    _geomap = geomap_data
    _last_loaded_ts = now

# reverse geocoding: converting (lat, lon) -> address
NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
async def reverse_geocode(lat: float, lon: float) -> Tuple[Optional[str], Optional[int]]:
    params = {
        "format":"jsonv2",
        "lat": str(lat),
        "lon" : str(lon),
        "zoom" : "18",
        "addressdetails":"1",
    }
    headers = {
        "User-Agent":"frost-byte"
    }
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(NOMINATIM_URL, params=params, headers=headers)
        r.raise_for_status()
        data = r.json()
    addr = data.get("address", {}) or {}
    street = addr.get("road") or addr.get("pedestrian") or addr.get("footway")
    hn = addr.get("house_number") # optional
    # converting house number to int
    house_number = None
    if isinstance(hn, str):
        try:
            house_number = int(hn.split("-")[0].strip()) # if house number is 123-123 we just take 123
        except Exception:
            house_number = None
    return street, house_number

def _norm(s: str) -> str: # normalizes the address, could vary in capitalization, accents, etc
    return "".join(ch.lower() for ch in s.strip() if ch.isalnum() or ch.isspace()).strip()

# find the best matching cote_rue_id to the address
def find_cote_rue_id(street: str, house_number: Optional[int]) -> Optional[str]:
    if not street:
        return None
    street_n = _norm(street)
    best_id = None
    best_range = None
    for cid, info in _geomap.items():
        nom_voie = info.get("nom_voie")
        if not nom_voie: # skips entries not the same street name
            continue
        if _norm(nom_voie) != street_n:
            continue
        if house_number is not None:
            try: 
                start = int(info.get("debut_adresse"))
                end = int(info.get("fin_adresse"))
            except Exception:
                continue
            if start <= house_number <= end:
                rng = end - start
                if best_range is None or rng < best_range:
                    best_range = rng
                    best_id = str(cid)
        else: # if there's no house number take the first street match
            best_id = str(cid)
            break
    return best_id

# converts the numeric codes in the dataset to state and score
def etat_to_status_risk(etat: Optional[int]) -> Tuple[str, float]:
    if etat is None:
        return("unknown", 0.3)
    mapping = {
        0: ("snowy", 0.9),
        1: ("cleared", 0.1),
        2: ("planned", 0.6),
        3: ("replanned", 0.7),
        4: ("replanned", 0.7),
        5: ("in_progress", 0.4),
        10: ("clear", 0.2),
    }
    return mapping.get(etat, ("unknown", 0.35))



async def get_snow_status(lat: float, lon: float) -> Dict[str, Any]:
    try:
        await load_planif_data()
        street, house_number = await reverse_geocode(lat, lon)
        if not street: # if no street then we can't match schedule obvi
            return {"status":"unknown", "risk":0.3, "source": "fallback_no_street"}
        cote_id = find_cote_rue_id(street, house_number)
        if not cote_id:
            return{
                "status": "unknown",
                "risk": 0.3,
                "source": "fallback_no_match",
                "street": street,
                "house_number": house_number,
            }
        planif = _planif_by_cote.get(cote_id)
        if not planif: # no current record for this street
            return {
                "status": "unknown",
                "risk": 0.3,
                "source": "fallback_no_planif",
                "cote_rue_id": cote_id,
                "street": street,
                "house_number": house_number,
            }
        etat = planif.get("etat_deneig")
        status, risk = etat_to_status_risk(etat)
        return {
                "status": status,
                "risk": risk,
                "source": "planif_neige_public_api",
                "cote_rue_id": cote_id,
                "street": street,
                "house_number": house_number,
            }
    except Exception:
        return {"status": "unknown", "risk": 0.3, "source": "fallback_exception"}'''

# Snow status service (fallback-first)
from __future__ import annotations
import time
from typing import Any, Dict, Optional, Tuple

import httpx
from services.scoring.interfaces import SnowServiceInterface

# caching the data
PLANIF_URL = "https://raw.githubusercontent.com/ludodefgh/planif-neige-public-api/main/data/planif-neige.json" # "live" snow status feed
GEOMAP_URL = "https://raw.githubusercontent.com/ludodefgh/planif-neige-public-api/main/data/geobase-map.json" # mapping that tells you what cote_rue_id corresponds to what street and address range

_planif_by_cote: Dict[str, Dict[str, Any]] = {} # lookup table: cote_rue_id -> planif record
_geomap: Dict[str, Dict[str, Any]] = {} # geobase map loaded as-is
_last_loaded_ts: float = 0.0 # when we last downloaded the data

REFRESH_EVERY = 20 * 60  # 20 minutes

# Add caching for reverse geocoding and snow status
_SNOW_CACHE = {}
_SNOW_CACHE_GRID_SIZE = 0.002 # ~100m grid

def _get_snow_cache_key(lat: float, lon: float) -> str:
    """Round coordinates to cache grid"""
    lat_rounded = round(lat / _SNOW_CACHE_GRID_SIZE) * _SNOW_CACHE_GRID_SIZE
    lon_rounded = round(lon / _SNOW_CACHE_GRID_SIZE) * _SNOW_CACHE_GRID_SIZE
    return f"{lat_rounded:.4f},{lon_rounded:.4f}"

async def load_planif_data(force: bool = False) -> None:
    """
    Loads data set into memory
    Refreshes every REFRESH_EVERY seconds unless force=True
    """
    global _planif_by_cote, _geomap, _last_loaded_ts
    now = time.time()
    if not force and _last_loaded_ts and (now-_last_loaded_ts) < REFRESH_EVERY:
        return
    async with httpx.AsyncClient(timeout = 30) as client:
        planif_resp = await client.get(PLANIF_URL)
        planif_resp.raise_for_status()
        planif_data = planif_resp.json()

        geomap_resp = await client.get(GEOMAP_URL)
        geomap_resp.raise_for_status()
        geomap_data = geomap_resp.json()
    planif_by_cote: Dict[str, Dict[str, Any]] = {}
    for rec in planif_data.get("planifications", []):
        cid = str(rec.get("cote_rue_id"))
        if cid:
            planif_by_cote[cid] = rec
    _planif_by_cote = planif_by_cote
    _geomap = geomap_data
    _last_loaded_ts = now

# reverse geocoding: converting (lat, lon) -> address
NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
async def reverse_geocode(lat: float, lon: float) -> Tuple[Optional[str], Optional[int]]:
    params = {
        "format":"jsonv2",
        "lat": str(lat),
        "lon" : str(lon),
        "zoom" : "18",
        "addressdetails":"1",
    }
    headers = {
        "User-Agent":"frost-byte"
    }
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(NOMINATIM_URL, params=params, headers=headers)
        r.raise_for_status()
        data = r.json()
    addr = data.get("address", {}) or {}
    street = addr.get("road") or addr.get("pedestrian") or addr.get("footway")
    hn = addr.get("house_number") # optional
    # converting house number to int
    house_number = None
    if isinstance(hn, str):
        try:
            house_number = int(hn.split("-")[0].strip()) # if house number is 123-123 we just take 123
        except Exception:
            house_number = None
    return street, house_number

def _norm(s: str) -> str: # normalizes the address, could vary in capitalization, accents, etc
    return "".join(ch.lower() for ch in s.strip() if ch.isalnum() or ch.isspace()).strip()

# find the best matching cote_rue_id to the address
def find_cote_rue_id(street: str, house_number: Optional[int]) -> Optional[str]:
    if not street:
        return None
    street_n = _norm(street)
    best_id = None
    best_range = None
    for cid, info in _geomap.items():
        nom_voie = info.get("nom_voie")
        if not nom_voie: # skips entries not the same street name
            continue
        if _norm(nom_voie) != street_n:
            continue
        if house_number is not None:
            try: 
                start = int(info.get("debut_adresse"))
                end = int(info.get("fin_adresse"))
            except Exception:
                continue
            if start <= house_number <= end:
                rng = end - start
                if best_range is None or rng < best_range:
                    best_range = rng
                    best_id = str(cid)
        else: # if there's no house number take the first street match
            best_id = str(cid)
            break
    return best_id

# converts the numeric codes in the dataset to state and score
def etat_to_status_risk(etat: Optional[int]) -> Tuple[str, float]:
    if etat is None:
        return("unknown", 0.3)
    mapping = {
        0: ("snowy", 0.9),
        1: ("cleared", 0.1),
        2: ("planned", 0.6),
        3: ("replanned", 0.7),
        4: ("replanned", 0.7),
        5: ("in_progress", 0.4),
        10: ("clear", 0.2),
    }
    return mapping.get(etat, ("unknown", 0.35))



async def get_snow_status(lat: float, lon: float) -> Dict[str, Any]:
    # Check cache first
    cache_key = _get_snow_cache_key(lat, lon)
    if cache_key in _SNOW_CACHE:
        return _SNOW_CACHE[cache_key]
    
    try:
        await load_planif_data()
        street, house_number = await reverse_geocode(lat, lon)
        if not street: # if no street then we can't match schedule obvi
            result = {"status":"unknown", "risk":0.3, "source": "fallback_no_street"}
            _SNOW_CACHE[cache_key] = result
            return result
        
        cote_id = find_cote_rue_id(street, house_number)
        if not cote_id:
            result = {
                "status": "unknown",
                "risk": 0.3,
                "source": "fallback_no_match",
                "street": street,
                "house_number": house_number,
            }
            _SNOW_CACHE[cache_key] = result
            return result
        
        planif = _planif_by_cote.get(cote_id)
        if not planif: # no current record for this street
            result = {
                "status": "unknown",
                "risk": 0.3,
                "source": "fallback_no_planif",
                "cote_rue_id": cote_id,
                "street": street,
                "house_number": house_number,
            }
            _SNOW_CACHE[cache_key] = result
            return result
        
        etat = planif.get("etat_deneig")
        status, risk = etat_to_status_risk(etat)
        result = {
                "status": status,
                "risk": risk,
                "source": "planif_neige_public_api",
                "cote_rue_id": cote_id,
                "street": street,
                "house_number": house_number,
            }
        _SNOW_CACHE[cache_key] = result
        return result
    except Exception:
        result = {"status": "unknown", "risk": 0.3, "source": "fallback_exception"}
        _SNOW_CACHE[cache_key] = result
        return result

class SnowService(SnowServiceInterface):
    """Real snow service implementation."""
    
    async def get_snow_status(self, lat: float, lon: float) -> dict:
        """
        Returns snow status matching the interface.
        """
        # Call the module-level function (avoiding name conflict by using globals())
        result = await globals()['get_snow_status'](lat, lon)
        
        # Map to interface format (already matches, but ensure consistency)
        return {
            "status": result.get("status", "unknown"),
            "risk": result.get("risk", 0.3),
        }