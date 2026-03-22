"""
ZINA Cantine BAD - Admin API Routes
Handles admin endpoints for menus, categories, orders, and settings
"""

from flask import jsonify, request, current_app, session

from supabase import create_client

from zina_app.api.admin import admin_bp
from zina_app.api.constants import CATEGORY_EMOJIS, CATEGORY_DEFAULT_IMAGES, CATEGORY_DEFAULT_IMAGE_FALLBACK
from zina_app.services import DatabaseService

# ── Auth guard ───────────────────────────────────────────────────────────────
# Routes that are accessible without a session
_PUBLIC_ENDPOINTS = {'admin.admin_login', 'admin.admin_logout'}

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

    if username == expected_user and password == expected_pass:
        session['zina_admin'] = True
        session.permanent = False
        return jsonify({'status': 'success', 'message': 'Connexion réussie'})
    return jsonify({'status': 'error', 'message': 'Identifiant ou mot de passe incorrect'}), 401


@admin_bp.route('/logout', methods=['POST'])
def admin_logout():
    """Clear admin session"""
    session.pop('zina_admin', None)
    return jsonify({'status': 'success'})


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
async def get_admin_menus():
    """Get all menus for admin"""
    try:
        db = get_db_service()
        categories = await db.get_categories()
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
                    'available': product.is_available,
                    'image': image
                })
        return jsonify(menus)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/menus', methods=['POST'])
def create_menu():
    """Create a new menu item"""
    try:
        data = request.json
        supabase = get_supabase()
        existing_category = supabase.table('categories').select('category_id').order('category_id',desc=True).limit(1).execute()
        if existing_category.data:
            next_category_id = existing_category.data[0]['category_id']
            data['category_id'] = next_category_id
            response = supabase.table('products').select('product_id').order('product_id',desc=True).limit(1).execute()
            next_id = response.data[0]['product_id'] + 1 if response.data else 1
            data['product_id'] = next_id
            supabase.table('products').insert(data).execute()
            print('Menu created:', data)
            return jsonify({'status': 'success', 'message': 'Menu créé'})
        else:
            return jsonify({'status': 'error', 'message': 'Aucune catégorie trouvée'}), 404
    except Exception as e:
        print("Une erreur",e)
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/menus/<int:menu_id>', methods=['PUT'])
def update_menu(menu_id):
    """Update a menu item"""
    try:
        data = request.json
        supabase = get_supabase()
        supabase.table('products').update(data).eq('product_id', menu_id).execute()
        return jsonify({'status': 'success', 'message': 'Menu mis à jour'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/menus/<int:menu_id>', methods=['DELETE'])
def delete_menu(menu_id):
    """Delete a menu item"""
    try:
        supabase = get_supabase()
        supabase.table('products').delete().eq('product_id', menu_id).execute()
        return jsonify({'status': 'success', 'message': 'Menu supprimé'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/categories', methods=['GET'])
async def get_admin_categories():
    """Get all categories for admin"""
    try:
        db = get_db_service()
        categories = await db.get_categories()
        result = []
        for cat in categories:
            category_key = cat.category_name.lower().replace(' ', '_').replace('-', '_')
            emoji = CATEGORY_EMOJIS.get(category_key, '🍽️')
            result.append({
                'id': cat.category_id,
                'name': cat.category_name,
                'description': cat.description,
                'emoji': emoji
            })
        return jsonify(result)
    except Exception as e:
        return jsonify([{'error': str(e)}])


@admin_bp.route('/categories', methods=['POST'])
def create_category():
    """Create a new category"""
    try:
        data = request.json
        supabase = get_supabase()
        
        # Get the next category_id
        response = supabase.table('categories').select('category_id').order('category_id', desc=True).limit(1).execute()
        next_id = response.data[0]['category_id'] + 1 if response.data else 1
        
        # Add the generated ID to the data
        data['category_id'] = next_id
        supabase.table('categories').insert(data).execute()
        return jsonify({'status': 'success', 'message': 'Catégorie créée'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    
@admin_bp.route('/categories/<int:category_id>',methods=['DELETE'])
def delete_categories(category_id):
    try:
        supabase = get_supabase()
        supabase.table('categories').delete().eq('category_id', category_id).execute()
        return jsonify({'status': 'success', 'message': 'Catégorie supprimée'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    
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
        return jsonify([{'error': str(e)}])


@admin_bp.route('/users', methods=['GET'])
def get_admin_users():
    """Get all users for admin"""
    try:
        supabase = get_supabase()
        response = supabase.table('users').select('*').execute()

        if response.data:
            users = []
            for user in response.data:
                users.append({
                    'user_id': user.get('user_id'),
                    'full_name': user.get('full_name'),
                    'email': user.get('email'),
                    'phone': user.get('phone'),
                    'department': user.get('department'),
                    'employee_id': user.get('employee_id'),
                    'created_at': user.get('created_at')
                })
            return jsonify(users)
        else:
            return jsonify([])
    except Exception as e:
        return jsonify([{'error': str(e)}])


@admin_bp.route('/orders/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    """Update order status"""
    try:
        data = request.json
        new_status = data.get('status')
        if not new_status:
            return jsonify({'status': 'error', 'message': 'Missing status field'}), 400
        supabase = get_supabase()
        supabase.table('orders').update({'order_status': new_status}).eq('order_id', order_id).execute()
        return jsonify({'status': 'success', 'message': f'Commande #{order_id} mise à jour : {new_status}'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


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
    try:
        data = request.json
        return jsonify({'status': 'success', 'message': 'Settings updated'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
