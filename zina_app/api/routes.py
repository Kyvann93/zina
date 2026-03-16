"""
ZINA Cantine BAD - Public API Routes
Handles menu, categories, products, orders, and company info endpoints
"""

import uuid
import re
import hashlib
import logging
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Optional

from flask import jsonify, request, current_app, g
from werkzeug.utils import secure_filename

from zina_app.api import api_bp
from zina_app.services import DatabaseService
from zina_app.models import CreateOrderRequest, OrderItemRequest

logger = logging.getLogger(__name__)

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

ALLOWED_IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
EMAIL_PATTERN = re.compile(r'^[\w\.-]+@[\w\.-]+\.\w+$')


def get_db_service() -> DatabaseService:
    """Get database service — one instance per request via Flask g."""
    if 'db' not in g:
        from supabase import create_client
        supabase = create_client(
            current_app.config['SUPABASE_URL'],
            current_app.config['SUPABASE_KEY']
        )
        g.db = DatabaseService(supabase)
    return g.db


def _save_uploaded_image(file, name: str) -> Optional[str]:
    """Save an uploaded image file and return its relative URL, or None on failure."""
    if not file or file.filename == '':
        return None
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return None
    filename = secure_filename(f"{name.lower().replace(' ', '-')}{ext}")
    save_path = Path('static/images/food') / filename
    save_path.parent.mkdir(parents=True, exist_ok=True)
    file.save(str(save_path))
    return f"static/images/food/{filename}"



@api_bp.route('/menu')
def get_menu():
    """Get full menu organized by category"""
    try:
        db = get_db_service()
        categories = db.get_categories()

        menu_data = {}
        for category in categories:
            category_key = category.category_name.lower().replace(' ', '_').replace('-', '_')
            default_image = DEFAULT_IMAGES.get(category_key, 'https://images.unsplash.com/photo-1544025162-d76690b67f14?w=400&h=300&fit=crop')
            category_image = category.image_url
            try:
                menu_data[category_key] = [
                    {
                        "id": product.product_id,
                        "name": product.product_name,
                        "price": float(product.price),
                        "description": product.description or "",
                        "image": product.image_url or category_image or default_image,
                        "prep_time": "15 min",
                        "category": product.category_name or category.category_name,
                        "options": [
                            {
                                "id": opt.option_id,
                                "name": opt.option_name,
                                "price": float(opt.additional_price)
                            } for opt in (product.options or [])
                        ]
                    }
                    for product in (category.products or [])
                ]
            except Exception as cat_error:
                logger.error("Error processing category %d: %s", category.category_id, cat_error)
                continue

        return jsonify(menu_data)
    except Exception as e:
        logger.error("Error in get_menu: %s", e, exc_info=True)
        return jsonify({"error": str(e)}), 500


@api_bp.route('/categories')
def get_categories():
    """Get all categories with images and products"""
    try:
        db = get_db_service()
        categories = db.get_categories()
        return jsonify([{
            "id": cat.category_id,
            "name": cat.category_name,
            "description": cat.description,
            "image": cat.image_url,
            "products_count": len(cat.products) if cat.products else 0
        } for cat in categories])
    except Exception as e:
        logger.error("Error in get_categories: %s", e)
        return jsonify({"error": str(e)}), 500


@api_bp.route('/products/<int:product_id>')
def get_product(product_id):
    """Get product by ID"""
    try:
        db = get_db_service()
        product = db.get_product_by_id(product_id)
        if product:
            return jsonify({
                "id": product.product_id,
                "category_id": product.category_id,
                "name": product.product_name,
                "description": product.description,
                "price": float(product.price),
                "image_url": product.image_url,
                "is_available": product.is_available,
                "category_name": product.category_name,
                "options": [
                    {
                        "id": opt.option_id,
                        "name": opt.option_name,
                        "price": float(opt.additional_price)
                    } for opt in (product.options or [])
                ]
            })
        return jsonify({"error": "Product not found"}), 404
    except Exception as e:
        logger.error("Error in get_product %d: %s", product_id, e)
        return jsonify({"error": str(e)}), 500


