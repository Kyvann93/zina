"""
ZINA Cantine BAD - Main Routes
Handles page rendering routes (non-API)
"""

from flask import Blueprint, render_template, redirect, url_for
from zina_app.api.routes import get_db_service
from flask import jsonify


main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    """Redirect home page to ordering interface"""
    return redirect(url_for('main.ordering'))


@main_bp.route('/commander')
def ordering():
    """Ordering page for employees"""
    return render_template('ordering.html')


@main_bp.route('/admin')
def admin_dashboard():
    """Admin dashboard interface"""
    try:
        db = get_db_service()
        print(db, "acces base de donnee")
        # Note: Database operations will be loaded dynamically via API calls from JavaScript
        # This prevents blocking the page render if database is slow
        category = None
        try:
            # Try to load categories but don't block if it fails
            # as they are reloaded dynamically in the admin panel
            print("Admin dashboard loaded successfully")
        except Exception as db_error:
            print(f"Warning: Could not preload categories: {db_error}")
    except Exception as e:
        print(f"Error in admin dashboard: {e}")
        category = None

    return render_template('admin.html', category=category)
