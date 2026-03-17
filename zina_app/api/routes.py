"""
ZINA Cantine BAD - Public API Routes
Handles menu, categories, products, orders, and company info endpoints
"""

import uuid
from datetime import datetime
from decimal import Decimal
from flask import jsonify, request, current_app

from zina_app.api import api_bp
from zina_app.services import DatabaseService
from zina_app.models import CreateOrderRequest, OrderItemRequest


def get_db_service():
    """Get database service from Flask app config"""
    from supabase import create_client
    supabase = create_client(
        current_app.config['SUPABASE_URL'],
        current_app.config['SUPABASE_KEY']
    )
    return DatabaseService(supabase)

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
    

@api_bp.route('/menu')
async def get_menu():
    """Get full menu organized by category"""
    try:
        db = get_db_service()
        categories = await db.get_categories()
        
        menu_data = {}
        for category in categories:
            category_key = category.category_name.lower().replace(' ', '_').replace('-', '_')
            default_image = DEFAULT_IMAGES.get(category_key, 'https://images.unsplash.com/photo-1544025162-d76690b67f14?w=400&h=300&fit=crop')
            category_image = category.image_url
            try:
                category_key = category.category_name.lower().replace(' ', '_')
                print("image produit",category.products[0].image_url)
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
                        ] if product.options else []
                    }
                    for product in (category.products or [])
                ]
            except Exception as cat_error:
                print(f"Error processing category {category.category_id}: {cat_error}")
                continue
        
        return jsonify(menu_data)
    except Exception as e:
        print(f"Error in get_menu: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@api_bp.route('/categories')
async def get_categories():
    """Get all categories with images and products"""
    try:
        db = get_db_service()
        categories = await db.get_categories()
        return jsonify([{
            "id": cat.category_id,
            "name": cat.category_name,
            "description": cat.description,
            "image": cat.image_url,
            "products_count": len(cat.products) if cat.products else 0
        } for cat in categories])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route('/products/<int:product_id>')
async def get_product(product_id):
    """Get product by ID"""
    try:
        db = get_db_service()
        product = await db.get_product_by_id(product_id)
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
                ] if product.options else []
            })
        else:
            return jsonify({"error": "Product not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route('/register', methods=['POST'])
def register_user():
    """Register a new user"""
    try:
        data = request.json

        required_fields = ['employee_id', 'full_name', 'email', 'department']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Validate email format
        import re
        email_pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if not re.match(email_pattern, data['email']):
            return jsonify({"error": "Invalid email format"}), 400

        # Generate UUID from employee ID
        import hashlib
        hash_bytes = hashlib.md5(data['employee_id'].encode()).digest()
        user_id = str(uuid.UUID(bytes=hash_bytes))

        # Generate a default password hash for new registrations
        default_password = f"temp-{data['employee_id'][:8]}"
        password_hash = hashlib.sha256(default_password.encode()).hexdigest()

        # Create user data
        user_data = {
            'user_id': user_id,
            'full_name': data['full_name'],
            'email': data['email'],
            'phone': data.get('phone'),
            'department': data['department'],
            'employee_id': data['employee_id'],
            'password_hash': password_hash,  # Required field
            'created_at': datetime.now().isoformat()
        }

        # Insert user into database
        from supabase import create_client
        supabase = create_client(
            current_app.config['SUPABASE_URL'],
            current_app.config['SUPABASE_KEY']
        )
        
        response = supabase.table('users').insert(user_data).execute()
        
        if response.data:
            return jsonify({
                "status": "success",
                "message": "Inscription réussie ! Vous pouvez maintenant vous connecter.",
                "user_id": user_id,
                "full_name": data['full_name']
            })
        else:
            return jsonify({"error": "Échec de l'inscription"}), 500

    except Exception as e:
        print(f"Registration error: {str(e)}")
        return jsonify({"error": "Une erreur est survenue lors de l'inscription"}), 500


@api_bp.route('/order', methods=['POST'])
async def place_order():
    """Place a new order"""
    try:
        order_data = request.json
        print("Les donnees recu concernant la commande",order_data)
        if not order_data or 'items' not in order_data:
            return jsonify({"error": "Missing required field: items"}), 400

        # user_id is now optional - allow guest orders
        user_id = order_data.get('user_id')

        # Handle string 'None' as None (guest order)
        if user_id == 'None' or user_id == 'null' or user_id is None:
            user_id = None

        order_items = []
        for item in order_data['items']:
            order_item = OrderItemRequest(
                product_id=item['product_id'],
                quantity=item['quantity'],
                option_ids=item.get('option_ids', [])
            )
            order_items.append(order_item)

        # Parse user_id safely if provided
        if user_id:
            try:
                user_id_obj = uuid.UUID(user_id)
            except (ValueError, TypeError) as uuid_error:
                print(f"Invalid user_id format: {uuid_error}, treating as guest order")
                user_id_obj = None  # Guest order
        else:
            user_id_obj = None  # Guest order

        # Parse pickup_time if provided
        pickup_time = None
        if order_data.get('pickup_time'):
            try:
                pickup_time = datetime.fromisoformat(order_data['pickup_time'])
            except (ValueError, TypeError) as pt_error:
                print(f"Invalid pickup_time format: {pt_error}")

        # Get prep_time from order data or use default
        prep_time_minutes = order_data.get('prep_time_minutes', 15)

        # Create order request - use inspect to check if fields exist
        import inspect
        sig = inspect.signature(CreateOrderRequest.__init__)
        params = sig.parameters

        init_kwargs = {
            'user_id': user_id_obj,
            'items': order_items,
             # Handled at counter
        }

        # Only add pickup_time and prep_time_minutes if the model supports them
        if 'pickup_time' in params:
            init_kwargs['pickup_time'] = pickup_time
        if 'prep_time_minutes' in params:
            init_kwargs['prep_time_minutes'] = prep_time_minutes

        create_order_request = CreateOrderRequest(**init_kwargs)

        # Store extra data on the object for the database service to use
        create_order_request.pickup_time = pickup_time  # type: ignore
        create_order_request.prep_time_minutes = prep_time_minutes  # type: ignore

        db = get_db_service()
        order_response = await db.create_order(create_order_request)

        if order_response:
            items_list = []
            for item in order_response.items:
                if isinstance(item, dict):
                    options_list = []
                    if item.get('options'):
                        for opt in item['options']:
                            if isinstance(opt, dict):
                                options_list.append({
                                    "option_id": opt.get("option_id"),
                                    "option_name": opt.get("option_name"),
                                    "additional_price": float(opt.get("additional_price", 0))
                                })
                            else:
                                options_list.append({
                                    "option_id": opt.option_id,
                                    "option_name": opt.option_name,
                                    "additional_price": float(opt.additional_price)
                                })

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
                        ] if item.options else []
                    })

            return jsonify({
                "status": "success",
                "order_id": order_response.order_id,
                "user_id": str(order_response.user_id),  # Include user_id for guest user tracking
                "total_amount": float(order_response.total_amount),
                "order_status": order_response.order_status,
                "pickup_time": getattr(order_response, 'pickup_time', None).isoformat() if getattr(order_response, 'pickup_time', None) else None,
                "prep_time_minutes": getattr(order_response, 'prep_time_minutes', 15),
                "items": items_list,
                "message": "Order placed successfully!"
            })
        else:
            return jsonify({"error": "Failed to create order"}), 500

    except Exception as e:
        print("Une erreur est survenu", e)
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@api_bp.route('/orders/<int:order_id>')
async def get_order(order_id):
    """Get order by ID"""
    try:
        db = get_db_service()
        order = await db.get_order_by_id(order_id)
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
                        ] if item.options else []
                    } for item in (order.items or [])
                ]
            })
        else:
            return jsonify({"error": "Order not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route('/menu/today')
async def get_menu_of_the_day():
    """Get today's special menu"""
    
    
    try:
        db = get_db_service()
        categories = await db.get_categories()

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
        return jsonify({"error": str(e)}), 500


@api_bp.route('/guest/orders')
async def get_guest_orders():
    """Get orders for a specific guest user"""
    try:
        # Get guest user_id from query parameter
        guest_user_id = request.args.get('user_id')
        
        if not guest_user_id or guest_user_id == 'None' or guest_user_id == 'null':
            return jsonify({"error": "Valid guest user ID required"}), 400

        # Validate UUID format
        try:
            import uuid
            uuid.UUID(guest_user_id)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400

        db = get_db_service()
        # Get orders for the specific guest user
        response = db.supabase.table('orders').select('*').eq('user_id', guest_user_id).order('created_at', desc=True).execute()
        
        guest_orders = []
        for order_data in response.data:
            # Get order items if table exists
            items = []
            try:
                items_response = db.supabase.table('order_items').select('*').eq('order_id', order_data['order_id']).execute()
                if items_response.data:
                    for item in items_response.data:
                        product = await db.get_product_by_id(item['product_id'])
                        if product:
                            items.append({
                                'product_id': product.product_id,
                                'product_name': product.product_name,
                                'quantity': item['quantity'],
                                'unit_price': float(item['unit_price'])
                            })
            except Exception:
                pass  # order_items table might not exist

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
        print(f"Error in get_guest_orders: {str(e)}")
        return jsonify({"error": str(e)}), 500


@api_bp.route('/user/orders')
async def get_user_orders():
    """Get orders for the current user"""
    try:
        # Get user_id from query parameter (for testing) or session
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({"error": "User ID required"}), 400

        # Parse user_id safely
        try:
            user_uuid = uuid.UUID(user_id)
        except (ValueError, TypeError) as uuid_error:
            return jsonify({"error": f"Invalid user_id format: {uuid_error}"}), 400

        db = get_db_service()
        orders = await db.get_orders_by_user_id(user_uuid)

        # Format orders for response
        formatted_orders = []
        for order in orders:
            formatted_orders.append({
                'order_id': order.order_id,
                'user_id': str(order.user_id),
                'total_amount': float(order.total_amount),
                'order_status': order.order_status,
                'created_at': order.created_at.isoformat() if order.created_at else None,
                'pickup_time': order.pickup_time.isoformat() if order.pickup_time else None,
                'prep_time_minutes': order.prep_time_minutes,
                'items': order.items,
            
            })

        return jsonify(formatted_orders)
    except Exception as e:
        print(f"Error in get_user_orders: {str(e)}")
        return jsonify({"error": str(e)}), 500


@api_bp.route('/admin/orders')
async def get_admin_orders():
    """Get all orders for admin dashboard"""
    try:
        db = get_db_service()
        # Get all orders from the database
        response = db.supabase.table('orders').select('*').order('created_at', desc=True).execute()

        orders = []
        for order_data in response.data:
            # Payment handled at counter - no payment record during order creation
           

            # Get order items if table exists
            items = []
            try:
                items_response = db.supabase.table('order_items').select('*').eq('order_id', order_data['order_id']).execute()
                if items_response.data:
                    for item in items_response.data:
                        product = await db.get_product_by_id(item['product_id'])
                        if product:
                            items.append({
                                'product_id': product.product_id,
                                'product_name': product.product_name,
                                'quantity': item['quantity'],
                                'unit_price': float(item['unit_price'])
                            })
            except Exception:
                pass  # order_items table might not exist

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
        print(f"Error in get_admin_orders: {str(e)}")
        return jsonify({"error": str(e)}), 500


@api_bp.route('/admin/users')
async def get_admin_users():
    """Get all users for admin dashboard"""
    try:
        db = get_db_service()
        # Get all users from the database
        response = db.supabase.table('users').select('*').order('created_at', desc=True).execute()

        users = []
        for user_data in response.data:
            users.append({
                'id': user_data.get('id'),
                'full_name': user_data.get('full_name'),
                'email': user_data.get('email'),
                'phone': user_data.get('phone'),
                'department': user_data.get('department'),
                'employee_id': user_data.get('employee_id'),
                'created_at': user_data.get('created_at')
            })
        print("utilisateur",users)
        return jsonify(users)
    except Exception as e:
        print(f"Error in get_admin_users: {str(e)}")
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

        required_fields = ['name', 'email', 'subject', 'message']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        current_app.logger.info(f"Contact form submission: {data}")

        return jsonify({
            "status": "success",
            "message": "Message envoyé avec succès. Nous vous répondrons dans les plus brefs délais."
        })

    except Exception as e:
        current_app.logger.error(f"Contact form error: {str(e)}")
        return jsonify({"error": "Une erreur est survenue. Veuillez réessayer."}), 500


@api_bp.route('/newsletter', methods=['POST'])
def subscribe_newsletter():
    """Handle newsletter subscription"""
    try:
        data = request.json
        email = data.get('email')

        if not email:
            return jsonify({"error": "Email is required"}), 400

        import re
        email_pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if not re.match(email_pattern, email):
            return jsonify({"error": "Invalid email format"}), 400

        current_app.logger.info(f"Newsletter subscription: {email}")

        return jsonify({
            "status": "success",
            "message": "Merci pour votre inscription à notre newsletter !"
        })

    except Exception as e:
        current_app.logger.error(f"Newsletter subscription error: {str(e)}")
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
async def create_product():
    """Create a new product with optional image"""
    try:
        # Get form data
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        price = request.form.get('price', '').strip()
        category_id = request.form.get('category_id', '').strip()
        
        if not name or not price or not category_id:
            return jsonify({"error": "Name, price, and category_id are required"}), 400
        
        try:
            price = float(price)
        except ValueError:
            return jsonify({"error": "Invalid price format"}), 400
        
        try:
            category_id = int(category_id)
        except ValueError:
            return jsonify({"error": "Invalid category_id format"}), 400
        
        # Handle image upload
        image_url = None
        if 'image' in request.files:
            file = request.files['image']
            if file.filename != '':
                # Validate file extension
                allowed_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
                if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
                    return jsonify({"error": "Invalid file type. Allowed: PNG, JPG, JPEG, GIF, WebP"}), 400
                
                # Save image file
                from werkzeug.utils import secure_filename
                from pathlib import Path
                
                filename = secure_filename(file.filename)
                product_name = name.lower().replace(' ', '-')
                
                # Create filename with product name
                file_extension = Path(filename).suffix
                new_filename = f"{product_name}{file_extension}"
                
                # Save to static/images/food directory
                save_path = Path('static/images/food') / new_filename
                save_path.parent.mkdir(parents=True, exist_ok=True)
                
                file.save(str(save_path))
                image_url = f"static/images/food/{new_filename}"
        
        # Get next product ID
        db = get_db_service()
        products = await db.get_products()
        max_id = max([product.product_id for product in products]) if products else 0
        new_product_id = max_id + 1
        
        # Create product in database
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
        else:
            return jsonify({"error": "Failed to create product"}), 500
            
    except Exception as e:
        print(f"Error in create_product: {e}")
        return jsonify({"error": str(e)}), 500


@api_bp.route('/products/<int:product_id>/image', methods=['POST'])
async def upload_product_image(product_id):
    """Upload image for a specific product"""
    try:
        db = get_db_service()
        
        # Check if product exists
        product = await db.get_product_by_id(product_id)
        if not product:
            return jsonify({"error": "Product not found"}), 404
        
        # Handle file upload
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"error": "No image file selected"}), 400
        
        # Validate file extension
        allowed_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
        if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
            return jsonify({"error": "Invalid file type. Allowed: PNG, JPG, JPEG, GIF, WebP"}), 400
        
        # Save image file
        from werkzeug.utils import secure_filename
        from pathlib import Path
        
        filename = secure_filename(file.filename)
        product_name = product.product_name.lower().replace(' ', '-')
        
        # Create filename with product name
        file_extension = Path(filename).suffix
        new_filename = f"{product_name}{file_extension}"
        
        # Save to static/images/food directory
        save_path = Path('static/images/food') / new_filename
        save_path.parent.mkdir(parents=True, exist_ok=True)
        
        file.save(str(save_path))
        
        # Update product in database with new image URL
        image_url = f"static/images/food/{new_filename}"
        
        try:
            # Update product image_url in database
            update_data = {'image_url': image_url}
            update_response = db.supabase.table('products').update(update_data).eq('product_id', product_id).execute()
            
            if update_response.data:
                return jsonify({
                    "status": "success",
                    "message": "Product image uploaded successfully",
                    "product_id": product_id,
                    "product_name": product.product_name,
                    "image_url": image_url,
                    "filename": new_filename
                })
            else:
                return jsonify({"error": "Failed to update product image"}), 500
                
        except Exception as e:
            print(f"Error updating product image: {e}")
            return jsonify({"error": "Failed to save image"}), 500
            
    except Exception as e:
        print(f"Error in upload_product_image: {e}")
        return jsonify({"error": str(e)}), 500


