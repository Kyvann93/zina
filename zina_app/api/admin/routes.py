"""
ZINA Cantine BAD - Admin API Routes
Handles admin endpoints for menus, categories, orders, and settings
"""

import json as _json
import os
from pathlib import Path

from flask import jsonify, request, current_app, session
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash

from supabase import create_client

from zina_app.api.admin import admin_bp
from zina_app.api.constants import CATEGORY_EMOJIS, CATEGORY_DEFAULT_IMAGES, CATEGORY_DEFAULT_IMAGE_FALLBACK
from zina_app.services import DatabaseService

# ── Auth guard ───────────────────────────────────────────────────────────────
# Routes that are accessible without a session
_PUBLIC_ENDPOINTS = {
    'admin.admin_login',
    'admin.admin_logout',
    'admin.admin_session',
    'admin.admin_register',
}

@admin_bp.before_request
def require_admin_session():
    if request.endpoint in _PUBLIC_ENDPOINTS:
        return None
    if not session.get('zina_admin'):
        return jsonify({'status': 'error', 'message': 'Non autorisé'}), 401


# ── Permission helpers ────────────────────────────────────────────────────────
_ALL_PERMISSIONS = [
    'dashboard', 'orders', 'orders_manage',
    'menu', 'menu_manage',
    'categories', 'categories_manage',
    'users',
    'admins', 'admins_manage',
    'roles', 'roles_manage',
    'settings', 'settings_manage',
]

def get_admin_permissions():
    """Return the permissions dict for the current session admin."""
    if session.get('admin_is_super'):
        return {p: True for p in _ALL_PERMISSIONS}
    perms = session.get('admin_permissions', {})
    return perms if isinstance(perms, dict) else {}

def has_permission(perm):
    if session.get('admin_is_super'):
        return True
    return bool(get_admin_permissions().get(perm, False))

def require_permission(perm):
    """Returns a 403 response if the current admin lacks the given permission."""
    if not has_permission(perm):
        return jsonify({'status': 'error', 'message': 'Permission refusée'}), 403
    return None


# ── Authentication ────────────────────────────────────────────────────────────
@admin_bp.route('/login', methods=['POST'])
def admin_login():
    """Authenticate admin and create a server-side session."""
    data = request.json or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    # Check if Supabase is configured
    supabase_url = current_app.config.get('SUPABASE_URL')
    supabase_key = current_app.config.get('SUPABASE_KEY')

    if not supabase_url or not supabase_key:
        return jsonify({
            'status': 'error',
            'message': "Base de données non configurée. Veuillez contacter l'administrateur."
        }), 503

    try:
        supabase = get_supabase()
        res = supabase.table('admin') \
            .select('id,username,email,password,is_approved,role_id,admin_roles(id,role_name,permissions,is_super_admin)') \
            .eq('username', username) \
            .limit(1).execute()

        if not res.data:
            return jsonify({'status': 'error', 'message': 'Identifiant ou mot de passe incorrect'}), 401

        admin = res.data[0]

        if not check_password_hash(admin['password'], password):
            return jsonify({'status': 'error', 'message': 'Identifiant ou mot de passe incorrect'}), 401

        if not admin.get('is_approved'):
            return jsonify({'status': 'error', 'message': "Votre compte est en attente d'approbation par un Super Admin"}), 403

        role = admin.get('admin_roles') or {}
        if isinstance(role, list):
            role = role[0] if role else {}

        perms = role.get('permissions', {})
        if isinstance(perms, str):
            import json as _json
            try:
                perms = _json.loads(perms) if perms.strip() else {}
            except (ValueError, KeyError):
                perms = {}
        is_super = bool(role.get('is_super_admin', False))

        session['zina_admin'] = True
        session['admin_id'] = admin['id']
        session['admin_username'] = admin['username']
        session['admin_role_id'] = role.get('id')
        session['admin_role_name'] = role.get('role_name', 'Admin')
        session['admin_permissions'] = perms
        session['admin_is_super'] = is_super
        session.permanent = False
        return jsonify({
            'status': 'success',
            'message': 'Connexion réussie',
            'username': admin['username'],
            'role': role.get('role_name', 'Admin'),
            'is_super_admin': is_super,
        })

    except Exception as e:
        current_app.logger.error('admin login error: %s', e)
        return jsonify({
            'status': 'error',
            'message': 'Erreur de connexion à la base de données'
        }), 500


