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
let currentSubcategory = 'all';
let currentLanguage = 'fr';
let currentTheme = 'light'; // Add theme state

// Meal Selection Modal State
let currentMealSelection = null;
let siderQuantities = {
    fries: 0,
    alloco: 0,
    attieke: 0
};
let currentStep = 1;
let selectedPickupTime = null;

// ========================================
// Test Functions (for debugging)
// ========================================
function testCategoryCounting() {
    // Create test menu data with French categories
    const testMenu = [
        { category: 'petit déjeuner', name: 'Croissant' },
        { category: 'petit déjeuner', name: 'Café' },
        { category: 'déjeuner', name: 'Riz Sauce' },
        { category: 'déjeuner', name: 'Poulet Braisé' },
        { category: 'déjeuner', name: 'Attiéké' },
        { category: 'boissons', name: 'Jus Orange' },
        { category: 'boissons', name: 'Eau' },
        { category: 'desserts', name: 'Gâteau' }
    ];
    
    console.log('Testing category counting with:', testMenu);
    updateCategoryCounts(testMenu);
    
    // Check if counts are correct
    const expectedCounts = {
        'countAll': 8,
        'countBreakfast': 2,
        'countLunch': 3,
        'countDrinks': 2,
        'countDesserts': 1
    };
    
    let allCorrect = true;
    for (const [id, expected] of Object.entries(expectedCounts)) {
        const el = document.getElementById(id);
        const actual = el ? parseInt(el.textContent) : 0;
        if (actual !== expected) {
            console.error(`❌ ${id}: expected ${expected}, got ${actual}`);
            allCorrect = false;
        } else {
            console.log(`✅ ${id}: ${actual}`);
        }
    }
    
    if (allCorrect) {
        console.log('🎉 All category counts are correct!');
    } else {
        console.log('❌ Some category counts are incorrect.');
    }
    
    return allCorrect;
}

// Make test function available globally
window.testCategoryCounting = testCategoryCounting;

// Test function for guest user order history
function testGuestOrderHistory() {
    console.log('=== Testing Guest User Order History ===');
    
    // Simulate a guest user with an ID (after placing first order)
    const testGuestUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Invité',
        department: 'Visiteur',
        isGuest: true
    };
    
    // Temporarily set current user to test guest
    const originalUser = currentUser;
    currentUser = testGuestUser;
    
    console.log('Test guest user:', testGuestUser);
    
    // Test order history display
    showOrderHistory();
    
    // Restore original user after 5 seconds
    setTimeout(() => {
        currentUser = originalUser;
        console.log('Restored original user:', originalUser);
    }, 5000);
}

// Make test function available globally
window.testGuestOrderHistory = testGuestOrderHistory;

// ========================================
// Initialize App
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    initializeDate();
    updateMealPeriod();
    checkSession(); // Check if user is logged in (moved inside DOMContentLoaded)
    loadLanguagePreference(); // Load language preference
    loadThemePreference(); // Load theme preference
    loadMenuFromAPI();

    // Handle category sidebar sticky behavior
    handleStickySidebar();
});

// ========================================
// Sticky Category Sidebar
// ========================================
function handleStickySidebar() {
    const header = document.querySelector('.order-header');
    const categorySidebar = document.querySelector('.category-sidebar');
    const mainContent = document.querySelector('.order-main');

    if (!header || !categorySidebar) return;

    const headerHeight = header.offsetHeight;

    // Set initial padding on main content
    mainContent.style.paddingTop = (headerHeight + 20) + 'px';

    window.addEventListener('scroll', function() {
        const scrollTop = window.scrollY;

        // When scrolled past header, hide header and make sidebar fixed at top
        if (scrollTop >= headerHeight) {
            header.style.transform = 'translateY(-100%)';
            categorySidebar.style.position = 'fixed';
            categorySidebar.style.top = '0';
            categorySidebar.style.left = '0';
            categorySidebar.style.right = '0';
            categorySidebar.style.width = '100%';
            categorySidebar.style.borderRadius = '0';
            categorySidebar.style.zIndex = '1000';
            categorySidebar.style.boxShadow = 'var(--shadow-lg)';

            // Adjust padding to match fixed sidebar height
            mainContent.style.paddingTop = (categorySidebar.offsetHeight + 20) + 'px';
        } else {
            header.style.transform = 'translateY(0)';
            categorySidebar.style.position = '';
            categorySidebar.style.top = '';
            categorySidebar.style.left = '';
            categorySidebar.style.right = '';
            categorySidebar.style.width = '';
            categorySidebar.style.borderRadius = '';
            categorySidebar.style.zIndex = '';
            categorySidebar.style.boxShadow = '';

            // Reset main content padding to initial value
            mainContent.style.paddingTop = (headerHeight + 20) + 'px';
        }
    });
}

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
            showToast(currentLanguage === 'fr' ? 'Inscription réussie ! Vous pouvez maintenant vous connecter.' : 'Registration successful! You can now log in.', 'success');

            // Switch back to login and pre-fill the form
            showLogin();
            document.getElementById('employeeId').value = employeeId;
            document.getElementById('employeeName').value = fullName;
            document.getElementById('department').value = department;

            // Clear registration form
            document.getElementById('registerForm').reset();
        } else {
            showToast(data.error || (currentLanguage === 'fr' ? 'Échec de l\'inscription' : 'Registration failed'), 'error');
        }
    })
    .catch(error => {
        console.error('Registration error:', error);
        showToast(currentLanguage === 'fr' ? 'Erreur de connexion. Veuillez réessayer.' : 'Connection error. Please try again.', 'error');
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
        name: currentLanguage === 'fr' ? 'Invité' : 'Guest',
        department: currentLanguage === 'fr' ? 'Visiteur' : 'Visitor',
        isGuest: true  // Flag to identify guest users
    };

    // Save to localStorage for persistence across page reloads
    localStorage.setItem('zina_user', JSON.stringify(currentUser));
    sessionStorage.setItem('zina_user', JSON.stringify(currentUser));  // Keep sessionStorage for compatibility

    // Hide login, show app
    const loginOverlay = document.getElementById('loginOverlay');
    const appContainer = document.getElementById('appContainer');
    const userName = document.getElementById('userName');
    const userDept = document.getElementById('userDept');

    if (loginOverlay) loginOverlay.style.display = 'none';
    if (appContainer) appContainer.style.display = 'block';
    if (userName) userName.textContent = currentLanguage === 'fr' ? 'Invité' : 'Guest';
    if (userDept) userDept.textContent = currentLanguage === 'fr' ? 'Visiteur' : 'Visitor';

    showToast(currentLanguage === 'fr' ? 'Accès invité - Votre historique de commandes sera disponible après votre première commande' : 'Guest access - Your order history will be available after your first order', 'info');

    // Load menu
    loadMenuFromAPI();
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

    showToast(currentLanguage === 'fr' ? 'Connexion réussie ! Bienvenue ' + employeeName : 'Login successful! Welcome ' + employeeName, 'success');
}