@api_bp.route('/register', methods=['POST'])
def register_user():
    """Register a new user"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Missing request body"}), 400

        for field in ['employee_id', 'full_name', 'email', 'department']:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        if not EMAIL_PATTERN.match(data['email']):
            return jsonify({"error": "Invalid email format"}), 400

        hash_bytes = hashlib.md5(data['employee_id'].encode()).digest()
        user_id = str(uuid.UUID(bytes=hash_bytes))

        default_password = f"temp-{data['employee_id'][:8]}"
        password_hash = hashlib.sha256(default_password.encode()).hexdigest()

        user_data = {
            'user_id': user_id,
            'full_name': data['full_name'],
            'email': data['email'],
            'phone': data.get('phone'),
            'department': data['department'],
            'employee_id': data['employee_id'],
            'password_hash': password_hash,
            'created_at': datetime.now().isoformat()
        }

        db = get_db_service()
        response = db.supabase.table('users').insert(user_data).execute()

        if response.data:
            return jsonify({
                "status": "success",
                "message": "Inscription réussie ! Vous pouvez maintenant vous connecter.",
                "user_id": user_id,
                "full_name": data['full_name']
            })
        return jsonify({"error": "Échec de l'inscription"}), 500

    except Exception as e:
        logger.error("Registration error: %s", e)
        return jsonify({"error": "Une erreur est survenue lors de l'inscription"}), 500


@api_bp.route('/order', methods=['POST'])
def place_order():
    """Place a new order"""
    try:
        order_data = request.json
        if not order_data:
            return jsonify({"error": "Missing request body"}), 400

        items = order_data.get('items')
        if not items:
            return jsonify({"error": "Missing required field: items"}), 400

        for item in items:
            if not item.get('product_id') or not item.get('quantity'):
                return jsonify({"error": "Each item needs product_id and quantity"}), 400
            if int(item['quantity']) <= 0:
                return jsonify({"error": "Quantity must be positive"}), 400

        user_id = order_data.get('user_id')
        if user_id in (None, 'None', 'null'):
            user_id = None

        user_id_obj = None
        if user_id:
            try:
                user_id_obj = uuid.UUID(user_id)
            except (ValueError, TypeError):
                logger.warning("Invalid user_id format: %s — treating as guest", user_id)

        pickup_time = None
        if order_data.get('pickup_time'):
            try:
                pickup_time = datetime.fromisoformat(order_data['pickup_time'])
            except (ValueError, TypeError) as e:
                logger.warning("Invalid pickup_time format: %s", e)

        order_items = [
            OrderItemRequest(
                product_id=item['product_id'],
                quantity=item['quantity'],
                option_ids=item.get('option_ids', [])
            )
            for item in items
        ]

        create_order_request = CreateOrderRequest(
            user_id=user_id_obj,
            items=order_items,
            pickup_time=pickup_time,
            prep_time_minutes=order_data.get('prep_time_minutes', 15)
        )

        db = get_db_service()
        order_response = db.create_order(create_order_request)

        if not order_response:
            return jsonify({"error": "Failed to create order"}), 500

        items_list = []
        for item in order_response.items:
            if isinstance(item, dict):
                options_list = [
                    {
                        "option_id": opt.get("option_id") if isinstance(opt, dict) else opt.option_id,
                        "option_name": opt.get("option_name") if isinstance(opt, dict) else opt.option_name,
                        "additional_price": float(opt.get("additional_price", 0) if isinstance(opt, dict) else opt.additional_price)
                    }
                    for opt in (item.get('options') or [])
                ]
                items_list.append({
                    "product_id": item["product_id"],
                    "product_name": item["product_name"],
                    "quantity": item["quantity"],
                    "unit_price": float(item["unit_price"]),
                    "options": options_list
                })
            else:
                items_list.append({
                    "product_id": item.product_id,
                    "product_name": item.product_name,
                    "quantity": item.quantity,
                    "unit_price": float(item.unit_price),
                    "options": [
                        {
                            "option_id": opt.option_id,
                            "option_name": opt.option_name,
                            "additional_price": float(opt.additional_price)
                        } for opt in (item.options or [])
                    ]
                })

        return jsonify({
            "status": "success",
            "order_id": order_response.order_id,
            "user_id": str(order_response.user_id),
            "total_amount": float(order_response.total_amount),
            "order_status": order_response.order_status,
            "pickup_time": order_response.pickup_time.isoformat() if order_response.pickup_time else None,
            "prep_time_minutes": order_response.prep_time_minutes,
            "items": items_list,
            "message": "Order placed successfully!"
        })

    except Exception as e:
        logger.error("Error in place_order: %s", e, exc_info=True)
        return jsonify({"error": str(e)}), 500


@api_bp.route('/orders/<int:order_id>')
def get_order(order_id):
    """Get order by ID"""
    try:
        db = get_db_service()
        order = db.get_order_by_id(order_id)
        if order:
            return jsonify({
                "order_id": order.order_id,
                "user_id": str(order.user_id),
                "total_amount": float(order.total_amount),
                "order_status": order.order_status,
                "created_at": order.created_at.isoformat() if order.created_at else None,
                "pickup_time": order.pickup_time.isoformat() if order.pickup_time else None,
                "prep_time_minutes": order.prep_time_minutes,
                "items": [
                    {
                        "product_id": item['product_id'] if isinstance(item, dict) else item.product_id,
                        "product_name": item['product_name'] if isinstance(item, dict) else item.product_name,
                        "quantity": item['quantity'] if isinstance(item, dict) else item.quantity,
                        "unit_price": float(item['unit_price'] if isinstance(item, dict) else item.unit_price),
                        "options": []
                    } for item in (order.items or [])
                ]
            })
        return jsonify({"error": "Order not found"}), 404
    except Exception as e:
        logger.error("Error in get_order %d: %s", order_id, e)
        return jsonify({"error": str(e)}), 500


@api_bp.route('/menu/today')
def get_menu_of_the_day():
    """Get today's special menu"""
    try:
        db = get_db_service()
        categories = db.get_categories()

        todays_menu = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "categories": {}
        }

        for category in categories:
            category_key = category.category_name.lower().replace(' ', '_').replace('-', '_')
            default_image = DEFAULT_IMAGES.get(category_key, 'https://images.unsplash.com/photo-1544025162-d76690b67f14?w=400&h=300&fit=crop')
            category_image = category.image_url

            todays_menu["categories"][category.category_name.lower().replace(' ', '_')] = [
                {
                    "id": product.product_id,
                    "name": product.product_name,
                    "price": float(product.price),
                    "description": product.description,
                    "image": product.image_url or category_image or default_image,
                    "prep_time": "15 min",
                    "is_popular": product.product_id % 3 == 0
                }
                for product in (category.products or [])[:6]
            ]

        return jsonify(todays_menu)
    except Exception as e:
        logger.error("Error in get_menu_of_the_day: %s", e)
        return jsonify({"error": str(e)}), 500


