import requests
import json
import sys
import time

def test_route_api():
    """Test the /route endpoint with Montreal coordinates"""
    
    url = "http://localhost:8000/route"
    
    # Test route: Downtown Montreal to Old Montreal
    payload = {
        "start": [-73.5673, 45.5017],  # [lon, lat]
        "end": [-73.5534, 45.5088]
    }
    
    print("🚀 Testing Frost Byte API...")
    print(f"📍 Route: {payload['start']} → {payload['end']}")
    print("\n" + "="*50)
    
    try:
        start_time = time.time()  # Start timer
        response = requests.post(url, json=payload, timeout=300)
        elapsed = time.time() - start_time  # Calculate elapsed time
        
        if response.status_code != 200:
            print(f"❌ Error: Status {response.status_code}")
            print(response.text)
            return False
        
        data = response.json()
        
        # Check structure
        print("\n✅ Response received!")
        print(f"⏱️  Request took: {elapsed:.1f} seconds")
        print(f"   Routes found: {len(data.get('routes', []))}")
        print(f"   Chosen route: {data.get('chosen_route_id')}")
        
        # Check wind data
        wind = data.get('wind', {})
        print(f"\n🌬️  Wind Data:")
        print(f"   Speed: {wind.get('speed')} m/s")
        print(f"   Direction: {wind.get('direction')}°")
        
        # Check routes and metrics
        print(f"\n🛣️  Routes:")
        for route in data.get('routes', []):
            metrics = route.get('metrics', {})
            print(f"\n   {route.get('id')} ({route.get('type')}):")
            print(f"      Distance: {metrics.get('distance_m'):.0f} m")
            print(f"      Wind cost: {metrics.get('wind_cost'):.2f}")
            print(f"      Snow cost: {metrics.get('snow_cost'):.2f}")
            print(f"      Total score: {route.get('score'):.2f}")
        
        # Check Gemini explanation
        explanation = data.get('explanation', {})
        print(f"\n🤖 Gemini Explanation:")
        if explanation.get('explanation'):
            print(f"   ✅ Explanation received")
            print(f"   Text: {explanation.get('explanation')[:100]}...")
            print(f"   Bullets: {len(explanation.get('bullets', []))} items")
        else:
            print(f"   ⚠️  Using fallback explanation")
        
        print("\n" + "="*50)
        print("✅ All checks passed!")
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to server")
        print("   Make sure the server is running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_route_api()
    sys.exit(0 if success else 1)