"""
ZINA Cantine BAD - Database Service
Handles all database operations via Supabase
"""

from typing import List, Optional
from decimal import Decimal
from datetime import datetime, timedelta, timezone
import uuid
import hashlib
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

    # ------------------------------------------------------------------ #
    # Product operations                                                   #
    # ------------------------------------------------------------------ #

    def get_products(self, category_id: Optional[int] = None, available_only: bool = True) -> List[ProductResponse]:
        try:
            query = self.supabase.table('products').select(
                '*, categories(category_name), product_options(*)'
            )
            if category_id:
                query = query.eq('category_id', category_id)
            if available_only:
                query = query.eq('is_available', True)

            response = query.execute()
            logger.debug("get_products: found %d products (available_only=%s)", len(response.data), available_only)

            return [self._build_product(item) for item in response.data]
        except Exception as e:
            logger.error("Error fetching products: %s", e)
            return []

    def get_product_by_id(self, product_id: int) -> Optional[ProductResponse]:
        try:
            response = self.supabase.table('products').select(
                '*, categories(category_name), product_options(*)'
            ).eq('product_id', product_id).execute()

            if not response.data:
                return None
            return self._build_product(response.data[0])
        except Exception as e:
            logger.error("Error fetching product %d: %s", product_id, e)
            return None

    def _build_product(self, item: dict) -> ProductResponse:
        category_name = item['categories'].get('category_name') if item.get('categories') else None
        options = [ProductOption(**opt) for opt in (item.get('product_options') or [])]
        return ProductResponse(
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

    # ------------------------------------------------------------------ #
    # Category operations                                                  #
    # ------------------------------------------------------------------ #

    def get_categories(self) -> List[CategoryResponse]:
        try:
            response = self.supabase.table('categories').select(
                '*, products(*, product_options(*))'
            ).execute()

            categories = []
            for item in response.data:
                category_name = item['category_name']

                products = []
                for prod in (item.get('products') or []):
                    if not prod.get('is_available', True):
                        continue
                    options = [ProductOption(**opt) for opt in (prod.get('product_options') or [])]
                    products.append(ProductResponse(
                        product_id=prod['product_id'],
                        category_id=prod['category_id'],
                        product_name=prod['product_name'],
                        description=prod.get('description'),
                        price=Decimal(str(prod['price'])),
                        image_url=prod.get('image_url'),
                        is_available=prod.get('is_available', True),
                        category_name=category_name,
                        options=options
                    ))

                image_url = item.get('image_url')
                if not image_url:
                    try:
                        image_url = self.image_service.get_fallback_image_url(category_name, use_api='unsplash')
                    except Exception as api_err:
                        logger.warning("Fallback image API error for %s: %s", category_name, api_err)
                        image_url = None

                categories.append(CategoryResponse(
                    category_id=item['category_id'],
                    category_name=category_name,
                    description=item.get('description'),
                    image_url=image_url,
                    products=products
                ))

            return categories
        except Exception as e:
            logger.error("Error fetching categories: %s", e)
            return []

    # ------------------------------------------------------------------ #
    # Order operations                                                     #
    # ------------------------------------------------------------------ #

    def create_order(self, order_request: CreateOrderRequest) -> Optional[OrderResponse]:
        try:
            total_amount = Decimal('0')
            order_items_data = []

            logger.debug("Creating order with %d items", len(order_request.items))

            for item_request in order_request.items:
                product = self.get_product_by_id(item_request.product_id)
                if not product:
                    logger.warning("Product %d not found, skipping", item_request.product_id)
                    continue

                unit_price = product.price
                if item_request.option_ids and product.options:
                    for option in product.options:
                        if option.option_id in item_request.option_ids:
                            unit_price += option.additional_price

                total_amount += unit_price * item_request.quantity
                order_items_data.append({
                    'product_id': item_request.product_id,
                    'product_name': product.product_name,
                    'quantity': item_request.quantity,
                    'unit_price': float(unit_price)
                })

            now = datetime.now(timezone.utc)
            prep_time_minutes = order_request.prep_time_minutes
            pickup_time = order_request.pickup_time

            if pickup_time:
                if pickup_time.tzinfo is None:
                    pickup_time = pickup_time.replace(tzinfo=timezone.utc)
                min_pickup = now + timedelta(minutes=prep_time_minutes)
                if pickup_time < min_pickup:
                    pickup_time = min_pickup
            else:
                pickup_time = now + timedelta(minutes=prep_time_minutes)

            order_id = int(datetime.now().timestamp())

            # Resolve or create user
            user_id_str = self._resolve_user(order_request.user_id)
            if user_id_str is None:
                return None

            order_data = {
                'order_id': order_id,
                'user_id': user_id_str,
                'total_amount': int(total_amount),
                'order_status': 'pending',
                'pickup_time': pickup_time.isoformat(),
                'prep_time_minutes': prep_time_minutes
            }

            order_response = self.supabase.table('orders').insert(order_data).execute()
            if not order_response.data:
                logger.error("Order creation returned no data")
                return None

            # Insert order items (check table exists once)
            try:
                self.supabase.table('order_items').select('order_id').limit(1).execute()
                for item in order_items_data:
                    self.supabase.table('order_items').insert({
                        'order_id': order_id,
                        'product_id': item['product_id'],
                        'product_name': item['product_name'],
                        'quantity': item['quantity'],
                        'unit_price': int(item['unit_price'])
                    }).execute()
            except Exception as e:
                logger.warning("Could not insert order items: %s", e)

            # Build response items
            items_response = []
            for item_request in order_request.items:
                product = self.get_product_by_id(item_request.product_id)
                if not product:
                    continue
                unit_price = product.price
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
            logger.error("Error creating order: %s", e, exc_info=True)
            return None

    def _resolve_user(self, user_id: Optional[uuid.UUID]) -> Optional[str]:
        """Return a valid user_id string, creating the user if needed."""
        if user_id:
            user_id_str = str(user_id)
            exists = self.supabase.table('users').select('user_id').eq('user_id', user_id_str).execute()
            if not exists.data:
                default_password = f"temp-{user_id_str[:8]}"
                user_data = {
                    'user_id': user_id_str,
                    'full_name': f'Employee {user_id_str[:8]}',
                    'email': f'employee-{user_id_str[:8]}@zina-cantine.ci',
                    'password_hash': hashlib.sha256(default_password.encode()).hexdigest(),
                    'created_at': datetime.now().isoformat()
                }
                try:
                    self.supabase.table('users').insert(user_data).execute()
                except Exception as e:
                    logger.error("Could not create user %s: %s", user_id_str, e)
                    return None
            return user_id_str
        else:
            guest_id = str(uuid.uuid4())
            default_password = f"guest-{guest_id[:8]}"
            guest_data = {
                'user_id': guest_id,
                'full_name': 'Guest User',
                'email': f'guest-{guest_id[:8]}@zina-cantine.ci',
                'password_hash': hashlib.sha256(default_password.encode()).hexdigest(),
                'created_at': datetime.now().isoformat()
            }
            try:
                result = self.supabase.table('users').insert(guest_data).execute()
                if result.data:
                    return guest_id
                logger.error("Failed to create guest user")
                return None
            except Exception as e:
                logger.error("Could not create guest user: %s", e)
                return None

    def get_order_by_id(self, order_id: int) -> Optional[OrderResponse]:
        try:
            response = self.supabase.table('orders').select('*').eq('order_id', order_id).execute()
            if not response.data:
                return None

            order_data = response.data[0]

            try:
                user_id = uuid.UUID(order_data['user_id'])
            except (ValueError, TypeError) as e:
                logger.error("Invalid UUID for user_id %s: %s", order_data.get('user_id'), e)
                return None

            items = []
            try:
                items_resp = self.supabase.table('order_items').select(
                    '*, products(product_name, price)'
                ).eq('order_id', order_id).execute()
                for item in (items_resp.data or []):
                    product_name = item['products']['product_name'] if item.get('products') else f"Product {item['product_id']}"
                    items.append({
                        'product_id': item['product_id'],
                        'product_name': product_name,
                        'quantity': item['quantity'],
                        'unit_price': Decimal(str(item['unit_price'])),
                        'options': []
                    })
            except Exception as e:
                logger.warning("Could not fetch items for order %d: %s", order_id, e)

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
            logger.error("Error fetching order %d: %s", order_id, e)
            return None

    def get_orders_by_user_id(self, user_id: uuid.UUID) -> List[OrderResponse]:
        try:
            response = self.supabase.table('orders').select(
                '*, order_items(*, products(product_name, price))'
            ).eq('user_id', str(user_id)).order('created_at', desc=True).execute()

            orders = []
            for order_data in response.data:
                try:
                    user_obj_id = uuid.UUID(order_data['user_id'])
                except (ValueError, TypeError) as e:
                    logger.warning("Invalid UUID for user_id %s: %s", order_data.get('user_id'), e)
                    continue

                items = []
                for item in (order_data.get('order_items') or []):
                    product_name = item['products']['product_name'] if item.get('products') else f"Product {item['product_id']}"
                    items.append({
                        'product_id': item['product_id'],
                        'product_name': product_name,
                        'quantity': item['quantity'],
                        'unit_price': float(item['unit_price'])
                    })

                pickup_time = None
                if order_data.get('pickup_time'):
                    try:
                        pickup_time = datetime.fromisoformat(order_data['pickup_time'])
                    except (ValueError, TypeError):
                        pass

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
            logger.error("Error getting orders for user %s: %s", user_id, e)
            return []

    # ------------------------------------------------------------------ #
    # User operations                                                      #
    # ------------------------------------------------------------------ #

    def get_user_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        try:
            response = self.supabase.table('users').select('*').eq('user_id', str(user_id)).execute()
            if not response.data:
                return None

            user_data = response.data[0]
            try:
                uid = uuid.UUID(user_data['user_id'])
            except (ValueError, TypeError) as e:
                logger.error("Invalid UUID for user_id %s: %s", user_data.get('user_id'), e)
                return None

            return User(
                user_id=uid,
                full_name=user_data['full_name'],
                email=user_data['email'],
                phone=user_data.get('phone'),
                password_hash=user_data.get('password_hash', ''),
                created_at=datetime.fromisoformat(user_data['created_at']) if user_data.get('created_at') else None
            )
        except Exception as e:
            logger.error("Error fetching user: %s", e)
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
            return user if response.data else None
        except Exception as e:
            logger.error("Error creating user: %s", e)
            return None

    # ------------------------------------------------------------------ #
    # Payment operations                                                   #
    # ------------------------------------------------------------------ #

    def update_payment_status(self, payment_id: int, status: str, transaction_reference: Optional[str] = None) -> bool:
        try:
            update_data = {
                'payment_status': status,
                'paid_at': datetime.now().isoformat() if status == 'completed' else None
            }
            if transaction_reference:
                update_data['transaction_reference'] = transaction_reference
            response = self.supabase.table('payments').update(update_data).eq('payment_id', payment_id).execute()
            return len(response.data) > 0
        except Exception as e:
            logger.error("Error updating payment status: %s", e)
            return False
