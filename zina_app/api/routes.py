"""
ZINA Cantine BAD - Public API Routes
Handles menu, categories, products, orders, and company info endpoints
"""

import uuid
from datetime import datetime
from decimal import Decimal
from urllib.parse import urlparse
import urllib.request
from flask import jsonify, request, current_app, redirect, url_for, flash, session, Response, make_response
from zina_app.api import api_bp
from zina_app.api.constants import CATEGORY_EMOJIS, CATEGORY_DEFAULT_IMAGES, CATEGORY_DEFAULT_IMAGE_FALLBACK
from zina_app.services import DatabaseService
from zina_app.models import CreateOrderRequest, OrderItemRequest, CreateTransactionRequest
from zina_app import limiter


def get_supabase():
    """Get Supabase client if configured, None otherwise"""
    supabase_url = current_app.config.get('SUPABASE_URL')
    supabase_key = current_app.config.get('SUPABASE_KEY')
    if not supabase_url or not supabase_key:
        return None
    from supabase import create_client
    return create_client(supabase_url, supabase_key)


def get_db_service():
    """Get database service from Flask app config"""
    from supabase import create_client
    supabase = create_client(
        current_app.config['SUPABASE_URL'],
        current_app.config['SUPABASE_KEY']
    )
    return DatabaseService(supabase)

# DEFAULT_IMAGES imported from constants.py
    

@api_bp.route('/menu')
def get_menu():
    """Get full menu organized by category"""
    try:
        db = get_db_service()
<<<<<<< Updated upstream
        categories = await db.get_categories()
        
=======
        if not db:
            # Supabase not configured - return empty menu
            return jsonify({})

        categories = db.get_categories()

>>>>>>> Stashed changes
        menu_data = {}
        for category in categories:
            category_key = category.category_name.lower().replace(' ', '_').replace('-', '_')
            default_image = CATEGORY_DEFAULT_IMAGES.get(category_key, CATEGORY_DEFAULT_IMAGE_FALLBACK)
            category_image = category.image_url
            try:
                category_key = category.category_name.lower().replace(' ', '_')
                menu_data[category_key] = [
                    {
                        "id": product.product_id,
                        "category_id": category.category_id,
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
                current_app.logger.error('request error: %s', e)
                continue

        resp = make_response(jsonify(menu_data))
        resp.headers['Cache-Control'] = 'public, max-age=300, stale-while-revalidate=60'
        return resp
    except Exception as e:
        current_app.logger.error('get_menu error: %s', e, exc_info=True)
        return jsonify({'error': 'Une erreur est survenue'}), 500


@api_bp.route('/categories')
def get_categories():
    """Get all categories — 2 queries total, no product loading"""
    try:
        from supabase import create_client
        from collections import Counter
        supabase = create_client(
            current_app.config['SUPABASE_URL'],
            current_app.config['SUPABASE_KEY']
        )
        # Query 1: all category rows (lightweight)
        cats_resp = supabase.table('categories').select('*').execute()
        categories = cats_resp.data or []

        # Query 2: just category_id column for available products — count in Python
        counts_resp = (supabase.table('products')
                       .select('category_id')
                       .eq('is_available', True)
                       .execute())
        count_map = Counter(p['category_id'] for p in (counts_resp.data or []))

        result = []
        for cat in categories:
            cat_key = cat['category_name'].lower().replace(' ', '_').replace('-', '_')
            result.append({
                'id':             cat['category_id'],
                'name':           cat['category_name'],
                'description':    cat.get('description'),
                'image':          cat.get('image_url'),
                'emoji':          CATEGORY_EMOJIS.get(cat_key, '🍽️'),
                'products_count': count_map.get(cat['category_id'], 0)
            })
        resp = make_response(jsonify(result))
        resp.headers['Cache-Control'] = 'public, max-age=300, stale-while-revalidate=60'
        return resp
    except Exception as e:
        return jsonify({'error': 'Une erreur est survenue'}), 500


@api_bp.route('/sous-categories')
def get_sous_categories():
    """Get sous-categories, optionally filtered by category_id"""
    try:
        from supabase import create_client
        supabase = create_client(
            current_app.config['SUPABASE_URL'],
            current_app.config['SUPABASE_KEY']
        )
        category_id = request.args.get('category_id')
        q = supabase.table('sous_categories').select('*').order('sous_category_id')
        if category_id:
            q = q.eq('category_id', int(category_id))
        resp = q.execute()
        result = []
        for sc in (resp.data or []):
            result.append({
                'id':          sc['sous_category_id'],
                'name':        sc['name'],
                'description': sc.get('description'),
                'image':       sc.get('image_url'),
                'category_id': sc['category_id']
            })
        resp = make_response(jsonify(result))
        resp.headers['Cache-Control'] = 'public, max-age=300, stale-while-revalidate=60'
        return resp
    except Exception as e:
        return jsonify({'error': 'Une erreur est survenue'}), 500


@api_bp.route('/menu/feed')
def get_menu_feed():
    """Paginated flat product list — exactly 3 DB queries regardless of catalogue size"""
    try:
        from supabase import create_client
        supabase = create_client(
            current_app.config['SUPABASE_URL'],
            current_app.config['SUPABASE_KEY']
        )
        limit       = min(int(request.args.get('limit', 100)), 200)
        offset      = max(int(request.args.get('offset', 0)), 0)
        category_id = request.args.get('category_id')

        # ── Query 1: products with pagination ────────────────────────────────
        q = (supabase.table('products')
             .select('*', count='exact')
             .eq('is_available', True)
             .order('product_id')
             .range(offset, offset + limit - 1))
        if category_id:
            q = q.eq('category_id', int(category_id))
        prod_resp = q.execute()
        products  = prod_resp.data or []
        total     = prod_resp.count or 0

        # ── Query 2: all categories (lightweight name + image lookup) ─────────
        cats_resp = supabase.table('categories').select('category_id,category_name,image_url').execute()
        cat_map   = {c['category_id']: c for c in (cats_resp.data or [])}

        # ── Build response (options fetched lazily per product when needed) ────
        items = []
        for p in products:
            cat     = cat_map.get(p['category_id'], {})
            cat_key = cat.get('category_name', '').lower().replace(' ', '_').replace('-', '_')
            image   = p.get('image_url') or cat.get('image_url') or CATEGORY_DEFAULT_IMAGES.get(cat_key, CATEGORY_DEFAULT_IMAGE_FALLBACK)
            items.append({
                'id':               p['product_id'],
                'category_id':      p['category_id'],
                'sous_category_id': p.get('sous_category_id'),
                'name':             p['product_name'],
                'description':      p.get('description') or '',
                'price':            float(p['price']),
                'image':            image,
                'category':         cat.get('category_name', ''),
                'available':        p.get('is_available', True),
                'is_popular':       p.get('is_popular', False),
                'options':          []
            })

        return jsonify({
            'items':    items,
            'total':    total,
            'offset':   offset,
            'limit':    limit,
            'has_more': (offset + limit) < total
        })
    except Exception as e:
        current_app.logger.error(f"Menu feed error: {type(e).__name__}")
        return jsonify({'error': 'Une erreur est survenue'}), 500


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
                ] if product.options else []
            })
        else:
            return jsonify({"error": "Product not found"}), 404
    except Exception as e:
        return jsonify({'error': 'Une erreur est survenue'}), 500


