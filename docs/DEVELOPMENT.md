# 📚 ZINA Cantine BAD - Development Guide

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Database Management](#database-management)
- [API Development](#api-development)
- [Frontend Development](#frontend-development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Development Environment Setup

### Prerequisites

- **Python 3.8+**
- **Node.js 16+** (for frontend tools)
- **Git**
- **PostgreSQL** (or use Supabase)
- **Redis** (for caching and sessions)

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/zina-cantine/zina-bad.git
cd zina-bad

# Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Or manual setup
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Initialize database
python scripts/init_db.py

# Start development server
python app.py
```

### Development Tools

- **Pre-commit hooks**: `pre-commit install`
- **Code formatting**: `black zina_app/`
- **Import sorting**: `isort zina_app/`
- **Linting**: `flake8 zina_app/`
- **Type checking**: `mypy zina_app/`
- **Security scanning**: `bandit -r zina_app/`

## Project Structure

```
zina-bad/
├── 📁 app.py                 # Main Flask application
├── 📁 zina_app/             # Application package
│   ├── 📁 __init__.py       # Package initialization
│   ├── 📁 api/              # API endpoints
│   │   ├── 📁 __init__.py
│   │   ├── 📁 admin/        # Admin API routes
│   │   ├── 📁 auth/         # Authentication
│   │   ├── 📁 orders/       # Order management
│   │   └── 📁 menu/         # Menu management
│   ├── 📁 models/           # Data models
│   │   ├── 📁 __init__.py
│   │   ├── 📁 user.py
│   │   ├── 📁 product.py
│   │   └── 📁 order.py
│   ├── 📁 services/         # Business logic
│   │   ├── 📁 __init__.py
│   │   ├── 📁 auth_service.py
│   │   ├── 📁 order_service.py
│   │   └── 📁 notification_service.py
│   ├── 📁 utils/            # Utility functions
│   │   ├── 📁 __init__.py
│   │   ├── 📁 decorators.py
│   │   ├── 📁 validators.py
│   │   └── 📁 helpers.py
│   ├── 📁 config/           # Configuration
│   │   ├── 📁 __init__.py
│   │   ├── 📁 development.py
│   │   ├── 📁 production.py
│   │   └── 📁 testing.py
│   └── 📁 extensions.py     # Flask extensions
├── 📁 templates/            # HTML templates
│   ├── 📄 index.html        # Main website
│   ├── 📄 admin.html        # Admin dashboard
│   └── 📄 ordering.html     # Ordering interface
├── 📁 static/               # Static assets
│   ├── 📁 css/              # Stylesheets
│   ├── 📁 js/               # JavaScript files
│   ├── 📁 images/           # Images and media
│   └── 📁 fonts/            # Custom fonts
├── 📁 tests/                # Test suite
│   ├── 📁 unit/             # Unit tests
│   ├── 📁 integration/      # Integration tests
│   └── 📁 fixtures/         # Test data
├── 📁 scripts/              # Utility scripts
│   ├── 📄 init_db.py        # Database initialization
│   ├── 📄 create_admin.py   # Create admin user
│   └── 📄 setup.sh          # Setup script
├── 📁 migrations/           # Database migrations
├── 📁 docs/                 # Documentation
├── 📄 requirements.txt      # Python dependencies
├── 📄 requirements-dev.txt  # Development dependencies
├── 📄 pyproject.toml       # Project configuration
├── 📄 .env.example          # Environment template
└── 📄 README.md             # Project documentation
```

## Coding Standards

### Python Standards

#### Code Style
- Follow **PEP 8** guidelines
- Use **Black** for code formatting
- Maximum line length: **88 characters**
- Use **f-strings** for string formatting

#### Type Hints
```python
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

@dataclass
class User:
    id: str
    name: str
    email: str
    is_active: bool = True

def get_user_by_id(user_id: str) -> Optional[User]:
    """Get user by ID from database."""
    try:
        return db_service.get_user(user_id)
    except DatabaseError as e:
        logger.error(f"Failed to get user {user_id}: {e}")
        return None
```

#### Documentation
```python
def create_order(user_id: str, items: List[OrderItem]) -> Order:
    """Create a new order for a user.
    
    Args:
        user_id: The ID of the user placing the order
        items: List of items to include in the order
        
    Returns:
        The created order object
        
    Raises:
        ValidationError: If the order data is invalid
        DatabaseError: If there's an error saving to the database
        
    Example:
        >>> items = [OrderItem(product_id=1, quantity=2)]
        >>> order = create_order("user123", items)
        >>> print(order.id)
    """
    pass
```

### JavaScript Standards

#### Code Style
```javascript
// Use camelCase for variables
const userName = 'John Doe';

// Use PascalCase for classes
class OrderService {
  constructor() {
    this.orders = [];
  }
  
  async createOrder(items) {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to create order:', error);
      throw error;
    }
  }
}

// Use arrow functions for callbacks
const processOrder = (order) => {
  return order.items.map(item => ({
    ...item,
    total: item.price * item.quantity,
  }));
};
```

#### Error Handling
```javascript
// Always handle errors properly
const loadMenu = async () => {
  try {
    const response = await fetch('/api/menu');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const menu = await response.json();
    return menu;
  } catch (error) {
    console.error('Failed to load menu:', error);
    showToast('Failed to load menu. Please try again.', 'error');
    return null;
  }
};
```

### CSS Standards

#### BEM Methodology
```css
/* Block */
.menu-item {
  display: flex;
  
}

/* Element */
.menu-item__title {
  font-size: 1.2rem;
  font-weight: 600;
}

.menu-item__price {
  color: var(--primary-color);
}

/* Modifier */
.menu-item--featured {
  background: var(--accent-color);
  border: 2px solid var(--primary-color);
}

.menu-item--disabled {
  opacity: 0.5;
  pointer-events: none;
}
```

#### CSS Variables
```css
:root {
  /* Colors */
  --primary-color: #581b1f;
  --secondary-color: #d4af37;
  --accent-color: #f8f9fa;
  --text-color: #333;
  --error-color: #dc3545;
  --success-color: #28a745;
  
  /* Typography */
  --font-family-primary: 'Poppins', sans-serif;
  --font-family-secondary: 'Playfair Display', serif;
  --font-size-base: 1rem;
  --line-height-base: 1.5;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 2rem;
  --spacing-xl: 4rem;
  
  /* Breakpoints */
  --breakpoint-sm: 576px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 992px;
  --breakpoint-xl: 1200px;
}
```

## Testing Guidelines

### Unit Testing

#### Python Tests
```python
import pytest
from unittest.mock import Mock, patch
from zina_app.services.order_service import OrderService

class TestOrderService:
    def setup_method(self):
        self.order_service = OrderService()
        self.mock_db = Mock()
    
    def test_create_order_success(self):
        """Test successful order creation."""
        # Arrange
        user_id = "test-user-123"
        items = [
            {"product_id": 1, "quantity": 2, "price": 2500}
        ]
        expected_order = {"id": "order-123", "user_id": user_id, "total": 5000}
        
        self.mock_db.create_order.return_value = expected_order
        
        # Act
        result = self.order_service.create_order(user_id, items)
        
        # Assert
        assert result == expected_order
        self.mock_db.create_order.assert_called_once_with(user_id, items)
    
    def test_create_order_invalid_data(self):
        """Test order creation with invalid data."""
        # Arrange
        user_id = ""
        items = []
        
        # Act & Assert
        with pytest.raises(ValidationError):
            self.order_service.create_order(user_id, items)
    
    @patch('zina_app.services.order_service.send_notification')
    def test_create_order_sends_notification(self, mock_notification):
        """Test that order creation sends notification."""
        # Arrange
        user_id = "test-user-123"
        items = [{"product_id": 1, "quantity": 1}]
        
        # Act
        self.order_service.create_order(user_id, items)
        
        # Assert
        mock_notification.assert_called_once()
```

#### JavaScript Tests
```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrderForm } from '../OrderForm';

describe('OrderForm', () => {
  test('renders order form correctly', () => {
    render(<OrderForm />);
    
    expect(screen.getByLabelText('Product')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Order' })).toBeInTheDocument();
  });
  
  test('submits order with correct data', async () => {
    const mockSubmit = jest.fn();
    render(<OrderForm onSubmit={mockSubmit} />);
    
    fireEvent.change(screen.getByLabelText('Product'), {
      target: { value: '1' }
    });
    fireEvent.change(screen.getByLabelText('Quantity'), {
      target: { value: '2' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Order' }));
    
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        product_id: '1',
        quantity: '2'
      });
    });
  });
  
  test('shows validation error for empty fields', async () => {
    render(<OrderForm />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Submit Order' }));
    
    await waitFor(() => {
      expect(screen.getByText('Product is required')).toBeInTheDocument();
      expect(screen.getByText('Quantity is required')).toBeInTheDocument();
    });
  });
});
```

### Integration Testing

```python
import pytest
from fastapi.testclient import TestClient
from zina_app import create_app

@pytest.fixture
def client():
    app = create_app(testing=True)
    with TestClient(app) as client:
        yield client

@pytest.fixture
def auth_headers(client):
    # Create test user and get token
    response = client.post('/api/auth/login', json={
        'username': 'test@example.com',
        'password': 'testpassword'
    })
    token = response.json()['access_token']
    return {'Authorization': f'Bearer {token}'}

def test_create_order_integration(client, auth_headers):
    """Test complete order creation flow."""
    # Create order
    order_data = {
        'items': [
            {'product_id': 1, 'quantity': 2}
        ]
    }
    
    response = client.post('/api/orders', json=order_data, headers=auth_headers)
    
    assert response.status_code == 201
    order = response.json()
    assert 'id' in order
    assert order['total'] == 5000
    
    # Verify order was saved
    response = client.get(f'/api/orders/{order["id"]}', headers=auth_headers)
    assert response.status_code == 200
    assert response.json()['id'] == order['id']
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=zina_app --cov-report=html

# Run specific test file
pytest tests/test_order_service.py

# Run tests with specific marker
pytest -m "unit"
pytest -m "integration"
pytest -m "slow"

# Run tests in parallel
pytest -n auto

# Generate coverage report
pytest --cov=zina_app --cov-report=term-missing --cov-report=html
```

## Database Management

### Migrations

```bash
# Create new migration
flask db migrate -m "Add user preferences table"

# Apply migrations
flask db upgrade

# Rollback migration
flask db downgrade

# View migration history
flask db history
```

### Database Seeding

```python
# scripts/seed_data.py
from zina_app.models import User, Product, Category
from zina_app.extensions import db

def seed_database():
    """Seed database with initial data."""
    # Create categories
    categories = [
        Category(name='Breakfast', description='Morning meals'),
        Category(name='Lunch', description='Midday meals'),
        Category(name='Snacks', description='Light bites'),
    ]
    
    for category in categories:
        db.session.add(category)
    
    # Create products
    products = [
        Product(name='Attiéké Poisson', price=2500, category_id=1),
        Product(name='Riz Sauce', price=2000, category_id=2),
        Product(name='Alloco', price=1500, category_id=3),
    ]
    
    for product in products:
        db.session.add(product)
    
    db.session.commit()
    print("Database seeded successfully!")

if __name__ == '__main__':
    seed_database()
```

### Database Backups

```bash
# Create backup
pg_dump -h localhost -U zina_user zina_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
psql -h localhost -U zina_user zina_db < backup_20231201_120000.sql

# Automated backup script
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/zina_backup_$DATE.sql"

pg_dump -h localhost -U zina_user zina_db > $BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "zina_backup_*.sql" -mtime +30 -delete
```

## API Development

### API Standards

#### Response Format
```json
{
  "success": true,
  "data": {
    "id": "order-123",
    "user_id": "user-456",
    "items": [...],
    "total": 5000,
    "created_at": "2023-12-01T12:00:00Z"
  },
  "message": "Order created successfully",
  "timestamp": "2023-12-01T12:00:00Z"
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid order data",
    "details": {
      "items": "At least one item is required"
    }
  },
  "timestamp": "2023-12-01T12:00:00Z"
}
```

#### API Documentation
```python
from flask import Blueprint, request, jsonify
from flask_restx import Api, Resource, fields

api_v1 = Blueprint('api', __name__)
api = Api(api_v1, doc='/docs/', title='ZINA Cantine BAD API')

order_model = api.model('Order', {
    'items': fields.List(fields.Nested(api.model('OrderItem', {
        'product_id': fields.Integer(required=True),
        'quantity': fields.Integer(required=True, min=1),
    })), required=True),
})

@api.route('/orders')
class OrderList(Resource):
    @api.expect(order_model)
    @api.marshal_with(order_model)
    def post(self):
        """Create a new order."""
        data = request.get_json()
        # Process order creation
        return result, 201
```

### API Testing

```python
def test_api_create_order(client, auth_headers):
    """Test API order creation."""
    order_data = {
        'items': [
            {'product_id': 1, 'quantity': 2}
        ]
    }
    
    response = client.post('/api/orders', 
                          json=order_data, 
                          headers=auth_headers)
    
    assert response.status_code == 201
    data = response.json()
    assert data['success'] is True
    assert 'data' in data
    assert data['data']['total'] == 5000

def test_api_create_order_validation_error(client, auth_headers):
    """Test API validation error handling."""
    order_data = {'items': []}  # Empty items
    
    response = client.post('/api/orders', 
                          json=order_data, 
                          headers=auth_headers)
    
    assert response.status_code == 400
    data = response.json()
    assert data['success'] is False
    assert data['error']['code'] == 'VALIDATION_ERROR'
```

## Frontend Development

### JavaScript Architecture

#### Module Pattern
```javascript
// static/js/modules/orderModule.js
const OrderModule = (() => {
  let cart = [];
  
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    
    updateCartUI();
    saveCartToStorage();
  };
  
  const removeFromCart = (productId) => {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
    saveCartToStorage();
  };
  
  const updateCartUI = () => {
    const cartElement = document.getElementById('cart-items');
    const totalElement = document.getElementById('cart-total');
    
    cartElement.innerHTML = cart.map(item => `
      <div class="cart-item">
        <span>${item.name}</span>
        <span>${item.quantity} x ${item.price}</span>
        <button onclick="OrderModule.removeFromCart('${item.id}')">×</button>
      </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalElement.textContent = total;
  };
  
  const saveCartToStorage = () => {
    localStorage.setItem('cart', JSON.stringify(cart));
  };
  
  const loadCartFromStorage = () => {
    const saved = localStorage.getItem('cart');
    if (saved) {
      cart = JSON.parse(saved);
      updateCartUI();
    }
  };
  
  // Initialize
  document.addEventListener('DOMContentLoaded', loadCartFromStorage);
  
  return {
    addToCart,
    removeFromCart,
    getCart: () => cart,
    clearCart: () => { cart = []; updateCartUI(); }
  };
})();
```

### CSS Architecture

#### Component-Based CSS
```css
/* static/css/components/button.css */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--border-radius);
  font-family: var(--font-family-primary);
  font-size: var(--font-size-base);
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn:active {
  transform: translateY(0);
}

.btn--primary {
  background-color: var(--primary-color);
  color: white;
}

.btn--secondary {
  background-color: var(--secondary-color);
  color: white;
}

.btn--outline {
  background-color: transparent;
  border: 2px solid var(--primary-color);
  color: var(--primary-color);
}

.btn--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.btn--sm {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: 0.875rem;
}

.btn--lg {
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: 1.125rem;
}
```

## Deployment

### Local Development

```bash
# Start development server
python app.py

# Start with auto-reload
FLASK_ENV=development python app.py

# Start with debugger
python -m pdb app.py
```

### Docker Development

```bash
# Build image
docker build -t zina-cantine-bad .

# Run container
docker run -p 5000:5000 zina-cantine-bad

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop containers
docker-compose down
```

### Production Deployment

```bash
# Build production image
docker build -f Dockerfile.prod -t zina-cantine-bad:prod .

# Deploy to staging
docker-compose -f docker-compose.staging.yml up -d

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
docker-compose exec app flask db upgrade

# Create admin user
docker-compose exec app python scripts/create_admin.py
```

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connection
python -c "from zina_app.extensions import db; print(db.engine.execute('SELECT 1').scalar())"

# Check database status
docker-compose exec postgres pg_isready

# View database logs
docker-compose logs postgres
```

#### Redis Connection Issues
```bash
# Check Redis connection
python -c "import redis; r=redis.Redis(); print(r.ping())"

# Check Redis status
docker-compose exec redis redis-cli ping

# View Redis logs
docker-compose logs redis
```

#### Application Issues
```bash
# Check application logs
docker-compose logs app

# Debug mode
FLASK_DEBUG=1 python app.py

# Check configuration
python -c "from zina_app import config; print(config.__dict__)"
```

### Performance Issues

#### Database Performance
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check indexes
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE tablename = 'orders';

-- Analyze table
ANALYZE orders;
```

#### Application Performance
```python
# Enable profiling
from flask import Flask
from flask_profiler import Profiler

app = Flask(__name__)
Profiler(app)

# Monitor memory usage
import psutil
import os

def get_memory_usage():
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / 1024 / 1024  # MB
```

### Security Issues

#### Check Dependencies
```bash
# Check for security vulnerabilities
safety check
pip-audit

# Update dependencies
pip install --upgrade -r requirements.txt
```

#### Check Configuration
```bash
# Check environment variables
env | grep -E "(SECRET|PASSWORD|KEY)"

# Check file permissions
ls -la .env
chmod 600 .env
```

---

## 📞 Getting Help

- **Documentation**: [Project Wiki](https://github.com/zina-cantine/zina-bad/wiki)
- **Issues**: [GitHub Issues](https://github.com/zina-cantine/zina-bad/issues)
- **Discussions**: [GitHub Discussions](https://github.com/zina-cantine/zina-bad/discussions)
- **Email**: dev@zina-cantine.ci

Happy coding! 🚀
