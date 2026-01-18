from typing import List, Tuple, Dict, Any
import math

def haversine_distance(point1: Tuple[float, float], point2: Tuple[float, float]) -> float:
    """Calculate distance between two lat/lon points in meters."""
    R = 6371000  # Earth radius in meters
    
    lat1, lon1 = math.radians(point1[1]), math.radians(point1[0])
    lat2, lon2 = math.radians(point2[1]), math.radians(point2[0])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c

def interpolate_point(
    point1: Tuple[float, float],
    point2: Tuple[float, float],
    fraction: float
) -> Tuple[float, float]:
    """Interpolate a point between two coordinates."""
    lon = point1[0] + (point2[0] - point1[0]) * fraction
    lat = point1[1] + (point2[1] - point1[1]) * fraction
    return (lon, lat)

def sample_route_points(
    geometry: Dict[str, Any],
    interval_m: float = 40.0
) -> List[Tuple[float, float]]:
    """
    Sample points along a route every ~40m.
    
    Args:
        geometry: GeoJSON geometry from ORS
        interval_m: Sampling interval in meters
    
    Returns:
        List of (lon, lat) tuples
    """
    coordinates = geometry.get("coordinates", [])
    if not coordinates:
        return []
    
    sampled_points = []
    current_distance = 0.0
    
    for i in range(len(coordinates) - 1):
        point1 = tuple(coordinates[i])
        point2 = tuple(coordinates[i + 1])
        
        segment_distance = haversine_distance(point1, point2)
        
        # Add start point of segment
        if i == 0:
            sampled_points.append(point1)
        
        # Sample points along segment
        num_samples = int(segment_distance / interval_m)
        for j in range(1, num_samples + 1):
            fraction = j / (num_samples + 1)
            sampled_point = interpolate_point(point1, point2, fraction)
            sampled_points.append(sampled_point)
        
        # Add end point
        sampled_points.append(point2)
    
    return sampled_points

def calculate_bearing(
    point1: Tuple[float, float],
    point2: Tuple[float, float]
) -> float:
    """
    Calculate bearing (direction) from point1 to point2 in degrees.
    
    Returns:
        Bearing in degrees (0-360), where 0 is North
    """
    lat1, lon1 = math.radians(point1[1]), math.radians(point1[0])
    lat2, lon2 = math.radians(point2[1]), math.radians(point2[0])
    
    dlon = lon2 - lon1
    
    y = math.sin(dlon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    
    bearing = math.atan2(y, x)
    bearing = math.degrees(bearing)
    bearing = (bearing + 360) % 360  # Normalize to 0-360
    
    return bearing