@api_bp.route('/me')
def get_current_user():
    """Return the current Flask-session user — used by the ordering page after login redirect."""
    if not session.get('is_logged_in') or not session.get('user_id'):
        return jsonify({'authenticated': False}), 401
    user_id = session['user_id']
    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table('users').select('*').eq('user_id', user_id).limit(1).execute()
            if res.data:
                u = res.data[0]
                return jsonify({
                    'authenticated': True,
                    'user': {
                        'id': u['user_id'],
                        'name': u.get('full_name', ''),
                        'email': u.get('email', ''),
                        'phone': u.get('phone', ''),
                        'department': u.get('department', ''),
                        'employee_id': u.get('employee_id', '')
                    }
                })
        except Exception as e:
            current_app.logger.error('get_current_user error: %s', e)
    # Fallback to session data only
    return jsonify({
        'authenticated': True,
        'user': {
            'id': user_id,
            'name': session.get('user_name', ''),
            'email': '',
            'phone': '',
            'department': '',
            'employee_id': ''
        }
    })


@api_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register_user():
    """Register a new user"""
    try:
        data = request.form
        required_fields = ['full_name', 'email', 'phone', 'password']
        for field in required_fields:
            if field not in data:
                flash(f"Champ requis manquant: {field}", 'error')
                return redirect(url_for('main.register'))

        # Validate email format
        import re
        email_pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if not re.match(email_pattern, data['email']):
            
            flash("Format d'email invalide", 'error')
            return redirect(url_for('main.register'))

<<<<<<< Updated upstream
        # Generate UUID from employee ID
        import hashlib
        random_integer = str(random.randint(9, int(1e6)))
        hash_bytes = hashlib.md5(random_integer.encode()).digest()
        user_id = str(uuid.UUID(bytes=hash_bytes))
