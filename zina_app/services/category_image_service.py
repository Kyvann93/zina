"""
ZINA Cantine BAD - Category Image Service
Handles mapping of categories to images with local and external fallback
"""

import os
from pathlib import Path
from typing import Optional
import requests
from urllib.parse import quote
import logging

logger = logging.getLogger(__name__)

# Image extensions to search for
SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.PNG', '.JPG', '.JPEG']


class CategoryImageService:
    """Service to resolve category images with fallback mechanism"""
    
    def __init__(self, base_path: str = None):
        """
        Initialize the service
        
        Args:
            base_path: Base path to the food images folder (e.g., /path/to/static/images/food)
        """
        if base_path is None:
            # Default to Flask app's static/images/food directory
            base_path = os.path.join(os.path.dirname(__file__), '..', '..', 'static', 'images', 'food')
        
        self.base_path = Path(base_path)
        self.url_base_path = 'static/images/food'
        
        # Ensure directory exists
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    def normalize_category_name(self, category_name: str) -> str:
        """
        Normalize category name for file matching
        
        Args:
            category_name: Original category name (e.g., "Petit Déjeuner")
        
        Returns:
            Normalized name (e.g., "petit-dejeuner")
        """
        # Convert to lowercase, replace spaces with hyphens, remove special chars except hyphens
        normalized = category_name.lower()
        normalized = normalized.replace(' ', '-')
        normalized = normalized.replace('é', 'e')
        normalized = normalized.replace('è', 'e')
        normalized = normalized.replace('ê', 'e')
        normalized = normalized.replace('à', 'a')
        normalized = normalized.replace('â', 'a')
        normalized = normalized.replace('ç', 'c')
        normalized = normalized.replace('ô', 'o')
        normalized = normalized.replace('ù', 'u')
        normalized = normalized.replace('û', 'u')
        # Remove any remaining non-alphanumeric characters (except hyphens)
        normalized = ''.join(c for c in normalized if c.isalnum() or c == '-')
        return normalized
    
    def find_local_image(self, category_name: str) -> Optional[str]:
        """
        Find a local image for a category by name
        
        Args:
            category_name: Category name to search for
        
        Returns:
            Relative URL path to image if found, None otherwise
        """
        normalized_name = self.normalize_category_name(category_name)
        
        # Check if normalized name matches any file in the food folder
        if self.base_path.exists():
            for file in self.base_path.iterdir():
                if file.is_file():
                    file_stem = self.normalize_category_name(file.stem)
                    if file_stem == normalized_name and file.suffix.lower() in SUPPORTED_EXTENSIONS:
                        # Return Flask-friendly URL path
                        return f"{self.url_base_path}/{file.name}"
        
        return None
    
    def get_fallback_image_url(self, category_name: str, use_api: str = 'unsplash') -> Optional[str]:
        """
        Get fallback image from external API
        
        Args:
            category_name: Category name to search for
            use_api: Which API to use ('unsplash' or 'pixabay')
        
        Returns:
            URL to fallback image, or None if API call fails
        """
        try:
            if use_api == 'unsplash':
                return self._get_unsplash_image(category_name)
            elif use_api == 'pixabay':
                return self._get_pixabay_image(category_name)
            else:
                logger.warning(f"Unknown API: {use_api}")
                return None
        except Exception as e:
            logger.warning(f"Failed to get fallback image from {use_api}: {e}")
            return None
    
    def _get_unsplash_image(self, category_name: str) -> Optional[str]:
        """
        Get image from Unsplash API (no auth required for basic usage)
        
        Args:
            category_name: Category name to search for
        
        Returns:
            URL to image from Unsplash
        """
        try:
            # Use Unsplash's public API endpoint which is more reliable
            # Format: https://source.unsplash.com/600x400/?{search_terms}
            search_term = category_name.replace(' ', '+')
            
            # Try the source.unsplash.com endpoint with proper format
            url = f"https://source.unsplash.com/600x400/?{search_term},food"
            
            # Verify the URL works by making a quick head request
            response = requests.head(url, timeout=5, allow_redirects=True)
            if response.status_code == 200:
                return url
            
            # Fallback: If that fails, try a simpler search
            url_simple = f"https://source.unsplash.com/600x400/?{search_term}"
            response = requests.head(url_simple, timeout=5, allow_redirects=True)
            if response.status_code == 200:
                return url_simple
            
            # If Unsplash fails, return a generic food image placeholder
            # Using a reliable placeholder service
            return None
        except Exception as e:
            logger.warning(f"Unsplash API error: {e}")
            # Return None instead of crashing - caller will use local image or placeholder
            return None
    
    def _get_pixabay_image(self, category_name: str) -> Optional[str]:
        """
        Get image from Pixabay API (requires API key from environment)
        
        Args:
            category_name: Category name to search for
        
        Returns:
            URL to image from Pixabay
        """
        api_key = os.getenv('PIXABAY_API_KEY')
        if not api_key:
            logger.warning("PIXABAY_API_KEY not set in environment")
            return None
        
        try:
            search_term = f"{category_name} food"
            url = "https://pixabay.com/api/"
            params = {
                'key': api_key,
                'q': search_term,
                'min_width': 400,
                'min_height': 400,
                'per_page': 3
            }
            
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            
            data = response.json()
            if data.get('hits'):
                # Return the first result's webformatURL (good quality, reasonable size)
                return data['hits'][0]['webformatURL']
            return None
        except Exception as e:
            logger.warning(f"Pixabay API error: {e}")
            return None
    
    def get_category_image(self, category_name: str, fallback_api: str = 'unsplash') -> Optional[str]:
        """
        Get image URL for a category with fallback mechanism
        
        Priority:
        1. Check for local image in food folder
        2. Fall back to external API (Unsplash or Pixabay)
        3. Return None if no image found
        
        Args:
            category_name: Category name
            fallback_api: Which API to use as fallback ('unsplash' or 'pixabay')
        
        Returns:
            Image URL or None
        """
        # Try local image first
        local_image = self.find_local_image(category_name)
        if local_image:
            return local_image
        
        # Fall back to external API
        return self.get_fallback_image_url(category_name, use_api=fallback_api)
    
    def list_available_images(self) -> dict:
        """
        List all available images in the food folder
        
        Returns:
            Dictionary with image info {filename: {path, size_kb}}
        """
        images = {}
        if self.base_path.exists():
            for file in self.base_path.iterdir():
                if file.is_file() and file.suffix.lower() in SUPPORTED_EXTENSIONS:
                    size_kb = file.stat().st_size / 1024
                    images[file.name] = {
                        'path': f"{self.url_base_path}/{file.name}",
                        'size_kb': round(size_kb, 2)
                    }
        return images
