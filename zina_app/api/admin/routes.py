"""
ZINA Cantine BAD - Admin API Routes
Handles admin endpoints for menus, categories, orders, and settings
"""

import os
from datetime import datetime, timezone
from pathlib import Path

from flask import jsonify, request, current_app, session
from werkzeug.utils import secure_filename

from supabase import create_client

from zina_app.api.admin import admin_bp
from zina_app.api.constants import CATEGORY_EMOJIS, CATEGORY_DEFAULT_IMAGES, CATEGORY_DEFAULT_IMAGE_FALLBACK
from zina_app.services import DatabaseService

# ── Auth guard ───────────────────────────────────────────────────────────────
# Routes that are accessible without a session
_PUBLIC_ENDPOINTS = {'admin.admin_login', 'admin.admin_logout', 'admin.admin_session'}

@admin_bp.before_request
def require_admin_session():
    if request.endpoint in _PUBLIC_ENDPOINTS:
        return None
    if not session.get('zina_admin'):
        return jsonify({'status': 'error', 'message': 'Non autorisé'}), 401


@admin_bp.route('/login', methods=['POST'])
def admin_login():
    """Authenticate admin and create a server-side session"""
    data = request.json or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    expected_user = current_app.config.get('ADMIN_USERNAME', 'admin')
    expected_pass = current_app.config.get('ADMIN_PASSWORD', 'admin123')

    if not expected_pass:
        # Development fallback to avoid locking yourself out locally.
        # In production, ADMIN_PASSWORD must be set.
        if current_app.config.get('DEBUG') and username == expected_user and password == 'admin123':
            session['zina_admin'] = True
            session.permanent = False
            return jsonify({'status': 'success', 'message': 'Connexion réussie'})

        return jsonify({
            'status': 'error',
            'message': "Admin non configuré. Définissez la variable d'environnement ADMIN_PASSWORD.",
        }), 503
    if username == expected_user and password == expected_pass:
        session['zina_admin'] = True
        session['admin_id'] = admin['id']
        session['admin_username'] = admin['username']
        session['admin_role_id'] = role.get('id')
        session['admin_role_name'] = role.get('role_name', 'Admin')
        session['admin_permissions'] = perms
        session['admin_is_super'] = is_super
        session.permanent = True
        return jsonify({
            'status': 'success',
            'message': 'Connexion réussie',
            'username': admin['username'],
            'role': role.get('role_name', 'Admin'),
            'is_super_admin': is_super,
        })


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
    """Return whether the current browser has an authenticated admin session"""
    return jsonify({'authenticated': bool(session.get('zina_admin'))})


def get_supabase():
    """Get Supabase client from Flask app config"""
    return create_client(
        current_app.config['SUPABASE_URL'],
        current_app.config['SUPABASE_KEY']
    )


def get_db_service():
    """Get database service from Flask app config"""
    supabase = create_client(
        current_app.config['SUPABASE_URL'],
        current_app.config['SUPABASE_KEY']
    )
    return DatabaseService(supabase)