=======
        # Check if Supabase is configured
        supabase_url = current_app.config.get('SUPABASE_URL')
        supabase_key = current_app.config.get('SUPABASE_KEY')
        if not supabase_url or not supabase_key:
            flash("Base de données non configurée. Veuillez configurer Supabase.", 'error')
            return redirect(url_for('main.register'))

        # Generate a cryptographically random UUID
        user_id = str(uuid.uuid4())

        # Hash the user's chosen password with a salt (PBKDF2-SHA256 via Werkzeug)
        from werkzeug.security import generate_password_hash
        raw_password = data.get('password', '')
        if not raw_password or len(raw_password) < 8:
            flash("Le mot de passe doit contenir au moins 8 caractères", 'error')
            return redirect(url_for('main.register'))
        password_hash = generate_password_hash(raw_password)

        # Create user data
        user_data = {
            'user_id': user_id,
            'full_name': data.get('full_name'),
            'email': data.get('email'),
            'phone': data.get('phone'),
            'notes': data.get('notes'),
            'password_hash': password_hash,  # Required field
            'created_at': datetime.now().isoformat()
        }

        # Insert user into database
        from supabase import create_client
        supabase = create_client(
            current_app.config['SUPABASE_URL'],
            current_app.config['SUPABASE_KEY']
        )
        try:
            response = supabase.table('users').insert(user_data).execute()
        except Exception as db_error:
            print(f"Database error during registration: {db_error}")
            flash("Une erreur est survenue lors de l'inscription. Veuillez réessayer.", 'error')
            return redirect(url_for('main.register'))
        if response.data:
            # Redirect to login page with success message
            
            flash('Inscription réussie ! Vous pouvez maintenant vous connecter.', 'success')
            return redirect(url_for('main.login'))
        else:
            flash('Échec de l\'inscription', 'error')
            return redirect(url_for('main.register'))

    except Exception as e:
        current_app.logger.error('register_user error: %s', e)
        flash("Une erreur est survenue lors de l'inscription. Veuillez réessayer.", 'error')
        return redirect(url_for('main.register'))

@api_bp.route('/login_user', methods=['POST'])
@limiter.limit("10 per minute")
def login_user():
    session.permanent = True
    """Handle user login"""
    try:
        data = request.form
        phone = data.get('phone', '').replace(" ", "")
        raw_password = data.get('password', '')

        if not phone or not raw_password:
            flash("Numéro de téléphone et mot de passe sont requis", 'error')
            return redirect(url_for('main.login'))

        from supabase import create_client
        from werkzeug.security import check_password_hash
        supabase_url = current_app.config.get('SUPABASE_URL')
        supabase_key = current_app.config.get('SUPABASE_KEY')

        # Check if Supabase is configured
        if not supabase_url or not supabase_key:
            flash("Base de données non configurée. Veuillez configurer Supabase.", 'error')
            return redirect(url_for('main.login'))

        supabase = create_client(supabase_url, supabase_key)
        response = supabase.table('users').select('*').eq('phone', phone).execute()
        if response.data:
            user = response.data[0]
            stored_hash = user.get('password_hash', '')
            if not stored_hash or not check_password_hash(stored_hash, raw_password):
                flash("Identifiants incorrects", 'error')
                return redirect(url_for('main.login'))
            session["is_logged_in"] = True
            session['user_id'] = user['user_id']
            session['user_name'] = user['full_name']
            return redirect(url_for('main.ordering'))
        else:
            flash("Identifiants incorrects", 'error')
            return redirect(url_for('main.login'))

    except Exception as e:
        current_app.logger.error('login_user error: %s', e)
        flash("Une erreur est survenue lors de la connexion. Veuillez réessayer.", 'error')
        return redirect(url_for('main.login'))
@api_bp.route('/order', methods=['POST'])
@limiter.limit("20 per minute")
def place_order():
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

        db = get_db_service()

        requested_product_ids = [item_request.product_id for item_request in order_items]
        products = [db.get_product_by_id(pid) for pid in requested_product_ids]
        products = [p for p in products if p is not None]
        existing_ids = {p.product_id for p in products}
>>>>>>> Stashed changes
        invalid_product_ids = [pid for pid in requested_product_ids if pid not in existing_ids]

        if invalid_product_ids:
            return jsonify({
                "error": "Invalid product_id(s) in order items",
                "invalid_product_ids": invalid_product_ids,
            }), 400

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

        # Optional discount amount (FCFA)
        discount_amount = order_data.get('discount_amount', 0)

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

        if 'discount_amount' in params:
            init_kwargs['discount_amount'] = discount_amount

        create_order_request = CreateOrderRequest(**init_kwargs)

        # Store extra data on the object for the database service to use
        create_order_request.pickup_time = pickup_time  # type: ignore
        create_order_request.prep_time_minutes = prep_time_minutes  # type: ignore

        order_response = db.create_order(create_order_request)

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
        current_app.logger.error(f"Place order error: {type(e).__name__}")
        return jsonify({'error': 'Une erreur est survenue'}), 500


