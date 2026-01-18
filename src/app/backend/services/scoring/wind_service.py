import requests
from typing import Dict, Any, Tuple
from datetime import datetime, timedelta
from functools import lru_cache

# Simple cache (in production, use Redis)
_wind_cache = {}

def get_wind_data(lat: float, lon: float) -> Dict[str, float]:
    """
    Get wind speed and direction for a location.
    Uses OpenWeatherMap or Open-Meteo (free, no key needed).
    
    Returns:
        {"speed": float (m/s), "direction": float (degrees)}
    """
    # Check cache (5 minute TTL)
    cache_key = f"{round(lat, 2)}_{round(lon, 2)}"
    if cache_key in _wind_cache:
        cached_time, cached_data = _wind_cache[cache_key]
        if datetime.now() - cached_time < timedelta(minutes=5):
            return cached_data
    
    # Open-Meteo (free, no API key)
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "wind_speed_10m,wind_direction_10m",
        "timezone": "America/Montreal"
    }
    
    response = requests.get(url, params=params)
    response.raise_for_status()
    
    data = response.json()
    current = data["current"]
    
    wind_data = {
        "speed": current["wind_speed_10m"],  # m/s
        "direction": current["wind_direction_10m"]  # degrees (meteorological)
    }
    
    # Cache it
    _wind_cache[cache_key] = (datetime.now(), wind_data)
    
    return wind_data