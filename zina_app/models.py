"""
ZINA Cantine BAD - Data Models
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List
from decimal import Decimal
import uuid


@dataclass
class User:
    user_id: uuid.UUID
    full_name: str
    email: str
    phone: Optional[str] = None
    password_hash: str = ""
    created_at: Optional[datetime] = None


@dataclass
class Category:
    category_id: int
    category_name: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None


@dataclass
class Product:
    product_id: int
    category_id: int
    product_name: str
    price: Decimal
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_available: bool = True
    created_at: Optional[datetime] = None

    # Optional relationship data
    category: Optional[Category] = None
    options: Optional[List['ProductOption']] = None


@dataclass
class ProductOption:
    option_id: int
    product_id: int
    option_name: str
    additional_price: Decimal

    # Optional relationship data
    product: Optional[Product] = None


@dataclass
class Order:
    order_id: int
    user_id: uuid.UUID
    total_amount: Decimal
    order_status: str
    created_at: Optional[datetime] = None

    # Optional relationship data
    user: Optional[User] = None
    


@dataclass
class OrderItem:
    order_id: int
    product_id: int
    quantity: int
    unit_price: Decimal

    # Optional relationship data
    order: Optional[Order] = None
    product: Optional[Product] = None


# Request/Response DTOs
@dataclass
class CreateOrderRequest:
    user_id: uuid.UUID
    items: List['OrderItemRequest']
    pickup_time: Optional[datetime] = None
    prep_time_minutes: int = 15


@dataclass
class OrderItemRequest:
    product_id: int
    quantity: int
    option_ids: Optional[List[int]] = None


@dataclass
class OrderResponse:
    order_id: int
    user_id: uuid.UUID
    total_amount: Decimal
    order_status: str
    created_at: datetime
    items: List['OrderItemResponse']
    pickup_time: datetime
    prep_time_minutes: int = 15


@dataclass
class OrderItemResponse:
    product_id: int
    product_name: str
    quantity: int
    unit_price: Decimal
    options: Optional[List['ProductOption']] = None

@dataclass
class ProductResponse:
    product_id: int
    category_id: int
    product_name: str
    price: Decimal
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_available: bool = True
    category_name: Optional[str] = None
    options: Optional[List[ProductOption]] = None


@dataclass
class CategoryResponse:
    category_id: int
    category_name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    products: Optional[List[ProductResponse]] = None