@api_bp.route('/payment/wave/initiate', methods=['POST'])
def initiate_wave_payment():
    """Initiate a Wave payment checkout session for an order"""
    try:
        import requests as http_requests

        # Require authentication
        if not session.get('is_logged_in') or not session.get('user_id'):
            return jsonify({'status': 'error', 'message': 'Authentification requise'}), 401

        data = request.json
        order_id = data.get('order_id')
        amount = data.get('amount')
        payment_method = data.get('payment_method', 'wave')

        if not order_id or not amount:
            return jsonify({'status': 'error', 'message': 'order_id and amount sont requis'}), 400

        # Validate payment_method is 'wave' only
        if payment_method != 'wave':
            return jsonify({'status': 'error', 'message': 'Méthode de paiement invalide'}), 400

        # Validate amount is a positive number
        try:
            amount_value = float(amount)
            if amount_value <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return jsonify({'status': 'error', 'message': 'Montant invalide'}), 400

        # Validate order_id is a valid integer
        try:
            order_id_int = int(order_id)
        except (ValueError, TypeError):
            return jsonify({'status': 'error', 'message': 'ID de commande invalide'}), 400

        wave_api_key = current_app.config.get('WAVE_API_KEY')
        if not wave_api_key:
            return jsonify({'status': 'error', 'message': 'Paiement Wave non configuré'}), 500

        base_url = request.host_url.rstrip('/')

        wave_response = http_requests.post(
            'https://api.wave.com/v1/checkout/sessions',
            headers={
                'Authorization': f'Bearer {wave_api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'amount': str(int(amount_value)),
                'currency': 'XOF',
                'error_url': f'{base_url}/commander?payment=error&order_id={order_id_int}',
                'success_url': f'{base_url}/commander?payment=success&order_id={order_id_int}',
                'client_reference': f'order_{order_id_int}'
            },
            timeout=15
        )

        if wave_response.status_code == 200:
            wave_data = wave_response.json()
            return jsonify({
                'status': 'success',
                'wave_launch_url': wave_data.get('wave_launch_url'),
                'checkout_id': wave_data.get('id'),
                'order_id': order_id_int
            })
        else:
            current_app.logger.error(f"Wave API error: {wave_response.status_code}")
            return jsonify({'status': 'error', 'message': 'Erreur Wave API'}), 502

    except Exception as e:
        current_app.logger.error(f"Wave payment initiation error: {type(e).__name__}")
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500


@api_bp.route('/payment/wave/webhook', methods=['POST'])
def wave_webhook():
    """Handle Wave payment webhook callback"""
    try:
        import hmac
        import hashlib as _hashlib
        import re
        webhook_secret = current_app.config.get('WAVE_WEBHOOK_SECRET')
        if webhook_secret:
            signature = request.headers.get('Wave-Signature', '')
            body = request.get_data()
            expected = hmac.new(webhook_secret.encode(), body, _hashlib.sha256).hexdigest()
            if not hmac.compare_digest(signature, expected):
                current_app.logger.warning('Wave webhook signature mismatch')
                return jsonify({'status': 'error'}), 403

        event = request.json
        if not event:
            return jsonify({'status': 'error'}), 400

        if event.get('type') == 'checkout.session.completed':
            session_data = event.get('data', {})
            client_reference = session_data.get('client_reference', '')
            transaction_status = session_data.get('transaction_status')

            if transaction_status == 'succeeded' and client_reference.startswith('order_'):
                order_id_str = client_reference.replace('order_', '')
                # Validate order_id is a valid integer
                try:
                    order_id = int(order_id_str)
                except (ValueError, TypeError):
                    current_app.logger.warning(f"Invalid order_id in webhook: {order_id_str}")
                    return jsonify({'status': 'error'}), 400

                from supabase import create_client
                supabase = create_client(
                    current_app.config['SUPABASE_URL'],
                    current_app.config['SUPABASE_KEY']
                )
                # Verify order exists before updating
                order_check = supabase.table('orders').select('order_id').eq('order_id', order_id).execute()
                if not order_check.data:
                    current_app.logger.warning(f"Order not found in webhook: {order_id}")
                    return jsonify({'status': 'error'}), 404

                supabase.table('orders').update({
                    'order_status': 'confirmed',
                    'payment_method': 'wave'
                }).eq('order_id', order_id).execute()

        return jsonify({'status': 'ok'})

    except Exception as e:
        current_app.logger.error(f"Wave webhook error: {type(e).__name__}")
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500


