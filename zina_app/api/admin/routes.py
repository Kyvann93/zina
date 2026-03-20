"""
ZINA Cantine BAD - Admin API Routes
Handles admin endpoints for menus, categories, orders, and settings
"""

from flask import jsonify, request, current_app
from supabase import create_client
import json
from pathlib import Path

from zina_app.api.admin import admin_bp
from zina_app.services import DatabaseService


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
local_path : str= "static/images/food"
bucket_name : str = 'menu_picture'
supabase_file_path : str = 'storage/files/buckets/menu_picture'

def upload_image_to_supabase(local_path,remote_path):
    try:
        with open(local_path,'rb') as f:
            file_body= f.read()
        response = get_db_service.storage.from_(bucket_name).upload(
            file = file_body,
            path = remote_path,
        )
        if response.get("error"):
            raise Exception(response["error"].get("message"))
        print(f"Successfully uploaded {local_path} to {remote_path}")
        public_url_response = get_db_service.storage.from_(bucket_name).get_public_url(remote_path)
        print(f"Public URL: {public_url_response}")
    except FileNotFoundError:
        print(f"Error: the file {local_path} was not found.")


@admin_bp.route('/menus', methods=['GET'])
async def get_admin_menus():
    """Get all menus for admin"""
    # Default images by category - using Unsplash source URLs
    DEFAULT_IMAGES = {
        'petit_déjeuner': 'https://images.unsplash.com/photo-1533089862017-5614ec45e25a?w=400&h=300&fit=crop',
        'petit-déjeuner': 'https://images.unsplash.com/photo-1533089862017-5614ec45e25a?w=400&h=300&fit=crop',
        'déjeuner': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
        'dejeuner': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
        'snacks': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=300&fit=crop',
        'salades': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
        'salade': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
        'boissons': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop',
        'desserts': 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=300&fit=crop',
        'dessert': 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=300&fit=crop',
        'dîner': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
        'diner': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
        'entrées': 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=400&h=300&fit=crop',
        'entrees': 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=400&h=300&fit=crop',
        'soupes': 'https://images.unsplash.com/photo-1547592166-23acbe346499?w=400&h=300&fit=crop',
        'soupe': 'https://images.unsplash.com/photo-1547592166-23acbe346499?w=400&h=300&fit=crop',
        'spécialités': 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop',
        'specialites': 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop',
        'breakfast': 'https://images.unsplash.com/photo-1533089862017-5614ec45e25a?w=400&h=300&fit=crop',
        'lunch': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
        'dinner': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
        'appetizers': 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=400&h=300&fit=crop',
        'soups': 'https://images.unsplash.com/photo-1547592166-23acbe346499?w=400&h=300&fit=crop',
        'specials': 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop'
    }
    
    try:
        db = get_db_service()
        categories = await db.get_categories()
        menus = []
        for cat in categories:
            category_key = cat.category_name.lower().replace(' ', '_').replace('-', '_')
            default_image = DEFAULT_IMAGES.get(category_key, 'https://images.unsplash.com/photo-1544025162-d76690b67f14?w=400&h=300&fit=crop')
            
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
    # Emoji icons by category
    CATEGORY_EMOJIS = {
        'petit_déjeuner': '🥐',
        'petit-déjeuner': '🥐',
        'déjeuner': '🍽️',
        'dejeuner': '🍽️',
        'snacks': '🍟',
        'salades': '🥗',
        'salade': '🥗',
        'boissons': '🥤',
        'desserts': '🍰',
        'dessert': '🍰',
        'dîner': '🍲',
        'diner': '🍲',
        'entrées': '🥖',
        'entrees': '🥖',
        'soupes': '🍜',
        'soupe': '🍜',
        'spécialités': '🌟',
        'specialites': '🌟',
        'breakfast': '🥐',
        'lunch': '🍽️',
        'dinner': '🍲',
        'appetizers': '🥖',
        'soups': '🍜',
        'specials': '🌟'
    }
    
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
        response = (
            supabase.table('orders')
            .select('order_id,user_id,total_amount,order_status,created_at,pickup_time,prep_time_minutes')
            .order('created_at', desc=True)
            .limit(200)
            .execute()
        )

        if response.data:
            orders = []
            for order in response.data:
                # Get order items
                items = []
                try:
                    items_response = supabase.table('order_items')\
                        .select('*')\
                        .eq('order_id', order['order_id'])\
                        .execute()
                    if items_response.data:
                        for item in items_response.data:
                            items.append({
                                'product_id': item['product_id'],
                                'product_name': item.get('product_name', 'Item'),
                                'quantity': item['quantity'],
                                'unit_price': float(item['unit_price']) if item.get('unit_price') else 0
                            })
                except Exception:
                    pass  # order_items table might not exist

                # Get payment info
                payment = {'payment_method': 'Non spécifié'}
                try:
                    payment_response = supabase.table('payments')\
                        .select('payment_method')\
                        .eq('order_id', order['order_id'])\
                        .execute()
                    if payment_response.data and len(payment_response.data) > 0:
                        payment['payment_method'] = payment_response.data[0].get('payment_method', 'Non spécifié')
                except Exception:
                    pass  # payments table might not exist or no payment yet

                orders.append({
                    'order_id': order.get('order_id'),
                    'user_id': order.get('user_id'),
                    'total_amount': float(order.get('total_amount') or 0),
                    'order_status': order.get('order_status'),
                    'created_at': order.get('created_at'),
                    'pickup_time': order.get('pickup_time'),
                    'prep_time_minutes': order.get('prep_time_minutes'),
                    'items': items,
                    'payment': payment
                })
            return jsonify(orders)
        else:
            return jsonify([])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
                    'id': user.get('id'),
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
            return jsonify({'status': 'error', 'message': 'Status is required'}), 400
        
        supabase = get_supabase()
        
        # Update the order status in the database
        response = supabase.table('orders')\
            .update({'order_status': new_status})\
            .eq('order_id', order_id)\
            .execute()
        
        if response.data:
            return jsonify({
                'status': 'success',
                'message': f'Order {order_id} updated to {new_status}',
                'order_id': order_id,
                'new_status': new_status
            })
        else:
            return jsonify({'status': 'error', 'message': 'Order not found'}), 404
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
        _ = request.json
        return jsonify({'status': 'success', 'message': 'Settings updated'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/formulas', methods=['GET'])
def get_formulas_admin():
    """Get formulas configuration (discounts) for admin"""
    try:
        config_path = Path(current_app.root_path) / 'config' / 'formulas.json'
        if not config_path.exists():
            default_data = {"discounts": {"EP": 0, "PD": 0, "EPD": 0, "EPDB": 0}}
            config_path.parent.mkdir(parents=True, exist_ok=True)
            config_path.write_text(json.dumps(default_data, ensure_ascii=False, indent=2), encoding='utf-8')
            return jsonify(default_data)

        data = json.loads(config_path.read_text(encoding='utf-8'))
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/formulas', methods=['POST'])
def update_formulas_admin():
    """Update formulas configuration (discounts)"""
    try:
        payload = request.json or {}
        discounts = payload.get('discounts') or {}

        normalized = {
            'EP': int(discounts.get('EP', 0) or 0),
            'PD': int(discounts.get('PD', 0) or 0),
            'EPD': int(discounts.get('EPD', 0) or 0),
            'EPDB': int(discounts.get('EPDB', 0) or 0)
        }

        for k, v in list(normalized.items()):
            if v < 0:
                normalized[k] = 0

        data = {'discounts': normalized}

        config_path = Path(current_app.root_path) / 'config' / 'formulas.json'
        config_path.parent.mkdir(parents=True, exist_ok=True)
        config_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

        return jsonify({'status': 'success', 'data': data})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
