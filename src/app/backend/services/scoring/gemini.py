import os
import json
import time
from dotenv import load_dotenv
from google import genai

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
    from pathlib import Path
    env_path = Path(__file__).parent.parent.parent.parent.parent.parent / '.env'
    print(f"DEBUG Gemini: Loading .env from: {env_path}")
    print(f"DEBUG Gemini: .env exists: {env_path.exists()}")
    load_dotenv(env_path)
    api_key = os.getenv("GEMINI_API_KEY")
    
    print(f"DEBUG Gemini: GEMINI_API_KEY loaded: {'Yes' if api_key else 'No'}")
    if api_key:
        print(f"DEBUG Gemini: API key starts with: {api_key[:15]}...")

    if not api_key:
        print("WARNING: GEMINI_API_KEY not found, using fallback")
        return fallback

    cache_key = json.dumps(payload, sort_keys=True)
    cached = _cache_get(cache_key)
    if cached:
        return cached

    try:
        print("DEBUG Gemini: Creating client...")
        client = genai.Client(api_key=api_key)

        prompt = _build_prompt(payload)
        print(f"DEBUG Gemini: Prompt length: {len(prompt)} chars")
        print(f"DEBUG Gemini: Making API call to Gemini...")

        response = client.models.generate_content(
            model="models/gemini-2.5-flash",
            contents=prompt,
        )

        print(f"DEBUG Gemini: Response received, type: {type(response)}")
        text = getattr(response, "text", "") or ""
        print(f"DEBUG Gemini: Response text length: {len(text)} chars")
        print(f"DEBUG Gemini: Response text preview: {text[:200]}...")
        
        parsed = _safe_parse(text)
        print(f"DEBUG Gemini: Parsed result: {parsed is not None}")

        if not parsed:
            print("WARNING: Failed to parse Gemini response, using fallback")
            parsed = fallback
        else:
            print("DEBUG Gemini: Successfully parsed response!")

        _cache_set(cache_key, parsed)
        return parsed

    except Exception as e:
        print(f"ERROR Gemini: Exception type: {type(e).__name__}")
        print(f"ERROR Gemini: Exception message: {str(e)}")
        import traceback
        print("ERROR Gemini: Full traceback:")
        traceback.print_exc()
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
        return json.loads(text[start:end])
    except:
        return None

##### FALLBACK FUNCTION #####
def _fallback(payload):
    routes = payload.get("routes", [])
    chosen_id = payload.get("chosen_route_id")

    chosen = next((r for r in routes if r.get("id") == chosen_id), None)
    other = next((r for r in routes if r.get("id") != chosen_id), None)

    if not chosen or not other:
        return {
            "explanation": "This route was selected because it appears more comfortable based on weather conditions.",
            "bullets": ["Comfort-based routing", "Lower wind exposure"],
            "comfort_score": None,
        }

    c = chosen.get("metrics", {})
    o = other.get("metrics", {})

    c_shelter = c.get("shelter_score")
    o_shelter = o.get("shelter_score")

    bullets = [
        f"Distance: {c.get('distance_m', 'N/A')} m vs {o.get('distance_m', 'N/A')} m",
        f"Wind cost: {c.get('wind_cost', 'N/A')} vs {o.get('wind_cost', 'N/A')}",
        f"Snow cost: {c.get('snow_cost', 'N/A')} vs {o.get('snow_cost', 'N/A')}",
    ]

    if c_shelter is not None and o_shelter is not None:
        bullets.append(
            f"Shelter score: {c_shelter:.2f} vs {o_shelter:.2f} (higher = more sheltered)"
        )

    return {
        "explanation": (
            "This route is slightly longer, but offers better shelter from buildings, reduces wind in your face (and general wind exposure), "
            "overall improving your walking comfort."
        ),
        "bullets": bullets,
        "comfort_score": None,
    }