@api_bp.route('/payment/wave/status/<order_id>', methods=['GET'])
def wave_transaction_status(order_id):
    """Check payment status for an order - requires authentication"""
    try:
        # Validate order_id format
        try:
            order_id_int = int(order_id)
        except (ValueError, TypeError):
            return jsonify({'status': 'error', 'message': 'ID de commande invalide'}), 400

        # Require authentication to prevent IDOR
        if not session.get('is_logged_in') or not session.get('user_id'):
            return jsonify({'status': 'error', 'message': 'Authentification requise'}), 401

        session_user_id = session.get('user_id')

        from supabase import create_client
        supabase = create_client(
            current_app.config['SUPABASE_URL'],
            current_app.config['SUPABASE_KEY']
        )
        # Verify the order belongs to the authenticated user
        response = supabase.table('orders').select('order_status, payment_method, user_id').eq('order_id', order_id_int).execute()
        if not response.data:
            return jsonify({'status': 'error', 'message': 'Commande introuvable'}), 404

        order = response.data[0]
        # Check if the order belongs to the authenticated user
        if str(order.get('user_id')) != str(session_user_id):
            current_app.logger.warning(f"IDOR attempt: user {session_user_id} tried to access order {order_id}")
            return jsonify({'status': 'error', 'message': 'Non autorisé'}), 403

        return jsonify({
            'status': 'success',
            'order_status': order.get('order_status'),
            'payment_method': order.get('payment_method'),
            'paid': order.get('payment_method') == 'wave' or order.get('order_status') == 'confirmed'
        })

    except Exception as e:
        current_app.logger.error(f"Payment status check error: {type(e).__name__}")
        return jsonify({'status': 'error', 'message': 'Une erreur est survenue'}), 500


@api_bp.route('/orders/<int:order_id>')
def get_order(order_id):
    """Get order by ID - requires authentication and ownership verification"""
    try:
        # Require authentication to prevent IDOR
        if not session.get('is_logged_in') or not session.get('user_id'):
            return jsonify({"error": "Authentification requise"}), 401

        session_user_id = session.get('user_id')

        db = get_db_service()
        order = db.get_order_by_id(order_id)
        if order:
            # Verify the order belongs to the authenticated user
            if str(order.user_id) != str(session_user_id):
                current_app.logger.warning(f"IDOR attempt: user {session_user_id} tried to access order {order_id}")
                return jsonify({"error": "Non autorisé"}), 403

            items_list = []
            for item in (order.items or []):
                if isinstance(item, dict):
                    options_list = []
                    if item.get('options'):
                        for opt in item['options']:
                            if isinstance(opt, dict):
                                options_list.append({
                                    "option_id": opt.get("option_id"),
                                    "option_name": opt.get("option_name"),
                                    "additional_price": float(opt.get("additional_price", 0)),
                                })
                            else:
                                options_list.append({
                                    "option_id": opt.option_id,
                                    "option_name": opt.option_name,
                                    "additional_price": float(opt.additional_price),
                                })

                    items_list.append({
                        "product_id": item.get("product_id"),
                        "product_name": item.get("product_name"),
                        "quantity": item.get("quantity"),
                        "unit_price": float(item.get("unit_price", 0)),
                        "options": options_list,
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
                                "additional_price": float(opt.additional_price),
                            }
                            for opt in (item.options or [])
                        ] if item.options else [],
                    })

            # Get payment info
            payment_info = {"payment_method": "Non spécifié", "transaction_status": "N/A"}
            try:
                db = get_db_service()
                payment_response = db.supabase.table('transactions')\
                    .select('payment_method, transaction_status')\
                    .eq('order_id', order.order_id)\
                    .execute()
                if payment_response.data and len(payment_response.data) > 0:
                    payment_info = {
                        "payment_method": payment_response.data[0].get('payment_method', 'Non spécifié'),
                        "transaction_status": payment_response.data[0].get('transaction_status', 'N/A')
                    }
            except Exception:
                pass  # payments table might not exist or no payment yet

            return jsonify({
                "order_id": order.order_id,
                "user_id": str(order.user_id),
                "total_amount": float(order.total_amount),
                "order_status": order.order_status,
                "created_at": order.created_at.isoformat() if order.created_at else None,
                "pickup_time": order.pickup_time.isoformat() if order.pickup_time else None,
                "prep_time_minutes": order.prep_time_minutes,
                "items": items_list,
                "payment": payment_info
            })
        else:
            return jsonify({"error": "Order not found"}), 404
    except Exception as e:
        current_app.logger.error(f"Get order error: {type(e).__name__}")
        return jsonify({'error': 'Une erreur est survenue'}), 500


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
            default_image = CATEGORY_DEFAULT_IMAGES.get(category_key, CATEGORY_DEFAULT_IMAGE_FALLBACK)
            category_image = category.image_url
            
            todays_menu["categories"][category.category_name.lower().replace(' ', '_')] = [
                {
                    "id": product.product_id,
                    "name": product.product_name,
                    "price": float(product.price),
                    "description": product.description,
                    "image": product.image_url or category_image or default_image,
                    "prep_time": "15 min",
                    "is_popular": product.is_popular is True
                }
                for product in (category.products or [])[:6]
            ]

        return jsonify(todays_menu)
    except Exception as e:
        return jsonify({'error': 'Une erreur est survenue'}), 500


