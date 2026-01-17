# Snow status service (fallback-first)

async def get_snow_status(lat: float, lon: float):
    """
    note: this is a temporary fallback.
    always returns a conservative snow risk
    """
    return {
        "status": "unknown",
        "risk": 0.3,
        "source": "fallback"
    }
