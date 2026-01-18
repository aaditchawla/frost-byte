from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Tuple
import sys
import os
from pathlib import Path

# Add services to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from services.routing.ors_service import get_route_alternatives
from services.routing.route_sampler import sample_route_points, calculate_bearing
from services.scoring.wind_service import get_wind_data
from services.scoring.wind_calculator import calculate_headwind_factor, calculate_wind_cost
from services.scoring.route_scorer import RouteScorer, RouteMetrics
from services.buildings import BuildingService
from services.snow import SnowService
from services.scoring.mock_services import MockBuildingService, MockSnowService
from services.scoring.gemini import generate_route_explanation

app = FastAPI(title="Frost Byte API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
scorer = RouteScorer()
building_service = BuildingService()  # Real service
snow_service = SnowService()  # Real service

class RouteRequest(BaseModel):
    start: List[float]  # [lon, lat]
    end: List[float]    # [lon, lat]

class RouteResponse(BaseModel):
    routes: List[dict]
    chosen_route_id: str
    wind: dict
    explanation: dict 

@app.post("/route", response_model=RouteResponse)
async def compute_routes(request: RouteRequest):
    """
    Compute walking routes with wind and snow awareness.
    """
    try:
        start = tuple(request.start)
        end = tuple(request.end)
        
        # 1. Get route alternatives from ORS
        alternatives = get_route_alternatives(start, end)
        
        if not alternatives:
            raise HTTPException(status_code=404, detail="No routes found")
        
        # 2. Get wind data (use midpoint of first route)
        midpoint_lat = (start[1] + end[1]) / 2
        midpoint_lon = (start[0] + end[0]) / 2
        wind_data = get_wind_data(midpoint_lat, midpoint_lon)
        
        # 3. Process each route
        routes_with_scores = []
        
        for idx, route in enumerate(alternatives):
            geometry = route["geometry"]
            distance_m = route["distance_m"]
            duration_s = route.get("duration_s", int(distance_m / 1.4))  # Get from ORS or estimate
            
            # Sample points
            sampled_points = sample_route_points(geometry, interval_m=40.0)
            
            # Calculate metrics
            '''wind_cost = 0.0
            snow_cost = 0.0
            
            for i in range(len(sampled_points) - 1):
                point = sampled_points[i]
                next_point = sampled_points[i + 1]
                
                # Get building density (Person 3)
                building = await building_service.get_building_density(
                    point[1], point[0]  # lat, lon
                )
                
                # Get snow status (Person 3)
                snow = await snow_service.get_snow_status(
                    point[1], point[0]  # lat, lon
                )
                
                # Calculate bearing
                bearing = calculate_bearing(point, next_point)
                
                # Calculate headwind
                headwind = calculate_headwind_factor(
                    bearing,
                    wind_data["direction"],
                    wind_data["speed"]
                )
                
                # Calculate wind cost
                segment_wind_cost = calculate_wind_cost(
                    headwind,
                    building["shelter_score"]
                )
                wind_cost += segment_wind_cost
                
                # Add snow cost
                snow_cost += snow["risk"]'''
                            # Calculate metrics
            wind_cost = 0.0
            snow_cost = 0.0
            
            # Track last snow status (update every 20 points)
            last_snow = None
            
            for i in range(len(sampled_points) - 1):
                point = sampled_points[i]
                next_point = sampled_points[i + 1]
                
                # Get building density (Person 3)
                building = await building_service.get_building_density(
                    point[1], point[0]  # lat, lon
                )
                
                # Get snow status (Person 3) - only every 20 points
                if i % 20 == 0 or last_snow is None:
                    # Update snow status every 20 points
                    last_snow = await snow_service.get_snow_status(
                        point[1], point[0]  # lat, lon
                    )
                
                # Use the last known snow status
                snow = last_snow
                
                # Calculate bearing
                bearing = calculate_bearing(point, next_point)
                
                # Calculate headwind
                headwind = calculate_headwind_factor(
                    bearing,
                    wind_data["direction"],
                    wind_data["speed"]
                )
                
                # Calculate wind cost
                segment_wind_cost = calculate_wind_cost(
                    headwind,
                    building["shelter_score"]
                )
                wind_cost += segment_wind_cost
                
                # Add snow cost
                snow_cost += snow["risk"]
            
            # Score route
            metrics = RouteMetrics(
                distance_m=distance_m,
                wind_cost=wind_cost,
                snow_cost=snow_cost
            )
            score = scorer.score_route(metrics)
            
            route_id = f"route_{idx}"
            
            routes_with_scores.append({
                "id": route_id,
                "geojson": geometry,
                "distance_m": distance_m,
                "duration_s": duration_s,  # Preserve duration from ORS
                "score": score,
                "metrics": {
                    "distance_m": metrics.distance_m,
                    "wind_cost": metrics.wind_cost,
                    "snow_cost": metrics.snow_cost
                }
            })
        
        # 4. Choose best route (lowest score = best route)
        best_route = scorer.choose_best_route(routes_with_scores)
        
        # 5. Format response for frontend
        response_routes = []
        for route in routes_with_scores:
            # Label route based on whether it's the chosen best route
            if route["id"] == best_route["id"]:
                route_type = "recommended"
            else:
                route_type = "alternative"
            geometry = route["geojson"]
            coordinates = geometry.get("coordinates", [])
            
            # Convert GeoJSON coordinates [lon, lat] to overview_path [{lat, lng}]
            overview_path = [
                {"lat": coord[1], "lng": coord[0]}  # GeoJSON is [lon, lat], we need {lat, lng}
                for coord in coordinates
            ]
            
            # Create legs structure (one leg for the entire route)
            distance_m = route["distance_m"]
            duration_s = route.get("duration_s", int(distance_m / 1.4))  # Estimate: ~1.4 m/s walking speed
            
            # Format distance and duration like Google Maps
            if distance_m >= 1000:
                distance_text = f"{distance_m/1000:.1f} km"
            else:
                distance_text = f"{int(distance_m)} m"
            
            duration_mins = duration_s // 60
            if duration_mins > 0:
                duration_text = f"{duration_mins} mins"
            else:
                duration_text = f"{duration_s} secs"
            
            # Get start and end locations
            start_coord = coordinates[0] if coordinates else [0, 0]
            end_coord = coordinates[-1] if coordinates else [0, 0]
            
            # Create legs array (one leg for entire route)
            legs = [{
                "start_location": {"lat": start_coord[1], "lng": start_coord[0]},
                "end_location": {"lat": end_coord[1], "lng": end_coord[0]},
                "distance": {"text": distance_text, "value": int(distance_m)},
                "duration": {"text": duration_text, "value": int(duration_s)},
                "steps": []  # We don't have turn-by-turn from ORS
            }]
            
            response_routes.append({
                "id": route["id"],
                "type": route_type,  # "recommended" or "alternative" based on scoring
                "overview_path": overview_path,  # Frontend format
                "legs": legs,  # Frontend format
                "distance_m": distance_m,
                "score": route["score"].total_score,
                "metrics": route["metrics"],
                "geojson": geometry  # Keep original for reference
            })
        
        # Get Gemini explanation
        gemini_payload = {
            "chosen_route_id": best_route["id"],
            "routes": response_routes
        }
        explanation = generate_route_explanation(gemini_payload)
        
        return RouteResponse(
            routes=response_routes,
            chosen_route_id=best_route["id"],
            wind=wind_data,
            explanation=explanation,
        )
    
    except Exception as e:
        import traceback
        error_detail = str(e) if str(e) else repr(e)
        # Log the full error for debugging
        print(f"ERROR in /route endpoint: {error_detail}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=error_detail)

@app.get("/")
async def root():
    return {"message": "Frost Byte API", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)