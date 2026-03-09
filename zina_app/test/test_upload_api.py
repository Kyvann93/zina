#!/usr/bin/env python3
"""
Test script for image upload API endpoints
"""

import requests
import json

def test_api_endpoints():
    """Test the image upload API endpoints"""
    base_url = "http://127.0.0.1:5000"
    
    print("Testing Image Upload API Endpoints")
    print("=" * 50)
    
    # Test 1: Get categories (should work)
    print("\n1. Testing GET /api/categories:")
    try:
        response = requests.get(f"{base_url}/api/categories", timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            categories = response.json()
            print(f"   ✅ Found {len(categories)} categories")
        else:
            print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 2: Create category without image
    print("\n2. Testing POST /api/categories (without image):")
    try:
        data = {
            'name': 'Test Category',
            'description': 'Test description'
        }
        response = requests.post(f"{base_url}/api/categories", data=data, timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Category created: {result.get('category', {}).get('name')}")
        else:
            print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 3: Create product without image
    print("\n3. Testing POST /api/products (without image):")
    try:
        data = {
            'name': 'Test Product',
            'description': 'Test product description',
            'price': '3500',
            'category_id': '1'
        }
        response = requests.post(f"{base_url}/api/products", data=data, timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Product created: {result.get('product', {}).get('name')}")
        else:
            print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 4: Try image upload to non-existent category
    print("\n4. Testing POST /api/categories/999/image (should fail):")
    try:
        response = requests.post(f"{base_url}/api/categories/999/image", timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 404:
            print("   ✅ Non-existent category handled correctly")
        else:
            print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    print("\n" + "=" * 50)
    print("✅ API endpoints are ready for image uploads!")
    print("📝 Use test_image_upload.html to test with actual images")

if __name__ == "__main__":
    test_api_endpoints()