function handleLogout() {
    if (confirm(currentLanguage === 'fr' ? 'Voulez-vous vraiment vous déconnecter ?' : 'Do you really want to log out?')) {
        // Clear both localStorage and sessionStorage
        localStorage.removeItem('zina_user');
        localStorage.removeItem('zina_cart');  // Also clear cart
        sessionStorage.removeItem('zina_user');
        location.reload();
    }
}

// Order History Functions
function showOrderHistory() {
    // Allow all users (including guests) to see order history
    if (!currentUser) {
        showToast(currentLanguage === 'fr' ? 'Veuillez vous connecter pour voir vos commandes' : 'Please log in to view your orders', 'warning');
        return;
    }

    const orderHistoryModal = document.getElementById('orderHistoryModal');
    if (orderHistoryModal) {
        orderHistoryModal.style.display = 'flex';
        orderHistoryModal.offsetHeight; // Force reflow
        orderHistoryModal.classList.add('active');
    }
    fetchUserOrders();
}

function closeOrderHistoryModal() {
    const modal = document.getElementById('orderHistoryModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

async function fetchUserOrders() {
    try {
        let url;
        if (currentUser.isGuest) {
            // Guest users use guest orders endpoint with their assigned user_id
            if (!currentUser.id || currentUser.id === 'null' || currentUser.id === 'None') {
                displayOrderHistoryError(currentLanguage === 'fr' ? 'Aucune commande trouvée. Passez votre première commande pour voir l\'historique.' : 'No orders found. Place your first order to see history.');
                return;
            }
            url = `/api/guest/orders?user_id=${currentUser.id}`;
        } else if (currentUser.id) {
            // Logged-in users use user orders endpoint
            url = `/api/user/orders?user_id=${currentUser.id}`;
        } else {
            showToast(currentLanguage === 'fr' ? 'Veuillez vous connecter pour voir vos commandes' : 'Please log in to view your orders', 'warning');
            return;
        }

        console.log(`Fetching orders from: ${url}`);
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            displayOrderHistory(data);
        } else {
            console.error('Error fetching orders:', data);
            displayOrderHistoryError(data.error || (currentLanguage === 'fr' ? 'Erreur lors du chargement des commandes' : 'Error loading orders'));
        }
    } catch (error) {
        console.error('Network error:', error);
        displayOrderHistoryError(currentLanguage === 'fr' ? 'Erreur de connexion' : 'Connection error');
    }
}

function displayOrderHistory(orders) {
    const contentDiv = document.getElementById('orderHistoryContent');
    if (!contentDiv) return;

    if (!orders || orders.length === 0) {
        contentDiv.innerHTML = `
            <div class="no-orders">
                <i class="fas fa-receipt"></i>
                <h3>${currentLanguage === 'fr' ? 'Aucune commande trouvée' : 'No orders found'}</h3>
                <p>${currentLanguage === 'fr' ? "Vous n'avez pas encore passé de commande" : "You haven't placed any orders yet"}</p>
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
                    <div class="order-item-id">${currentLanguage === 'fr' ? 'Commande' : 'Order'} #${order.order_id}</div>
                    <div class="order-item-date">${formatDate(createdDate)}</div>
                </div>
                <div class="order-item-details">
                    <div class="order-detail-row">
                        <span class="order-detail-label">${currentLanguage === 'fr' ? 'Statut:' : 'Status:'}</span>
                        <span class="order-item-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="order-detail-row">
                        <span class="order-detail-label">${currentLanguage === 'fr' ? 'Montant:' : 'Amount:'}</span>
                        <span class="order-detail-value">${formatPrice(order.total_amount)}</span>
                    </div>
                    <div class="order-detail-row">
                        <span class="order-detail-label">${currentLanguage === 'fr' ? 'Préparation:' : 'Prep Time:'}</span>
                        <span class="order-detail-value">${order.prep_time_minutes} min</span>
                    </div>
                    <div class="order-detail-row">
                        <span class="order-detail-label">${currentLanguage === 'fr' ? 'Récupération:' : 'Pickup:'}</span>
                        <span class="order-detail-value">${pickupDate ? formatTime(pickupDate) : (currentLanguage === 'fr' ? 'Non défini' : 'Not set')}</span>
                    </div>
                </div>
                ${order.items && order.items.length > 0 ? `
                    <div class="order-items-list">
                        <h4>${currentLanguage === 'fr' ? 'Articles commandés:' : 'Ordered items:'}</h4>
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
    if (!contentDiv) return;

    contentDiv.innerHTML = `
        <div class="no-orders">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>${currentLanguage === 'fr' ? 'Erreur de chargement' : 'Loading Error'}</h3>
            <p>${error}</p>
            <button class="btn-retry" onclick="fetchUserOrders()">
                <i class="fas fa-redo"></i> ${currentLanguage === 'fr' ? 'Réessayer' : 'Retry'}
            </button>
        </div>
    `;
}

function getStatusText(status) {
    const statusMapFr = {
        'pending': 'En attente',
        'confirmed': 'Confirmée',
        'preparing': 'En préparation',
        'ready': 'Prête',
        'completed': 'Terminée',
        'cancelled': 'Annulée'
    };

    const statusMapEn = {
        'pending': 'Pending',
        'confirmed': 'Confirmed',
        'preparing': 'Preparing',
        'ready': 'Ready',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
    };

    return currentLanguage === 'fr' ? statusMapFr[status] : statusMapEn[status] || status;
}

function formatDate(date) {
    const locale = currentLanguage === 'fr' ? 'fr-FR' : 'en-US';
    return date.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTime(date) {
    const locale = currentLanguage === 'fr' ? 'fr-FR' : 'en-US';
    return date.toLocaleTimeString(locale, {
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
        
        // Check if elements exist before accessing them
        const loginOverlay = document.getElementById('loginOverlay');
        const appContainer = document.getElementById('appContainer');
        const userName = document.getElementById('userName');
        const userDept = document.getElementById('userDept');
        
        if (loginOverlay) loginOverlay.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
        if (userName) userName.textContent = currentUser.name;
        if (userDept) userDept.textContent = currentUser.department;
        
        // Restore cart if exists
        restoreCart();

        showToast(currentLanguage === 'fr' ? 'Session restaurée - Bienvenue ' + currentUser.name : 'Session restored - Welcome ' + currentUser.name, 'info');
    } else {
        // Show login overlay if no user is logged in
        const loginOverlay = document.getElementById('loginOverlay');
        const appContainer = document.getElementById('appContainer');

        if (loginOverlay) loginOverlay.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
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

// ========================================
// Date & Time
// ========================================
function initializeDate() {
    const currentDateElement = document.getElementById('currentDate');
    if (currentDateElement) {
        const now = new Date();
        const locale = currentLanguage === 'fr' ? 'fr-FR' : 'en-US';
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        currentDateElement.textContent = now.toLocaleDateString(locale, options);
    }
}

function updateMealPeriod() {
    const mealPeriodElement = document.getElementById('mealPeriod');
    if (!mealPeriodElement) return;

    const hour = new Date().getHours();
    let period = currentLanguage === 'fr' ? 'Déjeuner' : 'Lunch';

    if (hour < 10) period = currentLanguage === 'fr' ? 'Petit-Déjeuner' : 'Breakfast';
    else if (hour >= 14 && hour < 16) period = currentLanguage === 'fr' ? 'Collation' : 'Snack';
    else if (hour >= 18) period = currentLanguage === 'fr' ? 'Dîner' : 'Dinner';

    mealPeriodElement.textContent = period;
}

// ========================================
// Burger Menu & Language Functions
// ========================================
function toggleBurgerMenu() {
    const panel = document.getElementById('burgerMenuPanel');
    const burger = document.getElementById('burgerMenu');
    
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
            myCart: 'Mon Panier',
            logout: 'Déconnexion',
            employee: 'Employé',
            department: 'Département',

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

            // Toast messages
            error: 'Erreur',
            success: 'Succès',
            warning: 'Attention',
            info: 'Information'
        },
        en: {
            // Header & Navigation
            orderHistory: 'My Orders',
            myCart: 'My Cart',
            logout: 'Logout',
            employee: 'Employee',
            department: 'Department',

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
    
    const langSwitch = document.getElementById('langSwitch');
    if (langSwitch) {
        // Set switch state based on saved language
        langSwitch.checked = savedLang === 'en';
    }
    
    updateTranslations();
}

function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

function setTheme(theme) {
    currentTheme = theme;
    
    // Update HTML data attribute
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update theme icon
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
    
    // Save theme preference
    localStorage.setItem('zina_theme', theme);
    
    // Show toast notification
    const message = theme === 'light' ? 'Mode clair activé' : 'Mode sombre activé';
    showToast(message, 'info');
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem('zina_theme') || 'light';
    setTheme(savedTheme);
}

// Close burger menu when clicking outside
document.addEventListener('click', function(event) {
    const panel = document.getElementById('burgerMenuPanel');
    const burger = document.getElementById('burgerMenu');
    
    if (panel && panel.classList.contains('active') && 
        !panel.contains(event.target) && 
        !burger.contains(event.target)) {
        toggleBurgerMenu();
    }
});

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
            console.log('Menu data loaded:', data);
            if (data && Object.keys(data).length > 0) {
                // Use API data
                menuItems = convertAPIMenu(data);
                console.log('Menu items converted:', menuItems.length, 'items');
                console.log('Categories:', [...new Set(menuItems.map(i => i.category))]);
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

    for (const [categoryKey, items] of Object.entries(apiData)) {
        items.forEach(item => {
            converted.push({
                id: id++,
                name: item.name,
                description: item.description || '',
                price: item.price,
                category: item.category || categoryKey,  // Use item's category if available
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
        const actualNames = mapCategoryToActualNames(currentCategory);
        filteredMenu = filteredMenu.filter(item => 
            actualNames.some(name => 
                item.category && item.category.toLowerCase() === name.toLowerCase()
            )
        );
    }
    
    // Apply subcategory filter
    if (currentSubcategory !== 'all' && currentSubcategory !== 'tous') {
        filteredMenu = filteredMenu.filter(item => 
            item.subcategory && item.subcategory.toLowerCase() === currentSubcategory.toLowerCase()
        );
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
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>Aucun plat trouvé</h3>
                <p>Essayez une autre catégorie ou filtre</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredMenu.map(item => `
        <div class="menu-item ${!item.available ? 'unavailable' : ''}" data-id="${item.id}">
            <div class="menu-item-image">
                <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/300x200?text=${encodeURIComponent(item.name)}'">
                ${item.popular ? '<span class="popular-badge"><i class="fas fa-star"></i> Populaire</span>' : ''}
                ${!item.available ? '<span class="unavailable-badge">Indisponible</span>' : ''}
                <button class="add-btn-overlay" onclick="addToCart(${item.id})">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div class="menu-item-content">
                <div class="menu-item-header">
                    <h3 class="menu-item-title">${item.name}</h3>
                    <span class="menu-item-price">${item.price} FCFA</span>
                </div>
                <p class="menu-item-description">${item.description}</p>
            </div>
        </div>
    `).join('');
    
    document.getElementById('menuTitle').textContent = 
        currentCategory === 'all' ? 'Commander' : 
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
    // Count items by actual category names (no safe key conversion)
    const categoryCounts = {};
    menu.forEach(item => {
        const category = item.category;
        if (category) {
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
    });
    
    // Update "All" count
    const allEl = document.getElementById('countAll');
    if (allEl) {
        allEl.textContent = menu.length;
    }
    
    // Define mapping from data-category values to actual category names
    const categoryMappings = {
        'breakfast': ['petit déjeuner', 'petit-déjeuner', 'breakfast', 'petit_dejeuner'],
        'lunch': ['déjeuner', 'dejeuner', 'plats complets', 'lunch', 'plats_complets'],
        'snacks': ['snacks'],
        'salads': ['salades', 'salade', 'salads'],
        'drinks': ['boissons', 'drinks'],
        'desserts': ['desserts', 'dessert'],
        'specials': ['spécialités', 'specialites', 'specials']
    };
    
    // Update specific category counts
    document.querySelectorAll('.cat-btn[data-category]').forEach(btn => {
        const category = btn.dataset.category;
        if (category === 'all') return; // Already handled
        
        // Calculate count by summing all matching actual categories
        let count = 0;
        const actualCategories = categoryMappings[category] || [category];
        
        actualCategories.forEach(actualCat => {
            count += categoryCounts[actualCat] || 0;
        });
        
        // Find the count element for this category
        const countEl = btn.querySelector('.cat-count');
        if (countEl) {
            countEl.textContent = count;
        }
    });
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function filterCategory(category) {
    currentCategory = category;
    currentSubcategory = 'all'; // Reset subcategory when main category changes

    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });

    // Show/hide subcategories based on selected category
    updateSubcategories(category);
    
    renderMenu(menuItems);
}

function updateSubcategories(category) {
    const subcategoriesSection = document.getElementById('subcategoriesSection');
    const subcategoriesNav = document.getElementById('subcategoriesNav');
    
    // Define subcategories for each main category
    const subcategoriesMap = {
        'breakfast': ['Tous', 'Viennoiseries', 'Boissons Chaudes', 'Céréales'],
        'lunch': ['Tous', 'Plats Traditionnels', 'Riz Sauces', 'Grillades', 'Accompagnements'],
        'snacks': ['Tous', 'Gâteaux', 'Beignets', 'Chips', 'Fruits'],
        'salads': ['Tous', 'Salades Vertes', 'Salades Composées', 'Crudités'],
        'drinks': ['Tous', 'Jus', 'Sodas', 'Eaux', 'Boissons Chaudes'],
        'desserts': ['Tous', 'Glaces', 'Pâtisseries', 'Fruits', 'Chocolats'],
        'specials': ['Tous', 'Menu du Jour', 'Plats du Chef', 'Promotions']
    };
    
    if (category === 'all' || !subcategoriesMap[category]) {
        subcategoriesSection.style.display = 'none';
        return;
    }
    
    const subcategories = subcategoriesMap[category];
    
    // Clear existing subcategories
    subcategoriesNav.innerHTML = '';
    
    // Add subcategory buttons
    subcategories.forEach(sub => {
        const btn = document.createElement('button');
        btn.className = 'subcategory-btn';
        if (sub === 'Tous') {
            btn.classList.add('active');
        }
        btn.dataset.subcategory = sub.toLowerCase().replace(/\s+/g, '-');
        btn.onclick = () => filterSubcategory(sub.toLowerCase().replace(/\s+/g, '-'));
        btn.innerHTML = `
            <span>${sub}</span>
        `;
        subcategoriesNav.appendChild(btn);
    });
    
    subcategoriesSection.style.display = 'block';
}

function filterSubcategory(subcategory) {
    currentSubcategory = subcategory;
    
    document.querySelectorAll('.subcategory-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.subcategory === subcategory) {
            btn.classList.add('active');
        }
    });
    
    renderMenu(menuItems);
}

// Helper function to map English category to actual French category names
function mapCategoryToActualNames(category) {
    if (category === 'all') return null; // No filtering for 'all'
    
    const mappings = {
        'breakfast': ['petit déjeuner', 'petit-déjeuner', 'breakfast', 'petit_dejeuner'],
        'lunch': ['déjeuner', 'dejeuner', 'plats complets', 'lunch', 'plats_complets'],
        'snacks': ['snacks'],
        'salads': ['salades', 'salade', 'salads'],
        'drinks': ['boissons', 'drinks'],
        'desserts': ['desserts', 'dessert'],
        'specials': ['spécialités', 'specialites', 'specials']
    };
    
    return mappings[category] || [category];
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
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const query = searchInput.value.toLowerCase();

    if (query.length < 2) {
        renderMenu(menuItems);
        return;
    }

    const filtered = menuItems.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
    );
    
    const grid = document.getElementById('menuGrid');
    if (!grid) return;
    
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

    // Add item directly to cart with quantity 1
    addToCartDirectly(item, 1);
}

function addToCartDirectly(item, quantity) {
    const existingItem = cart.find(i => i.id === item.id);
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
            siders: {}
        });
    }

    updateCartUI();
    saveCart();  // Save to localStorage
    showToast(currentLanguage === 'fr' ? 'Article ajouté au panier' : 'Item added to cart', 'success');
}

function updateCartUI() {
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const navCartCount = document.getElementById('navCartCount');

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Update both cart count badges
    if (cartCount) {
        cartCount.textContent = totalItems;
    }
    if (navCartCount) {
        navCartCount.textContent = totalItems;
        // Hide badge if cart is empty
        if (totalItems === 0) {
            navCartCount.style.display = 'none';
        } else {
            navCartCount.style.display = 'flex';
        }
    }

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-basket"></i>
                <p data-translate="cartEmpty">${currentLanguage === 'fr' ? 'Votre panier est vide' : 'Your cart is empty'}</p>
                <span data-translate="cartEmptySub">${currentLanguage === 'fr' ? 'Ajoutez des articles pour commencer' : 'Add items to get started'}</span>
            </div>
        `;
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-image"><img style="height: -webkit-fill-available; width: -webkit-fill-available;" src="${item.image}"/></div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${formatPrice(item.price)}</div>
                    <div class="cart-item-quantity">${currentLanguage === 'fr' ? 'Quantité' : 'Quantity'}: ${item.quantity}</div>
                    <button class="add-more-btn" onclick="addToCart(${item.id})">
                        <i class="fas fa-plus"></i> ${currentLanguage === 'fr' ? 'Ajouter' : 'Add'}
                    </button>
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
        showToast(currentLanguage === 'fr' ? 'Article retiré du panier' : 'Item removed from cart', 'warning');
    } else {
        showToast(currentLanguage === 'fr' ? 'Quantité mise à jour' : 'Quantity updated', 'info');
    }

    updateCartUI();
    saveCart();  // Save to localStorage
}

function removeFromCart(itemId) {
    cart = cart.filter(i => i.id !== itemId);
    updateCartUI();
    saveCart();  // Save to localStorage
    showToast(currentLanguage === 'fr' ? 'Article retiré du panier' : 'Item removed from cart', 'warning');
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
// Meal Selection Modal (Siders Selection)
// ========================================
function openMealSelectionModal(meal) {
    console.log('Opening meal selection modal for:', meal.name);
    currentMealSelection = meal;
    currentStep = 1;
    siderQuantities = { fries: 0, alloco: 0, attieke: 0 };
    selectedPickupTime = null;

    // Update selected meal info
    const mealInfoEl = document.getElementById('selectedMealInfo');
    if (mealInfoEl) {
        mealInfoEl.textContent = `${meal.name} - ${formatPrice(meal.price)}`;
    }

    // Reset sider quantities display
    updateSiderDisplay();

    // Show modal
    const modal = document.getElementById('mealSelectionModal');
    console.log('Modal element:', modal);
    if (modal) {
        modal.classList.add('active');
        console.log('Modal classes:', modal.classList);
    }

    // Show step 1
    showStep(1);
}

function closeMealSelectionModal() {
    document.getElementById('mealSelectionModal').classList.remove('active');
    currentMealSelection = null;
    currentStep = 1;
    siderQuantities = { fries: 0, alloco: 0, attieke: 0 };
}

function updateSiderQuantity(siderType, change) {
    if (siderQuantities[siderType] === undefined) return;

    const newValue = siderQuantities[siderType] + change;
    if (newValue < 0) return;

    siderQuantities[siderType] = newValue;
    updateSiderDisplay();
}

function updateSiderDisplay() {
    document.getElementById('friesQty').textContent = siderQuantities.fries;
    document.getElementById('allocoQty').textContent = siderQuantities.alloco;
    document.getElementById('attiekeQty').textContent = siderQuantities.attieke;

    // Disable minus buttons if quantity is 0
    document.querySelector('.qty-btn-minus[onclick*="fries"]').disabled = siderQuantities.fries === 0;
    document.querySelector('.qty-btn-minus[onclick*="alloco"]').disabled = siderQuantities.alloco === 0;
    document.querySelector('.qty-btn-minus[onclick*="attieke"]').disabled = siderQuantities.attieke === 0;
}

function nextStep() {
    if (currentStep === 1) {
        // Validate at least one sider is selected
        const totalSiders = siderQuantities.fries + siderQuantities.alloco + siderQuantities.attieke;
        if (totalSiders === 0) {
            showToast(currentLanguage === 'fr' ? 'Veuillez sélectionner au moins un accompagnement' : 'Please select at least one side', 'warning');
            return;
        }

        // Show verification step
        showVerificationStep();
        showStep(2);
    } else if (currentStep === 2) {
        // Show pickup time step
        showPickupTimeStep();
        showStep(3);
    }
}

function previousStep() {
    if (currentStep === 2) {
        showStep(1);
    } else if (currentStep === 3) {
        showStep(2);
    }
}

function showStep(step) {
    currentStep = step;

    // Update step visibility
    document.querySelectorAll('.modal-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');

    // Update progress indicator
    document.querySelectorAll('.progress-step').forEach((s, index) => {
        const stepNum = index + 1;
        s.classList.remove('active', 'completed');
        if (stepNum === step) {
            s.classList.add('active');
        } else if (stepNum < step) {
            s.classList.add('completed');
        }
    });

    // Update buttons
    document.getElementById('backBtn').style.display = step === 1 ? 'none' : 'flex';
    document.getElementById('nextBtn').style.display = step === 3 ? 'none' : 'flex';
    document.getElementById('confirmBtn').style.display = step === 3 ? 'flex' : 'none';
}

function showVerificationStep() {
    const meal = currentMealSelection;

    // Update meal info
    document.getElementById('verifyMealName').textContent = meal.name;
    document.getElementById('verifyMealPrice').textContent = formatPrice(meal.price);
    document.getElementById('verifyMealQty').textContent = `x1`;

    // Set meal image
    const imageContainer = document.getElementById('verifyMealImage');
    if (meal.image && meal.image.startsWith('<')) {
        imageContainer.innerHTML = meal.image;
    } else {
        imageContainer.innerHTML = `<img src="${meal.image}" alt="${meal.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>🍽️</text></svg>'">`;
    }

    // Update siders list
    const sidersContainer = document.getElementById('verificationSiders');
    const siderNamesFr = {
        fries: 'Frites',
        alloco: 'Alloco',
        attieke: 'Attiéké'
    };
    const siderNamesEn = {
        fries: 'Fries',
        alloco: 'Alloco',
        attieke: 'Attiéké'
    };
    const siderIcons = {
        fries: '🍟',
        alloco: '🍌',
        attieke: '🍚'
    };
    const siderNames = currentLanguage === 'fr' ? siderNamesFr : siderNamesEn;

    let sidersHtml = '';
    for (const [key, qty] of Object.entries(siderQuantities)) {
        if (qty > 0) {
            sidersHtml += `
                <div class="verification-sider-item">
                    <div class="sider-info">
                        <span class="sider-icon">${siderIcons[key]}</span>
                        <span class="sider-name">${siderNames[key]}</span>
                    </div>
                    <span class="sider-qty-label">x${qty} ${currentLanguage === 'fr' ? 'portion' : 'portion'}${qty > 1 ? 's' : ''}</span>
                </div>
            `;
        }
    }
    sidersContainer.innerHTML = sidersHtml;

    // Update total
    document.getElementById('verifyTotal').textContent = formatPrice(meal.price);
}

function showPickupTimeStep() {
    const prepTime = currentMealSelection.prepTime || 15;
    document.getElementById('prepTimeDisplay').textContent = prepTime;

    // Calculate earliest pickup time
    const earliestTime = new Date();
    earliestTime.setMinutes(earliestTime.getMinutes() + prepTime + 5);
    const locale = currentLanguage === 'fr' ? 'fr-FR' : 'en-US';
    const earliestTimeStr = earliestTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    document.getElementById('earliestTime').textContent = currentLanguage === 'fr' ? `Prêt vers ${earliestTimeStr}` : `Ready around ${earliestTimeStr}`;

    // Populate custom time options
    populatePickupTimeOptions(prepTime);

    // Reset to ASAP
    document.querySelector('input[name="pickupTime"][value="asap"]').checked = true;
    document.getElementById('customTimeInput').style.display = 'none';
    selectedPickupTime = 'asap';
}

function populatePickupTimeOptions(prepTimeMinutes) {
    const select = document.getElementById('pickupTimeSelect');
    const now = new Date();
    const minPickupMinutes = prepTimeMinutes + 5;

    select.innerHTML = '';

    // Create time options every 15 minutes for the next 3 hours
    for (let i = minPickupMinutes; i <= minPickupMinutes + 180; i += 15) {
        const time = new Date(now.getTime() + i * 60000);
        const locale = currentLanguage === 'fr' ? 'fr-FR' : 'en-US';
        const timeStr = time.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        const label = i < 60 ? (currentLanguage === 'fr' ? `Dans ${i} min (${timeStr})` : `In ${i} min (${timeStr})`) : (currentLanguage === 'fr' ? `À ${timeStr}` : `At ${timeStr}`);

        const option = document.createElement('option');
        option.value = i;
        option.textContent = label;
        select.appendChild(option);
    }
}

function updateCustomTime() {
    document.getElementById('customTimeInput').style.display = 'none';
    selectedPickupTime = 'asap';
}

function enableCustomTime() {
    document.getElementById('customTimeInput').style.display = 'block';
    // Select first option by default
    const select = document.getElementById('pickupTimeSelect');
    if (select.options.length > 0) {
        selectedPickupTime = parseInt(select.value);
    }
}

function updatePickupTime() {
    const select = document.getElementById('pickupTimeSelect');
    selectedPickupTime = parseInt(select.value);
}

function confirmMealOrder() {
            alert('clicked');
        console.log('confirmMealOrder called');
        // Loader/modal debug logs
        console.log('Attempting to show loader/modal...');
        console.log('successModal:', successModal);
        console.log('orderLoading:', orderLoading);
        console.log('orderReceipt:', orderReceipt);
        // After showing modal/loader
        setTimeout(() => {
            console.log('Loader should now be hidden, receipt shown.');
        }, 1200);
    if (!currentMealSelection) return;

    // Calculate pickup time
    const prepTime = currentMealSelection.prepTime || 15;
    let pickupTime;

    if (selectedPickupTime === 'asap') {
        pickupTime = new Date();
        pickupTime.setMinutes(pickupTime.getMinutes() + prepTime + 5);
    } else {
        pickupTime = new Date();
        pickupTime.setMinutes(pickupTime.getMinutes() + selectedPickupTime);
    }

    // Add meal to cart with siders
    const mealWithSiders = {
        id: currentMealSelection.id,
        name: currentMealSelection.name,
        price: currentMealSelection.price,
        quantity: 1,
        image: currentMealSelection.image,
        category: currentMealSelection.category,
        prepTime: prepTime,
        optionIds: [],
        siders: { ...siderQuantities }
    };

    cart.push(mealWithSiders);
    updateCartUI();
    saveCart();

    // Close modal
    closeMealSelectionModal();

    // Show loader and success modal instantly
    const successModal = document.getElementById('successModal');
    const orderLoading = document.getElementById('orderLoading');
    const orderReceipt = document.getElementById('orderReceipt');

    if (successModal) {
        successModal.style.transition = 'none';
        successModal.style.display = 'flex';
        successModal.offsetHeight; // Force reflow
        successModal.style.opacity = '1';
        successModal.style.visibility = 'visible';
        successModal.classList.add('active');
    }
    if (orderLoading) {
        orderLoading.style.display = 'block';
    }
    if (orderReceipt) {
        orderReceipt.style.display = 'none';
    }

    // Show success after a short delay (simulate processing)
    setTimeout(() => {
        if (orderLoading) orderLoading.style.display = 'none';
        if (orderReceipt) orderReceipt.style.display = 'block';
        // Optionally set order number, etc.
    }, 1200);

    // Show success toast
    showToast(currentLanguage === 'fr' ? 'Commande ajoutée au panier' : 'Order added to cart', 'success');
}

// ========================================
// Checkout
// ========================================
function proceedToCheckout() {
    console.log('proceedToCheckout called, cart length:', cart.length);

    if (cart.length === 0) {
        showToast(currentLanguage === 'fr' ? 'Votre panier est vide' : 'Your cart is empty', 'error');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Calculate total prep time (max of all items)
    const totalPrepTime = Math.max(...cart.map(item => item.prepTime || 15));

    const orderSummary = document.getElementById('orderSummary');
    console.log('orderSummary element:', orderSummary);

    if (!orderSummary) {
        console.error('orderSummary element not found!');
        showToast('Error: Order summary not found', 'error');
        return;
    }

    orderSummary.innerHTML = `
        <h4 style="margin-bottom: 1rem;">${currentLanguage === 'fr' ? 'Récapitulatif de la commande' : 'Order Summary'}</h4>
        <div class="order-items-detail" style="margin-bottom: 1rem; max-height: 200px; overflow-y: auto;">
            ${cart.map(item => `
                <div class="order-item-detail" style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                    <span>${item.quantity}x ${item.name}</span>
                    <strong>${formatPrice(item.price * item.quantity)}</strong>
                </div>
            `).join('')}
        </div>
        <div class="order-prep-time" style="margin-bottom: 1rem; color:white; padding: 0.5rem; background: #581b1f; border-radius: 4px; font-size: 0.9rem;">
            <i class="fas fa-clock"></i> ${currentLanguage === 'fr' ? 'Temps de préparation estimé' : 'Estimated prep time'}: <strong>${totalPrepTime} ${currentLanguage === 'fr' ? 'minutes' : 'minutes'}</strong>
        </div>
        <div class="order-item" style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #ddd;">
            <strong>${currentLanguage === 'fr' ? 'Total à payer' : 'Total to pay'}</strong>
            <strong style="color: var(--primary);">${formatPrice(total)}</strong>
        </div>
    `;

    // Update pickup time options based on prep time
    updatePickupTimeOptions(totalPrepTime);

    const orderModal = document.getElementById('orderModal');
    console.log('orderModal element:', orderModal);

    if (orderModal) {
        orderModal.style.display = 'flex';
        // Force reflow
        orderModal.offsetHeight;
        orderModal.classList.add('active');
        console.log('orderModal active class added');
    }

    // Close cart sidebar
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    if (cartSidebar && cartSidebar.classList.contains('active')) {
        cartSidebar.classList.remove('active');
    }
    if (cartOverlay && cartOverlay.classList.contains('active')) {
        cartOverlay.classList.remove('active');
    }
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
    const orderModal = document.getElementById('orderModal');
    if (orderModal) {
        orderModal.classList.remove('active');
        orderModal.style.display = 'none';
    }
}

function confirmOrder() {
        // Hide orderModal if visible
        const orderModal = document.getElementById('orderModal');
        if (orderModal) {
            orderModal.style.display = 'none';
            orderModal.classList.remove('active');
        }
    console.log('confirmOrder called');

    // Show the success modal with loader immediately
    const successModal = document.getElementById('successModal');
    const orderLoading = document.getElementById('orderLoading');
    const orderReceipt = document.getElementById('orderReceipt');

    console.log('Elements found:', { successModal, orderLoading, orderReceipt });

    // Show the modal instantly (skip transition)
    if (successModal) {
        successModal.style.transition = 'none';
        successModal.style.display = 'flex';
        successModal.offsetHeight; // Force reflow
        successModal.style.opacity = '1';
        successModal.style.visibility = 'visible';
        successModal.classList.add('active');
        console.log('Modal shown');
    }

    // Show loading spinner, hide receipt
    if (orderLoading) {
        orderLoading.style.display = 'block';
        console.log('Loader shown');
    }
    if (orderReceipt) {
        orderReceipt.style.display = 'none';
    }

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

                    // Show additional success message for guest users
                    setTimeout(() => {
                        showToast(currentLanguage === 'fr' ? 'Commande confirmée !' : 'Order confirmed!', 'success');
                    }, 2000);
                }

                closeOrderModal();
                showSuccess(data.order_id || Math.floor(Math.random() * 10000), pickupTime, totalPrepTime, data.items || [], totalAmount);
                cart = [];
                saveCart();  // Clear cart from localStorage
                updateCartUI();
            } else {
            showToast(currentLanguage === 'fr' ? 'Erreur: ' + (data.error || '��chec de la commande') : 'Error: ' + (data.error || 'Order failed'), 'error');
        }
    })
    .catch(error => {
        console.error('Order error:', error);
        showToast(currentLanguage === 'fr' ? 'Erreur lors de la commande: ' + error.message : 'Order error: ' + error.message, 'error');
    }, 50); // 50ms delay to allow browser to paint loader
    });
}

function showSuccess(orderId, pickupTime, prepTimeMinutes, orderItems, totalAmount) {
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

    // Format pickup time
    const locale = currentLanguage === 'fr' ? 'fr-FR' : 'en-US';
    const pickupTimeStr = pickupTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

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
                        <div class="receipt-item-price">${formatPrice(item.unit_price)}</div>
                    </div>
                </div>
                <span class="receipt-item-total">${formatPrice(item.unit_price * item.quantity)}</span>
            </div>
        `).join('');
    } else if (receiptItemsList) {
        receiptItemsList.innerHTML = '<p style="text-align: center; color: var(--medium-gray); padding: 1rem;">Aucun article</p>';
    }
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

// ========================================
// Utilities
// ========================================
function formatPrice(price) {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
}

function showToast(message, type = 'info') {
    console.log('Toast called:', message, type); // Debug log
    
    const container = document.getElementById('toastContainer');
    if (!container) {
        // Fallback: log to console if toast container doesn't exist
        console.log(`[${type.toUpperCase()}] ${message}`);
        console.error('Toast container not found!');
        return;
    }
    
    console.log('Container found:', container); // Debug log
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    
    console.log('Toast added to container:', toast); // Debug log
    
    // Wait for toast to be visible, then set up removal
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
        closeMealSelectionModal();
        if (document.getElementById('cartSidebar').classList.contains('active')) {
            toggleCart();
        }
    }
});

// Export functions
window.addToCart = addToCart;
// ========================================
// Bottom Navigation Functions
// ========================================
function openSearchPage() {
    // Focus on the search bar in the category sidebar
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.focus();
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        showToast(currentLanguage === 'fr' ? 'Utilisez la barre de recherche en haut' : 'Use the search bar at the top', 'info');
    }
}

// ========================================
// Exports
// ========================================
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.filterCategory = filterCategory;
window.filterSubcategory = filterSubcategory;
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
window.toggleBurgerMenu = toggleBurgerMenu;
window.toggleLanguage = toggleLanguage;
window.toggleTheme = toggleTheme;
window.setTheme = setTheme;
window.changeLanguage = changeLanguage;
window.updateTranslations = updateTranslations;
window.handleGuestAccess = handleGuestAccess;
window.showRegistration = showRegistration;
window.showLogin = showLogin;
window.switchToManual = switchToManual;
window.saveCart = saveCart;
window.restoreCart = restoreCart;
window.checkSession = checkSession;
window.showOrderHistory = showOrderHistory;
window.closeOrderHistoryModal = closeOrderHistoryModal;
window.openSearchPage = openSearchPage;
window.fetchUserOrders = fetchUserOrders;
window.startScanner = function() {
    showToast('Fonctionnalité de scan QR à implémenter', 'info');
};

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
