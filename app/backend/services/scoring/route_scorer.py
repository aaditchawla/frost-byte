from typing import Dict, Any, List
from dataclasses import dataclass

@dataclass
class RouteMetrics:
    """Metrics for a single route."""
    distance_m: float
    wind_cost: float
    snow_cost: float

@dataclass
class RouteScore:
    """Scoring result for a route."""
    total_score: float
    breakdown: RouteMetrics

class RouteScorer:
    """Scores routes based on distance, wind, and snow."""
    
    def __init__(
        self,
        weight_distance: float = 1.0,
        weight_wind: float = 20.0,
        weight_snow: float = 50.0
    ):
        self.weight_distance = weight_distance
        self.weight_wind = weight_wind
        self.weight_snow = weight_snow
    
    def score_route(self, metrics: RouteMetrics) -> RouteScore:
        """
        Calculate total score for a route.
        Lower score = better route.
        """
        total_score = (
            self.weight_distance * metrics.distance_m +
            self.weight_wind * metrics.wind_cost +
            self.weight_snow * metrics.snow_cost
        )
        
        return RouteScore(
            total_score=total_score,
            breakdown=metrics
        )
    
    def choose_best_route(
        self,
        routes_with_scores: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Choose route with lowest score."""
        return min(routes_with_scores, key=lambda r: r["score"].total_score)