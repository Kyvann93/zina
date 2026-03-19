"""
ZINA Cantine BAD - Application Package
"""

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
    
    # Initialize extensions
    CORS(app)
    
    # Register blueprints
    from zina_app.api import api_bp
    from zina_app.api.admin import admin_bp
    from zina_app.api.features_routes import features_bp

    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(features_bp, url_prefix='/api')
    
    # Register main routes
    from zina_app.routes import main_bp
    app.register_blueprint(main_bp)
    
    return app
