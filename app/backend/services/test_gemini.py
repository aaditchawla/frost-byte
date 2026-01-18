import gemini
# print("USING GEMINI FILE:", gemini.__file__)
from gemini import generate_route_explanation

payload = {
    "chosen_route_id": "comfort",
    "routes": [
        {
            "id": "fastest",
            "metrics": {
                "distance_m": 1300,
                "wind_cost": 200,
                "snow_cost": 90,
                "shelter_score": 0.3
            }
        },
        {
            "id": "comfort",
            "metrics": {
                "distance_m": 1450,
                "wind_cost": 120,
                "snow_cost": 40,
                "shelter_score": 0.8

            }
        }
    ]
}

#print("PAYLOAD METRICS FASTEST:", payload["routes"][0]["metrics"].get("shelter_score"))
#print("PAYLOAD METRICS COMFORT:", payload["routes"][1]["metrics"].get("shelter_score"))

result = generate_route_explanation(payload)
print(result)