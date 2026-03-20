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
<<<<<<< Updated upstream
=======
    checkSession(); // Check if user is logged in (moved inside DOMContentLoaded)
    loadLanguagePreference(); // Load language preference
    loadThemePreference(); // Load theme preference
    loadFormulaDiscounts();
>>>>>>> Stashed changes
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
    
<<<<<<< Updated upstream
    if (hour < 10) period = 'Petit-Déjeuner';
    else if (hour >= 14 && hour < 16) period = 'Collation';
    else if (hour >= 18) period = 'Dîner';
=======
    if (panel.classList.contains('active')) {
        panel.classList.remove('active');
        burger.innerHTML = '<i class="fas fa-bars"></i>';
    } else {
        panel.classList.add('active');
        burger.innerHTML = '<i class="fas fa-times"></i>';
    }
}

function toggleLanguage() {
    // Get the switch element
    const langSwitch = document.getElementById('langSwitch');

    // Determine new language based on switch state
    const newLang = langSwitch.checked ? 'en' : 'fr';

    // Update current language
    currentLanguage = newLang;

    // Save language preference
    localStorage.setItem('zina_language', newLang);

    // Update page language
    document.documentElement.lang = newLang;

    // Update guest user name and department if guest
    if (currentUser && currentUser.isGuest) {
        currentUser.name = newLang === 'fr' ? 'Invité' : 'Guest';
        currentUser.department = newLang === 'fr' ? 'Visiteur' : 'Visitor';
        localStorage.setItem('zina_user', JSON.stringify(currentUser));
        // Update displayed user info
        const userName = document.getElementById('userName');
        const userDept = document.getElementById('userDept');
        if (userName) userName.textContent = currentUser.name;
        if (userDept) userDept.textContent = currentUser.department;
    }

    // Update all translatable elements
    updateTranslations();

    // Update date/time based on language
    initializeDate();
    updateMealPeriod();

    showToast(newLang === 'fr' ? 'Langue changée en Français' : 'Language changed to English', 'info');
}

function changeLanguage(lang) {
    currentLanguage = lang;

    // Save language preference
    localStorage.setItem('zina_language', lang);

    // Update page language
    document.documentElement.lang = lang;

    // Update guest user name and department if guest
    if (currentUser && currentUser.isGuest) {
        currentUser.name = lang === 'fr' ? 'Invité' : 'Guest';
        currentUser.department = lang === 'fr' ? 'Visiteur' : 'Visitor';
        localStorage.setItem('zina_user', JSON.stringify(currentUser));
        // Update displayed user info
        const userName = document.getElementById('userName');
        const userDept = document.getElementById('userDept');
        if (userName) userName.textContent = currentUser.name;
        if (userDept) userDept.textContent = currentUser.department;
    }

    // Update all translatable elements
    updateTranslations();

    // Update date/time based on language
    initializeDate();
    updateMealPeriod();

    showToast(lang === 'fr' ? 'Langue changée en Français' : 'Language changed to English', 'info');
}

