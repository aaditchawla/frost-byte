from dotenv import load_dotenv
import os
from pathlib import Path

# Load .env from app/ directory (parent of backend)
env_path = Path(__file__).parent.parent.parent.parent / '.env'
load_dotenv(env_path)

ORS_API_KEY = os.getenv("ORS_API_KEY") 
ORS_BASE_URL = "https://api.openrouteservice.org/v2"

