from .interfaces import BuildingServiceInterface, SnowServiceInterface
from typing import Dict, Any

class MockBuildingService(BuildingServiceInterface):
    """Mock building service for testing."""
    
    async def get_building_density(
        self, lat: float, lon: float
    ) -> Dict[str, Any]:
        # Return mock data
        return {
            "count": 10,
            "area": 500.0,
            "shelter_score": 0.6  # 60% sheltered
        }

class MockSnowService(SnowServiceInterface):
    """Mock snow service for testing."""
    
    async def get_snow_status(
        self, lat: float, lon: float
    ) -> Dict[str, Any]:
        # Return mock data
        return {
            "status": "cleared",
            "risk": 0.1
        }