function updateTranslations() {
    const translations = {
        fr: {
            // Header & Navigation
            orderHistory: 'Mes Commandes',
            Cart: 'Mon Panier',
            logout: 'Déconnexion',
            employee: 'Employé',
            department: 'Département',

            formulas: 'Formules',
            formulaEP: 'Entrée + Plat',
            formulaPD: 'Plat + Dessert',
            formulaEPD: 'Entrée + Plat + Dessert',
            formulaEPDB: 'Entrée + Plat + Dessert + Boisson',

            // Search & Categories
            searchPlaceholder: 'Rechercher un plat, un snack...',
            allCategories: 'Tous',
            breakfast: 'Petit-Déjeuner',
            lunch: 'Plats Complets',
            snacks: 'Snacks',
            salads: 'Salades',
            drinks: 'Boissons',
            desserts: 'Desserts',
            specials: 'Spécialités',
            subcategories: 'Sous-catégories',

            // Menu
            orderTitle: 'Commander',
            all: 'Tous',
            popular: 'Populaires',
            new: 'Nouveautés',
            loadingMenu: 'Chargement du menu...',

            // Cart
            cartTitle: 'Mon Panier',
            cartEmpty: 'Votre panier est vide',
            cartEmptySub: 'Ajoutez des articles pour commencer',
            subtotal: 'Sous-total',
            formulaDiscount: 'Remise formules',
            total: 'Total',
            checkout: 'Commander',
            addToCart: 'Ajouter au panier',
            addMore: 'Ajouter',
            quantity: 'Quantité',

            // Meal Selection Modal
            chooseSiders: 'Choisissez vos accompagnements',
            siders: 'Accompagnements',
            verification: 'Vérification',
            pickup: 'Récupération',
            fries: 'Frites',
            alloco: 'Alloco',
            attieke: 'Attiéké',
            included: 'Inclus',
            siderNote: 'Sélectionnez le nombre de portions pour chaque accompagnement',
            verifyOrder: 'Vérifiez votre commande',
            choosePickupTime: 'Choisissez l\'heure de récupération',
            prepTime: 'Temps de préparation estimé',
            minutes: 'minutes',
            asap: 'Dès que possible',
            chooseTime: 'Choisir l\'heure',
            selectTime: 'Sélectionnez votre heure',
            pickupTimeLabel: 'Heure de récupération',
            back: 'Retour',
            next: 'Suivant',
            confirmOrder: 'Confirmer la Commande',

            // Order Modal
            orderConfirmation: 'Confirmation de Commande',
            orderSummary: 'Résumé de la commande',
            pickupTime: 'Heure de Récupération',
            immediately: 'Immédiatement',
            in15min: 'Dans 15 minutes',
            in30min: 'Dans 30 minutes',
            in45min: 'Dans 45 minutes',
            in60min: 'Dans 1 heure',
            cancel: 'Annuler',

            // Order History
            orderHistoryTitle: 'Mes Commandes',
            loadingOrders: 'Chargement de vos commandes...',
            noOrders: 'Aucune commande trouvée',
            noOrdersSub: 'Vous n\'avez pas encore passé de commande',
            orderNumber: 'Commande',
            status: 'Statut',
            amount: 'Montant',
            prepTimeLabel: 'Préparation',
            pickupTimeLabel: 'Récupération',
            orderedItems: 'Articles commandés',
            retry: 'Réessayer',

            // Success Modal
            orderConfirmed: 'Commande Confirmée !',
            orderSaved: 'Votre commande #',
            estimatedWait: 'Temps d\'attente estimé',
            pickupLocation: 'Lieu de récupération',
            pickupLocationValue: 'Cantine BAD - Comptoir 1',
            close: 'Fermer',

            // Login
            loginTitle: 'ZINA Cantine BAD',
            loginSubtitle: 'Accès Employés - Banque Africaine de Développement',
            loginRequired: 'Veuillez vous connecter pour accéder au service',
            loginSecure: 'Utilisez notre page de connexion sécurisée',
            signIn: 'Se Connecter',
            signUp: 'S\'inscrire',
            guestAccess: 'Continuer en tant qu\'Invité',

            // Profile
            userProfile: 'Mon Profil',
            profile: 'Profil',
            orders: 'Commandes',
            cart: 'Panier',
            fullName: 'Nom Complet',
            email: 'Email',
            phone: 'Téléphone',
            edit: 'Modifier',
            save: 'Enregistrer',

            // Toast messages
            error: 'Erreur',
            success: 'Succès',
            warning: 'Attention',
            info: 'Information'
        },
        en: {
            // Header & Navigation
            orderHistory: 'My Orders',
            Cart: 'Cart',
            logout: 'Logout',
            employee: 'Employee',
            department: 'Department',

            formulas: 'Formulas',
            formulaEP: 'Starter + Main',
            formulaPD: 'Main + Dessert',
            formulaEPD: 'Starter + Main + Dessert',
            formulaEPDB: 'Starter + Main + Dessert + Drink',

            // Search & Categories
            searchPlaceholder: 'Search for a dish, snack...',
            allCategories: 'All',
            breakfast: 'Breakfast',
            lunch: 'Full Meals',
            snacks: 'Snacks',
            salads: 'Salads',
            drinks: 'Drinks',
            desserts: 'Desserts',
            specials: 'Specialties',
            subcategories: 'Subcategories',

            // Menu
            orderTitle: 'Order',
            all: 'All',
            popular: 'Popular',
            new: 'New',
            loadingMenu: 'Loading menu...',

            // Cart
            cartTitle: 'My Cart',
            cartEmpty: 'Your cart is empty',
            cartEmptySub: 'Add items to get started',
            subtotal: 'Subtotal',
            formulaDiscount: 'Formula discount',
            total: 'Total',
            checkout: 'Checkout',
            addToCart: 'Add to Cart',
            addMore: 'Add',
            quantity: 'Quantity',

            // Meal Selection Modal
            chooseSiders: 'Choose your sides',
            siders: 'Sides',
            verification: 'Verification',
            pickup: 'Pickup',
            fries: 'Fries',
            alloco: 'Alloco',
            attieke: 'Attiéké',
            included: 'Included',
            siderNote: 'Select the number of portions for each side',
            verifyOrder: 'Verify your order',
            choosePickupTime: 'Choose pickup time',
            prepTime: 'Estimated prep time',
            minutes: 'minutes',
            asap: 'As soon as possible',
            chooseTime: 'Choose time',
            selectTime: 'Select your time',
            pickupTimeLabel: 'Pickup time',
            back: 'Back',
            next: 'Next',
            confirmOrder: 'Confirm Order',

            // Order Modal
            orderConfirmation: 'Order Confirmation',
            orderSummary: 'Order Summary',
            pickupTime: 'Pickup Time',
            immediately: 'Immediately',
            in15min: 'In 15 minutes',
            in30min: 'In 30 minutes',
            in45min: 'In 45 minutes',
            in60min: 'In 1 hour',
            cancel: 'Cancel',

            // Order History
            orderHistoryTitle: 'My Orders',
            loadingOrders: 'Loading your orders...',
            noOrders: 'No orders found',
            noOrdersSub: 'You haven\'t placed any orders yet',
            orderNumber: 'Order',
            status: 'Status',
            amount: 'Amount',
            prepTimeLabel: 'Prep Time',
            pickupTimeLabel: 'Pickup Time',
            orderedItems: 'Ordered Items',
            retry: 'Retry',

            // Success Modal
            orderConfirmed: 'Order Confirmed!',
            orderSaved: 'Your order #',
            estimatedWait: 'Estimated wait time',
            pickupLocation: 'Pickup Location',
            pickupLocationValue: 'BAD Canteen - Counter 1',
            close: 'Close',

            // Login
            loginTitle: 'ZINA BAD Canteen',
            loginSubtitle: 'Employee Access - African Development Bank',
            loginRequired: 'Please log in to access the service',
            loginSecure: 'Use our secure login page',
            signIn: 'Sign In',
            signUp: 'Sign Up',
            guestAccess: 'Continue as Guest',

            // Profile
            userProfile: 'My Profile',
            profile: 'Profile',
            orders: 'Orders',
            cart: 'Cart',
            fullName: 'Full Name',
            email: 'Email',
            phone: 'Phone',
            edit: 'Edit',
            save: 'Save',

            // Toast messages
            error: 'Error',
            success: 'Success',
            warning: 'Warning',
            info: 'Information'
        }
    };

    const currentTranslations = translations[currentLanguage];

    // Update elements with data-translate attribute
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        if (currentTranslations[key]) {
            element.textContent = currentTranslations[key];
        }
    });

    // Update search placeholder
    const searchInput = document.getElementById('searchInput');
    if (searchInput && currentTranslations.searchPlaceholder) {
        searchInput.placeholder = currentTranslations.searchPlaceholder;
    }

    // Update filter buttons
    document.querySelectorAll('.filter-chip').forEach(chip => {
        const filter = chip.getAttribute('data-filter');
        if (currentTranslations[filter]) {
            // Preserve icons in filter chips
            const icon = chip.querySelector('i');
            if (icon) {
                chip.innerHTML = `${icon.outerHTML} ${currentTranslations[filter]}`;
            } else {
                chip.textContent = currentTranslations[filter];
            }
        }
    });

    // Update category buttons
    document.querySelectorAll('.cat-btn').forEach(btn => {
        const category = btn.getAttribute('data-category');
        const catNameEl = btn.querySelector('.cat-name');
        if (catNameEl && currentTranslations[category]) {
            catNameEl.textContent = currentTranslations[category];
        }
    });

    // Update meal period dynamically
    updateMealPeriod();
}

