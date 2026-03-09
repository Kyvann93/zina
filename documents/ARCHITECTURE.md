# ZINA Cantine BAD - Project Structure

## Architecture

This Flask application uses a modular blueprint architecture for better organization and scalability.

```
windsurf-project/
├── app.py                          # Main application entry point
├── requirements.txt                # Python dependencies
├── .env                            # Environment variables (Supabase credentials)
├── static/                         # Static assets
│   ├── css/
│   │   ├── style.css               # Home page styles
│   │   ├── ordering.css            # Ordering system styles
│   │   └── admin.css               # Admin dashboard styles
│   └── js/
│       ├── app.js                  # Home page JavaScript
│       ├── ordering.js             # Ordering system JavaScript
│       └── admin.js                # Admin dashboard JavaScript
├── templates/                      # HTML templates
│   ├── index.html                  # Home page
│   ├── ordering.html               # Ordering interface
│   └── admin.html                  # Admin dashboard
│
└── zina_app/                       # Main application package
    ├── __init__.py                 # Application factory
    ├── routes.py                   # Main page routes (/, /admin, /commander)
    │
    ├── api/                        # API blueprints
    │   ├── __init__.py             # Public API blueprint registration
    │   ├── routes.py               # Public API endpoints
    │   └── admin/
    │       ├── __init__.py         # Admin API blueprint registration
    │       └── routes.py           # Admin API endpoints
    │
    ├── services/
    │   ├── __init__.py
    │   └── database_service.py     # Supabase database operations
    │
    ├── models/
    │   └── __init__.py             # Data classes (User, Product, Order, etc.)
    │
    └── config/
        ├── __init__.py
        └── default.py              # Application configuration
```

## API Endpoints

### Public API (`/api`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/menu` | GET | Get full menu organized by category |
| `/api/categories` | GET | Get all categories |
| `/api/products/<id>` | GET | Get product by ID |
| `/api/order` | POST | Place a new order |
| `/api/orders/<id>` | GET | Get order by ID |
| `/api/menu/today` | GET | Get today's special menu |
| `/api/info` | GET | Get company information |
| `/api/contact` | POST | Submit contact form |
| `/api/newsletter` | POST | Subscribe to newsletter |

### Admin API (`/api/admin`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/menus` | GET | Get all menu items |
| `/api/admin/menus` | POST | Create new menu item |
| `/api/admin/menus/<id>` | PUT | Update menu item |
| `/api/admin/menus/<id>` | DELETE | Delete menu item |
| `/api/admin/categories` | GET | Get all categories |
| `/api/admin/categories` | POST | Create new category |
| `/api/admin/orders` | GET | Get all orders |
| `/api/admin/orders/<id>/status` | PUT | Update order status |
| `/api/admin/settings` | GET | Get site settings |
| `/api/admin/settings` | POST | Update site settings |

## Frontend ↔ Backend Integration

All frontend JavaScript files now load data from the backend API:

### `static/js/app.js` (Home Page)
- Loads menu data from `/api/menu`
- Submits contact forms to `/api/contact`
- Subscribes to newsletter via `/api/newsletter`

### `static/js/ordering.js` (Ordering System)
- Loads menu from `/api/menu`
- Places orders via `/api/order`
- All cart operations use backend data

### `static/js/admin.js` (Admin Dashboard)
- Loads menus from `/api/menu`
- Loads categories from `/api/admin/categories`
- Creates/updates/deletes menus via `/api/admin/menus`
- Creates categories via `/api/admin/categories`

## Running the Application

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables in `.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

3. Run the application:
```bash
python app.py
```

4. Access the application:
- Home: http://localhost:5000/
- Ordering: http://localhost:5000/commander
- Admin: http://localhost:5000/admin (login: admin / admin123)

## Database Schema

The application uses Supabase with the following tables:
- `users` - User accounts
- `categories` - Menu categories
- `products` - Menu items
- `product_options` - Product add-ons
- `orders` - Customer orders
- `payments` - Payment records
