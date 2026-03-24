"""
ZINA Cantine BAD - Application Package
"""

import os
from flask import Flask
from flask_cors import CORS


def create_app(config_object=None):
    """Application factory for creating Flask app"""
    app = Flask(__name__, 
                static_folder='../static',
                template_folder='../templates')
    
    # Load configuration
    if config_object is None:
        from zina_app.config.default import DefaultConfig
        config_object = DefaultConfig
    
    app.config.from_object(config_object)
    
    # Initialize extensions — restrict CORS to origins listed in CORS_ORIGINS env var
    cors_env = os.environ.get('CORS_ORIGINS', '').strip()
    allowed_origins = [o.strip() for o in cors_env.split(',') if o.strip()] if cors_env else '*'
    CORS(app, origins=allowed_origins)
    
    # Register blueprints
    from zina_app.api import api_bp
    from zina_app.api.admin import admin_bp
    
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    # Register main routes
    from zina_app.routes import main_bp
    app.register_blueprint(main_bp)
    
    return app
