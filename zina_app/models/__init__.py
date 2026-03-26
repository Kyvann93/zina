"""
ZINA Cantine BAD - Data Models
"""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
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
    is_popular: bool = False
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
    unit_price: int

    # Optional relationship data
    order: Optional[Order] = None
    product: Optional[Product] = None


# Request/Response DTOs
@dataclass
class CreateOrderRequest:
    user_id: Optional[uuid.UUID]
    items: List['OrderItemRequest']
    # Optional - handled at counter


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
    pickup_time: Optional[datetime] = None
    prep_time_minutes: int = 15


@dataclass
class OrderItemResponse:
    product_id: int
    product_name: str
    quantity: int
    unit_price: Decimal
    options: Optional[List[ProductOption]] = None




@dataclass
class ProductResponse:
    product_id: int
    category_id: int
    product_name: str
    price: Decimal
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_available: bool = True
    is_popular: bool = False
    category_name: Optional[str] = None
    options: Optional[List[ProductOption]] = None


@dataclass
class CategoryResponse:
    category_id: int
    category_name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    products: Optional[List[ProductResponse]] = None
    
@dataclass
class Transaction:
    transaction_id: int
    order_id: int
    user_id: uuid.UUID
    amount: Decimal
    transaction_type: str = 'payment'  # 'payment', 'refund', 'partial_refund'
    currency: str = 'XOF'
    payment_method: str = 'cash'  # 'cash', 'mobile_money', 'card', 'other'
    payment_provider: Optional[str] = None
    transaction_status: str = 'pending'  # 'pending', 'completed', 'failed', 'cancelled'
    created_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None
    transaction_reference: Optional[str] = None
    internal_reference: Optional[str] = None
    notes: Optional[str] = None
    processed_by: Optional[uuid.UUID] = None
    processing_location: Optional[str] = None
    created_by: Optional[uuid.UUID] = None
    updated_at: Optional[datetime] = None
    
    # Optional relationship data
    order: Optional[Order] = None
    user: Optional[User] = None
    processor: Optional[User] = None

# Request/Response DTOs for transactions
@dataclass
class CreateTransactionRequest:
    order_id: int
    user_id: uuid.UUID
    amount: Decimal
    transaction_type: str = 'payment'
    payment_method: str = 'cash'
    payment_provider: Optional[str] = None
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None
    processing_location: Optional[str] = 'counter'

@dataclass
class TransactionResponse:
    transaction_id: int
    order_id: int
    user_id: uuid.UUID
    transaction_type: str
    amount: Decimal
    currency: str
    payment_method: str
    payment_provider: Optional[str]
    transaction_status: str
    created_at: datetime
    processed_at: Optional[datetime]
    transaction_reference: Optional[str]
    internal_reference: Optional[str]
    notes: Optional[str]
    processed_by: Optional[uuid.UUID]
    processing_location: Optional[str]
    order_details: Optional[OrderResponse] = None