@admin_bp.route('/register', methods=['POST'])
def admin_register():
    """Register a new admin account — pending approval by a Super Admin."""
    data = request.json or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()

    if not username or not email or not password:
        return jsonify({'status': 'error', 'message': 'Tous les champs sont requis'}), 400
    if len(password) < 8:
        return jsonify({'status': 'error', 'message': 'Le mot de passe doit contenir au moins 8 caractères'}), 400

    try:
        supabase = get_supabase()
        existing = supabase.table('admin').select('id') \
            .or_(f'username.eq.{username},email.eq.{email}').execute()
        if existing.data:
            return jsonify({'status': 'error', 'message': 'Identifiant ou email déjà utilisé'}), 409

        supabase.table('admin').insert({
            'username': username,
            'email': email,
            'password': generate_password_hash(password),
            'is_approved': False,
            'role_id': None,
        }).execute()
        return jsonify({'status': 'success', 'message': "Demande envoyée. Un Super Admin doit approuver votre compte."})
    except Exception as e:
        current_app.logger.error('admin_register error: %s', e)
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500


@admin_bp.route('/logout', methods=['POST'])
def admin_logout():
    """Clear admin session"""
    session.pop('zina_admin', None)
    return jsonify({'status': 'success'})


@admin_bp.route('/session', methods=['GET'])
def admin_session():
    """Return authentication status and role info for the current session."""
    if not session.get('zina_admin'):
        return jsonify({'authenticated': False})
    return jsonify({
        'authenticated': True,
        'username': session.get('admin_username', 'Admin'),
        'role': session.get('admin_role_name', ''),
        'is_super_admin': bool(session.get('admin_is_super', False)),
        'permissions': get_admin_permissions(),
    })


# ── Admin User Management ─────────────────────────────────────────────────────
@admin_bp.route('/admin-users', methods=['GET'])
def list_admin():
    """List all admin users (requires admins permission)."""
    err = require_permission('admins')
    if err:
        return err
    try:
        supabase = get_supabase()
        res = supabase.table('admin') \
            .select('id,username,email,is_approved,created_at,role_id,admin_roles(role_name)') \
            .order('created_at', desc=True).execute()
        users = []
        for u in (res.data or []):
            role_info = u.get('admin_roles') or {}
            if isinstance(role_info, list):
                role_info = role_info[0] if role_info else {}
            users.append({
                'id': u['id'],
                'username': u['username'],
                'email': u['email'],
                'is_approved': u.get('is_approved', False),
                'role_name': role_info.get('role_name') if role_info else None,
                'role_id': u.get('role_id'),
                'created_at': u.get('created_at'),
            })
        return jsonify(users)
    except Exception as e:
        current_app.logger.error('list_admin error: %s', e)
        return jsonify([]), 500


@admin_bp.route('/admin-users/<int:user_id>/approve', methods=['PUT'])
def approve_admin_user(user_id):
    """Approve a pending admin and optionally assign a role."""
    err = require_permission('admins_manage')
    if err:
        return err
    data = request.json or {}
    role_id = data.get('role_id')
    try:
        supabase = get_supabase()
        update = {'is_approved': True}
        if role_id:
            update['role_id'] = int(role_id)
        if session.get('admin_id'):
            update['approved_by'] = session['admin_id']
        supabase.table('admin').update(update).eq('id', user_id).execute()
        return jsonify({'status': 'success', 'message': 'Administrateur approuvé'})
    except Exception as e:
        current_app.logger.error('approve_admin_user error: %s', e)
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500