@api_bp.route('/guest/orders')
def get_guest_orders():
    """Get orders for a specific guest user"""
    try:
        guest_user_id = request.args.get('user_id')

        if not guest_user_id or guest_user_id in ('None', 'null'):
            return jsonify({"error": "Valid guest user ID required"}), 400

        try:
            uuid.UUID(guest_user_id)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400

        db = get_db_service()
        response = db.supabase.table('orders').select(
            '*, order_items(*, products(product_name, price))'
        ).eq('user_id', guest_user_id).order('created_at', desc=True).execute()

        guest_orders = []
        for order_data in response.data:
            items = []
            for item in (order_data.get('order_items') or []):
                product_name = item['products']['product_name'] if item.get('products') else f"Product {item['product_id']}"
                items.append({
                    'product_id': item['product_id'],
                    'product_name': product_name,
                    'quantity': item['quantity'],
                    'unit_price': float(item['unit_price'])
                })

            guest_orders.append({
                'order_id': order_data['order_id'],
                'user_id': order_data['user_id'],
                'total_amount': float(order_data['total_amount']),
                'order_status': order_data['order_status'],
                'created_at': order_data['created_at'],
                'pickup_time': order_data.get('pickup_time'),
                'prep_time_minutes': order_data.get('prep_time_minutes', 15),
                'items': items,
                'is_guest': True
            })

        return jsonify(guest_orders)
    except Exception as e:
        logger.error("Error in get_guest_orders: %s", e)
        return jsonify({"error": str(e)}), 500