@api_bp.route('/guest/orders')
def get_guest_orders():
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
                        product = db.get_product_by_id(item['product_id'])
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
        current_app.logger.error('get_guest_orders error: %s', e)
        return jsonify({'error': 'Une erreur est survenue'}), 500


@api_bp.route('/user/orders')
def get_user_orders():
    """Get orders for the current authenticated user"""
    try:
        user_id = request.args.get('user_id')

        if not user_id:
            return jsonify({"error": "User ID required"}), 400

        # Enforce that the requesting session owns these orders
        session_user_id = session.get('user_id')
        if not session_user_id or str(session_user_id) != str(user_id):
            return jsonify({"error": "Non autorisé"}), 403

        # Parse user_id safely
        try:
            user_uuid = uuid.UUID(user_id)
        except (ValueError, TypeError) as uuid_error:
            return jsonify({"error": f"Invalid user_id format: {uuid_error}"}), 400

        db = get_db_service()
        orders = db.get_orders_by_user_id(user_uuid)

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
        current_app.logger.error('get_user_orders error: %s', e)
        return jsonify({"error": "Une erreur est survenue"}), 500




@api_bp.route('/user/profile')
def get_user_profile():
    """Get user profile data — only the authenticated user's own profile"""
    try:
        user_id = request.args.get('user_id')

        if not user_id:
            return jsonify({"error": "User ID required"}), 400

        # Enforce that the requesting session owns this profile
        session_user_id = session.get('user_id')
        if not session_user_id or str(session_user_id) != str(user_id):
            return jsonify({"error": "Non autorisé"}), 403

        from supabase import create_client
        supabase = create_client(
            current_app.config['SUPABASE_URL'],
            current_app.config['SUPABASE_KEY']
        )
        
        # Fetch user data from users table
        response = supabase.table('users').select('*').eq('user_id', user_id).execute()
        
        if response.data:
            user_data = response.data[0]
            return jsonify({
                "status": "success",
                "user": {
                    "user_id": user_data.get('user_id'),
                    "full_name": user_data.get('full_name'),
                    "email": user_data.get('email'),
                    "phone": user_data.get('phone'),
                    "department": user_data.get('department'),
                    "employee_id": user_data.get('employee_id'),
                    "created_at": user_data.get('created_at')
                }
            })
        else:
            return jsonify({"error": "User not found"}), 404
            
    except Exception as e:
        current_app.logger.error('get_user_profile error: %s', e)
        return jsonify({"error": "Une erreur est survenue"}), 500




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
        return jsonify({'error': 'Une erreur est survenue'}), 500


@api_bp.route('/products', methods=['POST'])
def create_product():
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
        products = db.get_products()
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
        current_app.logger.error('request error: %s', e)
        return jsonify({'error': 'Une erreur est survenue'}), 500


@api_bp.route('/products/<int:product_id>/image', methods=['POST'])
def upload_product_image(product_id):
    """Upload image for a specific product"""
    try:
        db = get_db_service()
        
        # Check if product exists
        product = db.get_product_by_id(product_id)
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
            current_app.logger.error('request error: %s', e)
            return jsonify({"error": "Failed to save image"}), 500
            
    except Exception as e:
        current_app.logger.error('request error: %s', e)
        return jsonify({'error': 'Une erreur est survenue'}), 500


@api_bp.route('/categories', methods=['POST'])
def create_category():
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
        categories = db.get_categories()
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
        current_app.logger.error('request error: %s', e)
        return jsonify({'error': 'Une erreur est survenue'}), 500