@admin_bp.route('/admin-users/<int:user_id>/role', methods=['PUT'])
def update_admin_user_role(user_id):
    """Update the role of an existing admin user."""
    err = require_permission('admins_manage')
    if err:
        return err
    data = request.json or {}
    role_id = data.get('role_id')
    if not role_id:
        return jsonify({'status': 'error', 'message': 'role_id requis'}), 400
    try:
        supabase = get_supabase()
        supabase.table('admin').update({'role_id': int(role_id)}).eq('id', user_id).execute()
        return jsonify({'status': 'success', 'message': 'Rôle mis à jour'})
    except Exception as e:
        current_app.logger.error('update_admin_user_role error: %s', e)
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500


@admin_bp.route('/admin-users/<int:user_id>', methods=['DELETE'])
def delete_admin_user(user_id):
    """Delete an admin user."""
    err = require_permission('admins_manage')
    if err:
        return err
    if session.get('admin_id') == user_id:
        return jsonify({'status': 'error', 'message': 'Vous ne pouvez pas supprimer votre propre compte'}), 400
    try:
        supabase = get_supabase()
        supabase.table('admin').delete().eq('id', user_id).execute()
        return jsonify({'status': 'success', 'message': 'Administrateur supprimé'})
    except Exception as e:
        current_app.logger.error('delete_admin_user error: %s', e)
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500


# ── Roles Management ──────────────────────────────────────────────────────────
@admin_bp.route('/roles', methods=['GET'])
def list_roles():
    """List all roles (requires roles permission)."""
    err = require_permission('roles')
    if err:
        return err
    try:
        supabase = get_supabase()
        res = supabase.table('admin_roles').select('*').order('id').execute()
        return jsonify(res.data or [])
    except Exception as e:
        current_app.logger.error('list_roles error: %s', e)
        return jsonify([]), 500


@admin_bp.route('/roles', methods=['POST'])
def create_role():
    """Create a new role."""
    err = require_permission('roles_manage')
    if err:
        return err
    data = request.json or {}
    role_name = data.get('role_name', '').strip()
    permissions = data.get('permissions', {})
    if not role_name:
        return jsonify({'status': 'error', 'message': 'role_name requis'}), 400
    if not isinstance(permissions, dict):
        permissions = {}
    try:
        supabase = get_supabase()
        res = supabase.table('admin_roles').insert({
            'role_name': role_name,
            'permissions': permissions,
            'is_super_admin': False,
        }).execute()
        new_id = res.data[0]['id'] if res.data else None
        return jsonify({'status': 'success', 'message': 'Rôle créé', 'id': new_id})
    except Exception as e:
        current_app.logger.error('create_role error: %s', e)
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500


@admin_bp.route('/roles/<int:role_id>', methods=['PUT'])
def update_role(role_id):
    """Update a role's name and permissions."""
    err = require_permission('roles_manage')
    if err:
        return err
    data = request.json or {}
    update = {}
    if 'role_name' in data:
        update['role_name'] = data['role_name']
    if 'permissions' in data and isinstance(data['permissions'], dict):
        update['permissions'] = data['permissions']
    if not update:
        return jsonify({'status': 'error', 'message': 'Aucune donnée à mettre à jour'}), 400
    try:
        supabase = get_supabase()
        role_res = supabase.table('admin_roles').select('is_super_admin').eq('id', role_id).limit(1).execute()
        if role_res.data and role_res.data[0].get('is_super_admin'):
            return jsonify({'status': 'error', 'message': 'Impossible de modifier le rôle Super Admin'}), 403
        supabase.table('admin_roles').update(update).eq('id', role_id).execute()
        return jsonify({'status': 'success', 'message': 'Rôle mis à jour'})
    except Exception as e:
        current_app.logger.error('update_role error: %s', e)
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500


