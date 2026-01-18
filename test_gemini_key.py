# test_gemini_key.py
import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai

# Load .env
env_path = Path('.env')
print(f"Loading .env from: {env_path.absolute()}")
print(f".env exists: {env_path.exists()}")

load_dotenv(env_path)
api_key = os.getenv("GEMINI_API_KEY")

print(f"\nAPI key loaded: {'Yes' if api_key else 'No'}")
if api_key:
    print(f"API key: {api_key[:20]}...{api_key[-10:]}")
else:
    print("ERROR: GEMINI_API_KEY not found!")
    exit(1)

# Test API call
try:
    print("\nTesting Gemini API call...")
    client = genai.Client(api_key=api_key)
    
    response = client.models.generate_content(
        model="models/gemini-2.5-flash",
        contents="Say hello in JSON format: {\"message\": \"hello\"}",
    )
    
    text = getattr(response, "text", "") or ""
    print(f"\n✅ SUCCESS! Response received:")
    print(text)
    
except Exception as e:
    print(f"\n❌ ERROR: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()