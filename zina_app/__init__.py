"""
ZINA Cantine BAD - Application Package
"""

import json
from pathlib import Path

from flask import Flask
from flask_cors import CORS
from flasgger import Swagger


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

    spec_path = Path(app.root_path) / "config" / "openapi.yaml"
    try:
        from yaml import safe_load

        swagger_template = safe_load(spec_path.read_text(encoding="utf-8")) if spec_path.exists() else {}
    except Exception:
        swagger_template = {}

    # Ensure no swagger field is injected by Flasgger
    swagger_template["swagger"] = None
    swagger_template["openapi"] = swagger_template.get("openapi", "3.0.2")

    Swagger(app, template=swagger_template)

    @app.route("/openapi.json")
    def openapi_json():
        clean_spec = {k: v for k, v in swagger_template.items() if k != "swagger"}
        return app.response_class(
            response=json.dumps(clean_spec),
            status=200,
            mimetype="application/json",
        )
    
    # Register blueprints
    from zina_app.api import api_bp
    from zina_app.api.admin import admin_bp
    
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    # Register main routes
    from zina_app.routes import main_bp
    app.register_blueprint(main_bp)
    
    return app