@admin_bp.route('/roles/<int:role_id>', methods=['DELETE'])
def delete_role(role_id):
    """Delete a role (cannot delete Super Admin role)."""
    err = require_permission('roles_manage')
    if err:
        return err
    try:
        supabase = get_supabase()
        role_res = supabase.table('admin_roles').select('is_super_admin').eq('id', role_id).limit(1).execute()
        if role_res.data and role_res.data[0].get('is_super_admin'):
            return jsonify({'status': 'error', 'message': 'Impossible de supprimer le rôle Super Admin'}), 403
        supabase.table('admin_roles').delete().eq('id', role_id).execute()
        return jsonify({'status': 'success', 'message': 'Rôle supprimé'})
    except Exception as e:
        current_app.logger.error('delete_role error: %s', e)
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500


def get_supabase():
    """Get Supabase client from Flask app config.
    Raises RuntimeError if SUPABASE_URL or SUPABASE_KEY are not set.
    """
    url = current_app.config.get('SUPABASE_URL')
    key = current_app.config.get('SUPABASE_KEY')
    if not url or not key:
        raise RuntimeError(
            'Supabase non configuré — définissez SUPABASE_URL et SUPABASE_KEY dans votre fichier .env'
        )
    return create_client(url, key)


def get_db_service():
    """Get database service from Flask app config"""
    supabase = create_client(
        current_app.config['SUPABASE_URL'],
        current_app.config['SUPABASE_KEY']
    )
    return DatabaseService(supabase)


@admin_bp.route('/menus', methods=['GET'])
async def get_admin_menus():
    """Get all menus for admin"""
    try:
        db = get_db_service()
        categories = await db.get_categories(available_only=False)
        menus = []
        for cat in categories:
            category_key = cat.category_name.lower().replace(' ', '_').replace('-', '_')
            default_image = CATEGORY_DEFAULT_IMAGES.get(category_key, CATEGORY_DEFAULT_IMAGE_FALLBACK)
            
            for product in (cat.products or []):
                product_image = product.image_url
                category_image = cat.image_url
                if product_image :
                    image = product_image
                elif category_image :
                    image = category_image
                else :
                    image = default_image
                menus.append({
                    'id': product.product_id,
                    'name': product.product_name,
                    'category': cat.category_name.lower(),
                    'category_id': cat.category_id,
                    'price': float(product.price),
                    'description': product.description,
                    'available': product.is_available is not False,
                    'image': image
                })
        return jsonify(menus)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


_MENU_FIELDS = {'product_name', 'category_id', 'price', 'description', 'is_available', 'image_url'}
_CATEGORY_FIELDS = {'category_name', 'description', 'image_url'}
_VALID_ORDER_STATUSES = {'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'}


@admin_bp.route('/menus', methods=['POST'])
def create_menu():
    """Create a new menu item"""
    try:
        raw = request.json or {}
        data = {k: v for k, v in raw.items() if k in _MENU_FIELDS}
        supabase = get_supabase()
        existing_category = supabase.table('categories').select('category_id').order('category_id', desc=True).limit(1).execute()
        if not existing_category.data:
            return jsonify({'status': 'error', 'message': 'Aucune catégorie trouvée'}), 404
        if 'category_id' not in data:
            data['category_id'] = existing_category.data[0]['category_id']
        response = supabase.table('products').select('product_id').order('product_id', desc=True).limit(1).execute()
        next_id = response.data[0]['product_id'] + 1 if response.data else 1
        data['product_id'] = next_id
        supabase.table('products').insert(data).execute()
        return jsonify({'status': 'success', 'message': 'Menu créé', 'id': next_id})
    except Exception as e:
        current_app.logger.error('create_menu error: %s', e)
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500


_ALLOWED_IMAGE_EXTS = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}


