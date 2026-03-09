#!/usr/bin/env python3
"""Quick API Test"""
import urllib.request
import json

try:
    response = urllib.request.urlopen('http://localhost:5000/api/categories', timeout=5)
    data = json.loads(response.read())
    
    print("✅ API Response received!")
    print(f"Number of categories: {len(data) if isinstance(data, list) else 'Unknown'}")
    
    if isinstance(data, list) and len(data) > 0:
        cat = data[0]
        print(f"\nFirst category:")
        print(f"  - Name: {cat.get('name', 'N/A')}")
        print(f"  - Image: {cat.get('image', 'N/A')[:50]}..." if len(str(cat.get('image', ''))) > 50 else f"  - Image: {cat.get('image', 'N/A')}")
        print(f"  - Products: {cat.get('products_count', 'N/A')}")
    elif isinstance(data, dict):
        print(f"Response type: dict")
        print(f"Keys: {list(data.keys())}")
    else:
        print(f"Full response:")
        print(json.dumps(data, indent=2)[:500])
        
except Exception as e:
    print(f"❌ Error: {e}")
    print("\nMake sure the Flask server is running:")
    print("  python app.py")
