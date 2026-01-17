import requests
from typing import List, Tuple, Dict, Any
from .config import ORS_API_KEY, ORS_BASE_URL

def get_route_alternatives(
    start: Tuple[float, float],  # (lon, lat)
    end: Tuple[float, float]
) -> List[Dict[str, Any]]:
    """
    Get 2-3 alternative walking routes from OpenRouteService.
    
    Returns list of routes with geometry and distance.
    """
    if not ORS_API_KEY:
        raise ValueError("ORS_API_KEY is not set! Check your .env file.")
    
    url = f"{ORS_BASE_URL}/directions/foot-walking"
    
    # Format coordinates as OpenRouteService expects: "lon,lat"
    start_str = f"{start[0]},{start[1]}"
    end_str = f"{end[0]},{end[1]}"
    
    # Headers as shown in their example
    headers = {
        'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
    }
    
    # Parameters: api_key as query param, start and end as separate params
    params = {
        "api_key": ORS_API_KEY,  # API key as query parameter (not header!)
        "start": start_str,       # Format: "lon,lat"
        "end": end_str,           # Format: "lon,lat"
        "alternatives": 2,        # Get 2 alternatives (total 3 routes)
    }
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        
        # Check status code first
        if response.status_code != 200:
            error_text = response.text[:500]  # First 500 chars of error
            raise Exception(f"OpenRouteService API returned status {response.status_code}: {error_text}")
        
        # Parse JSON response
        try:
            data = response.json()
        except ValueError as e:
            raise Exception(f"Invalid JSON response from OpenRouteService: {response.text[:200]}")
        
        # Check if response contains an error
        if "error" in data:
            error_msg = data.get("error", "Unknown error from OpenRouteService")
            raise Exception(f"OpenRouteService error: {error_msg}")
        
        # OpenRouteService returns GeoJSON FeatureCollection format
        # Structure: {"type": "FeatureCollection", "features": [...]}
        if data.get("type") == "FeatureCollection" and "features" in data:
            routes = []
            
            for feature in data.get("features", []):
                # Each feature has: type, geometry, properties
                if feature.get("type") != "Feature":
                    continue
                
                geometry = feature.get("geometry")
                properties = feature.get("properties", {})
                
                # Summary is in properties
                summary = properties.get("summary", {})
                
                if not geometry:
                    continue  # Skip invalid routes
                
                routes.append({
                    "geometry": geometry,
                    "distance_m": summary.get("distance", 0),
                    "duration_s": summary.get("duration", 0)
                })
            
            if not routes:
                raise Exception("No valid routes returned from OpenRouteService")
            
            return routes
        
        # Fallback: try old format with "routes" key (for JSON format)
        elif "routes" in data:
            routes = []
            
            for route in data.get("routes", []):
                if "geometry" not in route or "summary" not in route:
                    continue
                
                routes.append({
                    "geometry": route["geometry"],
                    "distance_m": route["summary"].get("distance", 0),
                    "duration_s": route["summary"].get("duration", 0)
                })
            
            if not routes:
                raise Exception("No valid routes returned from OpenRouteService")
            
            return routes
        
        else:
            raise Exception(f"Unexpected response format from OpenRouteService. Response type: {data.get('type')}, keys: {list(data.keys())[:5]}")
        
    except requests.exceptions.RequestException as e:
        raise Exception(f"Network error calling OpenRouteService: {str(e)}")
    except Exception as e:
        # Re-raise with better error message
        raise Exception(f"Error getting routes from OpenRouteService: {str(e)}")