@admin_bp.route('/menus/<int:menu_id>/image', methods=['POST'])
def upload_menu_image(menu_id):
    """Upload image for a menu item"""
    try:
        if 'image' not in request.files:
            return jsonify({'status': 'error', 'message': 'Aucun fichier fourni'}), 400
        file = request.files['image']
        if not file or file.filename == '':
            return jsonify({'status': 'error', 'message': 'Fichier vide'}), 400
        ext = os.path.splitext(secure_filename(file.filename).lower())[1]
        if ext not in _ALLOWED_IMAGE_EXTS:
            return jsonify({'status': 'error', 'message': 'Format non supporté'}), 400
        filename = f"menu_{menu_id}{ext}"
        save_path = Path('static/images/food') / filename
        save_path.parent.mkdir(parents=True, exist_ok=True)
        file.save(str(save_path))
        image_url = f"static/images/food/{filename}"
        supabase = get_supabase()
        supabase.table('products').update({'image_url': image_url}).eq('product_id', menu_id).execute()
        return jsonify({'status': 'success', 'image_url': image_url})
    except Exception as e:
        current_app.logger.error('upload_menu_image error: %s', e)
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500


@admin_bp.route('/menus/bulk', methods=['PUT'])
def bulk_update_menus():
    """Bulk update menu items (e.g. availability)"""
    try:
        body = request.json or {}
        ids = body.get('ids', [])
        update_data = {k: v for k, v in (body.get('data') or {}).items() if k in _MENU_FIELDS}
        if not ids or not update_data:
            return jsonify({'status': 'error', 'message': 'ids et data requis'}), 400
        supabase = get_supabase()
        supabase.table('products').update(update_data).in_('product_id', ids).execute()
        label = 'disponibles' if update_data.get('is_available') else 'indisponibles'
        return jsonify({'status': 'success', 'message': f'{len(ids)} plat(s) marqué(s) {label}'})
    except Exception as e:
        current_app.logger.error('bulk_update_menus error: %s', e)
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500


@admin_bp.route('/menus/bulk', methods=['DELETE'])
def bulk_delete_menus():
    """Bulk delete menu items"""
    try:
        body = request.json or {}
        ids = body.get('ids', [])
        if not ids:
            return jsonify({'status': 'error', 'message': 'ids requis'}), 400
        supabase = get_supabase()
        supabase.table('products').delete().in_('product_id', ids).execute()
        return jsonify({'status': 'success', 'message': f'{len(ids)} plat(s) supprimé(s)'})
    except Exception as e:
        current_app.logger.error('bulk_delete_menus error: %s', e)
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500


@admin_bp.route('/menus/<int:menu_id>', methods=['PUT'])
def update_menu(menu_id):
    """Update a menu item"""
    try:
        raw = request.json or {}
        data = {k: v for k, v in raw.items() if k in _MENU_FIELDS}
        if not data:
            return jsonify({'status': 'error', 'message': 'Aucun champ valide fourni'}), 400
        supabase = get_supabase()
        supabase.table('products').update(data).eq('product_id', menu_id).execute()
        return jsonify({'status': 'success', 'message': 'Menu mis à jour'})
    except Exception as e:
        current_app.logger.error('update_menu error: %s', e)
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500


@admin_bp.route('/menus/<int:menu_id>', methods=['DELETE'])
def delete_menu(menu_id):
    """Delete a menu item"""
    try:
        supabase = get_supabase()
        supabase.table('products').delete().eq('product_id', menu_id).execute()
        return jsonify({'status': 'success', 'message': 'Menu supprimé'})
    except Exception as e:
        current_app.logger.error('delete_menu error: %s', e)
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500


@admin_bp.route('/categories', methods=['GET'])
async def get_admin_categories():
    """Get all categories for admin"""
    try:
        db = get_db_service()
        categories = await db.get_categories(available_only=False)
        result = []
        for cat in categories:
            category_key = cat.category_name.lower().replace(' ', '_').replace('-', '_')
            emoji = CATEGORY_EMOJIS.get(category_key, '🍽️')
            result.append({
                'id': cat.category_id,
                'name': cat.category_name,
                'description': cat.description,
                'emoji': emoji,
                'image_url': cat.image_url
            })
        return jsonify(result)
    except Exception as e:
        return jsonify([{'error': str(e)}])


