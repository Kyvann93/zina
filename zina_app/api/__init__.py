"""
ZINA Cantine BAD - API Blueprint
"""

from flask import Blueprint

api_bp = Blueprint('api', __name__)

# Import routes to register them with the blueprint
from zina_app.api import routes
