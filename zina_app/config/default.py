"""
ZINA Cantine BAD - Configuration
"""

import os
import secrets
from datetime import timedelta
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
    # In production (FLASK_ENV=production), SESSION_COOKIE_SECURE should be 'true'
    # In development, it can be 'false' to allow HTTP localhost testing
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    # Default: True in production, False in development
    _is_prod = os.environ.get('FLASK_ENV', 'development').lower() == 'production'
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'true' if _is_prod else 'false').lower() == 'true'

    #Session timeout in seconds (default: 1 hour)
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    
    # Supabase
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_KEY = os.environ.get('SUPABASE_KEY')

    # Wave Mobile Money (Côte d'Ivoire)
    WAVE_API_KEY = os.environ.get('WAVE_API_KEY')
    WAVE_WEBHOOK_SECRET = os.environ.get('WAVE_WEBHOOK_SECRET')

    # Admin credentials - MUST be set via environment variables (no fallback defaults)
    # These are intentionally None - the app should fail if not configured
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME')
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD')

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