@admin_bp.route('/menus', methods=['GET'])
def get_admin_menus():
    """Get all menus for admin"""
    try:
        db = get_db_service()
        categories = db.get_categories(available_only=False)
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
                    'popular': product.is_popular is True,
                    'image': image
                })
        return jsonify(menus)
    except Exception as e:
        print(f"Une erreur est survenue lors du chargmenet des menus{e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


_MENU_FIELDS = {'product_name', 'category_id', 'price', 'description', 'is_available', 'is_popular', 'image_url'}
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
def get_admin_categories():
    """Get all categories for admin"""
    try:
        db = get_db_service()
        categories = db.get_categories(available_only=False)
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
    """Get all orders for admin with full details"""
    try:
        supabase = get_supabase()

        # Get all orders
        response = supabase.table('orders').select('*').order('created_at', desc=True).execute()

        if not response.data:
            return jsonify([])

        orders = []
        for order in response.data:
            # Get user info for client name
            full_name = 'Client'
            if order.get('user_id'):
                user_res = supabase.table('users').select('full_name').eq('user_id', order.get('user_id')).limit(1).execute()
                if user_res.data:
                    full_name = user_res.data[0].get('full_name', 'Client')

            # Get order items
            items_res = supabase.table('order_items').select('*').eq('order_id', order.get('order_id')).execute()
            articles = []
            for item in (items_res.data or []):
                product_res = supabase.table('products').select('product_name').eq('product_id', item.get('product_id')).limit(1).execute()
                product_name = 'Produit'
                if product_res.data:
                    product_name = product_res.data[0].get('product_name', 'Produit')
                articles.append({
                    'product_id': item.get('product_id'),
                    'product_name': product_name,
                    'quantity': item.get('quantity'),
                    'unit_price': item.get('unit_price')
                })

            # Get payment info
            payment_info = {'payment_method': None, 'transaction_status': 'N/A'}
            payment_res = supabase.table('transactions').select('payment_method, transaction_status').eq('order_id', order.get('order_id')).limit(1).execute()
            if payment_res.data:
                payment_info = {
                    'payment_method': payment_res.data[0].get('payment_method'),
                    'transaction_status': payment_res.data[0].get('transaction_status', 'N/A')
                }

            orders.append({
                'order_id': order.get('order_id'),
                'user_id': order.get('user_id'),
                'full_name': full_name,
                'total_amount': order.get('total_amount', 0),
                'order_status': order.get('order_status', 'pending'),
                'created_at': order.get('created_at'),
                'pickup_time': order.get('pickup_time'),
                'prep_time_minutes': order.get('prep_time_minutes', 15),
                'articles': articles,
                'payment': payment_info
            })

        return jsonify(orders)
    except Exception as e:
        current_app.logger.error('get_admin_orders error: %s', e)
        return jsonify([]), 500


@admin_bp.route('/users', methods=['GET'])
def get_admin_users():
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
        current_app.logger.error('get_admin_users error: %s', e)
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
                'transaction_status': order.get('transaction_status')
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
        transaction_status = data.get('transaction_status', 'completed')
        
        if not payment_method:
            return jsonify({'status': 'error', 'message': 'Méthode de paiement manquante'}), 400
        
        valid_methods = ['cash', 'counter', 'wave', 'card']
        if payment_method not in valid_methods:
            return jsonify({'status': 'error', 'message': 'Méthode de paiement invalide'}), 400
        
        supabase = get_supabase()

        # Upsert transaction record (do not touch the orders table for payment fields)
        existing = supabase.table('transactions').select('transaction_id').eq('order_id', order_id).limit(1).execute()
        now_iso = datetime.now(timezone.utc).isoformat()
        tx_data = {
            'payment_method': payment_method,
            'transaction_status': transaction_status,
            'transaction_type': 'payment',
            'updated_at': now_iso,
        }
        if transaction_status == 'completed':
            tx_data['processed_at'] = now_iso

        if existing.data:
            supabase.table('transactions').update(tx_data).eq('order_id', order_id).execute()
        else:
            # Look up user_id and amount from the order
            order_row = supabase.table('orders').select('user_id, total_amount').eq('order_id', order_id).limit(1).execute()
            if order_row.data:
                tx_data['order_id'] = order_id
                tx_data['user_id'] = order_row.data[0]['user_id']
                tx_data['amount'] = order_row.data[0]['total_amount']
                tx_data['currency'] = 'XOF'
                tx_data['created_at'] = now_iso
                supabase.table('transactions').insert(tx_data).execute()

        # If payment is completed, advance the order status to confirmed
        if transaction_status == 'completed' and payment_method in ['cash', 'counter', 'wave', 'card']:
            supabase.table('orders').update({'order_status': 'confirmed'}).eq('order_id', order_id).execute()
        
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
