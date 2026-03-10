"""
ZINA Cantine BAD - Admin API Routes
Handles admin endpoints for menus, categories, orders, and settings
"""

from flask import jsonify, request, current_app
from supabase import create_client

from zina_app.api.admin import admin_bp
from zina_app.services import DatabaseService


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

def get_supabase():
    """Get Supabase client from Flask app config"""
    return create_client(
        current_app.config['SUPABASE_URL'],
        current_app.config['SUPABASE_KEY']
    )


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
        return jsonify([])
    except Exception as e:
        return jsonify([{'error': str(e)}])


@admin_bp.route('/orders/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    """Update order status"""
    try:
        data = request.json
        new_status = data.get('status')
        return jsonify({'status': 'success', 'message': f'Order {order_id} updated to {new_status}'})
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