// Load saved language preference
function loadLanguagePreference() {
    const savedLang = localStorage.getItem('zina_language') || 'fr';
    currentLanguage = savedLang;
>>>>>>> Stashed changes
    
    document.getElementById('mealPeriod').textContent = period;
}

// ========================================
// Menu System - Load from Backend
// ========================================
let menuItems = []; // Store all menu items from backend

let currentFormula = null;
let formulaStepIndex = 0;
let formulaSelections = {};

let formulaDiscounts = { EP: 0, PD: 0, EPD: 0, EPDB: 0 };

function loadFormulaDiscounts() {
    fetch('/api/formulas')
        .then(r => r.json())
        .then(data => {
            if (data && data.discounts) {
                formulaDiscounts = {
                    EP: parseInt(data.discounts.EP || 0),
                    PD: parseInt(data.discounts.PD || 0),
                    EPD: parseInt(data.discounts.EPD || 0),
                    EPDB: parseInt(data.discounts.EPDB || 0)
                };
            }
            updateCartTotals();
        })
        .catch(() => {
            updateCartTotals();
        });
}

const COURSE_CATEGORY_MAPPING = {
    entree: ['snacks', 'salads', 'salades', 'salade', 'entrées', 'entrees', 'appetizers'],
    plat: ['lunch', 'specials', 'déjeuner', 'dejeuner', 'plats complets', 'plats_complets', 'spécialités', 'specialites', 'specials'],
    dessert: ['desserts', 'dessert'],
    boisson: ['drinks', 'boissons']
};

