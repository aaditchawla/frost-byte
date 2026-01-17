from typing import Dict, Any, Tuple
from abc import ABC, abstractmethod

class BuildingServiceInterface(ABC):
    """Interface for building density service (Person 3)."""
    
    @abstractmethod
    async def get_building_density(
        self, lat: float, lon: float
    ) -> Dict[str, Any]:
        """
        Returns:
            {
                "count": int,
                "area": float,
                "shelter_score": float  # 0-1
            }
        """
        pass

class SnowServiceInterface(ABC):
    """Interface for snow status service (Person 3)."""
    
    @abstractmethod
    async def get_snow_status(
        self, lat: float, lon: float
    ) -> Dict[str, Any]:
        """
        Returns:
            {
                "status": str,  # "cleared" | "in_progress" | "planned" | "unknown"
                "risk": float    # 0-1
            }
        """
        pass