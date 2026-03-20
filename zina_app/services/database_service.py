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
    CreateOrderRequest
)
from zina_app.services.category_image_service import CategoryImageService

logger = logging.getLogger(__name__)


class DatabaseService:
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.image_service = CategoryImageService()

    # Product operations
    async def get_products(self, category_id: Optional[int] = None, available_only: bool = True) -> List[ProductResponse]:
        try:
            query = self.supabase.table('products').select('*')

            if category_id:
                query = query.eq('category_id', category_id)

            if available_only:
                query = query.eq('is_available', True)

            response = query.execute()

            print(f"[DEBUG] get_products: found {len(response.data)} products (available_only={available_only})")

            products = []
            print(f'[DEBUG]{response.data}')
            for item in response.data:
                # Get category info
                category_response = self.supabase.table('categories').select('category_name').eq('category_id', item['category_id']).execute()
                category_name = category_response.data[0]['category_name'] if category_response.data else None

                # Get product options
                options_response = self.supabase.table('product_options').select('*').eq('product_id', item['product_id']).execute()
                options = [ProductOption(**opt) for opt in options_response.data] if options_response.data else []

                product = ProductResponse(
                    product_id=item['product_id'],
                    category_id=item['category_id'],
                    product_name=item['product_name'],
                    description=item.get('description'),
                    price=Decimal(str(item['price'])),
                    image_url=item.get('image_url'),
                    is_available=item.get('is_available', True),
                    category_name=category_name,
                    options=options
                )
                products.append(product)

            return products
        except Exception as e:
            print(f"Error fetching products: {e}")
            return []

    async def get_product_by_id(self, product_id: int) -> Optional[ProductResponse]:
        try:
            response = self.supabase.table('products').select('*').eq('product_id', product_id).limit(1).execute()
            if not response.data:
                return None

            item = response.data[0]

            category_name = None
            try:
                category_response = self.supabase.table('categories').select('category_name').eq('category_id', item['category_id']).limit(1).execute()
                category_name = category_response.data[0]['category_name'] if category_response.data else None
            except Exception:
                category_name = None

            options_response = self.supabase.table('product_options').select('*').eq('product_id', item['product_id']).execute()
            options = [ProductOption(**opt) for opt in options_response.data] if options_response.data else []

            return ProductResponse(
                product_id=item['product_id'],
                category_id=item['category_id'],
                product_name=item['product_name'],
                description=item.get('description'),
                price=Decimal(str(item['price'])),
                image_url=item.get('image_url'),
                is_available=item.get('is_available', True),
                category_name=category_name,
                options=options,
            )
        except Exception as e:
            print(f"Error fetching product by id {product_id}: {e}")
            return None

    async def get_products_by_ids(self, product_ids: List[int]) -> List[ProductResponse]:
        """Batch-load products + options for a list of product_ids.

        This avoids repeated calls to get_products() and helps prevent upstream 502s.
        """
        if not product_ids:
            return []

        unique_ids = sorted({int(pid) for pid in product_ids if pid is not None})
        if not unique_ids:
            return []

        try:
            products_resp = self.supabase.table('products').select('*').in_('product_id', unique_ids).execute()
            product_rows = products_resp.data or []

            options_resp = self.supabase.table('product_options').select('*').in_('product_id', unique_ids).execute()
            option_rows = options_resp.data or []

            options_by_product_id = {}
            for opt in option_rows:
                options_by_product_id.setdefault(opt.get('product_id'), []).append(ProductOption(**opt))

            products: List[ProductResponse] = []
            for row in product_rows:
                products.append(
                    ProductResponse(
                        product_id=row['product_id'],
                        category_id=row['category_id'],
                        product_name=row['product_name'],
                        description=row.get('description'),
                        price=Decimal(str(row['price'])),
                        image_url=row.get('image_url'),
                        is_available=row.get('is_available', True),
                        category_name=None,
                        options=options_by_product_id.get(row['product_id'], []),
                    )
                )

            return products
        except Exception as e:
            print(f"Error batch fetching products by ids: {e}")
            return []

    # Category operations
    async def get_categories(self) -> List[CategoryResponse]:
        try:
            response = self.supabase.table('categories').select('*').execute()

            categories = []
            for item in response.data:
                # Get products for this category
                products = await self.get_products(category_id=item['category_id'])
                
                # Get image for this category - prioritize local images
                category_name = item['category_name']
                try:
                    # Try to find local image first (most reliable)
                    image_url = item['image_url']
                    print("Image",image_url)
                    # If no local image, try API fallback but don't block on failure
                    if not image_url:
                        try:
                            image_url = self.image_service.get_fallback_image_url(category_name, use_api='unsplash')
                        except Exception as api_err:
                            # Log but don't crash - it's OK to have no image
                            logger.warning(f"Fallback API error for {category_name}: {api_err}")
                            image_url = None
                except Exception as img_err:
                    print(f"Warning: Could not get image for {category_name}: {img_err}")
                    image_url = None

                category = CategoryResponse(
                    category_id=item['category_id'],
                    category_name=category_name,
                    description=item.get('description'),
                    image_url=image_url,
                    products=products
                )
                categories.append(category)

            return categories
        except Exception as e:
            print(f"Error fetching categories: {e}")
            return []

    # Order operations
    async def create_order(self, order_request: CreateOrderRequest) -> Optional[OrderResponse]:
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
                product = product_by_id.get(item_request.product_id)

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

            # Generate a unique order ID
            order_id = int(datetime.now().timestamp())  # Use timestamp as order ID

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

            # Create order
            order_data = {
                'order_id': order_id,
                'user_id': user_id_str,  # Always has a value (real user or guest user)
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
                product = await self.get_product_by_id(item_request.product_id)

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

    async def get_order_by_id(self, order_id: int) -> Optional[OrderResponse]:
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
                        pid = item.get('product_id')
                        product = product_by_id.get(pid)
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
    async def get_user_by_id(self, user_id: uuid.UUID) -> Optional[User]:
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

    async def create_user(self, user: User) -> Optional[User]:
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

    async def get_orders_by_user_id(self, user_id: uuid.UUID) -> List[OrderResponse]:
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
                            product = await self.get_product_by_id(item['product_id'])
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

    # Payment operations - handled at counter
    # This function may be used when implementing counter payment processing
    async def update_payment_status(self, payment_id: int, status: str, transaction_reference: Optional[str] = None) -> bool:
        try:
            update_data = {
                'payment_status': status,
                'paid_at': datetime.now().isoformat() if status == 'completed' else None
            }

            if transaction_reference:
                update_data['transaction_reference'] = transaction_reference

            # Note: This will only work when payments table exists and payment records are created
            response = self.supabase.table('payments').update(update_data).eq('payment_id', payment_id).execute()
            return len(response.data) > 0
        except Exception as e:
            print(f"Error updating payment status: {e}")
            return False

    async def update_order_status(self, order_id: int, new_status: str) -> bool:
        """Update order status"""
        try:
            response = self.supabase.table('orders')\
                .update({'order_status': new_status})\
                .eq('order_id', order_id)\
                .execute()
            return len(response.data) > 0
        except Exception as e:
            print(f"Error updating order status: {e}")
            return False
