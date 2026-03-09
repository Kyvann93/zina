#!/usr/bin/env python3
"""Test CategoryResponse definition"""
import sys
import importlib

# Clear any cached modules
if 'models' in sys.modules:
    del sys.modules['models']
if 'zina_app' in sys.modules:
    del sys.modules['zina_app']

from models import CategoryResponse
from dataclasses import fields

print("CategoryResponse fields:")
for field in fields(CategoryResponse):
    print(f"  - {field.name}: {field.type} = {field.default}")

print("\nTrying to create CategoryResponse with image_url...")
try:
    cat = CategoryResponse(
        category_id=1,
        category_name="Test",
        description="Test desc",
        image_url="http://example.com/image.jpg",
        products=None
    )
    print(f"✅ Success! Category: {cat.category_name}, Image: {cat.image_url}")
except TypeError as e:
    print(f"❌ Error: {e}")