const FORMULAS = {
    EP: { key: 'EP', steps: ['entree', 'plat'] },
    PD: { key: 'PD', steps: ['plat', 'dessert'] },
    EPD: { key: 'EPD', steps: ['entree', 'plat', 'dessert'] },
    EPDB: { key: 'EPDB', steps: ['entree', 'plat', 'dessert', 'boisson'] }
};

function normalizeCategoryForFormula(cat) {
    if (!cat) return '';
    return cat
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/_/g, ' ');
}

function openFormulaModal() {
    const modal = document.getElementById('formulaModal');
    const selectScreen = document.getElementById('formulaSelectScreen');
    const wizardScreen = document.getElementById('formulaWizardScreen');
    if (!modal || !selectScreen || !wizardScreen) return;

    modal.style.display = 'flex';
    modal.classList.add('active');
    selectScreen.style.display = 'flex';
    wizardScreen.style.display = 'none';
}

function closeFormulaModal() {
    const modal = document.getElementById('formulaModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    formulaCancel();
}

function startFormula(formulaKey) {
    const formula = FORMULAS[formulaKey];
    const selectScreen = document.getElementById('formulaSelectScreen');
    const wizardScreen = document.getElementById('formulaWizardScreen');
    if (!formula || !selectScreen || !wizardScreen) return;

    currentFormula = formula;
    formulaStepIndex = 0;
    formulaSelections = {};

    selectScreen.style.display = 'none';
    wizardScreen.style.display = 'block';
    renderFormulaStep();
}

function formulaCancel() {
    currentFormula = null;
    formulaStepIndex = 0;
    formulaSelections = {};

    const selectScreen = document.getElementById('formulaSelectScreen');
    const wizardScreen = document.getElementById('formulaWizardScreen');
    if (selectScreen && wizardScreen) {
        selectScreen.style.display = 'block';
        wizardScreen.style.display = 'none';
    }
}

function formulaPrevStep() {
    if (!currentFormula) {
        formulaCancel();
        return;
    }

    if (formulaStepIndex <= 0) {
        formulaCancel();
        return;
    }

    formulaStepIndex -= 1;
    renderFormulaStep();
}

function renderFormulaStep() {
    if (!currentFormula) return;

    const stepKey = currentFormula.steps[formulaStepIndex];
    const titleEl = document.getElementById('formulaStepTitle');
    const gridEl = document.getElementById('formulaItemsGrid');
    if (!titleEl || !gridEl) return;

    const labelsFr = {
        entree: 'Choisissez une entrée',
        plat: 'Choisissez un plat',
        dessert: 'Choisissez un dessert',
        boisson: 'Choisissez une boisson'
    };
    const labelsEn = {
        entree: 'Choose a starter',
        plat: 'Choose a main dish',
        dessert: 'Choose a dessert',
        boisson: 'Choose a drink'
    };
    const labels = currentLanguage === 'fr' ? labelsFr : labelsEn;
    titleEl.textContent = labels[stepKey] || stepKey;

    const allowed = (COURSE_CATEGORY_MAPPING[stepKey] || []).map(normalizeCategoryForFormula);
    const candidates = menuItems.filter(it => {
        const cat = normalizeCategoryForFormula(it.category);
        return allowed.includes(cat);
    });

    if (candidates.length === 0) {
        gridEl.innerHTML = `
            <div class="formula-empty">
                ${currentLanguage === 'fr' ? 'Aucun article disponible pour cette étape.' : 'No items available for this step.'}
            </div>
        `;
        return;
    }

    gridEl.innerHTML = candidates.map(it => `
        <button class="formula-item" type="button" onclick="selectFormulaItem('${stepKey}', ${it.id})">
            <div class="formula-item-name">${it.name}</div>
            <div class="formula-item-price">${formatPrice(it.price)}</div>
        </button>
    `).join('');
}

function addToCartDirectlyWithMeta(item, quantity, meta) {
    const existingItem = cart.find(i => i.id === item.id && i.comboId === meta.comboId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: quantity,
            image: item.image,
            category: item.category,
            prepTime: item.prepTime,
            optionIds: [],
            siders: {},
            comboId: meta.comboId,
            course: meta.course,
            formulaKey: meta.formulaKey
        });
    }

    updateCartUI();
    saveCart();
}

