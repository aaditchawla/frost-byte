from dotenv import load_dotenv
import os
from pathlib import Path

# Load .env from project root (go up 6 levels from routing/config.py)
env_path = Path(__file__).parent.parent.parent.parent.parent.parent / '.env'
print(f"Loading .env from: {env_path}")
print(f".env file exists: {env_path.exists()}")
load_dotenv(env_path)

ORS_API_KEY = os.getenv("ORS_API_KEY")
print(f"ORS_API_KEY loaded: {'Yes' if ORS_API_KEY else 'No'}")
ORS_BASE_URL = "https://api.openrouteservice.org/v2"

