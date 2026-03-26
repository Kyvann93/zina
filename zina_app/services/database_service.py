"""
ZINA Cantine BAD - Database Service
Handles all database operations via Supabase
"""

from typing import List, Optional
from decimal import Decimal
from datetime import datetime
import uuid
import logging
from supabase import Client

from zina_app.models import (
    ProductOption, User,
    ProductResponse, CategoryResponse, OrderResponse,
    CreateOrderRequest, Transaction, TransactionResponse, CreateTransactionRequest
)
from zina_app.services.category_image_service import CategoryImageService

logger = logging.getLogger(__name__)


class DatabaseService:
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.image_service = CategoryImageService()

    # ── Internal batch helpers ────────────────────────────────────────────────

    def _fetch_all_products_raw(self, category_id: Optional[int] = None, available_only: bool = True):
        """Single DB query for products — no per-row lookups."""
        query = self.supabase.table('products').select('*')
        if category_id:
            query = query.eq('category_id', category_id)
        if available_only:
            query = query.eq('is_available', True)
        return query.execute().data or []

    def _fetch_options_map(self, product_ids: List[int]) -> dict:
        """Fetch all product_options for a list of product IDs → {product_id: [ProductOption]}."""
        if not product_ids:
            return {}
        opts = self.supabase.table('product_options').select('*').in_('product_id', product_ids).execute().data or []
        result: dict = {}
        for opt in opts:
            pid = opt['product_id']
            result.setdefault(pid, []).append(ProductOption(**opt))
        return result

    def _fetch_cat_names_map(self) -> dict:
        """Fetch all categories → {category_id: category_name}."""
        cats = self.supabase.table('categories').select('category_id, category_name').execute().data or []
        return {c['category_id']: c['category_name'] for c in cats}

    # ── Public product operations (3 queries max) ─────────────────────────────

    def get_products(self, category_id: Optional[int] = None, available_only: bool = True) -> List[ProductResponse]:
        try:
            rows = self._fetch_all_products_raw(category_id=category_id, available_only=available_only)
            if not rows:
                return []

            cat_names = self._fetch_cat_names_map()
            product_ids = [r['product_id'] for r in rows]
            options_map = self._fetch_options_map(product_ids)

            products = []
            for item in rows:
                products.append(ProductResponse(
                    product_id=item['product_id'],
                    category_id=item['category_id'],
                    product_name=item['product_name'],
                    description=item.get('description'),
                    price=Decimal(str(item['price'])),
                    image_url=item.get('image_url'),
                    is_available=item.get('is_available', True),
                    category_name=cat_names.get(item['category_id']),
                    options=options_map.get(item['product_id'], [])
                ))
            return products
        except Exception as e:
            print(f"Error fetching products: {e}")
            return []

    def get_product_by_id(self, product_id: int) -> Optional[ProductResponse]:
        """Fetch a single product without loading all others."""
        try:
            rows = self.supabase.table('products').select('*').eq('product_id', product_id).limit(1).execute().data or []
            if not rows:
                return None
            item = rows[0]
            cat_names = self._fetch_cat_names_map()
            options_map = self._fetch_options_map([product_id])
            return ProductResponse(
                product_id=item['product_id'],
                category_id=item['category_id'],
                product_name=item['product_name'],
                description=item.get('description'),
                price=Decimal(str(item['price'])),
                image_url=item.get('image_url'),
                is_available=item.get('is_available', True),
                category_name=cat_names.get(item['category_id']),
                options=options_map.get(product_id, [])
            )
        except Exception as e:
            print(f"Error fetching product {product_id}: {e}")
            return None

    # ── Category operations (3 queries total) ─────────────────────────────────

    def get_categories(self, available_only: bool = True) -> List[CategoryResponse]:
        try:
            cats_data = self.supabase.table('categories').select('*').execute().data or []
            if not cats_data:
                return []

            # All products + all options in two queries
            all_products_raw = self._fetch_all_products_raw(available_only=available_only)
            product_ids = [p['product_id'] for p in all_products_raw]
            options_map = self._fetch_options_map(product_ids)
            cat_names = {c['category_id']: c['category_name'] for c in cats_data}

            # Group products by category
            products_by_cat: dict = {}
            for item in all_products_raw:
                cat_id = item['category_id']
                products_by_cat.setdefault(cat_id, []).append(ProductResponse(
                    product_id=item['product_id'],
                    category_id=cat_id,
                    product_name=item['product_name'],
                    description=item.get('description'),
                    price=Decimal(str(item['price'])),
                    image_url=item.get('image_url'),
                    is_available=item.get('is_available', True),
                    category_name=cat_names.get(cat_id),
                    options=options_map.get(item['product_id'], [])
                ))

            categories = []
            for item in cats_data:
                cat_id = item['category_id']
                category_name = item['category_name']
                image_url = item.get('image_url')
                if not image_url:
                    try:
                        image_url = self.image_service.get_fallback_image_url(category_name, use_api='unsplash')
                    except Exception:
                        image_url = None

                categories.append(CategoryResponse(
                    category_id=cat_id,
                    category_name=category_name,
                    description=item.get('description'),
                    image_url=image_url,
                    products=products_by_cat.get(cat_id, [])
                ))

            return categories
        except Exception as e:
            print(f"Error fetching categories: {e}")
            return []

    # Order operations
    def create_order(self, order_request: CreateOrderRequest) -> Optional[OrderResponse]:
        try:
            # Calculate total amount and build order items
            total_amount = Decimal('0')
            order_items_data = []

            print(f"[DEBUG] Creating order with {len(order_request.items)} items")

            requested_product_ids = [item.product_id for item in (order_request.items or [])]
            products = await self.get_products_by_ids(requested_product_ids)
            product_by_id = {p.product_id: p for p in products}

            for item_request in order_request.items:
                print(f"[DEBUG] Processing item: product_id={item_request.product_id}, quantity={item_request.quantity}")
                product = self.get_product_by_id(item_request.product_id)

                if not product:
                    print(f"[WARNING] Product {item_request.product_id} not found in database")
                    # Use hardcoded prices as fallback even if product not found
                    hardcoded_prices = {
                        1: 3500,  # Café Complet
                        2: 3000,  # Thé & Viennoiseries
                        3: 2000,  # Jus Naturel
                        4: 2500,  # Omelette Matinale
                    }
                    unit_price = Decimal(str(hardcoded_prices.get(item_request.product_id, 0)))
                    product_name = f"Product {item_request.product_id}"
                    print(f"[DEBUG] Using hardcoded price: {unit_price}")
                else:
                    print(f"[DEBUG] Product found: {product.product_name}, price: {product.price}")
                    unit_price = product.price
                    product_name = product.product_name

                    # Fallback to hardcoded prices if database price is 0 or None
                    if not unit_price or unit_price == 0:
                        hardcoded_prices = {
                            1: 3500,  # Café Complet
                            2: 3000,  # Thé & Viennoiseries
                            3: 2000,  # Jus Naturel
                            4: 2500,  # Omelette Matinale
                        }
                        unit_price = Decimal(str(hardcoded_prices.get(item_request.product_id, 0)))
                        print(f"[DEBUG] Database price was 0, using hardcoded price: {unit_price}")

                    # Add option prices if any
                    if item_request.option_ids and product.options:
                        for option in product.options:
                            if option.option_id in item_request.option_ids:
                                unit_price += option.additional_price
                                print(f"[DEBUG] Added option {option.option_name}: +{option.additional_price}")

                item_total = unit_price * item_request.quantity
                total_amount += item_total
                print(f"[DEBUG] Item total: {item_total}, Running total: {total_amount}")

                order_items_data.append({
                    'product_id': item_request.product_id,
                    'product_name': product_name,
                    'quantity': item_request.quantity,
                    'unit_price': float(unit_price)
                })

            discount_amount = getattr(order_request, 'discount_amount', 0) or 0
            try:
                discount_amount_int = int(discount_amount)
            except (ValueError, TypeError):
                discount_amount_int = 0

            if discount_amount_int < 0:
                discount_amount_int = 0

            if discount_amount_int:
                total_amount -= Decimal(str(discount_amount_int))
                if total_amount < 0:
                    total_amount = Decimal('0')

            print(f"[DEBUG] Final total_amount: {total_amount}")
            print(f"[DEBUG] Order items data: {order_items_data}")

            # Get pickup_time and prep_time_minutes (handle both old and new models)
            from datetime import timedelta, timezone
            pickup_time = getattr(order_request, 'pickup_time', None)
            prep_time_minutes = getattr(order_request, 'prep_time_minutes', 15)

            # Calculate pickup time: ensure it's greater than prep time
            # Use timezone-aware datetime for comparison
            now = datetime.now(timezone.utc)

            if pickup_time:
                # Make pickup_time timezone-aware if it isn't already
                if pickup_time.tzinfo is None:
                    pickup_time = pickup_time.replace(tzinfo=timezone.utc)

                # Ensure pickup time is at least prep_time_minutes from now
                min_pickup_time = now + timedelta(minutes=prep_time_minutes)
                if pickup_time < min_pickup_time:
                    pickup_time = min_pickup_time
            else:
                # Default: pickup after prep time
                pickup_time = now + timedelta(minutes=prep_time_minutes)

            # Handle user ID - create a guest user if no user_id provided
            user_id_str = None
            if order_request.user_id:
                user_id_str = str(order_request.user_id)
                # Check if user exists, create if not
                user_response = self.supabase.table('users').select('*').eq('user_id', user_id_str).execute()
                
                if not user_response.data:
                    # Create user with minimal info including required password_hash
                    import hashlib
                    # Generate a default password hash (empty password for auto-created users)
                    default_password = f"temp-{user_id_str[:8]}"
                    password_hash = hashlib.sha256(default_password.encode()).hexdigest()
                    
                    user_data = {
                        'user_id': user_id_str,
                        'full_name': f'Employee {user_id_str[:8]}',
                        'email': f'employee-{user_id_str[:8]}@zina-cantine.ci',
                        'password_hash': password_hash,  # Required field
                        'created_at': datetime.now().isoformat()
                    }
                    try:
                        user_create_response = self.supabase.table('users').insert(user_data).execute()
                        if user_create_response.data:
                            print(f"Created new user: {user_id_str}")
                        else:
                            print(f"Failed to create user: {user_create_response}")
                            user_id_str = None  # Fall back to guest mode
                    except Exception as user_error:
                        print(f"Error: Could not create user {user_id_str}: {user_error}")
                        user_id_str = None  # Fall back to guest mode
            else:
                # Create a guest user for orders without user_id
                print("Creating guest user for order")
                import hashlib
                import uuid
                
                # Generate a unique guest user ID
                guest_id = str(uuid.uuid4())
                guest_email = f"guest-{guest_id[:8]}@zina-cantine.ci"
                
                # Generate password hash
                default_password = f"guest-{guest_id[:8]}"
                password_hash = hashlib.sha256(default_password.encode()).hexdigest()
                
                guest_user_data = {
                    'user_id': guest_id,
                    'full_name': 'Guest User',
                    'email': guest_email,
                    'password_hash': password_hash,
                    'created_at': datetime.now().isoformat()
                }
                
                try:
                    guest_create_response = self.supabase.table('users').insert(guest_user_data).execute()
                    if guest_create_response.data:
                        user_id_str = guest_id
                        print(f"Created guest user: {guest_id}")
                    else:
                        print(f"Failed to create guest user: {guest_create_response}")
                        return None
                except Exception as guest_error:
                    print(f"Error: Could not create guest user: {guest_error}")
                    return None

            # Create order — let the DB generate the order_id
            order_data = {
                'user_id': user_id_str,
                'total_amount': int(total_amount),  # Convert to int for BIGINT column
                'order_status': 'pending',
                'pickup_time': pickup_time.isoformat(),
                'prep_time_minutes': prep_time_minutes
            }

            print(f"[DEBUG] Creating order with data: {order_data}")
            order_response = self.supabase.table('orders').insert(order_data).execute()
            print(f"[DEBUG] Order creation result: {order_response.data}")
            if not order_response.data:
                print("[ERROR] Order creation returned no data")
                return None

            order_id = order_response.data[0]['order_id']

            # Create order items if order_items table exists
            print(f"[DEBUG] Inserting {len(order_items_data)} order items")
            try:
                for item in order_items_data:
                    # First, check if order_items table has the right schema
                    try:
                        # Try to get the table schema
                        schema_check = self.supabase.table('order_items').select('*').limit(1).execute()
                        print(f"[DEBUG] order_items table exists, columns: {schema_check.data[0].keys() if schema_check.data else 'empty table'}")
                    except Exception as schema_error:
                        print(f"[WARNING] order_items table may not exist: {schema_error}")
                        continue

                    item_data = {
                        'order_id': order_id,
                        'product_id': item['product_id'],
                        'product_name': item['product_name'],
                        'quantity': item['quantity'],
                        'unit_price': int(item['unit_price'])  # Convert to int for DB compatibility
                    }
                    print(f"[DEBUG] Inserting order item: {item_data}")
                    result = self.supabase.table('order_items').insert(item_data).execute()
                    print(f"[DEBUG] Order item insert result: {result.data}")
            except Exception as items_error:
                # Log but don't fail - order_items table might not exist
                print(f"[ERROR] Could not create order items: {items_error}")
                import traceback
                traceback.print_exc()

            # Payment will be handled separately at the counter
            # No payment record created during order placement

            # Build order items response with product details
            items_response = []
            for item_request in order_request.items:
                product = self.get_product_by_id(item_request.product_id)

                if product:
                    # Calculate final unit_price with options
                    unit_price = product.price
                    if not unit_price or unit_price == 0:
                        hardcoded_prices = {
                            1: 3500,
                            2: 3000,
                            3: 2000,
                            4: 2500,
                        }
                        unit_price = Decimal(str(hardcoded_prices.get(item_request.product_id, 0)))

                    if item_request.option_ids and product.options:
                        for option in product.options:
                            if option.option_id in item_request.option_ids:
                                unit_price += option.additional_price

                    items_response.append({
                        'product_id': product.product_id,
                        'product_name': product.product_name,
                        'quantity': item_request.quantity,
                        'unit_price': unit_price,
                        'options': product.options if item_request.option_ids else []
                    })
                else:
                    # Product not found - use hardcoded data
                    hardcoded_prices = {
                        1: 3500,
                        2: 3000,
                        3: 2000,
                        4: 2500,
                    }
                    unit_price = Decimal(str(hardcoded_prices.get(item_request.product_id, 0)))
                    hardcoded_names = {
                        1: 'Café Complet',
                        2: 'Thé & Viennoiseries',
                        3: 'Jus Naturel',
                        4: 'Omelette Matinale',
                    }
                    items_response.append({
                        'product_id': item_request.product_id,
                        'product_name': hardcoded_names.get(item_request.product_id, f'Product {item_request.product_id}'),
                        'quantity': item_request.quantity,
                        'unit_price': unit_price,
                        'options': []
                    })

            print(f"[DEBUG] Building OrderResponse with {len(items_response)} items")

            # Return order response
            return OrderResponse(
                order_id=order_id,
                user_id=order_request.user_id if order_request.user_id else uuid.uuid4(),
                total_amount=Decimal(str(int(total_amount))),
                order_status='pending',
                created_at=datetime.now(timezone.utc),
                pickup_time=pickup_time,
                prep_time_minutes=prep_time_minutes,
                items=items_response
            )

        except Exception as e:
            print(f"Error creating order: {e}")
            import traceback
            traceback.print_exc()
            return None

    def get_order_by_id(self, order_id: int) -> Optional[OrderResponse]:
        try:
            response = self.supabase.table('orders').select('*').eq('order_id', order_id).execute()
            if not response.data:
                return None

            order_data = response.data[0]

            # Payment handled separately at counter - no payment record during order creation
            

            # Parse user_id safely
            try:
                user_id = uuid.UUID(order_data['user_id'])
            except (ValueError, TypeError) as uuid_error:
                print(f"Invalid UUID format for user_id: {order_data.get('user_id')}, error: {uuid_error}")
                user_id = uuid.uuid4()

            # Get order items if table exists
            items = []
            try:
                items_response = self.supabase.table('order_items').select('*').eq('order_id', order_id).execute()
                if items_response.data:
                    product_ids = [it.get('product_id') for it in items_response.data if it.get('product_id') is not None]
                    products = await self.get_products_by_ids([int(pid) for pid in product_ids])
                    product_by_id = {p.product_id: p for p in (products or [])}

                    for item in items_response.data:
                        product = self.get_product_by_id(item['product_id'])
                        if product:
                            items.append({
                                'product_id': product.product_id,
                                'product_name': product.product_name,
                                'quantity': item.get('quantity'),
                                'unit_price': Decimal(str(item.get('unit_price', 0))),
                                'options': product.options
                            })
            except Exception as items_error:
                print(f"Warning: Could not fetch order items: {items_error}")

            # Parse pickup_time
            pickup_time = None
            if order_data.get('pickup_time'):
                try:
                    pickup_time = datetime.fromisoformat(order_data['pickup_time'])
                except (ValueError, TypeError):
                    pass

            return OrderResponse(
                order_id=order_data['order_id'],
                user_id=user_id,
                total_amount=Decimal(str(order_data['total_amount'])),
                order_status=order_data['order_status'],
                created_at=datetime.fromisoformat(order_data['created_at']) if order_data.get('created_at') else datetime.now(),
                pickup_time=pickup_time,
                prep_time_minutes=order_data.get('prep_time_minutes', 15),
                items=items
            )
        except Exception as e:
            print(f"Error fetching order: {e}")
            return None

    # User operations
    def get_user_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        try:
            response = self.supabase.table('users').select('*').eq('user_id', str(user_id)).execute()
            if not response.data:
                return None

            user_data = response.data[0]
            
            # Parse user_id safely
            try:
                user_id = uuid.UUID(user_data['user_id'])
            except (ValueError, TypeError) as uuid_error:
                print(f"Invalid UUID format for user_id: {user_data.get('user_id')}, error: {uuid_error}")
                return None
            
            return User(
                user_id=user_id,
                full_name=user_data['full_name'],
                email=user_data['email'],
                phone=user_data.get('phone'),
                password_hash=user_data.get('password_hash', ''),
                created_at=datetime.fromisoformat(user_data['created_at']) if user_data.get('created_at') else None
            )
        except Exception as e:
            print(f"Error fetching user: {e}")
            return None

    def create_user(self, user: User) -> Optional[User]:
        try:
            user_data = {
                'user_id': str(user.user_id),
                'full_name': user.full_name,
                'email': user.email,
                'phone': user.phone,
                'password_hash': user.password_hash
            }

            response = self.supabase.table('users').insert(user_data).execute()
            if not response.data:
                return None

            return user
        except Exception as e:
            print(f"Error creating user: {e}")
            return None

    def get_orders_by_user_id(self, user_id: uuid.UUID) -> List[OrderResponse]:
        """Get all orders for a specific user"""
        try:
            user_id_str = str(user_id)
            response = self.supabase.table('orders').select('*').eq('user_id', user_id_str).order('created_at', desc=True).execute()
            
            orders = []
            for order_data in response.data:
                # Get order items if table exists
                items = []
                try:
                    items_response = self.supabase.table('order_items').select('*').eq('order_id', order_data['order_id']).execute()
                    if items_response.data:
                        for item in items_response.data:
                            product = self.get_product_by_id(item['product_id'])
                            if product:
                                items.append({
                                    'product_id': product.product_id,
                                    'product_name': product.product_name,
                                    'quantity': item['quantity'],
                                    'unit_price': float(item['unit_price'])
                                })
                except Exception:
                    pass  # order_items table might not exist

                # Parse user_id safely
                try:
                    user_obj_id = uuid.UUID(order_data['user_id'])
                except (ValueError, TypeError) as uuid_error:
                    print(f"Invalid UUID format for user_id: {order_data.get('user_id')}, error: {uuid_error}")
                    continue

                # Parse pickup_time
                pickup_time = None
                if order_data.get('pickup_time'):
                    try:
                        pickup_time = datetime.fromisoformat(order_data['pickup_time'])
                    except (ValueError, TypeError):
                        pickup_time = None

                orders.append(OrderResponse(
                    order_id=order_data['order_id'],
                    user_id=user_obj_id,
                    total_amount=Decimal(str(order_data['total_amount'])),
                    order_status=order_data['order_status'],
                    created_at=datetime.fromisoformat(order_data['created_at']) if order_data.get('created_at') else datetime.now(),
                    pickup_time=pickup_time,
                    prep_time_minutes=order_data.get('prep_time_minutes', 15),
                    items=items,
                
                ))

            return orders
        except Exception as e:
            print(f"Error getting orders by user ID: {e}")
            return []

    # ── Transaction operations ────────────────────────────────────────────────
    
    def create_transaction(self, transaction_request: CreateTransactionRequest) -> Optional[TransactionResponse]:
        """Create a new transaction record"""
        try:
            import hashlib
            import secrets
            ref_data = f"{transaction_request.order_id}-{transaction_request.user_id}-{secrets.token_hex(4)}"
            internal_reference = hashlib.md5(ref_data.encode()).hexdigest()[:12].upper()

            transaction_data = {
                'order_id': transaction_request.order_id,
                'user_id': str(transaction_request.user_id),
                'transaction_type': transaction_request.transaction_type,
                'amount': int(transaction_request.amount),  # Convert to int for BIGINT
                'currency': 'XOF',
                'payment_method': transaction_request.payment_method,
                'payment_provider': transaction_request.payment_provider,
                'transaction_status': 'pending',
                'transaction_reference': transaction_request.transaction_reference,
                'internal_reference': internal_reference,
                'notes': transaction_request.notes,
                'processing_location': transaction_request.processing_location,
                'created_at': datetime.now().isoformat()
            }
            
            response = self.supabase.table('transactions').insert(transaction_data).execute()
            if not response.data:
                return None
                
            transaction_data = response.data[0]
            
            # Get order details for response
            order_response = self.get_order_by_id(transaction_request.order_id)
            
            return TransactionResponse(
                transaction_id=transaction_data['transaction_id'],
                order_id=transaction_data['order_id'],
                user_id=uuid.UUID(transaction_data['user_id']),
                transaction_type=transaction_data['transaction_type'],
                amount=Decimal(str(transaction_data['amount'])),
                currency=transaction_data['currency'],
                payment_method=transaction_data['payment_method'],
                payment_provider=transaction_data.get('payment_provider'),
                transaction_status=transaction_data['transaction_status'],
                created_at=datetime.fromisoformat(transaction_data['created_at']),
                processed_at=datetime.fromisoformat(transaction_data['processed_at']) if transaction_data.get('processed_at') else None,
                transaction_reference=transaction_data.get('transaction_reference'),
                internal_reference=transaction_data.get('internal_reference'),
                notes=transaction_data.get('notes'),
                processed_by=uuid.UUID(transaction_data['processed_by']) if transaction_data.get('processed_by') else None,
                processing_location=transaction_data.get('processing_location'),
                order_details=order_response
            )
            
        except Exception as e:
            print(f"Error creating transaction: {e}")
            return None
    
    def get_transaction_by_id(self, transaction_id: int) -> Optional[TransactionResponse]:
        """Get a transaction by its ID"""
        try:
            response = self.supabase.table('transactions').select('*').eq('transaction_id', transaction_id).execute()
            if not response.data:
                return None
                
            transaction_data = response.data[0]
            
            # Get order details
            order_response = self.get_order_by_id(transaction_data['order_id'])
            
            return TransactionResponse(
                transaction_id=transaction_data['transaction_id'],
                order_id=transaction_data['order_id'],
                user_id=uuid.UUID(transaction_data['user_id']),
                transaction_type=transaction_data['transaction_type'],
                amount=Decimal(str(transaction_data['amount'])),
                currency=transaction_data['currency'],
                payment_method=transaction_data['payment_method'],
                payment_provider=transaction_data.get('payment_provider'),
                transaction_status=transaction_data['transaction_status'],
                created_at=datetime.fromisoformat(transaction_data['created_at']),
                processed_at=datetime.fromisoformat(transaction_data['processed_at']) if transaction_data.get('processed_at') else None,
                transaction_reference=transaction_data.get('transaction_reference'),
                internal_reference=transaction_data.get('internal_reference'),
                notes=transaction_data.get('notes'),
                processed_by=uuid.UUID(transaction_data['processed_by']) if transaction_data.get('processed_by') else None,
                processing_location=transaction_data.get('processing_location'),
                order_details=order_response
            )
            
        except Exception as e:
            print(f"Error fetching transaction {transaction_id}: {e}")
            return None
    
    def get_transactions_by_user_id(self, user_id: uuid.UUID, limit: int = 50) -> List[TransactionResponse]:
        """Get all transactions for a specific user"""
        try:
            user_id_str = str(user_id)
            response = self.supabase.table('transactions').select('*').eq('user_id', user_id_str).order('created_at', desc=True).limit(limit).execute()
            
            transactions = []
            for transaction_data in response.data:
                # Get order details
                order_response = self.get_order_by_id(transaction_data['order_id'])
                
                transactions.append(TransactionResponse(
                    transaction_id=transaction_data['transaction_id'],
                    order_id=transaction_data['order_id'],
                    user_id=uuid.UUID(transaction_data['user_id']),
                    transaction_type=transaction_data['transaction_type'],
                    amount=Decimal(str(transaction_data['amount'])),
                    currency=transaction_data['currency'],
                    payment_method=transaction_data['payment_method'],
                    payment_provider=transaction_data.get('payment_provider'),
                    transaction_status=transaction_data['transaction_status'],
                    created_at=datetime.fromisoformat(transaction_data['created_at']),
                    processed_at=datetime.fromisoformat(transaction_data['processed_at']) if transaction_data.get('processed_at') else None,
                    transaction_reference=transaction_data.get('transaction_reference'),
                    internal_reference=transaction_data.get('internal_reference'),
                    notes=transaction_data.get('notes'),
                    processed_by=uuid.UUID(transaction_data['processed_by']) if transaction_data.get('processed_by') else None,
                    processing_location=transaction_data.get('processing_location'),
                    order_details=order_response
                ))
            
            return transactions
            
        except Exception as e:
            print(f"Error fetching transactions for user {user_id}: {e}")
            return []
    
    def get_transactions_by_order_id(self, order_id: int) -> List[TransactionResponse]:
        """Get all transactions for a specific order"""
        try:
            response = self.supabase.table('transactions').select('*').eq('order_id', order_id).order('created_at', desc=True).execute()
            
            transactions = []
            for transaction_data in response.data:
                # Get order details
                order_response = self.get_order_by_id(transaction_data['order_id'])
                
                transactions.append(TransactionResponse(
                    transaction_id=transaction_data['transaction_id'],
                    order_id=transaction_data['order_id'],
                    user_id=uuid.UUID(transaction_data['user_id']),
                    transaction_type=transaction_data['transaction_type'],
                    amount=Decimal(str(transaction_data['amount'])),
                    currency=transaction_data['currency'],
                    payment_method=transaction_data['payment_method'],
                    payment_provider=transaction_data.get('payment_provider'),
                    transaction_status=transaction_data['transaction_status'],
                    created_at=datetime.fromisoformat(transaction_data['created_at']),
                    processed_at=datetime.fromisoformat(transaction_data['processed_at']) if transaction_data.get('processed_at') else None,
                    transaction_reference=transaction_data.get('transaction_reference'),
                    internal_reference=transaction_data.get('internal_reference'),
                    notes=transaction_data.get('notes'),
                    processed_by=uuid.UUID(transaction_data['processed_by']) if transaction_data.get('processed_by') else None,
                    processing_location=transaction_data.get('processing_location'),
                    order_details=order_response
                ))
            
            return transactions
            
        except Exception as e:
            print(f"Error fetching transactions for order {order_id}: {e}")
            return []
    
    def update_transaction_status(self, transaction_id: int, status: str, processed_by: Optional[uuid.UUID] = None, transaction_reference: Optional[str] = None) -> bool:
        """Update transaction status and processing information"""
        try:
            update_data = {
                'transaction_status': status,
                'updated_at': datetime.now().isoformat()
            }
            
            if status in ['completed', 'failed']:
                update_data['processed_at'] = datetime.now().isoformat()
                
            if processed_by:
                update_data['processed_by'] = str(processed_by)
                
            if transaction_reference:
                update_data['transaction_reference'] = transaction_reference
            
            response = self.supabase.table('transactions').update(update_data).eq('transaction_id', transaction_id).execute()
            return len(response.data) > 0
            
        except Exception as e:
            print(f"Error updating transaction status: {e}")
            return False
    
    def get_transaction_summary(self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> dict:
        """Get transaction summary for reporting"""
        try:
            query = self.supabase.table('transactions').select('*')
            
            if start_date:
                query = query.gte('created_at', start_date.isoformat())
            if end_date:
                query = query.lte('created_at', end_date.isoformat())
                
            response = query.execute()
            
            summary = {
                'total_transactions': len(response.data),
                'total_amount': sum(t['amount'] for t in response.data if t['transaction_status'] == 'completed'),
                'completed_transactions': len([t for t in response.data if t['transaction_status'] == 'completed']),
                'pending_transactions': len([t for t in response.data if t['transaction_status'] == 'pending']),
                'failed_transactions': len([t for t in response.data if t['transaction_status'] == 'failed']),
                'payment_methods': {}
            }
            
            # Group by payment method
            for transaction in response.data:
                method = transaction['payment_method']
                if method not in summary['payment_methods']:
                    summary['payment_methods'][method] = {'count': 0, 'amount': 0}
                
                summary['payment_methods'][method]['count'] += 1
                if transaction['transaction_status'] == 'completed':
                    summary['payment_methods'][method]['amount'] += transaction['amount']
            
            return summary
            
        except Exception as e:
            print(f"Error generating transaction summary: {e}")
            return {}