import os 
import json 
import time 
from dotenv import load_dotenv
import google.generativeai as genai

####################################
#10 minute cache for Gemini API call

_CACHE = {}
CACHE_TTL = 600  # seconds

def _now(): #internal helper functions written with underscore
    return (time.time())

def _cache_get(key):
    if key not in _CACHE: # have we seen this request before
        return None 
    ts, val = _CACHE[key] #timestamp = _CACHE[key][0], value = _CACHE[key][1]
    if _now() - ts > CACHE_TTL: #time expired?
        del _CACHE[key]
        return None
    return val

def _cache_set(key, val): #store cache as timestamp and value
    _CACHE[key] = (_now(), val) 

####################################

####################################
# Main function! Using Gemini API to generate the route explanation given the route data 
def generate_route_explanation(payload):
    """expected payload: 
    {
        "chosen_route_id": "comfort", "routes": [ 
        {"id": "fastest", "metrics": {"distance_m": 1300, "wind_cost": 200, "snow_cost": 90}},
        {"id": "comfort", "metrics": {"distance_m": 1450, "wind_cost": 120, "snow_cost": 40}}
        ]
    } """

    fallback = _fallback(payload) # in case of API failure, use fallback function

    #loading API key
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        return fallback
    
    cache_key = json.dumps(payload, sort_keys=True) #checking cache
    cached = _cache_get
    if cached:
        return cached
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = _build_prompt(payload)
        response = model.generate_content(prompt)

        text = response.text or ""
        parsed = _safe_parse(text)

        if not parsed: 
            parsed = fallback

        _cache_set(cache_key, parsed) #store in cache
        return parsed
    
    except Exception:
        return fallback
    
##### PROMPT BUILDER #####
def _build_prompt(payload):
    return f""" You are explaining a winter walking route choice for a navigation app. 
    Rules:
    - Do NOT invent street names or locations
    - Use only the data provided
    - Mention tradeoffs (distance vs. wind/snow)
    - Output JSON ONLY with keys: explanation, bullets, comfort_score

    DATA: {json.dumps(payload, indent=2)}
""" #f for formatted string 

##### JSON PARSER #####
def _safe_parse(text):
    try:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start == -1 or end == -1:
            return None
        return json.loads(text[start:end]+1)
    except:
        return None
    
##### FALLBACK FUNCTION #####
def _fallback(payload):
    routes = payload.get("routes", [])
    chosen_id = payload.get("chosen_route_id")

    chosen = next((r for r in routes if r["id"] == chosen_id), None)
    other = next((r for r in routes if r["id"] != chosen_id), None) 

    if not chosen or not other:
        return {
    "explanation": "This route is more comfortable due to reduced wind exposure.",
    "bullets": [
        "Comfort-based routing",
        "Lower wind exposure"
    ],
    "comfort_score": None
}
    c = chosen["metrics"]
    o = other["metrics"]

    return {
        "explanation": ("This route is slightly longer but reduces wind exposure and snow risk, making it more comfortable for winter walking"
        ),

        "bullets": [
            f"Distance: {c['distance_m']}m vs {o['distance_m']}m",
            f"Wind cost: {c['wind_cost']} vs {o['wind_cost']}",
            f"Snow cost: {c['snow_cost']} vs {o['snow_cost']}",
        ],
        "comfort_score": None, 
    }