@api_bp.route('/categories', methods=['POST'])
async def create_category():
    """Create a new category with optional image"""
    try:
        # Get form data
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        
        if not name:
            return jsonify({"error": "Category name is required"}), 400
        
        # Handle image upload
        image_url = None
        if 'image' in request.files:
            file = request.files['image']
            if file.filename != '':
                # Validate file extension
                allowed_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
                if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
                    return jsonify({"error": "Invalid file type. Allowed: PNG, JPG, JPEG, GIF, WebP"}), 400
                
                # Save image file
                from werkzeug.utils import secure_filename
                from pathlib import Path
                
                filename = secure_filename(file.filename)
                category_name = name.lower().replace(' ', '-')
                
                # Create filename with category name
                file_extension = Path(filename).suffix
                new_filename = f"{category_name}{file_extension}"
                
                # Save to static/images/food directory
                save_path = Path('static/images/food') / new_filename
                save_path.parent.mkdir(parents=True, exist_ok=True)
                
                file.save(str(save_path))
                image_url = f"static/images/food/{new_filename}"
        
        # Get next category ID
        db = get_db_service()
        categories = await db.get_categories()
        max_id = max([cat.category_id for cat in categories]) if categories else 0
        new_category_id = max_id + 1
        
        # Create category in database
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
        else:
            return jsonify({"error": "Failed to create category"}), 500
            
    except Exception as e:
        print(f"Error in create_category: {e}")
        return jsonify({"error": str(e)}), 500