@api_bp.route('/user/orders')
def get_user_orders():
    """Get orders for the current user"""
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({"error": "User ID required"}), 400

        try:
            user_uuid = uuid.UUID(user_id)
        except (ValueError, TypeError) as e:
            return jsonify({"error": f"Invalid user_id format: {e}"}), 400

        db = get_db_service()
        orders = db.get_orders_by_user_id(user_uuid)

        return jsonify([
            {
                'order_id': order.order_id,
                'user_id': str(order.user_id),
                'total_amount': float(order.total_amount),
                'order_status': order.order_status,
                'created_at': order.created_at.isoformat() if order.created_at else None,
                'pickup_time': order.pickup_time.isoformat() if order.pickup_time else None,
                'prep_time_minutes': order.prep_time_minutes,
                'items': order.items,
            }
            for order in orders
        ])
    except Exception as e:
        logger.error("Error in get_user_orders: %s", e)
        return jsonify({"error": str(e)}), 500


@api_bp.route('/admin/orders')
def get_admin_orders():
    """Get all orders for admin dashboard"""
    try:
        db = get_db_service()
        response = db.supabase.table('orders').select(
            '*, order_items(*, products(product_name, price))'
        ).order('created_at', desc=True).execute()

        orders = []
        for order_data in response.data:
            items = []
            for item in (order_data.get('order_items') or []):
                product_name = item['products']['product_name'] if item.get('products') else f"Product {item['product_id']}"
                items.append({
                    'product_id': item['product_id'],
                    'product_name': product_name,
                    'quantity': item['quantity'],
                    'unit_price': float(item['unit_price'])
                })

            orders.append({
                'order_id': order_data['order_id'],
                'user_id': order_data['user_id'],
                'total_amount': float(order_data['total_amount']),
                'order_status': order_data['order_status'],
                'created_at': order_data['created_at'],
                'pickup_time': order_data.get('pickup_time'),
                'prep_time_minutes': order_data.get('prep_time_minutes', 15),
                'items': items,
            })

        return jsonify(orders)
    except Exception as e:
        logger.error("Error in get_admin_orders: %s", e)
        return jsonify({"error": str(e)}), 500


@api_bp.route('/admin/users')
def get_admin_users():
    """Get all users for admin dashboard"""
    try:
        db = get_db_service()
        response = db.supabase.table('users').select('*').order('created_at', desc=True).execute()

        users = [
            {
                'id': u.get('id'),
                'full_name': u.get('full_name'),
                'email': u.get('email'),
                'phone': u.get('phone'),
                'department': u.get('department'),
                'employee_id': u.get('employee_id'),
                'created_at': u.get('created_at')
            }
            for u in response.data
        ]
        return jsonify(users)
    except Exception as e:
        logger.error("Error in get_admin_users: %s", e)
        return jsonify({"error": str(e)}), 500


