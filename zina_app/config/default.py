"""
ZINA Cantine BAD - Configuration
"""

import os
from dotenv import load_dotenv

load_dotenv()


class DefaultConfig:
    """Default application configuration"""
    
    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = True
    
    # Supabase
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_KEY = os.environ.get('SUPABASE_KEY')
    
    # App Info
    APP_NAME = 'ZINA - Cantine BAD'
    APP_DESCRIPTION = 'Système de Gestion de Cantine - Banque Africaine de Développement'
    COMPANY_NAME = 'ZINA'
    LOCATION = 'Abidjan, Côte d\'Ivoire'
    
   
    
    # Business Hours
    BUSINESS_HOURS = {
        'weekdays': '7h00 - 18h00',
        'saturday': '8h00 - 14h00',
        'sunday': 'Fermé'
    }