function selectFormulaItem(stepKey, itemId) {
    if (!currentFormula) return;
    const item = menuItems.find(i => i.id === itemId);
    if (!item || !item.available) return;

    formulaSelections[stepKey] = item;

    if (formulaStepIndex < currentFormula.steps.length - 1) {
        formulaStepIndex += 1;
        renderFormulaStep();
        return;
    }

    const comboId = `combo_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    currentFormula.steps.forEach(k => {
        const selected = formulaSelections[k];
        if (!selected) return;
        addToCartDirectlyWithMeta(selected, 1, { comboId, course: k, formulaKey: currentFormula.key });
    });

    closeFormulaModal();
    showToast(currentLanguage === 'fr' ? 'Formule ajoutée au panier' : 'Formula added to cart', 'success');
}

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
                id: (item.id !== undefined && item.id !== null) ? item.id : id++,
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
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = computeFormulaDiscountForCart();
    const total = Math.max(0, subtotal - discount);

    const subtotalEl = document.getElementById('cartSubtotal');
    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);

    const discountEl = document.getElementById('cartFormulaDiscount');
    if (discountEl) discountEl.textContent = formatPrice(discount);

    const totalEl = document.getElementById('cartTotal');
    if (totalEl) totalEl.textContent = formatPrice(total);
}

function computeFormulaDiscountForCart() {
    const comboMap = {};
    cart.forEach(item => {
        if (!item.comboId || !item.formulaKey) return;
        comboMap[item.comboId] = item.formulaKey;
    });

    return Object.values(comboMap).reduce((sum, fk) => {
        const v = formulaDiscounts && Object.prototype.hasOwnProperty.call(formulaDiscounts, fk) ? formulaDiscounts[fk] : 0;
        return sum + (parseInt(v || 0) || 0);
    }, 0);
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

<<<<<<< Updated upstream
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
=======
    console.log('Modal and loader shown');

    // Use setTimeout to ensure UI updates before fetch (guarantees loader is painted)
    setTimeout(() => {
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
            prep_time_minutes: totalPrepTime,
            discount_amount: computeFormulaDiscountForCart()
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
                const formulaDiscount = computeFormulaDiscountForCart();
                const subtotal = data.items ? data.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) : 0;
                const totalAmount = Math.max(0, subtotal - formulaDiscount);

                // Update guest user with the assigned user_id from backend
                if (currentUser && currentUser.isGuest && data.user_id) {
                    currentUser.id = data.user_id;
                    // Save updated user info to localStorage
                    localStorage.setItem('zina_user', JSON.stringify(currentUser));
                    sessionStorage.setItem('zina_user', JSON.stringify(currentUser));
                    console.log('Guest user updated with ID:', data.user_id);

                    // Show additional success message for guest users
                    setTimeout(() => {
                        showToast(currentLanguage === 'fr' ? 'Commande confirmée !' : 'Order confirmed!', 'success');
                    }, 2000);
                }

                closeOrderModal();
                showSuccess(data.order_id || Math.floor(Math.random() * 10000), pickupTime, totalPrepTime, data.items || [], totalAmount, formulaDiscount);
                cart = [];
                saveCart();  // Clear cart from localStorage
                updateCartUI();
            } else {
            showToast(currentLanguage === 'fr' ? 'Erreur: ' + (data.error || '��chec de la commande') : 'Error: ' + (data.error || 'Order failed'), 'error');
>>>>>>> Stashed changes
        }
    })
    .catch(error => {
        console.error('Order error:', error);
        showToast('Erreur lors de la commande: ' + error.message, 'error');
    });
}

<<<<<<< Updated upstream
function showSuccess(orderId, pickupTime, prepTimeMinutes, orderItems, totalAmount) {
    document.getElementById('orderNumber').textContent = orderId;
=======
function showSuccess(orderId, pickupTime, prepTimeMinutes, orderItems, totalAmount, formulaDiscount = 0) {
    console.log('showSuccess called with orderId:', orderId);

    // Hide loading, show receipt
    const orderLoading = document.getElementById('orderLoading');
    const orderReceipt = document.getElementById('orderReceipt');

    if (orderLoading) {
        orderLoading.style.display = 'none';
    }
    if (orderReceipt) {
        orderReceipt.style.display = 'block';
    }

    // Set order number
    const orderNumberEl = document.getElementById('orderNumber');
    console.log('orderNumberEl:', orderNumberEl);

    if (orderNumberEl) {
        orderNumberEl.textContent = orderId;
        console.log('Order number set to:', orderId);
    } else {
        console.error('orderNumber element not found!');
    }
>>>>>>> Stashed changes

    // Format pickup time
    const pickupTimeStr = pickupTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const pickupDateStr = pickupTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

<<<<<<< Updated upstream
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
=======
    // Update receipt fields
    const receiptPickupTime = document.getElementById('receiptPickupTime');
    if (receiptPickupTime) {
        receiptPickupTime.textContent = pickupTimeStr;
    }

    const receiptPrepTime = document.getElementById('receiptPrepTime');
    if (receiptPrepTime) {
        receiptPrepTime.textContent = prepTimeMinutes + ' ' + (currentLanguage === 'fr' ? 'min' : 'min');
    }

    // Calculate subtotal
    const subtotal = orderItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

    // Update totals
    const receiptSubtotal = document.getElementById('receiptSubtotal');
    if (receiptSubtotal) {
        receiptSubtotal.textContent = formatPrice(subtotal);
    }

    const receiptFormulaDiscount = document.getElementById('receiptFormulaDiscount');
    if (receiptFormulaDiscount) {
        receiptFormulaDiscount.textContent = formatPrice(formulaDiscount || 0);
    }

    const receiptTotal = document.getElementById('receiptTotal');
    if (receiptTotal) {
        receiptTotal.textContent = formatPrice(totalAmount);
    }

    // Render items list
    const receiptItemsList = document.getElementById('receiptItemsList');
    if (receiptItemsList && orderItems.length > 0) {
        receiptItemsList.innerHTML = orderItems.map(item => `
            <div class="receipt-item">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span class="receipt-item-qty">${item.quantity}</span>
                    <div class="receipt-item-details">
                        <div class="receipt-item-name">${item.product_name}</div>
                    </div>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======

// Meal Selection Modal functions
window.openMealSelectionModal = openMealSelectionModal;
window.closeMealSelectionModal = closeMealSelectionModal;
window.updateSiderQuantity = updateSiderQuantity;
window.nextStep = nextStep;
window.previousStep = previousStep;
window.confirmMealOrder = confirmMealOrder;
window.updateCustomTime = updateCustomTime;
window.enableCustomTime = enableCustomTime;
window.updatePickupTime = updatePickupTime;
window.showProfileModal = showProfileModal;
window.closeProfileModal = closeProfileModal;
window.editProfile = editProfile;
window.cancelEdit = cancelEdit;
window.saveProfile = saveProfile;

window.openFormulaModal = openFormulaModal;
window.closeFormulaModal = closeFormulaModal;
window.startFormula = startFormula;
window.formulaPrevStep = formulaPrevStep;
window.formulaCancel = formulaCancel;
window.selectFormulaItem = selectFormulaItem;
>>>>>>> Stashed changes