@api_bp.route('/info')
def get_company_info():
    """Get ZINA company information"""
    return jsonify({
        "company_name": current_app.config['COMPANY_NAME'],
        "app_name": current_app.config['APP_NAME'],
        "description": current_app.config['APP_DESCRIPTION'],
        "location": current_app.config['LOCATION'],
        "contact": {
            "address": "Cantine BAD, Avenue Joseph Anoma, Abidjan, Côte d'Ivoire",
            "phone": "+225 27 20 00 00 00",
            "email": "contact@zina-cantine.ci"
        },
        "hours": current_app.config['BUSINESS_HOURS']
    })


@api_bp.route('/contact', methods=['POST'])
def submit_contact_form():
    """Handle contact form submissions"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Missing request body"}), 400

        for field in ['name', 'email', 'subject', 'message']:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        current_app.logger.info("Contact form submission from: %s", data.get('email'))

        return jsonify({
            "status": "success",
            "message": "Message envoyé avec succès. Nous vous répondrons dans les plus brefs délais."
        })
    except Exception as e:
        current_app.logger.error("Contact form error: %s", e)
        return jsonify({"error": "Une erreur est survenue. Veuillez réessayer."}), 500


@api_bp.route('/newsletter', methods=['POST'])
def subscribe_newsletter():
    """Handle newsletter subscription"""
    try:
        data = request.json
        email = data.get('email') if data else None

        if not email:
            return jsonify({"error": "Email is required"}), 400

        if not EMAIL_PATTERN.match(email):
            return jsonify({"error": "Invalid email format"}), 400

        current_app.logger.info("Newsletter subscription: %s", email)

        return jsonify({
            "status": "success",
            "message": "Merci pour votre inscription à notre newsletter !"
        })
    except Exception as e:
        current_app.logger.error("Newsletter subscription error: %s", e)
        return jsonify({"error": "Une erreur est survenue. Veuillez réessayer."}), 500


@api_bp.route('/categories/images/available')
def get_available_category_images():
    """Get list of available category images in the local folder"""
    try:
        from zina_app.services.category_image_service import CategoryImageService
        image_service = CategoryImageService()
        available_images = image_service.list_available_images()
        return jsonify({
            "status": "success",
            "images": available_images,
            "count": len(available_images)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route('/products', methods=['POST'])
def create_product():
    """Create a new product with optional image"""
    try:
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        price_str = request.form.get('price', '').strip()
        category_id_str = request.form.get('category_id', '').strip()

        if not name or not price_str or not category_id_str:
            return jsonify({"error": "Name, price, and category_id are required"}), 400

        try:
            price = float(price_str)
        except ValueError:
            return jsonify({"error": "Invalid price format"}), 400

        try:
            category_id = int(category_id_str)
        except ValueError:
            return jsonify({"error": "Invalid category_id format"}), 400

        image_url = _save_uploaded_image(request.files.get('image'), name)
        if 'image' in request.files and request.files['image'].filename != '' and image_url is None:
            return jsonify({"error": "Invalid file type. Allowed: PNG, JPG, JPEG, GIF, WebP"}), 400

        db = get_db_service()
        products = db.get_products()
        new_product_id = (max(p.product_id for p in products) + 1) if products else 1

        product_data = {
            'product_id': new_product_id,
            'category_id': category_id,
            'product_name': name,
            'price': price,
            'description': description,
            'image_url': image_url,
            'is_available': True,
            'created_at': datetime.now().isoformat()
        }

        create_response = db.supabase.table('products').insert(product_data).execute()

        if create_response.data:
            return jsonify({
                "status": "success",
                "message": "Product created successfully",
                "product": {
                    "product_id": new_product_id,
                    "name": name,
                    "description": description,
                    "price": price,
                    "category_id": category_id,
                    "image_url": image_url
                }
            })
        return jsonify({"error": "Failed to create product"}), 500

    except Exception as e:
        logger.error("Error in create_product: %s", e)
        return jsonify({"error": str(e)}), 500


@api_bp.route('/products/<int:product_id>/image', methods=['POST'])
def upload_product_image(product_id):
    """Upload image for a specific product"""
    try:
        db = get_db_service()
        product = db.get_product_by_id(product_id)
        if not product:
            return jsonify({"error": "Product not found"}), 404

        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400

        image_url = _save_uploaded_image(request.files['image'], product.product_name)
        if image_url is None:
            return jsonify({"error": "Invalid or missing file. Allowed: PNG, JPG, JPEG, GIF, WebP"}), 400

        update_response = db.supabase.table('products').update({'image_url': image_url}).eq('product_id', product_id).execute()

        if update_response.data:
            return jsonify({
                "status": "success",
                "message": "Product image uploaded successfully",
                "product_id": product_id,
                "product_name": product.product_name,
                "image_url": image_url
            })
        return jsonify({"error": "Failed to update product image"}), 500

    except Exception as e:
        logger.error("Error in upload_product_image %d: %s", product_id, e)
        return jsonify({"error": str(e)}), 500


@api_bp.route('/categories', methods=['POST'])
def create_category():
    """Create a new category with optional image"""
    try:
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()

        if not name:
            return jsonify({"error": "Category name is required"}), 400

        image_url = _save_uploaded_image(request.files.get('image'), name)
        if 'image' in request.files and request.files['image'].filename != '' and image_url is None:
            return jsonify({"error": "Invalid file type. Allowed: PNG, JPG, JPEG, GIF, WebP"}), 400

        db = get_db_service()
        categories = db.get_categories()
        new_category_id = (max(c.category_id for c in categories) + 1) if categories else 1

        category_data = {
            'category_id': new_category_id,
            'category_name': name,
            'description': description,
            'image_url': image_url,
            'created_at': datetime.now().isoformat()
        }

        create_response = db.supabase.table('categories').insert(category_data).execute()

        if create_response.data:
            return jsonify({
                "status": "success",
                "message": "Category created successfully",
                "category": {
                    "category_id": new_category_id,
                    "name": name,
                    "description": description,
                    "image_url": image_url
                }
            })
        return jsonify({"error": "Failed to create category"}), 500

    except Exception as e:
        logger.error("Error in create_category: %s", e)
        return jsonify({"error": str(e)}), 500


@api_bp.route('/categories/<int:category_id>/image', methods=['POST'])
def upload_category_image(category_id):
    """Upload image for a specific category"""
    try:
        db = get_db_service()
        categories = db.get_categories()
        category = next((c for c in categories if c.category_id == category_id), None)
        if not category:
            return jsonify({"error": "Category not found"}), 404

        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400

        image_url = _save_uploaded_image(request.files['image'], category.category_name)
        if image_url is None:
            return jsonify({"error": "Invalid or missing file. Allowed: PNG, JPG, JPEG, GIF, WebP"}), 400

        update_response = db.supabase.table('categories').update({'image_url': image_url}).eq('category_id', category_id).execute()

        if update_response.data:
            return jsonify({
                "status": "success",
                "message": "Image uploaded successfully",
                "category_id": category_id,
                "category_name": category.category_name,
                "image_url": image_url
            })
        return jsonify({"error": "Failed to update category image"}), 500

    except Exception as e:
        logger.error("Error in upload_category_image %d: %s", category_id, e)
        return jsonify({"error": str(e)}), 500


@api_bp.route('/categories/<int:category_id>/image')
def get_category_image_info(category_id):
    """Get image information for a specific category"""
    try:
        db = get_db_service()
        categories = db.get_categories()
        category = next((c for c in categories if c.category_id == category_id), None)
        if not category:
            return jsonify({"error": "Category not found"}), 404

        return jsonify({
            "category_id": category.category_id,
            "category_name": category.category_name,
            "image_url": category.image_url,
            "description": category.description
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
