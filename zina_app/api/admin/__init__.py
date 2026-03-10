"""
ZINA Cantine BAD - Admin API Blueprint
"""

from flask import Blueprint

admin_bp = Blueprint('admin', __name__)

# Import routes to register them with the blueprint
from zina_app.api.admin import routes