@admin_bp.route('/categories', methods=['POST'])
def create_category():
    """Create a new category"""
    try:
        raw = request.json or {}
        data = {k: v for k, v in raw.items() if k in _CATEGORY_FIELDS}
        supabase = get_supabase()
        response = supabase.table('categories').select('category_id').order('category_id', desc=True).limit(1).execute()
        next_id = response.data[0]['category_id'] + 1 if response.data else 1
        data['category_id'] = next_id
        supabase.table('categories').insert(data).execute()
        return jsonify({'status': 'success', 'message': 'Catégorie créée', 'id': next_id})
    except Exception as e:
        current_app.logger.error('create_category error: %s', e)
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500
    
@admin_bp.route('/categories/<int:category_id>', methods=['PUT'])
def update_category(category_id):
    """Update an existing category"""
    try:
        raw = request.json or {}
        data = {k: v for k, v in raw.items() if k in _CATEGORY_FIELDS}
        if not data:
            return jsonify({'status': 'error', 'message': 'Aucun champ valide fourni'}), 400
        supabase = get_supabase()
        supabase.table('categories').update(data).eq('category_id', category_id).execute()
        return jsonify({'status': 'success', 'message': 'Catégorie mise à jour'})
    except Exception as e:
        current_app.logger.error('update_category error: %s', e)
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500


@admin_bp.route('/categories/<int:category_id>', methods=['DELETE'])
def delete_categories(category_id):
    try:
        supabase = get_supabase()
        supabase.table('categories').delete().eq('category_id', category_id).execute()
        return jsonify({'status': 'success', 'message': 'Catégorie supprimée'})
    except Exception as e:
        current_app.logger.error('delete_category error: %s', e)
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500
    
@admin_bp.route('/orders', methods=['GET'])
def get_admin_orders():
    """Get all orders for admin"""
    try:
        supabase = get_supabase()
        response = supabase.table('orders').select('*').order('created_at', desc=True).execute()
        
        if response.data:
            orders = []
            for order in response.data:
                orders.append({
                    'order_id': order.get('order_id'),
                    'user_id': order.get('user_id'),
                    'total_amount': order.get('total_amount'),
                    'order_status': order.get('order_status'),
                    'created_at': order.get('created_at'),
                    'pickup_time': order.get('pickup_time'),
                    'prep_time_minutes': order.get('prep_time_minutes')
                })
            return jsonify(orders)
        else:
            return jsonify([])
    except Exception as e:
        current_app.logger.error('get_admin_orders error: %s', e)
        return jsonify([]), 500


@admin_bp.route('/users', methods=['GET'])
def get_admin():
    """Get all users for admin with their order counts"""
    try:
        supabase = get_supabase()
        response = supabase.table('users').select('*').execute()

        if not response.data:
            return jsonify([])

        # Count orders per user in a single query
        orders_response = supabase.table('orders').select('user_id').execute()
        order_counts = {}
        for order in (orders_response.data or []):
            uid = order.get('user_id')
            if uid:
                order_counts[uid] = order_counts.get(uid, 0) + 1

        users = []
        for user in response.data:
            uid = user.get('user_id')
            users.append({
                'user_id': uid,
                'full_name': user.get('full_name'),
                'email': user.get('email'),
                'phone': user.get('phone'),
                'department': user.get('department'),
                'employee_id': user.get('employee_id'),
                'created_at': user.get('created_at'),
                'order_count': order_counts.get(uid, 0)
            })
        return jsonify(users)
    except Exception as e:
        current_app.logger.error('get_admin error: %s', e)
        return jsonify([]), 500


