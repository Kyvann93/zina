"""
ZINA Cantine BAD - Main Routes
Handles page rendering routes (non-API)
"""

from flask import Blueprint, render_template,request, redirect, url_for,session,flash
from zina_app.api.routes import get_db_service


main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    """Home page - Welcome and navigation"""
    return render_template('index.html')


@main_bp.route('/commander')
def ordering():
    """Ordering page for employees"""
    # Check if user is logged in OR accessing as guest
    is_logged_in = session.get('is_logged_in', False)
    is_guest = 'guest' in request.args
    user_info = None

    if is_logged_in:
        # User is authenticated
        user_info = {
            'id': session.get('user_id'),
            'name': session.get('user_name'),
            'email': session.get('user_email'),
            'is_logged_in': True
        }
    elif is_guest:
        # Guest access - pass guest info
        user_info = {
            'is_logged_in': False,
            'is_guest': True
        }
    else:
        # Not logged in and not accessing as guest
        flash('Veuillez vous connecter ou continuer en tant qu\'invité', 'info')
        return redirect(url_for('main.login'))

    return render_template('ordering.html', user_info=user_info)

@main_bp.route('/login')
def login():
    """Dedicated login page"""    
    return render_template('login.html')

@main_bp.route('/logout')
def logout():
    """Handle user logout"""
    session.clear()  # Clear all session data
    return redirect(url_for('main.index'))

@main_bp.route('/guest-access')
def guest_access():
    """Handle guest access - clear session and redirect to ordering"""
    session.clear()  # Clear any existing session
    return redirect(url_for('main.ordering', guest='true'))

@main_bp.route('/register')
def register():
    """Dedicated registration page"""

    return render_template('register.html')


@main_bp.route('/kitchen')
def kitchen():
    """Kitchen display — shows live orders for kitchen staff"""
    return render_template('kitchen.html')


@main_bp.route('/leaderboard')
def leaderboard():
    """Employee gamification leaderboard"""
    return render_template('leaderboard.html')


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
