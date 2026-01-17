from fastapi import FastAPI, Query

from services.buildings import get_building_features
from services.snow import get_snow_status

app = FastAPI()

@app.get("/debug/features")
async def debug_features(
    lat: float = Query(...),
    lon: float = Query(...),
):
    buildings = await get_building_features(lat, lon)
    snow = await get_snow_status(lat, lon)
    return {"buildings": buildings, "snow": snow}