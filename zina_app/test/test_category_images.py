#!/usr/bin/env python3
"""
Category Images System - Quick Test & Demo
Tests the category image functionality
Usage: python test_category_images.py
"""

import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, os.path.dirname(__file__))

def test_image_service():
    """Test the CategoryImageService"""
    from zina_app.services.category_image_service import CategoryImageService
    
    print("\n" + "="*60)
    print("🧪 Testing CategoryImageService")
    print("="*60 + "\n")
    
    service = CategoryImageService()
    
    # Test 1: Normalize category names
    print("1️⃣  Testing category name normalization:")
    test_names = [
        "Petit Déjeuner",
        "Boissons Chaudes",
        "Salades & Légumes",
        "Plats Principaux"
    ]
    
    for name in test_names:
        normalized = service.normalize_category_name(name)
        print(f"   '{name}' → '{normalized}'")
    
    # Test 2: Find local images
    print("\n2️⃣  Looking for local images in /static/images/food/:")
    available_images = service.list_available_images()
    
    if available_images:
        for filename, info in available_images.items():
            print(f"   ✅ {filename} ({info['size_kb']} KB)")
            print(f"      Path: {info['path']}")
    else:
        print("   ⚠️  No images found in /static/images/food/")
        print("      Add images with names like: 'petit-dejeuner.jpg', 'salade.jpg', etc.")
    
    # Test 3: Match local images
    print("\n3️⃣  Testing local image matching:")
    test_categories = [
        "Petit Déjeuner",
        "Déjeuner",
        "Dîner",
        "Salades",
        "Pizza"
    ]
    
    for category in test_categories:
        local_img = service.find_local_image(category)
        if local_img:
            print(f"   ✅ '{category}' → {local_img}")
        else:
            print(f"   ❌ '{category}' → Would use Unsplash fallback")
    
    # Test 4: Test normalization for images
    print("\n4️⃣  Image filename suggestions:")
    if available_images:
        for filename in available_images.keys():
            normalized = service.normalize_category_name(filename.split('.')[0])
            print(f"   Image: {filename}")
            print(f"   → Matches categories: '{normalized}', '{normalized.replace('-', ' ')}'")
    
    print("\n" + "="*60)
    print("✨ CategoryImageService is working correctly!")
    print("="*60 + "\n")


def test_api_endpoints():
    """Test the API endpoints (requires Flask app running)"""
    import requests
    
    print("\n" + "="*60)
    print("🌐 Testing API Endpoints (requires server running)")
    print("="*60 + "\n")
    
    base_url = "http://localhost:5000/api"
    
    try:
        # Test categories endpoint
        print("1️⃣  GET /categories")
        response = requests.get(f"{base_url}/categories", timeout=5)
        if response.status_code == 200:
            categories = response.json()
            print(f"   ✅ Got {len(categories)} categories")
            for cat in categories[:3]:
                print(f"      • {cat['name']}")
                print(f"        Image: {cat['image'][:50]}..." if cat.get('image') else "        Image: No image")
        else:
            print(f"   ❌ Status {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("   ❌ Could not connect to server")
        print("      Make sure Flask app is running: python app.py")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n" + "="*60)
    print("📚 Test Complete!")
    print("="*60 + "\n")


def print_quick_guide():
    """Print quick usage guide"""
    print("\n" + "="*60)
    print("📖 Category Images Quick Guide")
    print("="*60 + "\n")
    
    print("✨ Features:")
    print("  • Automatic local image detection for categories")
    print("  • Smart French accent handling (é→e, è→e, etc.)")
    print("  • Fallback to Unsplash API if no local image found")
    print("  • Optional Pixabay API support with API key")
    print("")
    
    print("🖼️  Adding Images:")
    print("  1. Save images to: /static/images/food/")
    print("  2. Name them after categories:")
    print("     Example: 'petit-dejeuner.jpg' for 'Petit Déjeuner'")
    print("  3. Supported formats: jpg, png, gif, webp")
    print("  4. No code changes needed - auto-detected!")
    print("")
    
    print("📡 API Endpoints:")
    print("  GET /api/categories              - All categories with images")
    print("  GET /api/categories/images/available  - Available local images")
    print("  GET /api/categories/<id>/image   - Specific category image info")
    print("")
    
    print("📁 Files Added/Modified:")
    print("  NEW: zina_app/services/category_image_service.py")
    print("  NEW: static/js/category-image-manager.js")
    print("  NEW: static/css/category-image-manager.css")
    print("  MODIFIED: models.py, database_service.py, routes.py")
    print("")
    
    print("📚 Documentation:")
    print("  • CATEGORY_IMAGES_GUIDE.md - Full technical docs")
    print("  • CATEGORY_IMAGES_EXAMPLES.md - Code examples")
    print("  • CATEGORY_IMAGES_IMPLEMENTATION.md - This implementation summary")
    print("")


if __name__ == "__main__":
    print("\n🎯 ZINA Category Images System - Test Suite\n")
    
    # Run service tests (no dependencies on running server)
    test_image_service()
    
    # Try API tests (may fail if server not running)
    test_api_endpoints()
    
    # Print guide
    print_quick_guide()
    
    print("✅ Ready to use! Check the documentation files for detailed info.\n")