@api_bp.route('/categories/<int:category_id>/image', methods=['POST'])
def upload_category_image(category_id):
    """Upload image for a specific category"""
    try:
        db = get_db_service()
        
        # Check if category exists
        categories = db.get_categories()
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
            current_app.logger.error('request error: %s', e)
            return jsonify({"error": "Failed to save image"}), 500
            
    except Exception as e:
        current_app.logger.error('request error: %s', e)
        return jsonify({'error': 'Une erreur est survenue'}), 500


_PROXY_ALLOWED_HOSTS = {'supabase.co', 'supabase.in'}


@api_bp.route('/img-proxy')
def image_proxy():
    """Proxy external images through the app server to avoid QUIC/HTTP3 errors in browsers.
    Only proxies URLs from trusted hosts (Supabase storage)."""
    url = request.args.get('url', '').strip()
    if not url:
        return '', 400
    try:
        parsed = urlparse(url)
        host = parsed.netloc.lower()
        # Check if host ends with .supabase.co or is exactly supabase.co
        allowed = host.endswith('.supabase.co') or host.endswith('.supabase.in') or host in _PROXY_ALLOWED_HOSTS
        if not allowed:
            current_app.logger.warning(f"Image proxy blocked: {host}")
            return '', 403
        req = urllib.request.Request(url, headers={'User-Agent': 'ZinaApp/1.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
            content_type = resp.headers.get('Content-Type', 'image/jpeg')
        response = Response(data, status=200, content_type=content_type)
        response.headers['Cache-Control'] = 'public, max-age=86400'
        return response
    except Exception as e:
        current_app.logger.error(f"Image proxy error: {type(e).__name__} - {url[:50]}")
        return '', 502


@api_bp.route('/categories/<int:category_id>/image')
def get_category_image_info(category_id):
    """Get image information for a specific category"""
    try:
        db = get_db_service()
        categories = db.get_categories()

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
        return jsonify({'error': 'Une erreur est survenue'}), 500


# ── Transaction Endpoints ─────────────────────────────────────────────────────

@api_bp.route('/transactions', methods=['POST'])
def create_transaction():
    """Create a new transaction for an order"""
    try:
        db = get_db_service()
        if not db:
            return jsonify({'error': 'Database not configured'}), 503

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400

        required = ['order_id', 'user_id', 'amount']
        missing = [f for f in required if f not in data]
        if missing:
            return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 400

        tx_request = CreateTransactionRequest(
            order_id=int(data['order_id']),
            user_id=uuid.UUID(data['user_id']),
            amount=Decimal(str(data['amount'])),
            transaction_type=data.get('transaction_type', 'payment'),
            payment_method=data.get('payment_method', 'cash'),
            payment_provider=data.get('payment_provider'),
            transaction_reference=data.get('transaction_reference'),
            notes=data.get('notes'),
            processing_location=data.get('processing_location', 'counter'),
        )

        result = db.create_transaction(tx_request)
        if not result:
            return jsonify({'error': 'Failed to create transaction'}), 500

        return jsonify({
            'transaction_id': result.transaction_id,
            'order_id': result.order_id,
            'user_id': str(result.user_id),
            'transaction_type': result.transaction_type,
            'amount': float(result.amount),
            'currency': result.currency,
            'payment_method': result.payment_method,
            'payment_provider': result.payment_provider,
            'transaction_status': result.transaction_status,
            'created_at': result.created_at.isoformat() if result.created_at else None,
            'transaction_reference': result.transaction_reference,
            'internal_reference': result.internal_reference,
            'notes': result.notes,
            'processing_location': result.processing_location,
        }), 201

    except (ValueError, AttributeError) as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error('create_transaction error: %s', e, exc_info=True)
        return jsonify({'error': 'Une erreur est survenue'}), 500


@api_bp.route('/transactions/<int:transaction_id>', methods=['GET'])
def get_transaction(transaction_id):
    """Get a transaction by ID"""
    try:
        db = get_db_service()
        if not db:
            return jsonify({'error': 'Database not configured'}), 503

        result = db.get_transaction_by_id(transaction_id)
        if not result:
            return jsonify({'error': 'Transaction not found'}), 404

        return jsonify({
            'transaction_id': result.transaction_id,
            'order_id': result.order_id,
            'user_id': str(result.user_id),
            'transaction_type': result.transaction_type,
            'amount': float(result.amount),
            'currency': result.currency,
            'payment_method': result.payment_method,
            'payment_provider': result.payment_provider,
            'transaction_status': result.transaction_status,
            'created_at': result.created_at.isoformat() if result.created_at else None,
            'processed_at': result.processed_at.isoformat() if result.processed_at else None,
            'transaction_reference': result.transaction_reference,
            'internal_reference': result.internal_reference,
            'notes': result.notes,
            'processing_location': result.processing_location,
        })

    except Exception as e:
        current_app.logger.error('get_transaction error: %s', e, exc_info=True)
        return jsonify({'error': 'Une erreur est survenue'}), 500


@api_bp.route('/transactions/<int:transaction_id>/status', methods=['PATCH'])
def update_transaction_status(transaction_id):
    """Update the status of a transaction"""
    try:
        db = get_db_service()
        if not db:
            return jsonify({'error': 'Database not configured'}), 503

        data = request.get_json()
        if not data or 'status' not in data:
            return jsonify({'error': 'status field required'}), 400

        valid_statuses = {'pending', 'completed', 'failed', 'cancelled'}
        if data['status'] not in valid_statuses:
            return jsonify({'error': f'status must be one of: {", ".join(valid_statuses)}'}), 400

        processed_by = uuid.UUID(data['processed_by']) if data.get('processed_by') else None
        success = db.update_transaction_status(
            transaction_id,
            data['status'],
            processed_by=processed_by,
            transaction_reference=data.get('transaction_reference'),
        )

        if not success:
            return jsonify({'error': 'Transaction not found or update failed'}), 404

        return jsonify({'transaction_id': transaction_id, 'status': data['status']})

    except (ValueError, AttributeError) as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error('update_transaction_status error: %s', e, exc_info=True)
        return jsonify({'error': 'Une erreur est survenue'}), 500


@api_bp.route('/orders/<int:order_id>/transactions', methods=['GET'])
def get_order_transactions(order_id):
    """Get all transactions for a specific order"""
    try:
        db = get_db_service()
        if not db:
            return jsonify({'error': 'Database not configured'}), 503

        results = db.get_transactions_by_order_id(order_id)
        return jsonify([
            {
                'transaction_id': t.transaction_id,
                'order_id': t.order_id,
                'user_id': str(t.user_id),
                'transaction_type': t.transaction_type,
                'amount': float(t.amount),
                'currency': t.currency,
                'payment_method': t.payment_method,
                'transaction_status': t.transaction_status,
                'created_at': t.created_at.isoformat() if t.created_at else None,
                'processed_at': t.processed_at.isoformat() if t.processed_at else None,
                'internal_reference': t.internal_reference,
                'processing_location': t.processing_location,
            }
            for t in results
        ])

    except Exception as e:
        current_app.logger.error('get_order_transactions error: %s', e, exc_info=True)
        return jsonify({'error': 'Une erreur est survenue'}), 500


@api_bp.route('/users/<user_id>/transactions', methods=['GET'])
def get_user_transactions(user_id):
    """Get all transactions for a specific user"""
    try:
        db = get_db_service()
        if not db:
            return jsonify({'error': 'Database not configured'}), 503

        limit = min(int(request.args.get('limit', 50)), 200)
        results = db.get_transactions_by_user_id(uuid.UUID(user_id), limit=limit)

        return jsonify([
            {
                'transaction_id': t.transaction_id,
                'order_id': t.order_id,
                'transaction_type': t.transaction_type,
                'amount': float(t.amount),
                'currency': t.currency,
                'payment_method': t.payment_method,
                'transaction_status': t.transaction_status,
                'created_at': t.created_at.isoformat() if t.created_at else None,
                'processed_at': t.processed_at.isoformat() if t.processed_at else None,
                'internal_reference': t.internal_reference,
            }
            for t in results
        ])

    except ValueError:
        return jsonify({'error': 'Invalid user_id format'}), 400
    except Exception as e:
        current_app.logger.error('get_user_transactions error: %s', e, exc_info=True)
        return jsonify({'error': 'Une erreur est survenue'}), 500


@api_bp.route('/transactions/summary', methods=['GET'])
def get_transaction_summary():
    """Get transaction summary, optionally filtered by date range"""
    try:
        db = get_db_service()
        if not db:
            return jsonify({'error': 'Database not configured'}), 503

        start_date = None
        end_date = None
        if request.args.get('start_date'):
            start_date = datetime.fromisoformat(request.args['start_date'])
        if request.args.get('end_date'):
            end_date = datetime.fromisoformat(request.args['end_date'])

        summary = db.get_transaction_summary(start_date=start_date, end_date=end_date)
        return jsonify(summary)

    except ValueError as e:
        return jsonify({'error': f'Invalid date format: {e}'}), 400
    except Exception as e:
        current_app.logger.error('get_transaction_summary error: %s', e, exc_info=True)
        return jsonify({'error': 'Une erreur est survenue'}), 500