@api_bp.route('/categories/<int:category_id>/image', methods=['POST'])
async def upload_category_image(category_id):
    """Upload image for a specific category"""
    try:
        db = get_db_service()
        
        # Check if category exists
        categories = await db.get_categories()
        category = next((cat for cat in categories if cat.category_id == category_id), None)
        if not category:
            return jsonify({"error": "Category not found"}), 404
        
        # Handle file upload
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"error": "No image file selected"}), 400
        
        # Validate file extension
        allowed_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
        if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
            return jsonify({"error": "Invalid file type. Allowed: PNG, JPG, JPEG, GIF, WebP"}), 400
        
        # Save image file
        from werkzeug.utils import secure_filename
        from pathlib import Path
        
        filename = secure_filename(file.filename)
        category_name = category.category_name.lower().replace(' ', '-')
        
        # Create filename with category name
        file_extension = Path(filename).suffix
        new_filename = f"{category_name}{file_extension}"
        
        # Save to static/images/food directory
        save_path = Path('static/images/food') / new_filename
        save_path.parent.mkdir(parents=True, exist_ok=True)
        
        file.save(str(save_path))
        
        # Update category in database with new image URL
        image_url = f"static/images/food/{new_filename}"
        
        try:
            # Update category image_url in database
            update_data = {'image_url': image_url}
            update_response = db.supabase.table('categories').update(update_data).eq('category_id', category_id).execute()
            
            if update_response.data:
                return jsonify({
                    "status": "success",
                    "message": "Image uploaded successfully",
                    "category_id": category_id,
                    "category_name": category.category_name,
                    "image_url": image_url,
                    "filename": new_filename
                })
            else:
                return jsonify({"error": "Failed to update category image"}), 500
                
        except Exception as e:
            print(f"Error updating category image: {e}")
            return jsonify({"error": "Failed to save image"}), 500
            
    except Exception as e:
        print(f"Error in upload_category_image: {e}")
        return jsonify({"error": str(e)}), 500


@api_bp.route('/categories/<int:category_id>/image')
async def get_category_image_info(category_id):
    """Get image information for a specific category"""
    try:
        db = get_db_service()
        categories = await db.get_categories()
        
        category = next((cat for cat in categories if cat.category_id == category_id), None)
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
