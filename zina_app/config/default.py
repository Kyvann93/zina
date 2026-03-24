"""
ZINA Cantine BAD - Configuration
"""

import os
import secrets
from dotenv import load_dotenv

load_dotenv()


class DefaultConfig:
    """Default application configuration"""

    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_hex(32)
    DEBUG = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'

    # File uploads — 10 MB max
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024

    # Session cookie security
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'false').lower() == 'true'

    # Supabase
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_KEY = os.environ.get('SUPABASE_KEY')

    # Wave Mobile Money (Côte d'Ivoire)
    WAVE_API_KEY = os.environ.get('WAVE_API_KEY')

    # Admin credentials — must be set via environment variables
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', '')
    
    # App Info
    APP_NAME = 'ZINA - Cantine BAD'
    APP_DESCRIPTION = 'Système de Gestion de Cantine - Banque Africaine de Développement'
    COMPANY_NAME = 'ZINA'
    LOCATION = 'Abidjan, Côte d\'Ivoire'
    
   
    
    # Business Hours
    BUSINESS_HOURS = {
        'weekdays': '7h00 - 17h00',
        'saturday': '8h00 - 14h00',
        'sunday': 'Fermé'
    }

    # Pricing
    SERVICE_FEE = float(os.environ.get('SERVICE_FEE', '0'))
    TAX_RATE = float(os.environ.get('TAX_RATE', '0'))
    PAYMENT_METHODS = ['wave', 'cash']