@admin_bp.route('/orders/<int:order_id>', methods=['GET'])
def get_admin_order(order_id):
    """Get a single order with items for admin details modal"""
    try:
        supabase = get_supabase()
        order_res = supabase.table('orders').select('*').eq('order_id', order_id).limit(1).execute()
        if not order_res.data:
            return jsonify({'error': 'Commande introuvable'}), 404
        order = order_res.data[0]

        items_res = supabase.table('order_items').select('*').eq('order_id', order_id).execute()
        items = items_res.data or []

        # Map item fields to expected frontend shape
        mapped_items = []
        for it in items:
            mapped_items.append({
                'order_item_id': it.get('order_item_id'),
                'product_id': it.get('product_id'),
                'product_name': it.get('product_name'),
                'quantity': it.get('quantity'),
                'unit_price': it.get('unit_price')
            })

        result = {
            'order_id': order.get('order_id'),
            'user_id': order.get('user_id'),
            'total_amount': float(order.get('total_amount') or 0),
            'order_status': order.get('order_status'),
            'created_at': order.get('created_at'),
            'pickup_time': order.get('pickup_time'),
            'prep_time_minutes': order.get('prep_time_minutes'),
            'payment': {
                'payment_method': order.get('payment_method'),
                'payment_status': order.get('payment_status')
            },
            'items': mapped_items
        }
        return jsonify(result)
    except Exception as e:
        current_app.logger.error('get_admin_order error: %s', e)
        return jsonify({'error': 'Erreur interne'}), 500


@admin_bp.route('/orders/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    """Update order status"""
    try:
        data = request.json or {}
        new_status = data.get('status')
        if not new_status:
            return jsonify({'status': 'error', 'message': 'Champ status manquant'}), 400
        if new_status not in _VALID_ORDER_STATUSES:
            return jsonify({'status': 'error', 'message': 'Statut invalide'}), 400
        supabase = get_supabase()
        supabase.table('orders').update({'order_status': new_status}).eq('order_id', order_id).execute()
        return jsonify({'status': 'success', 'message': f'Commande #{order_id} mise à jour : {new_status}'})
    except Exception as e:
        current_app.logger.error('update_order_status error: %s', e)
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500


@admin_bp.route('/orders/<int:order_id>/payment', methods=['PUT'])
def update_order_payment(order_id):
    """Update payment method for an order (e.g., mark as paid at counter)"""
    try:
        data = request.json or {}
        payment_method = data.get('payment_method')
        payment_status = data.get('payment_status', 'completed')
        
        if not payment_method:
            return jsonify({'status': 'error', 'message': 'Méthode de paiement manquante'}), 400
        
        valid_methods = ['cash', 'counter', 'wave', 'card']
        if payment_method not in valid_methods:
            return jsonify({'status': 'error', 'message': 'Méthode de paiement invalide'}), 400
        
        supabase = get_supabase()
        update_data = {
            'payment_method': payment_method,
            'payment_status': payment_status
        }
        
        # If payment is completed at counter, also update order status to confirmed
        if payment_status == 'completed' and payment_method in ['cash', 'counter']:
            update_data['order_status'] = 'confirmed'
        
        supabase.table('orders').update(update_data).eq('order_id', order_id).execute()
        
        method_display = {
            'cash': 'Espèces',
            'counter': 'Paiement au comptoir',
            'wave': 'Wave',
            'card': 'Carte bancaire'
        }.get(payment_method, payment_method)
        
        return jsonify({
            'status': 'success', 
            'message': f'Paiement mis à jour : {method_display}'
        })
    except Exception as e:
        current_app.logger.error('update_order_payment error: %s', e)
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500


@admin_bp.route('/settings', methods=['GET'])
def get_settings():
    """Get site settings"""
    return jsonify({
        'company_name': current_app.config['COMPANY_NAME'],
        'email': 'contact@zina-cantine.ci',
        'phone': '+225 27 20 00 00 00',
        'address': 'Cantine BAD, Avenue Joseph Anoma, Abidjan, Côte d\'Ivoire',
        'hours': current_app.config['BUSINESS_HOURS'],
        'service_fee': current_app.config['SERVICE_FEE'],
        'tax_rate': current_app.config['TAX_RATE'],
        'payment_methods': current_app.config['PAYMENT_METHODS']
    })


@admin_bp.route('/settings', methods=['POST'])
def update_settings():
    """Update site settings"""
    return jsonify({'status': 'success', 'message': 'Settings updated'})
