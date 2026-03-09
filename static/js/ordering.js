/**
 * ZINA Cantine BAD - Ordering System
 * Complete Food Ordering Interface with 60+ Menu Items
 */

// ========================================
// Menu Database (60+ Items)
// ========================================
// ========================================
// Global State
// ========================================
let cart = [];
let currentUser = null;
let currentCategory = 'all';
let currentFilter = 'all';

// ========================================
// Initialize App
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    initializeDate();
    updateMealPeriod();
    loadMenuFromAPI();
});

// ========================================
// Login System
// ========================================
function switchToManual() {
    document.querySelectorAll('.login-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.login-tab')[1].classList.add('active');
    document.querySelectorAll('.login-panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById('manualPanel').classList.add('active');
}

function showRegistration() {
    document.querySelectorAll('.login-panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById('registerPanel').classList.add('active');
}

function showLogin() {
    document.querySelectorAll('.login-panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById('manualPanel').classList.add('active');
}

function handleRegistration(event) {
    event.preventDefault();
    
    const employeeId = document.getElementById('regEmployeeId').value;
    const fullName = document.getElementById('regFullName').value;
    const email = document.getElementById('regEmail').value;
    const department = document.getElementById('regDepartment').value;
    const phone = document.getElementById('regPhone').value;
    
    // Show loading
    const submitBtn = event.target.querySelector('.register-submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Inscription...</span>';
    submitBtn.disabled = true;
    
    // Send registration request
    fetch('/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            employee_id: employeeId,
            full_name: fullName,
            email: email,
            department: department,
            phone: phone
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showToast('Inscription réussie ! Vous pouvez maintenant vous connecter.', 'success');
            
            // Switch back to login and pre-fill the form
            showLogin();
            document.getElementById('employeeId').value = employeeId;
            document.getElementById('employeeName').value = fullName;
            document.getElementById('department').value = department;
            
            // Clear registration form
            document.getElementById('registerForm').reset();
        } else {
            showToast(data.error || 'Échec de l\'inscription', 'error');
        }
    })
    .catch(error => {
        console.error('Registration error:', error);
        showToast('Erreur de connexion. Veuillez réessayer.', 'error');
    })
    .finally(() => {
        // Restore button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

function handleGuestAccess() {
    currentUser = {
        id: null,  // Will be assigned by backend when order is placed
        name: 'Invité',
        department: 'Visiteur',
        isGuest: true  // Flag to identify guest users
    };
    
    // Save to localStorage for persistence across page reloads
    localStorage.setItem('zina_user', JSON.stringify(currentUser));
    sessionStorage.setItem('zina_user', JSON.stringify(currentUser));  // Keep sessionStorage for compatibility
    
    // Hide login, show app
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    
    // Initialize user info
    document.getElementById('userName').textContent = 'Invité';
    document.getElementById('userDept').textContent = 'Visiteur';
    
    showToast('Accès invité - Un compte invité sera créé lors de votre première commande', 'info');
    
    // Load menu
    loadMenu();
}

function handleLogin(event) {
    event.preventDefault();
    
    const employeeId = document.getElementById('employeeId').value;
    const employeeName = document.getElementById('employeeName').value;
    const department = document.getElementById('department').value;
    
    currentUser = {
        id: employeeId,
        name: employeeName,
        department: department
    };
    
    // Save to localStorage for persistence across page reloads
    localStorage.setItem('zina_user', JSON.stringify(currentUser));
    sessionStorage.setItem('zina_user', JSON.stringify(currentUser));  // Keep sessionStorage for compatibility
    
    // Hide login, show app
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    
    // Initialize user info
    document.getElementById('userName').textContent = employeeName;
    document.getElementById('userDept').textContent = department;
    
    showToast('Connexion réussie ! Bienvenue ' + employeeName, 'success');
}

function handleLogout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        // Clear both localStorage and sessionStorage
        localStorage.removeItem('zina_user');
        localStorage.removeItem('zina_cart');  // Also clear cart
        sessionStorage.removeItem('zina_user');
        location.reload();
    }
}

// Order History Functions
function showOrderHistory() {
    if (!currentUser) {
        showToast('Veuillez vous connecter pour voir vos commandes', 'warning');
        return;
    }
    
    document.getElementById('orderHistoryModal').classList.add('active');
    fetchUserOrders();
}

function closeOrderHistoryModal() {
    document.getElementById('orderHistoryModal').classList.remove('active');
}

async function fetchUserOrders() {
    try {
        let url;
        if (currentUser.isGuest) {
            // Guest users use guest orders endpoint with their assigned user_id
            if (!currentUser.id || currentUser.id === 'null' || currentUser.id === 'None') {
                showToast('Veuillez d\'abord passer une commande pour activer l\'historique', 'info');
                return;
            }
            url = `/api/guest/orders?user_id=${currentUser.id}`;
        } else if (currentUser.id) {
            // Logged-in users use user orders endpoint
            url = `/api/user/orders?user_id=${currentUser.id}`;
        } else {
            showToast('Veuillez vous connecter pour voir vos commandes', 'warning');
            return;
        }
        
        console.log(`Fetching orders from: ${url}`);
        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok) {
            displayOrderHistory(data);
        } else {
            console.error('Error fetching orders:', data);
            displayOrderHistoryError(data.error || 'Erreur lors du chargement des commandes');
        }
    } catch (error) {
        console.error('Network error:', error);
        displayOrderHistoryError('Erreur de connexion');
    }
}

function displayOrderHistory(orders) {
    const contentDiv = document.getElementById('orderHistoryContent');
    
    if (!orders || orders.length === 0) {
        contentDiv.innerHTML = `
            <div class="no-orders">
                <i class="fas fa-receipt"></i>
                <h3>Aucune commande trouvée</h3>
                <p>Vous n'avez pas encore passé de commande</p>
            </div>
        `;
        return;
    }
    
    const ordersHtml = orders.map(order => {
        const createdDate = new Date(order.created_at);
        const pickupDate = order.pickup_time ? new Date(order.pickup_time) : null;
        
        const statusClass = `status-${order.order_status}`;
        const statusText = getStatusText(order.order_status);
        
        return `
            <div class="order-item">
                <div class="order-item-header">
                    <div class="order-item-id">Commande #${order.order_id}</div>
                    <div class="order-item-date">${formatDate(createdDate)}</div>
                </div>
                <div class="order-item-details">
                    <div class="order-detail-row">
                        <span class="order-detail-label">Statut:</span>
                        <span class="order-item-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="order-detail-row">
                        <span class="order-detail-label">Montant:</span>
                        <span class="order-detail-value">${formatPrice(order.total_amount)}</span>
                    </div>
                    <div class="order-detail-row">
                        <span class="order-detail-label">Préparation:</span>
                        <span class="order-detail-value">${order.prep_time_minutes} min</span>
                    </div>
                    <div class="order-detail-row">
                        <span class="order-detail-label">Récupération:</span>
                        <span class="order-detail-value">${pickupDate ? formatTime(pickupDate) : 'Non défini'}</span>
                    </div>
                </div>
                ${order.items && order.items.length > 0 ? `
                    <div class="order-items-list">
                        <h4>Articles commandés:</h4>
                        ${order.items.map(item => `
                            <div class="order-item-product">
                                <span>${item.quantity}x ${item.product_name}</span>
                                <span>${formatPrice(item.unit_price * item.quantity)}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    contentDiv.innerHTML = `<div class="order-history-content">${ordersHtml}</div>`;
}

function displayOrderHistoryError(error) {
    const contentDiv = document.getElementById('orderHistoryContent');
    contentDiv.innerHTML = `
        <div class="no-orders">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Erreur de chargement</h3>
            <p>${error}</p>
            <button class="btn-retry" onclick="fetchUserOrders()">
                <i class="fas fa-redo"></i> Réessayer
            </button>
        </div>
    `;
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'En attente',
        'confirmed': 'Confirmée',
        'preparing': 'En préparation',
        'ready': 'Prête',
        'completed': 'Terminée',
        'cancelled': 'Annulée'
    };
    return statusMap[status] || status;
}

function formatDate(date) {
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTime(date) {
    return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Check if user is already logged in and restore session
function checkSession() {
    // Try localStorage first (persistent), then sessionStorage (session-based)
    const savedUser = localStorage.getItem('zina_user') || sessionStorage.getItem('zina_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userDept').textContent = currentUser.department;
        
        // Restore cart if exists
        restoreCart();
        
        showToast('Session restaurée - Bienvenue ' + currentUser.name, 'info');
    }
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('zina_cart', JSON.stringify(cart));
}

// Restore cart from localStorage
function restoreCart() {
    const savedCart = localStorage.getItem('zina_cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
            updateCartUI();
            console.log('Cart restored from localStorage:', cart.length, 'items');
        } catch (e) {
            console.error('Error restoring cart:', e);
            cart = [];
        }
    }
}

// Run session check
checkSession();

// ========================================
// Date & Time
// ========================================
function initializeDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('fr-FR', options);
}

function updateMealPeriod() {
    const hour = new Date().getHours();
    let period = 'Déjeuner';
    
    if (hour < 10) period = 'Petit-Déjeuner';
    else if (hour >= 14 && hour < 16) period = 'Collation';
    else if (hour >= 18) period = 'Dîner';
    
    document.getElementById('mealPeriod').textContent = period;
}

// ========================================
// Menu System - Load from Backend
// ========================================
let menuItems = []; // Store all menu items from backend

function loadMenuFromAPI() {
    const menuGrid = document.getElementById('menuGrid');
    if (menuGrid) {
        menuGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Chargement du menu...</p>
            </div>
        `;
    }

    // Load from API
    fetch('/api/menu')
        .then(response => response.json())
        .then(data => {
            if (data && Object.keys(data).length > 0) {
                // Use API data
                menuItems = convertAPIMenu(data);
                renderMenu(menuItems);
                updateCategoryCounts(menuItems);
            } else {
                // Empty menu
                renderMenu([]);
            }
        })
        .catch(error => {
            console.error('Error loading menu:', error);
            if (menuGrid) {
                menuGrid.innerHTML = `
                    <div class="menu-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Impossible de charger le menu. Veuillez réessayer.</p>
                    </div>
                `;
            }
        });
}

function convertAPIMenu(apiData) {
    // Convert API format to our format
    const converted = [];
    let id = 1;
    
    for (const [category, items] of Object.entries(apiData)) {
        items.forEach(item => {
            converted.push({
                id: id++,
                name: item.name,
                description: item.description || '',
                price: item.price,
                category: category,
                image: item.image || '🍽️',
                available: item.is_available !== undefined ? item.is_available : true,
                popular: false,
                prepTime: 15
            });
        });
    }
    
    return converted;
}

function renderMenu(menu) {
    const grid = document.getElementById('menuGrid');
    updateCategoryCounts(menu);
    
    let filteredMenu = menu;
    
    // Apply category filter
    if (currentCategory !== 'all') {
        filteredMenu = filteredMenu.filter(item => item.category === currentCategory);
    }
    
    // Apply item filter
    if (currentFilter === 'available') {
        filteredMenu = filteredMenu.filter(item => item.available);
    } else if (currentFilter === 'popular') {
        filteredMenu = filteredMenu.filter(item => item.popular);
    } else if (currentFilter === 'new') {
        filteredMenu = filteredMenu.filter(item => item.id > 55);
    }
    
    if (filteredMenu.length === 0) {
        grid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-utensils"></i>
                <p>Aucun plat trouvé dans cette catégorie</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredMenu.map((item, index) => `
        <div class="menu-item" style="animation: slideUp 0.3s ease ${index * 0.05}s both">
            <div class="menu-item-image">
                <img src="${item.image}" alt="${item.name}">
                <div class="menu-item-badges">
                    ${item.popular ? '<span class="menu-badge badge-popular"><i class="fas fa-fire"></i> Populaire</span>' : ''}
                    ${item.id > 55 ? '<span class="menu-badge badge-new"><i class="fas fa-sparkles"></i> Nouveau</span>' : ''}
                </div>
            </div>
            <div class="menu-item-content">
                <div class="menu-item-header">
                    <h4 class="menu-item-title">${item.name}</h4>
                    <span class="menu-item-price">${formatPrice(item.price)}</span>
                </div>
                <p class="menu-item-description">${item.description}</p>
                <div class="menu-item-footer">
                    <div class="menu-item-meta">
                        <span><i class="fas fa-clock"></i> ${item.prepTime} min</span>
                    </div>
                    <button class="add-to-cart" onclick="addToCart(${item.id})" ${!item.available ? 'disabled' : ''}>
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    document.getElementById('menuTitle').textContent = 
        currentCategory === 'all' ? 'Tous les Plats' : 
        getCategoryName(currentCategory);
}

function getCategoryName(category) {
    const names = {
        'breakfast': 'Petit-Déjeuner',
        'lunch': 'Plats Complets',
        'snacks': 'Snacks',
        'salads': 'Salades',
        'drinks': 'Boissons',
        'desserts': 'Desserts',
        'specials': 'Spécialités'
    };
    return names[category] || category;
}

function updateCategoryCounts(menu) {
    const counts = {
        all: menu.length,
        breakfast: menu.filter(i => i.category === 'breakfast').length,
        lunch: menu.filter(i => i.category === 'lunch').length,
        snacks: menu.filter(i => i.category === 'snacks').length,
        salads: menu.filter(i => i.category === 'salads').length,
        drinks: menu.filter(i => i.category === 'drinks').length,
        desserts: menu.filter(i => i.category === 'desserts').length,
        specials: menu.filter(i => i.category === 'specials').length
    };
    
    for (const [cat, count] of Object.entries(counts)) {
        const el = document.getElementById(`count${capitalize(cat)}`);
        if (el) el.textContent = count;
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function filterCategory(category) {
    currentCategory = category;

    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });

    renderMenu(menuItems);
}

function filterItems(filter) {
    currentFilter = filter;

    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.remove('active');
        if (chip.dataset.filter === filter) {
            chip.classList.add('active');
        }
    });

    renderMenu(menuItems);
}

function searchMenu() {
    const query = document.getElementById('searchInput').value.toLowerCase();

    if (query.length < 2) {
        renderMenu(menuItems);
        return;
    }

    const filtered = menuItems.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
    );
    
    const grid = document.getElementById('menuGrid');
    grid.innerHTML = filtered.map(item => `
        <div class="menu-item">
            <div class="menu-item-image"><img src=${item.image}/></div>
            <div class="menu-item-content">
                <div class="menu-item-header">
                    <h4 class="menu-item-title">${item.name}</h4>
                    <span class="menu-item-price">${formatPrice(item.price)}</span>
                </div>
                <p class="menu-item-description">${item.description}</p>
                <div class="menu-item-footer">
                    <div class="menu-item-meta">
                        <span><i class="fas fa-clock"></i> ${item.prepTime} min</span>
                    </div>
                    <button class="add-to-cart" onclick="addToCart(${item.id})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ========================================
// Cart System
// ========================================
function addToCart(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    if (!item || !item.available) return;

    const existingItem = cart.find(i => i.id === itemId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            image: item.image,
            category: item.category,
            prepTime: item.prepTime,
            optionIds: []
        });
    }

    updateCartUI();
    saveCart();  // Save to localStorage
    showToast('Article ajouté au panier', 'success');
}

function updateCartUI() {
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-basket"></i>
                <p>Votre panier est vide</p>
                <span>Ajoutez des articles pour commencer</span>
            </div>
        `;
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-image"><img style="height: -webkit-fill-available; width: -webkit-fill-available;" src="${item.image}"/></div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${formatPrice(item.price)}</div>
                    <div class="quantity-controls">
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="qty-value">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <button class="remove-item" onclick="removeFromCart(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }
    
    updateCartTotals();
}

function updateQuantity(itemId, change) {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    
    item.quantity += change;
    if (item.quantity <= 0) {
        cart = cart.filter(i => i.id !== itemId);
        showToast('Article retiré du panier', 'warning');
    } else {
        showToast('Quantité mise à jour', 'info');
    }
    
    updateCartUI();
    saveCart();  // Save to localStorage
}

function removeFromCart(itemId) {
    cart = cart.filter(i => i.id !== itemId);
    updateCartUI();
    saveCart();  // Save to localStorage
    showToast('Article retiré du panier', 'warning');
}

function updateCartTotals() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    document.getElementById('cartTotal').textContent = formatPrice(total);
}

function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('active');
    document.getElementById('cartOverlay').classList.toggle('active');
}

// ========================================
// Checkout
// ========================================
function proceedToCheckout() {
    if (cart.length === 0) {
        showToast('Votre panier est vide', 'error');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Calculate total prep time (max of all items)
    const totalPrepTime = Math.max(...cart.map(item => item.prepTime || 15));

    const orderSummary = document.getElementById('orderSummary');
    orderSummary.innerHTML = `
        <h4 style="margin-bottom: 1rem;">Récapitulatif de la commande</h4>
        <div class="order-items-detail" style="margin-bottom: 1rem; max-height: 200px; overflow-y: auto;">
            ${cart.map(item => `
                <div class="order-item-detail" style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                    <span>${item.quantity}x ${item.name}</span>
                    <strong>${formatPrice(item.price * item.quantity)}</strong>
                </div>
            `).join('')}
        </div>
        <div class="order-prep-time" style="margin-bottom: 1rem; padding: 0.5rem; background: #fff3cd; border-radius: 4px; font-size: 0.9rem;">
            <i class="fas fa-clock"></i> Temps de préparation estimé: <strong>${totalPrepTime} minutes</strong>
        </div>
        <div class="order-item" style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #ddd;">
            <strong>Total à payer</strong>
            <strong style="color: var(--primary);">${formatPrice(total)}</strong>
        </div>
    `;

    // Update pickup time options based on prep time
    updatePickupTimeOptions(totalPrepTime);

    document.getElementById('orderModal').classList.add('active');
    toggleCart();
}

function updatePickupTimeOptions(prepTimeMinutes) {
    const pickupSelect = document.getElementById('pickupTime');
    const now = new Date();

    // Clear existing options
    pickupSelect.innerHTML = '';

    // Calculate minimum pickup time (prep time + 5 min buffer)
    const minPickupMinutes = prepTimeMinutes + 5;

    // Create options that are all >= minPickupMinutes
    const options = [
        { value: minPickupMinutes, label: `Dans ${minPickupMinutes} minutes (le plus tôt)` },
        { value: Math.max(30, minPickupMinutes + 15), label: `Dans ${Math.max(30, minPickupMinutes + 15)} minutes` },
        { value: Math.max(45, minPickupMinutes + 30), label: `Dans ${Math.max(45, minPickupMinutes + 30)} minutes` },
        { value: Math.max(60, minPickupMinutes + 45), label: `Dans ${Math.max(60, minPickupMinutes + 45)} minutes` },
        { value: Math.max(90, minPickupMinutes + 60), label: `Dans ${Math.max(90, minPickupMinutes + 60)} minutes` }
    ];

    // Remove duplicates and add options
    const seen = new Set();
    options.forEach(opt => {
        if (!seen.has(opt.value)) {
            seen.add(opt.value);
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            pickupSelect.appendChild(option);
        }
    });
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
}

function confirmOrder() {
    const pickupMinutes = parseInt(document.getElementById('pickupTime').value);

    // Calculate pickup time
    const pickupTime = new Date();
    pickupTime.setMinutes(pickupTime.getMinutes() + pickupMinutes);

    // Calculate total prep time
    const totalPrepTime = Math.max(...cart.map(item => item.prepTime || 15));

    // Format items for backend API
    const orderItems = cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        option_ids: item.optionIds || []
    }));

    const orderData = {
        // Only include user_id if it exists (guest users have null ID)
        ...(currentUser.id && { user_id: currentUser.id }),
        items: orderItems,
        payment_method: null,  // Handled at counter
        pickup_time: pickupTime.toISOString(),
        prep_time_minutes: totalPrepTime
    };

    // Send to API
    fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success' || data.order_id) {
            // Calculate total amount from order items
            const totalAmount = data.items ? data.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) : 0;
            
            // Update guest user with the assigned user_id from backend
            if (currentUser && currentUser.isGuest && data.user_id) {
                currentUser.id = data.user_id;
                // Save updated user info to localStorage
                localStorage.setItem('zina_user', JSON.stringify(currentUser));
                sessionStorage.setItem('zina_user', JSON.stringify(currentUser));
                console.log('Guest user updated with ID:', data.user_id);
            }
            
            closeOrderModal();
            showSuccess(data.order_id || Math.floor(Math.random() * 10000), pickupTime, totalPrepTime, data.items || [], totalAmount);
            cart = [];
            saveCart();  // Clear cart from localStorage
            updateCartUI();
        } else {
            showToast('Erreur: ' + (data.error || 'Échec de la commande'), 'error');
        }
    })
    .catch(error => {
        console.error('Order error:', error);
        showToast('Erreur lors de la commande: ' + error.message, 'error');
    });
}

function showSuccess(orderId, pickupTime, prepTimeMinutes, orderItems, totalAmount) {
    document.getElementById('orderNumber').textContent = orderId;

    // Format pickup time
    const pickupTimeStr = pickupTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const pickupDateStr = pickupTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    document.getElementById('successModal').querySelector('.order-details').innerHTML = `
        <div class="detail-row">
            <span>Heure de récupération:</span>
            <strong style="color: var(--primary); font-size: 1.1rem;">${pickupTimeStr}</strong>
        </div>
        <div class="detail-row">
            <span>Date de récupération:</span>
            <strong>${pickupDateStr}</strong>
        </div>
        <div class="detail-row">
            <span>Temps de préparation:</span>
            <strong>${prepTimeMinutes} minutes</strong>
        </div>
        <div class="detail-row">
            <span>Montant total:</span>
            <strong style="color: var(--accent); font-size: 1.1rem;">${formatPrice(totalAmount)}</strong>
        </div>
        <div class="detail-row">
            <span>Lieu de récupération:</span>
            <strong>Cantine BAD - Comptoir 1</strong>
        </div>
        ${orderItems.length > 0 ? `
        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #ddd;">
            <h5 style="margin-bottom: 0.5rem; font-size: 0.95rem;">Articles commandés:</h5>
            ${orderItems.map(item => `
                <div style="display: flex; justify-content: space-between; padding: 0.25rem 0; font-size: 0.9rem;">
                    <span>${item.quantity}x ${item.product_name}</span>
                    <span>${formatPrice(item.unit_price * item.quantity)}</span>
                </div>
            `).join('')}
        </div>
        ` : ''}
    `;

    document.getElementById('successModal').classList.add('active');
}

function closeSuccessModal() {
    document.getElementById('successModal').classList.remove('active');
}

// ========================================
// Utilities
// ========================================
function formatPrice(price) {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Close modals on escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeOrderModal();
        closeSuccessModal();
        if (document.getElementById('cartSidebar').classList.contains('active')) {
            toggleCart();
        }
    }
});

// Export functions
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.filterCategory = filterCategory;
window.filterItems = filterItems;
window.searchMenu = searchMenu;
window.proceedToCheckout = proceedToCheckout;
window.confirmOrder = confirmOrder;
window.closeOrderModal = closeOrderModal;
window.closeSuccessModal = closeSuccessModal;
window.showSuccess = showSuccess;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.handleRegistration = handleRegistration;
window.handleGuestAccess = handleGuestAccess;
window.showRegistration = showRegistration;
window.showLogin = showLogin;
window.switchToManual = switchToManual;
window.saveCart = saveCart;
window.restoreCart = restoreCart;
window.checkSession = checkSession;
window.showOrderHistory = showOrderHistory;
window.closeOrderHistoryModal = closeOrderHistoryModal;
window.fetchUserOrders = fetchUserOrders;
window.startScanner = function() {
    showToast('Fonctionnalité de scan QR à implémenter', 'info');
};
