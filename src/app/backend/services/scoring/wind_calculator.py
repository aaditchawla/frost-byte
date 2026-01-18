import math
from typing import Tuple

def calculate_headwind_factor(
    walking_bearing: float,  # Direction you're walking (0-360)
    wind_direction: float,   # Direction wind is coming FROM (0-360)
    wind_speed: float        # Wind speed in m/s
) -> float:
    """
    Calculate headwind component.
    
    Args:
        walking_bearing: Direction of travel (0=North, 90=East)
        wind_direction: Direction wind is coming FROM (meteorological)
        wind_speed: Wind speed in m/s
    
    Returns:
        Headwind component in m/s (0 if tailwind)
    """
    # Calculate angle difference
    angle_diff = abs(walking_bearing - wind_direction)
    
    # Normalize to 0-180 degrees
    if angle_diff > 180:
        angle_diff = 360 - angle_diff
    
    # Convert to radians
    angle_rad = math.radians(angle_diff)
    
    # Headwind = wind_speed * cos(angle)
    # cos(0) = 1 (direct headwind)
    # cos(90) = 0 (crosswind)
    # cos(180) = -1 (tailwind)
    headwind = wind_speed * math.cos(angle_rad)
    
    # Only penalize headwind, not tailwind
    headwind = max(0, headwind)
    
    return headwind

def calculate_wind_cost(
    headwind: float,
    building_shelter: float  # 0-1, where 1 = fully sheltered
) -> float:
    """
    Calculate wind cost for a segment.
    
    Higher exposure = higher cost.
    """
    exposure = 1 - building_shelter
    wind_cost = headwind * exposure
    return wind_cost