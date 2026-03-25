/**
 * ZINA Cantine BAD - Ordering System
 * Complete Food Ordering Interface with 60+ Menu Items
 */

// ========================================
// Image proxy helper — avoids ERR_QUIC_PROTOCOL_ERROR with Supabase CDN
// ========================================
function proxyImg(url) {
    if (!url || !url.startsWith('http')) return url;
    return '/api/img-proxy?url=' + encodeURIComponent(url);
}

// ========================================
// Global State
// ========================================
let cart = [];
let currentUser = null;
let currentCategory = 'all';
let currentFilter = 'all';
let currentSubcategory = 'all';
let currentLanguage = 'fr';
let currentTheme = 'light';

// Client-side progressive rendering
const PAGE_SIZE = 50;
let currentPage = 0;
let currentFilteredMenu = [];
let menuObserver = null;

// Server-side pagination
const API_PAGE_SIZE = 100;
let apiOffset = 0;
let apiHasMore = true;
let apiFetching = false;

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
    initializeGreetingBar();
    checkSession(); // Check if user is logged in (moved inside DOMContentLoaded)
    loadLanguagePreference(); // Load language preference
    loadThemePreference(); // Load theme preference
    loadCategoriesFromAPI();

    // Handle category sidebar sticky behavior
    handleStickySidebar();
});

// ========================================
// Sticky header hide/show on scroll
// ========================================
function handleStickySidebar() {
    const header = document.querySelector('.order-header');
    const pageTopBar = document.querySelector('.page-top-bar');
    if (!header || !pageTopBar) return;

    let ticking = false;

    function updateStickyLayout() {
        const scrollY = window.scrollY;
        const headerHeight = header.offsetHeight;

        if (scrollY > headerHeight) {
            header.classList.add('hidden');
            pageTopBar.style.top = '0';
        } else {
            header.classList.remove('hidden');
            pageTopBar.style.top = headerHeight + 'px';
        }

        ticking = false;
    }

    updateStickyLayout();

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateStickyLayout);
            ticking = true;
        }
    }, { passive: true });
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
    // Clear any existing user data first
    localStorage.removeItem('zina_user');
    sessionStorage.removeItem('zina_user');
    
    // Redirect to guest access endpoint which clears session and redirects back
    window.location.href = '/guest-access';
}

async function handleLogin(event) {
    event.preventDefault();

    const employeeId = document.getElementById('employeeId').value;
    const employeeName = document.getElementById('employeeName').value;
    const department = document.getElementById('department').value;

    const submitBtn = event.target ? event.target.querySelector('button[type="submit"]') : null;
    setButtonLoading(submitBtn, currentLanguage === 'fr' ? 'Connexion...' : 'Signing in...');

    try {
        // First, try to authenticate user and get complete data from database
        const response = await fetch('/api/login_user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'full_name': employeeName,
                'phone': employeeId, // Using employeeId as phone for now
            })
        });

        if (response.ok) {
            // If backend authentication succeeds, fetch complete user data
            const profileResponse = await fetch('/api/admin/users');
            const usersData = await profileResponse.json();
            
            // Find the user in the users list
            const userData = usersData.find(user => 
                user.full_name === employeeName || user.employee_id === employeeId
            );

            if (userData) {
                currentUser = {
                    id: userData.user_id,
                    name: userData.full_name,
                    email: userData.email,
                    phone: userData.phone,
                    department: userData.department || department,
                    employee_id: userData.employee_id || employeeId
                };
            } else {
                // Fallback to form data if not found in database
                currentUser = {
                    id: employeeId,
                    name: employeeName,
                    email: '',
                    phone: '',
                    department: department
                };
            }
        } else {
            // Fallback to form data if authentication fails
            currentUser = {
                id: employeeId,
                name: employeeName,
                email: '',
                phone: '',
                department: department
            };
        }
    } catch (error) {
        console.error('Login error:', error);
        // Fallback to form data on network error
        currentUser = {
            id: employeeId,
            name: employeeName,
            email: '',
            phone: '',
            department: department
        };
    } finally {
        resetButton(submitBtn);
    }

    // Save to localStorage for persistence across page reloads
    localStorage.setItem('zina_user', JSON.stringify(currentUser));
    sessionStorage.setItem('zina_user', JSON.stringify(currentUser));  // Keep sessionStorage for compatibility

    // Hide login, show app
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';

    // Initialize user info
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userDept').textContent = currentUser.department;

    showToast(currentLanguage === 'fr' ? 'Connexion réussie ! Bienvenue ' + currentUser.name : 'Login successful! Welcome ' + currentUser.name, 'success');
    initializeGreetingBar();
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
    // Allow guest users to see order history
    if (!currentUser) {
        showToast(currentLanguage === 'fr' ? 'Veuillez vous connecter pour voir vos commandes' : 'Please log in to view your orders', 'warning');
        return;
    }

    // For guest users without an ID yet (haven't placed an order), show empty state
    if (currentUser.isGuest && (!currentUser.id || currentUser.id === 'null' || currentUser.id === 'None')) {
        // Still show the modal, but display message that they need to place an order first
        const orderHistoryModal = document.getElementById('orderHistoryModal');
        if (orderHistoryModal) {
            orderHistoryModal.style.display = 'flex';
            orderHistoryModal.offsetHeight; // Force reflow
            orderHistoryModal.classList.add('active');
        }
        const contentDiv = document.getElementById('orderHistoryContent');
        if (contentDiv) {
            contentDiv.innerHTML = `
                <div class="no-orders">
                    <i class="fas fa-receipt"></i>
                    <h3>${currentLanguage === 'fr' ? 'Aucune commande trouvée' : 'No orders found'}</h3>
                    <p>${currentLanguage === 'fr' ? "Vous n'avez pas encore passé de commande. Passez votre première commande pour voir l'historique ici." : "You haven't placed any orders yet. Place your first order to see history here."}</p>
                </div>
            `;
        }
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
        console.log('fetchUserOrders called, currentUser:', currentUser);
        
        // Show loading indicator
        const contentDiv = document.getElementById('orderHistoryContent');
        if (contentDiv) {
            contentDiv.innerHTML = `<div class="zina-loader zina-loader--inline"><div class="zl-inner"><div class="zl-logo-wrap"><div class="zl-ring"></div><img src="/static/images/logo.PNG" alt="ZINA" class="zl-logo"></div><p class="zl-text">${currentLanguage === 'fr' ? 'Chargement de vos commandes...' : 'Loading your orders...'}</p><div class="zl-dots"><span></span><span></span><span></span></div></div></div>`;
        }

        let url;
        if (currentUser.isGuest) {
            // Guest users use guest orders endpoint with their assigned user_id
            console.log('Guest user, checking ID:', currentUser.id);
            if (!currentUser.id || currentUser.id === 'null' || currentUser.id === 'None') {
                console.log('Guest user has no ID, showing empty state');
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

        console.log('Orders response:', data);

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
        const statusText = getStatusText(order.order_status, currentLanguage);

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
                        <div>
                         ${order.items && order.items.length > 0 ? `
                         ${order.items.map(item => `
                            <span class="order-item-product">${item.quantity} x ${item.product_name}</span>
                         `).join('')}
                        ` : ''}
                        <span class="order-detail-label">${currentLanguage === 'fr' ? 'Montant:' : 'Amount:'}${formatPrice(order.total_amount)}</span>
                        </div>
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

// getStatusText, formatDate, formatTime → see utils.js

// Check if user is already logged in and restore session
function checkSession() {
    // Check if user just logged in
    const justLoggedIn = localStorage.getItem('login_success_flag') === 'true';

    // Try localStorage first (persistent), then sessionStorage (session-based)
    const savedUser = localStorage.getItem('zina_user') || sessionStorage.getItem('zina_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);

        // Update guest user name and department based on current language
        if (currentUser.isGuest) {
            currentUser.name = currentLanguage === 'fr' ? 'Invité' : 'Guest';
            currentUser.department = currentLanguage === 'fr' ? 'Visiteur' : 'Visitor';
            // Update saved user with correct language
            localStorage.setItem('zina_user', JSON.stringify(currentUser));
        }

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

        // Show success toast if user just logged in (not guest)
        if (justLoggedIn && !currentUser.isGuest) {
            showToast(currentLanguage === 'fr' ? 'Connexion réussie ! Bienvenue ' + currentUser.name : 'Login successful! Welcome ' + currentUser.name, 'success');
            localStorage.removeItem('login_success_flag');
        }
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

function initializeGreetingBar() {
    const msgEl = document.getElementById('greetingMessage');
    const timeEl = document.getElementById('greetingTime');
    if (!msgEl || !timeEl) return;

    const hour = new Date().getHours();
    const isFr = currentLanguage !== 'en';
    let greeting;
    if (hour < 12)      greeting = isFr ? 'Bonjour' : 'Good morning';
    else if (hour < 18) greeting = isFr ? 'Bon après-midi' : 'Good afternoon';
    else                greeting = isFr ? 'Bonsoir' : 'Good evening';

    const displayName = currentUser && (currentUser.full_name || currentUser.name);
    const name = displayName ? ', ' + displayName.split(' ')[0] : '';
    const suffix = isFr ? ' ! Que souhaitez-vous commander ?' : '! What would you like to order?';
    msgEl.textContent = greeting + name + suffix;

    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString(isFr ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
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
    // Category name translations (French → English)
    const categoryTranslations = {
        'petit déjeuner': 'Breakfast',
        'petit-déjeuner': 'Breakfast',
        'déjeuner': 'Lunch',
        'dejeuner': 'Lunch',
        'plats complets': 'Full Meals',
        'snacks': 'Snacks',
        'salades': 'Salads',
        'boissons': 'Drinks',
        'desserts': 'Desserts',
        'spécialités': 'Specialties',
        'specialites': 'Specialties',
        'formules': 'Formulas',
        'entrées': 'Starters',
        'entrees': 'Starters',
        'plats': 'Main Courses',
        'soupes': 'Soups',
        'pizzas': 'Pizzas',
        'burgers': 'Burgers',
        'pâtes': 'Pasta',
        'pates': 'Pasta',
        'riz': 'Rice Dishes',
        'poulet': 'Chicken',
        'poisson': 'Fish',
        'viande': 'Meat',
        'volaille': 'Poultry',
        'fruits de mer': 'Seafood',
        'legumes': 'Vegetables',
        'légumes': 'Vegetables',
        'accompagnements': 'Sides',
        'sauces': 'Sauces',
        'condiments': 'Condiments',
        'cafés': 'Coffees',
        'cafes': 'Coffees',
        'thés': 'Teas',
        'thes': 'Teas',
        'jus': 'Juices',
        'eaux': 'Waters',
        'sodas': 'Sodas',
        'bières': 'Beers',
        'bieres': 'Beers',
        'vins': 'Wines',
        'cocktails': 'Cocktails',
        'glaces': 'Ice Cream',
        'gâteaux': 'Cakes',
        'gateaux': 'Cakes',
        'pâtisseries': 'Pastries',
        'patisseries': 'Pastries',
        'tartes': 'Tarts',
        'crêpes': 'Crepes',
        'crepes': 'Crepes',
        'yaourts': 'Yogurts',
        'yaourts': 'Yogurts',
        'fruits': 'Fruits',
        'sandwichs': 'Sandwiches',
        'sandwiches': 'Sandwiches',
        'paninis': 'Paninis',
        'quiches': 'Quiches',
        'croque-monsieur': 'Croque Monsieur',
        'croque madame': 'Croque Madame',
        'salades composées': 'Composite Salads',
        'salades composes': 'Composite Salads'
    };

    const translations = {
        fr: {
            // Header & Navigation
            orderHistory: 'Mes Commandes',
            Cart: 'Mon Panier',
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
            choosePayment: 'Mode de paiement',
            choosePaymentHint: 'Choisissez comment vous souhaitez payer',
            cashCounter: 'Payer à la cantine',
            confirmPayment: 'Confirmer',

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
            choosePayment: 'Payment method',
            choosePaymentHint: 'Choose how you would like to pay',
            cashCounter: 'Pay at the counter',
            confirmPayment: 'Confirm',

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
        if (catNameEl) {
            // Get the French category name from the element's data or text content
            const frenchName = btn.getAttribute('data-category-fr') || catNameEl.textContent.trim().toLowerCase();

            // Translate based on current language
            if (currentLanguage === 'en' && categoryTranslations[frenchName]) {
                catNameEl.textContent = categoryTranslations[frenchName];
            } else if (currentLanguage === 'fr') {
                // Restore French name from data attribute if available
                const originalFrName = btn.getAttribute('data-category-fr');
                if (originalFrName) {
                    catNameEl.textContent = originalFrName;
                }
                // Otherwise, keep current text (already in French)
            }
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

function setTheme(theme, showNotification = true) {
    currentTheme = theme;
    
    // Update HTML data attribute
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update theme icon
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        const tag = themeIcon.tagName.toLowerCase();
        if (tag === 'iconify-icon') {
            themeIcon.setAttribute('icon', theme === 'light'
                ? 'icon-park-twotone:moon'
                : 'icon-park-twotone:sun');
        } else if (tag === 'img') {
            themeIcon.src = theme === 'light'
                ? 'https://img.icons8.com/doodle/24/bright-moon.png'
                : 'https://img.icons8.com/doodle/24/sun.png';
        } else {
            themeIcon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }
    
    // Save theme preference
    localStorage.setItem('zina_theme', theme);
    
    // Show toast notification only if requested
    if (showNotification) {
        const message = theme === 'light' ? 'Mode clair activé' : 'Mode sombre activé';
        showToast(message, 'info');
    }
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem('zina_theme') || 'light';
    setTheme(savedTheme, false);  // Don't show notification on page load
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

// API categories store: { [id]: { name, emoji } }
window.apiCategories = {};

// ── View toggle (grid / list) ─────────────────────────────────────────────────
var menuViewMode = localStorage.getItem('zina_menu_view') || 'grid';

function setMenuView(mode) {
    menuViewMode = mode;
    localStorage.setItem('zina_menu_view', mode);
    var grid = document.getElementById('menuGrid');
    if (grid) {
        grid.classList.toggle('menu-view-list', mode === 'list');
    }
    document.querySelectorAll('.view-toggle-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });
    var activeBtn = document.getElementById(mode === 'list' ? 'viewBtnList' : 'viewBtnGrid');
    if (activeBtn) activeBtn.classList.add('active');
}

function applyStoredMenuView() {
    // Only apply on phones; desktop always uses grid
    if (window.innerWidth > 768) return;
    setMenuView(menuViewMode);
}
// ─────────────────────────────────────────────────────────────────────────────

// Fallback emoji map for categories when the DB has no emoji set
var CATEGORY_EMOJI_MAP = [
    ['petit dejeuner', '🌅'], ['breakfast', '🌅'],
    ['déjeuner', '🍳'], ['dejeuner', '🍳'],
    ['dîner', '🍽️'], ['diner', '🍽️'],
    ['boisson', '🥤'], ['drink', '🥤'], ['jus', '🧃'], ['eau', '💧'],
    ['café', '☕'], ['cafe', '☕'], ['thé', '🍵'], ['the', '🍵'],
    ['dessert', '🍰'], ['gâteau', '🎂'], ['gateau', '🎂'], ['pâtisserie', '🧁'],
    ['snack', '🥪'], ['sandwich', '🥙'], ['burger', '🍔'],
    ['pizza', '🍕'], ['pasta', '🍝'], ['pâtes', '🍝'],
    ['riz', '🍚'], ['salade', '🥗'], ['soupe', '🍲'],
    ['poisson', '🐟'], ['fruits de mer', '🦐'],
    ['viande', '🥩'], ['poulet', '🍗'], ['bœuf', '🥩'], ['boeuf', '🥩'],
    ['formule', '⭐'], ['menu', '📋'],
    ['africain', '🌍'], ['ivoirien', '🌍'], ['local', '🌍'],
    ['végétarien', '🥦'], ['vegetarien', '🥦'], ['vegan', '🌱'],
    ['plat', '🥘'], ['chaud', '🔥'],
    ['froid', '🧊'], ['glace', '🍦'],
    ['fruit', '🍎'], ['légume', '🥕'], ['legume', '🥕'],
];
function getCategoryEmoji(name) {
    var lower = (name || '').toLowerCase();
    for (var i = 0; i < CATEGORY_EMOJI_MAP.length; i++) {
        if (lower.includes(CATEGORY_EMOJI_MAP[i][0])) return CATEGORY_EMOJI_MAP[i][1];
    }
    return '🍽️';
}

// Custom SVG icons — map category keywords → filename under /static/images/food/icons/
var CATEGORY_SVG_BASE = '/static/images/food/icons/';
var CATEGORY_SVG_MAP = [
    ['petit déjeuner', 'petitdejeuner.svg'], ['breakfast', 'petitdejeuner.svg'],
    ['petit-déjeuner', 'petitdejeuner.svg'],  
    ['petit-dejeuner', 'petitdejeuner.svg'],  
    ['Petit déjeuner', 'petitdejeuner.svg'],
    ['Dejeuner', 'déjeuner.svg'], ['déjeuner', 'déjeuner.svg'], ['dejeuner', 'déjeuner.svg'],
    ['boisson', 'boissons.svg'], ['Boisson', 'boissons.svg'], ['drink', 'boissons.svg'],
    ['jus', 'boissons.svg'], ['eau', 'boissons.svg'],
    ['café', 'boissons.svg'], ['cafe', 'boissons.svg'],
    ['thé', 'boissons.svg'], ['the', 'boissons.svg'],
    ['dessert', 'desserts.svg'], ['Dessert', 'desserts.svg'], ['gâteau', 'desserts.svg'],
    ['gateau', 'desserts.svg'], ['pâtisserie', 'desserts.svg'],
    ['snack', 'snacks.svg'], ['Snacks et repas leger', 'snacks.svg'], ['sandwich', 'snacks.svg'], ['burger', 'snacks.svg'],
];

function getCategoryIconHTML(name) {
    var lower = (name || '').toLowerCase();
    for (var i = 0; i < CATEGORY_SVG_MAP.length; i++) {
        if (lower.includes(CATEGORY_SVG_MAP[i][0])) {
            return '<img class="cat-svg-icon" src="' + CATEGORY_SVG_BASE + CATEGORY_SVG_MAP[i][1] + '" alt="" aria-hidden="true">';
        }
    }
    return getCategoryEmoji(name); // fallback to emoji for unmapped categories
}

function loadCategoriesFromAPI() {
    fetch('/api/categories')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            const nav = document.getElementById('categoryNav');
            if (!nav) return;

            // Build category map
            window.apiCategories = {};
            data.forEach(function(cat) {
                var emoji = cat.emoji || getCategoryEmoji(cat.name);
                window.apiCategories[String(cat.id)] = { name: cat.name, emoji: emoji };
            });

            // Remove any previously injected dynamic buttons
            nav.querySelectorAll('.cat-btn-dynamic').forEach(function(el) { el.remove(); });

            // Append one button per category from the API
            data.forEach(function(cat, idx) {
                const btn = document.createElement('button');
                btn.className = 'cat-btn cat-btn-dynamic';
                btn.setAttribute('data-category', String(cat.id));
                btn.setAttribute('data-category-fr', cat.name); // Store original French name for translation
                btn.style.animationDelay = (idx * 40) + 'ms';
                btn.onclick = function() { filterCategory(String(cat.id)); };
                var iconHTML = getCategoryIconHTML(cat.name);
                btn.innerHTML =
                    '<span class="cat-emoji">' + iconHTML + '</span>' +
                    '<span class="cat-name">' + cat.name + '</span>';
                nav.appendChild(btn);
            });

            // Parse twemoji only for fallback emoji (buttons without a custom SVG)
            if (window.twemoji) twemoji.parse(nav, { folder: 'svg', ext: '.svg' });

            // Now load the menu
            applyStoredMenuView();
            loadMenuFromAPI();
        })
        .catch(function(err) {
            console.error('Error loading categories:', err);
            applyStoredMenuView();
            // Fallback: load menu directly
            loadMenuFromAPI();
        });
}

function loadMenuFromAPI() {
    // Reset everything
    menuItems  = [];
    apiOffset  = 0;
    apiHasMore = true;
    apiFetching = false;

    const menuGrid = document.getElementById('menuGrid');
    if (menuGrid) {
        menuGrid.innerHTML = `
            <div class="zina-loader zina-loader--inline">
                <div class="zl-inner">
                    <div class="zl-logo-wrap">
                        <div class="zl-ring"></div>
                        <img src="/static/images/logo.PNG" alt="ZINA" class="zl-logo">
                    </div>
                    <p class="zl-text">${currentLanguage === 'fr' ? 'Chargement du menu...' : 'Loading menu...'}</p>
                    <div class="zl-dots"><span></span><span></span><span></span></div>
                </div>
            </div>`;
    }
    fetchMenuPage();
}

function fetchMenuPage() {
    if (apiFetching || !apiHasMore) return;
    apiFetching = true;

    // Track whether this is the very first load
    const isFirstLoad = menuItems.length === 0;

    fetch('/api/menu/feed?limit=' + API_PAGE_SIZE + '&offset=' + apiOffset)
        .then(function(r) { return r.json(); })
        .then(function(data) {
            apiFetching = false;
            if (data.error) throw new Error(data.error);

            // Merge new items — skip duplicates
            const existingIds = new Set(menuItems.map(function(i) { return i.id; }));
            const newItems = (data.items || [])
                .filter(function(i) { return !existingIds.has(i.id); })
                .map(function(item) {
                    return {
                        id:               item.id,
                        category_id:      String(item.category_id || ''),
                        sous_category_id: item.sous_category_id ? String(item.sous_category_id) : null,
                        name:             item.name,
                        description:      item.description || '',
                        price:            item.price,
                        category:         item.category || '',
                        image:            item.image || '',
                        available:        item.available !== undefined ? item.available : true,
                        popular:          item.id % 3 === 0,
                        prepTime:         15,
                        options:          item.options || []
                    };
                });

            menuItems  = menuItems.concat(newItems);
            apiOffset += (data.items || []).length;
            apiHasMore = data.has_more;

            updateCategoryCounts(menuItems);

            if (isFirstLoad) {
                // First load — full render (clears grid, resets pagination)
                renderMenu(menuItems);
            } else {
                // Subsequent fetch
                const grid = document.getElementById('menuGrid');
                if (!grid) return;

                if (currentCategory === 'all') {
                    // Grouped view: re-render all sections with the updated item pool
                    renderMenuGrouped(applyFilters(menuItems));
                } else {
                    // Single-category paginated view: append new matching items
                    const newFiltered = applyFilters(newItems);
                    currentFilteredMenu = currentFilteredMenu.concat(newFiltered);

                    const oldSentinel = document.getElementById('menuSentinel');
                    if (oldSentinel) oldSentinel.remove();
                    if (menuObserver) { menuObserver.disconnect(); menuObserver = null; }

                    loadMoreMenuItems(grid);
                }
            }
        })
        .catch(function(err) {
            apiFetching = false;
            console.error('Error fetching menu page:', err);
            const menuGrid = document.getElementById('menuGrid');
            if (menuGrid && menuItems.length === 0) {
                menuGrid.innerHTML = `
                    <div class="menu-error">
                        <i class="fas fa-triangle-exclamation"></i>
                        <p>${currentLanguage === 'fr' ? 'Impossible de charger le menu.' : 'Could not load the menu.'}
                           <button class="btn-retry" onclick="loadMenuFromAPI()">
                               ${currentLanguage === 'fr' ? 'Réessayer' : 'Retry'}
                           </button>
                        </p>
                    </div>`;
            }
        });
}

function convertAPIMenu(apiData) {
    const converted = [];

    for (const [categoryKey, items] of Object.entries(apiData)) {
        items.forEach(function(item) {
            converted.push({
                id: item.id,                           // real product_id from DB
                category_id: String(item.category_id || ''), // numeric FK as string
                name: item.name,
                description: item.description || '',
                price: item.price,
                category: item.category || categoryKey,
                image: item.image || '',
                available: item.is_available !== undefined ? item.is_available : true,
                popular: false,
                prepTime: 15,
                options: item.options || []
            });
        });
    }

    return converted;
}

function buildMenuItemHTML(item) {
    const catInfo = window.apiCategories && item.category_id
        ? window.apiCategories[String(item.category_id)]
        : null;
    const catTag = catInfo ? catInfo.name : '';
    return `
    <div class="menu-item${!item.available ? ' unavailable' : ''}" data-id="${item.id}">
        <div class="menu-item-image">
            <img src="${proxyImg(item.image)}" alt="${item.name}" loading="lazy"
                 onerror="this.src='/static/images/food/salade.jpg'">
            <div class="menu-item-image-overlay"></div>
            ${item.popular ? '<span class="menu-badge badge-popular"><i class="fas fa-fire-flame-curved"></i> Pop</span>' : ''}
            ${catTag ? `<span class="menu-item-tag-float">${catTag}</span>` : ''}
            ${!item.available ? `<div class="menu-unavailable-overlay"><i class="fas fa-hourglass-half"></i><span>${currentLanguage === 'fr' ? 'Indisponible' : 'Unavailable'}</span></div>` : ''}
            <button class="add-to-cart"
                    onclick="addToCart(${item.id})"
                    ${!item.available ? 'disabled' : ''}
                    title="${currentLanguage === 'fr' ? 'Ajouter au panier' : 'Add to cart'}">
                <i class="fas fa-plus"></i>
            </button>
        </div>
        <div class="menu-item-content">
            <h3 class="menu-item-title">${item.name}</h3>
            <p class="menu-item-description">${item.description || ''}</p>
            <div class="menu-item-bottom">
                <span class="menu-item-price">${formatPrice(item.price)}</span>
            </div>
        </div>
    </div>`;
}

function attachMenuObserver(grid) {
    // Disconnect any previous observer
    if (menuObserver) { menuObserver.disconnect(); menuObserver = null; }

    const sentinel = document.getElementById('menuSentinel');
    if (!sentinel) return;

    menuObserver = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting) {
            loadMoreMenuItems(grid);
        }
    }, { rootMargin: '400px' });

    menuObserver.observe(sentinel);
}

function loadMoreMenuItems(grid) {
    const start = currentPage * PAGE_SIZE;
    const slice = currentFilteredMenu.slice(start, start + PAGE_SIZE);

    if (slice.length === 0) {
        // Nothing left in the filtered buffer — fetch the next server page
        if (apiHasMore && !apiFetching) fetchMenuPage();
        return;
    }

    // Remove sentinel before appending
    const oldSentinel = document.getElementById('menuSentinel');
    if (oldSentinel) oldSentinel.remove();

    // Append new cards
    const fragment = document.createDocumentFragment();
    slice.forEach(function(item) {
        const tmp = document.createElement('div');
        tmp.innerHTML = buildMenuItemHTML(item);
        fragment.appendChild(tmp.firstElementChild);
    });
    grid.appendChild(fragment);

    // Apply Twemoji to newly added cards
    if (window.twemoji) twemoji.parse(grid, { folder: 'svg', ext: '.svg' });

    currentPage++;

    const hasMoreFiltered = currentPage * PAGE_SIZE < currentFilteredMenu.length;

    // Keep sentinel visible while there are more items (client or server)
    if (hasMoreFiltered || apiHasMore) {
        const sentinel = document.createElement('div');
        sentinel.id = 'menuSentinel';
        sentinel.className = 'menu-sentinel';
        grid.appendChild(sentinel);
        attachMenuObserver(grid);
    }

    // Pre-fetch the next server page when we're near the end of the local buffer
    if (!hasMoreFiltered && apiHasMore && !apiFetching) {
        fetchMenuPage();
    }
}

// Apply current category / subcategory / filter to an array of items
function applyFilters(items) {
    let result = items;
    if (currentCategory !== 'all') {
        result = result.filter(function(item) {
            return String(item.category_id) === String(currentCategory);
        });
    }
    if (currentSubcategory !== 'all' && currentSubcategory !== 'tous') {
        result = result.filter(function(item) {
            return item.sous_category_id && String(item.sous_category_id) === String(currentSubcategory);
        });
    }
    if (currentFilter === 'available') {
        result = result.filter(function(item) { return item.available; });
    } else if (currentFilter === 'popular') {
        result = result.filter(function(item) { return item.popular; });
    } else if (currentFilter === 'new') {
        var ids = items.map(function(i) { return i.id; });
        var cutoff = ids.length > 0 ? Math.floor((Math.max.apply(null, ids) + Math.min.apply(null, ids)) / 2) : 0;
        result = result.filter(function(item) { return item.id >= cutoff; });
    }
    return result;
}

function renderMenu(menu) {
    const grid = document.getElementById('menuGrid');
    updateCategoryCounts(menu);

    // Disconnect any existing observer
    if (menuObserver) { menuObserver.disconnect(); menuObserver = null; }

    // Formula view
    if (currentCategory === 'formulas') {
        grid.classList.remove('menu-grid-grouped');
        renderFormulas();
        return;
    }

    // No-filter view → horizontal grouped sections per category
    if (currentCategory === 'all') {
        grid.classList.add('menu-grid-grouped');
        renderMenuGrouped(applyFilters(menu));
        return;
    }

    // Single-category view → normal paginated grid
    grid.classList.remove('menu-grid-grouped');

    const filteredMenu = applyFilters(menu);

    if (filteredMenu.length === 0) {
        if (apiHasMore && !apiFetching) { fetchMenuPage(); return; }
        grid.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon"><i class="fas fa-utensils"></i></div>
                <h3>${currentLanguage === 'fr' ? 'Aucun plat trouvé' : 'No items found'}</h3>
                <p>${currentLanguage === 'fr' ? 'Essayez une autre catégorie ou filtre' : 'Try another category or filter'}</p>
            </div>
        `;
        return;
    }

    currentFilteredMenu = filteredMenu;
    currentPage = 0;
    grid.innerHTML = '';

    // Drain the full local buffer without waiting for the IntersectionObserver
    loadMoreMenuItems(grid);
    while (currentPage * PAGE_SIZE < currentFilteredMenu.length && document.getElementById('menuSentinel')) {
        loadMoreMenuItems(grid);
    }

    const titleEl = document.getElementById('menuTitle');
    if (titleEl) {
        const catInfo = window.apiCategories ? window.apiCategories[String(currentCategory)] : null;
        titleEl.textContent = catInfo
            ? (catInfo.emoji + ' ' + catInfo.name)
            : (currentLanguage === 'fr' ? 'Tous les plats' : 'All dishes');
    }
}

/**
 * Render one horizontal-scrolling section per category (the default "all" view).
 * Shows up to 10 items per category.
 */
function renderMenuGrouped(items) {
    var grid = document.getElementById('menuGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // Group items by category_id, preserving insertion order
    var groups = {};
    var groupOrder = [];
    items.forEach(function(item) {
        if (!item.available) return;
        var cid = String(item.category_id || 'other');
        if (!groups[cid]) { groups[cid] = []; groupOrder.push(cid); }
        groups[cid].push(item);
    });

    if (groupOrder.length === 0) {
        if (apiHasMore && !apiFetching) { fetchMenuPage(); return; }
        grid.innerHTML = '<div class="no-results"><div class="no-results-icon"><i class="fas fa-utensils"></i></div>' +
            '<h3>' + (currentLanguage === 'fr' ? 'Aucun plat disponible' : 'No items available') + '</h3></div>';
        return;
    }

    groupOrder.forEach(function(cid) {
        var catItems = groups[cid].slice(0, 10);
        var catInfo  = window.apiCategories && window.apiCategories[cid];
        var catName  = catInfo ? catInfo.name  : (currentLanguage === 'fr' ? 'Divers' : 'Other');
        var catEmoji = catInfo ? catInfo.emoji : '';
        var total    = groups[cid].length;

        var section = document.createElement('div');
        section.className = 'menu-category-section';
        section.dataset.categoryId = cid;
        section.innerHTML =
            '<div class="menu-category-header">' +
                '<span class="menu-category-title">' + catName + '</span>' +
                '<button class="menu-category-see-all" onclick="filterCategory(\'' + cid + '\')">' +
                    (currentLanguage === 'fr' ? 'Voir tout' : 'See all') +
                    (total > 10 ? ' (' + total + ')' : '') +
                    ' <i class="fas fa-chevron-right"></i>' +
                '</button>' +
            '</div>' +
            '<div class="menu-category-row">' +
                catItems.map(function(item) { return buildMenuItemHTML(item); }).join('') +
            '</div>';

        grid.appendChild(section);
    });

    if (window.twemoji) twemoji.parse(grid, { folder: 'svg', ext: '.svg' });
}

function updateCategoryCounts() { /* counts removed */ }

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function filterCategory(category) {
    // Toggle: clicking the already-active category deselects it → grouped view
    if (currentCategory === category) {
        currentCategory = 'all';
        currentSubcategory = 'all';
        document.querySelectorAll('.cat-btn').forEach(function(btn) { btn.classList.remove('active'); });
        renderMenu(menuItems);
        updateSubcategories('all');
        return;
    }

    currentCategory = category;
    currentSubcategory = 'all';

    document.querySelectorAll('.cat-btn').forEach(function(btn) {
        btn.classList.remove('active');
        if (btn.dataset.category === category) btn.classList.add('active');
    });

    renderMenu(menuItems);
    updateSubcategories(category);
}

function updateSubcategories(categoryId) {
    const section = document.getElementById('subcategoriesSection');
    const nav = document.getElementById('subcategoriesNav');
    if (!section || !nav) return;

    // Hide for 'all' or 'formulas'
    if (!categoryId || categoryId === 'all' || categoryId === 'formulas') {
        section.style.display = 'none';
        return;
    }

    fetch('/api/sous-categories?category_id=' + encodeURIComponent(categoryId))
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (!data || data.error || data.length === 0) {
                section.style.display = 'none';
                return;
            }

            // Build subcategory buttons
            nav.innerHTML = '';

            // "Tous" button
            const allBtn = document.createElement('button');
            allBtn.className = 'subcategory-btn active';
            allBtn.setAttribute('data-subcategory', 'all');
            allBtn.onclick = function() { filterSubcategory('all'); };
            allBtn.textContent = currentLanguage === 'fr' ? 'Tous' : 'All';
            nav.appendChild(allBtn);

            data.forEach(function(sc) {
                const btn = document.createElement('button');
                btn.className = 'subcategory-btn';
                btn.setAttribute('data-subcategory', String(sc.id));
                btn.onclick = function() { filterSubcategory(String(sc.id)); };
                btn.textContent = sc.name;
                nav.appendChild(btn);
            });

            section.style.display = '';
        })
        .catch(function() {
            section.style.display = 'none';
        });
}

function filterSubcategory(subcategory) {
    currentSubcategory = subcategory;
    document.querySelectorAll('.subcategory-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.subcategory === String(subcategory));
    });
    renderMenu(menuItems);
}

function filterItems(filter) {
    // Toggle off if clicking the same filter
    if (currentFilter === filter) {
        currentFilter = 'all';
    } else {
        currentFilter = filter;
    }

    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.remove('active');
        if (chip.dataset.filter === currentFilter) {
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
        (item.name || '').toLowerCase().includes(query) ||
        (item.description || '').toLowerCase().includes(query)
    );
    
    const grid = document.getElementById('menuGrid');
    if (!grid) return;
    
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>${currentLanguage === 'fr' ? 'Aucun plat trouvé' : 'No items found'}</h3>
                <p>${currentLanguage === 'fr' ? 'Essayez une autre recherche' : 'Try another search'}</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filtered.map(item => buildMenuItemHTML(item)).join('');
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
    const desktopCartCount = document.getElementById('desktopCartCount');

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Update all cart count badges
    if (cartCount) cartCount.textContent = totalItems;

    [navCartCount, desktopCartCount].forEach(function(badge) {
        if (!badge) return;
        badge.textContent = totalItems;
        badge.style.display = totalItems === 0 ? 'none' : 'flex';
        if (totalItems > 0) {
            badge.style.animation = 'none';
            badge.offsetHeight; // reflow to restart
            badge.style.animation = 'badgePop 0.3s ease';
        }
    });


    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-basket-shopping"></i>
                <p>${currentLanguage === 'fr' ? 'Votre panier est vide' : 'Your cart is empty'}</p>
                <span>${currentLanguage === 'fr' ? 'Ajoutez des articles pour commencer' : 'Add items to get started'}</span>
            </div>
        `;
    } else {
        cartItems.innerHTML = cart.map(function(item) {
            if (item.isFormula) {
                var subList = item.items.map(function(sub) {
                    return '<li><i class="fas fa-check"></i> ' + sub.name + '</li>';
                }).join('');
                return '<div class="cart-item cart-item-formula">' +
                    '<div class="cart-formula-icon"><i class="' + item.formulaIcon + '"></i></div>' +
                    '<div class="cart-item-details">' +
                        '<div class="cart-item-title">' + item.formulaName + '</div>' +
                        '<ul class="formula-cart-subitems">' + subList + '</ul>' +
                    '</div>' +
                    '<button class="remove-item" onclick="removeFromCart(\'' + item.id + '\')" title="Retirer">' +
                        '<i class="fas fa-trash-alt"></i>' +
                    '</button>' +
                '</div>';
            }
            // Normal item with qty controls
            return '<div class="cart-item" data-id="' + item.id + '">' +
                '<div class="cart-item-image">' +
                    '<img src="' + proxyImg(item.image) + '" alt="' + item.name + '" onerror="this.parentElement.innerHTML=\'<i class=\\\"fas fa-utensils\\\"></i>\'">' +
                '</div>' +
                '<div class="cart-item-details">' +
                    '<div class="cart-item-title">' + item.name + '</div>' +
                    '<div class="cart-qty-controls">' +
                        '<button class="cart-qty-btn" onclick="updateQuantity(' + item.id + ', -1)" title="Réduire">' +
                            '<i class="fas fa-minus"></i>' +
                        '</button>' +
                        '<span class="cart-qty-val">' + item.quantity + '</span>' +
                        '<button class="cart-qty-btn" onclick="updateQuantity(' + item.id + ', 1)" title="Augmenter">' +
                            '<i class="fas fa-plus"></i>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
                '<div class="cart-item-right">' +
                    '<span class="cart-item-total">' + formatPrice(item.price * item.quantity) + '</span>' +
                    '<button class="remove-item" onclick="removeFromCart(' + item.id + ')" title="Retirer">' +
                        '<i class="fas fa-trash-alt"></i>' +
                    '</button>' +
                '</div>' +
            '</div>';
        }).join('');
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
    // Hide orderModal, show payment method selection
    const orderModal = document.getElementById('orderModal');
    if (orderModal) {
        orderModal.style.display = 'none';
        orderModal.classList.remove('active');
    }
    const pmModal = document.getElementById('paymentMethodModal');
    if (pmModal) {
        pmModal.style.display = 'flex';
        pmModal.offsetHeight;
        pmModal.classList.add('active');
    }
}

function closePaymentMethodModal() {
    const pmModal = document.getElementById('paymentMethodModal');
    if (pmModal) {
        pmModal.classList.remove('active');
        pmModal.style.display = 'none';
    }
}

function proceedWithPayment() {
    const selected = document.querySelector('input[name="paymentMethod"]:checked');
    const paymentMethod = selected ? selected.value : 'cash';

    // Mobile money not yet available — show toast and stay on modal
    if (paymentMethod === 'orange_money' || paymentMethod === 'mtn_momo' || paymentMethod === 'moov_money') {
        showToast(
            currentLanguage === 'fr'
                ? 'Ce mode de paiement n\'est pas disponible pour le moment'
                : 'This payment method is not available at the moment',
            'warning'
        );
        return;
    }

    closePaymentMethodModal();

    console.log('proceedWithPayment called, method:', paymentMethod);

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
        const orderItems = flattenCartForSubmission(cart);

        const orderData = {
            // Only include user_id if it exists (guest users have null ID)
            ...(currentUser.id && { user_id: currentUser.id }),
            items: orderItems,
            payment_method: paymentMethod,
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
                    localStorage.setItem('zina_user', JSON.stringify(currentUser));
                    sessionStorage.setItem('zina_user', JSON.stringify(currentUser));
                }

                // Hide loading modal
                const successModal = document.getElementById('successModal');
                if (successModal) {
                    successModal.style.display = 'none';
                    successModal.classList.remove('active');
                }

                // Clear cart
                cart = [];
                saveCart();
                updateCartUI();

                if (paymentMethod === 'wave') {
                    // Show Wave modal in "unavailable" mode — user pays at counter
                    showWaveUnavailableModal(data.order_id, totalAmount, pickupTime, totalPrepTime, data.items || []);
                } else {
                    // Show receipt directly for cash
                    showSuccess(data.order_id, pickupTime, totalPrepTime, data.items || [], totalAmount);
                }

            } else {
                const successModal = document.getElementById('successModal');
                if (successModal) { successModal.style.display = 'none'; successModal.classList.remove('active'); }
                showToast(currentLanguage === 'fr' ? 'Erreur: ' + (data.error || 'Échec de la commande') : 'Error: ' + (data.error || 'Order failed'), 'error');
            }
        })
        .catch(error => {
            console.error('Order error:', error);
            const successModal = document.getElementById('successModal');
            if (successModal) { successModal.style.display = 'none'; successModal.classList.remove('active'); }
            showToast(currentLanguage === 'fr' ? 'Erreur lors de la commande: ' + error.message : 'Order error: ' + error.message, 'error');
        });
    }, 50);
}

// ── Wave Payment ──────────────────────────────────────────────────────────────

let _wavePollingInterval = null;
let _wavePendingReceipt = null; // { orderId, pickupTime, prepTime, items, total }

function showWaveUnavailableModal(orderId, totalAmount, pickupTime, prepTimeMinutes, orderItems) {
    _wavePendingReceipt = { orderId, pickupTime, prepTimeMinutes, orderItems, totalAmount };

    // Update amount / order id displays
    document.getElementById('waveAmountDisplay').textContent = formatPrice(totalAmount);
    document.getElementById('waveOrderIdDisplay').textContent = orderId;

    // Show unavailable section, hide everything else
    document.getElementById('waveQrLoading').style.display = 'none';
    document.getElementById('waveQrWrapper').style.display = 'none';
    document.getElementById('waveQrError').style.display = 'none';
    document.getElementById('waveUnavailable').style.display = 'flex';
    document.getElementById('waveStatusBar').style.display = 'none';
    document.getElementById('waveModalFooter').style.display = 'none';

    const modal = document.getElementById('wavePaymentModal');
    modal.style.display = 'flex';
    modal.offsetHeight;
    modal.classList.add('active');
}

function showWavePaymentModal(orderId, totalAmount, pickupTime, prepTimeMinutes, orderItems) {
    _wavePendingReceipt = { orderId, pickupTime, prepTimeMinutes, orderItems, totalAmount };

    // Update display values
    document.getElementById('waveAmountDisplay').textContent = formatPrice(totalAmount);
    document.getElementById('waveOrderIdDisplay').textContent = orderId;

    // Reset QR section
    document.getElementById('waveQrLoading').style.display = 'flex';
    document.getElementById('waveQrWrapper').style.display = 'none';
    document.getElementById('waveQrError').style.display = 'none';
    document.getElementById('waveUnavailable').style.display = 'none';
    document.getElementById('waveScanHint').style.display = 'none';
    document.getElementById('waveStatusBar').style.display = '';
    document.getElementById('waveModalFooter').style.display = '';
    document.getElementById('waveStatusWaiting').style.display = 'flex';
    document.getElementById('waveStatusConfirmed').style.display = 'none';
    document.getElementById('waveBtnSkip').style.display = 'flex';
    document.getElementById('waveQrCode').innerHTML = '';

    const modal = document.getElementById('wavePaymentModal');
    modal.style.display = 'flex';
    modal.offsetHeight;
    modal.classList.add('active');

    // Call backend to create Wave checkout session
    fetch('/api/payment/wave/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, amount: totalAmount })
    })
    .then(r => r.json())
    .then(res => {
        document.getElementById('waveQrLoading').style.display = 'none';
        if (res.status === 'success' && res.wave_launch_url) {
            // Generate QR code
            document.getElementById('waveQrWrapper').style.display = 'flex';
            new QRCode(document.getElementById('waveQrCode'), {
                text: res.wave_launch_url,
                width: 210,
                height: 210,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
            document.getElementById('waveScanHint').style.display = 'flex';

            // Show "Open Wave" link for mobile users
            const mobileLink = document.getElementById('waveMobileLink');
            mobileLink.href = res.wave_launch_url;
            mobileLink.style.display = 'flex';

            // Start polling for payment confirmation
            _startWavePolling(orderId);
        } else {
            document.getElementById('waveQrError').style.display = 'flex';
            document.getElementById('waveQrErrorMsg').textContent =
                res.message || (currentLanguage === 'fr' ? 'Impossible de générer le QR code.' : 'Could not generate QR code.');
        }
    })
    .catch(() => {
        document.getElementById('waveQrLoading').style.display = 'none';
        document.getElementById('waveQrError').style.display = 'flex';
    });
}

function _startWavePolling(orderId) {
    if (_wavePollingInterval) clearInterval(_wavePollingInterval);
    _wavePollingInterval = setInterval(() => {
        fetch(`/api/payment/wave/status/${orderId}`)
            .then(r => r.json())
            .then(res => {
                if (res.paid) {
                    clearInterval(_wavePollingInterval);
                    _wavePollingInterval = null;
                    _onWavePaymentConfirmed();
                }
            })
            .catch(() => {});
    }, 3000); // poll every 3s

    // Stop polling after 10 minutes
    setTimeout(() => {
        if (_wavePollingInterval) {
            clearInterval(_wavePollingInterval);
            _wavePollingInterval = null;
        }
    }, 600000);
}

function _onWavePaymentConfirmed() {
    document.getElementById('waveStatusWaiting').style.display = 'none';
    document.getElementById('waveStatusConfirmed').style.display = 'flex';
    document.getElementById('waveBtnSkip').style.display = 'none';
    showToast(currentLanguage === 'fr' ? 'Paiement Wave confirmé !' : 'Wave payment confirmed!', 'success');
    setTimeout(() => {
        closeWavePaymentModal();
        if (_wavePendingReceipt) {
            const r = _wavePendingReceipt;
            showSuccess(r.orderId, r.pickupTime, r.prepTimeMinutes, r.orderItems, r.totalAmount);
        }
    }, 1800);
}

function closeWavePaymentModal() {
    if (_wavePollingInterval) {
        clearInterval(_wavePollingInterval);
        _wavePollingInterval = null;
    }
    const modal = document.getElementById('wavePaymentModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    // Reset states for next use
    const unavail = document.getElementById('waveUnavailable');
    if (unavail) unavail.style.display = 'none';
    const hint = document.getElementById('waveScanHint');
    if (hint) hint.style.display = 'none';
    const footer = document.getElementById('waveModalFooter');
    if (footer) footer.style.display = '';
    const statusBar = document.getElementById('waveStatusBar');
    if (statusBar) statusBar.style.display = '';
}

function skipWavePayment() {
    closeWavePaymentModal();
    if (_wavePendingReceipt) {
        const r = _wavePendingReceipt;
        showSuccess(r.orderId, r.pickupTime, r.prepTimeMinutes, r.orderItems, r.totalAmount);
    }
}

function showSuccess(orderId, pickupTime, prepTimeMinutes, orderItems, totalAmount) {
    console.log('showSuccess called with orderId:', orderId);

    // Ensure the success modal is visible
    const successModal = document.getElementById('successModal');
    if (successModal) {
        successModal.style.transition = 'none';
        successModal.style.display = 'flex';
        successModal.offsetHeight;
        successModal.style.opacity = '1';
        successModal.style.visibility = 'visible';
        successModal.classList.add('active');
    }

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
// formatPrice, showToast → see utils.js

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

// ========================================
// Formula Feature
// ========================================

/**
 * Maps a DB category_name (lowercased) to a course type.
 * Used to filter which menu items appear at each formula step.
 */
const COURSE_TYPE_MAP = {
    'entrées':        'entree',
    'entrée':         'entree',
    'entrees':        'entree',
    'entree':         'entree',
    'salades':        'entree',
    'salade':         'entree',
    'snacks':         'entree',
    'petit déjeuner': 'entree',
    'petit-déjeuner': 'entree',
    'soupes':         'entree',
    'soupe':          'entree',
    'déjeuner':       'plat',
    'dejeuner':       'plat',
    'plats complets': 'plat',
    'plats':          'plat',
    'spécialités':    'plat',
    'specialites':    'plat',
    'dîner':          'plat',
    'diner':          'plat',
    'desserts':       'dessert',
    'dessert':        'dessert',
    'boissons':       'boisson',
};

function getCourseType(categoryName) {
    if (!categoryName) return null;
    return COURSE_TYPE_MAP[categoryName.toLowerCase().trim()] || null;
}

const FORMULAS = [
    {
        id: 'f1',
        name: 'Entrée + Plat',
        description: 'Une entrée et un plat de votre choix',
        icon: 'fas fa-utensils',
        steps: ['entree', 'plat'],
        labels: { entree: 'Votre Entrée', plat: 'Votre Plat' }
    },
    {
        id: 'f2',
        name: 'Entrée + Plat + Dessert',
        description: 'La formule complète sans boisson',
        icon: 'fas fa-star',
        badge: 'Populaire',
        steps: ['entree', 'plat', 'dessert'],
        labels: { entree: 'Votre Entrée', plat: 'Votre Plat', dessert: 'Votre Dessert' }
    },
    {
        id: 'f3',
        name: 'Plat + Dessert',
        description: 'Un plat et une douceur en fin de repas',
        icon: 'fas fa-ice-cream',
        steps: ['plat', 'dessert'],
        labels: { plat: 'Votre Plat', dessert: 'Votre Dessert' }
    },
    {
        id: 'f4',
        name: 'Formule Complète',
        description: 'Entrée, plat, dessert et boisson — le repas idéal',
        icon: 'fas fa-crown',
        badge: 'Complet',
        steps: ['entree', 'plat', 'dessert', 'boisson'],
        labels: { entree: 'Votre Entrée', plat: 'Votre Plat', dessert: 'Votre Dessert', boisson: 'Votre Boisson' }
    }
];

// Formula builder state
var currentFormula = null;
var currentFormulaStep = 0;
var formulaSelections = {};

var COURSE_STEP_LABELS = {
    entree:  'Entrée',
    plat:    'Plat',
    dessert: 'Dessert',
    boisson: 'Boisson'
};

/**
 * Render the formula cards grid in the menu area.
 */
function renderFormulas() {
    var grid = document.getElementById('menuGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="formula-cards-grid">' +
        FORMULAS.map(function(f) {
            var stepBadges = f.steps.map(function(s) {
                return '<span class="formula-step-badge">' + (COURSE_STEP_LABELS[s] || s) + '</span>';
            }).join('');

            return '<div class="formula-card">' +
                '<div class="formula-card-header">' +
                    '<div class="formula-card-icon"><i class="' + f.icon + '"></i></div>' +
                    (f.badge ? '<span class="formula-card-badge">' + f.badge + '</span>' : '') +
                '</div>' +
                '<div class="formula-card-body">' +
                    '<h3 class="formula-card-name">' + f.name + '</h3>' +
                    '<p class="formula-card-desc">' + f.description + '</p>' +
                    '<div class="formula-step-badges">' + stepBadges + '</div>' +
                '</div>' +
                '<button class="formula-compose-btn" onclick="openFormulaBuilderModal(\'' + f.id + '\')">' +
                    '<i class="fas fa-plus-circle"></i> Composer' +
                '</button>' +
            '</div>';
        }).join('') +
    '</div>';
}

function openFormulaBuilderModal(formulaId) {
    currentFormula = FORMULAS.find(function(f) { return f.id === formulaId; });
    if (!currentFormula) return;
    currentFormulaStep = 0;
    formulaSelections = {};

    document.getElementById('formulaBuilderTitle').innerHTML =
        '<i class="' + currentFormula.icon + '"></i> ' + currentFormula.name;

    buildFormulaProgress();
    renderFormulaStep(0);
    openModal('formulaBuilderModal');
}

function closeFormulaBuilderModal() {
    currentFormula = null;
    currentFormulaStep = 0;
    formulaSelections = {};
    closeModal('formulaBuilderModal');
}

function buildFormulaProgress() {
    var el = document.getElementById('formulaProgress');
    if (!el || !currentFormula) return;
    el.innerHTML = currentFormula.steps.map(function(step, i) {
        return '<div class="formula-prog-step" id="fprog-' + i + '">' +
            '<div class="formula-prog-dot">' + (i + 1) + '</div>' +
            '<span>' + (COURSE_STEP_LABELS[step] || step) + '</span>' +
        '</div>';
    }).join('<div class="formula-prog-connector"></div>');
    updateFormulaProgress();
}

function updateFormulaProgress() {
    if (!currentFormula) return;
    currentFormula.steps.forEach(function(_, i) {
        var el = document.getElementById('fprog-' + i);
        if (!el) return;
        el.className = 'formula-prog-step' +
            (i < currentFormulaStep ? ' done' : '') +
            (i === currentFormulaStep ? ' active' : '');
    });
}

function renderFormulaStep(stepIndex) {
    if (!currentFormula) return;
    var courseType = currentFormula.steps[stepIndex];
    var label = currentFormula.labels[courseType] || COURSE_STEP_LABELS[courseType] || courseType;

    // Update step label
    var labelEl = document.getElementById('formulaStepLabel');
    if (labelEl) labelEl.textContent = 'Étape ' + (stepIndex + 1) + ' / ' + currentFormula.steps.length + ' — ' + label;

    // Filter menu items for this course type
    var items = (menuItems || []).filter(function(item) {
        return getCourseType(item.category) === courseType && item.available !== false;
    });

    var content = document.getElementById('formulaStepContent');
    if (!content) return;

    if (items.length === 0) {
        content.innerHTML = '<div class="formula-empty-step"><i class="fas fa-exclamation-circle"></i>' +
            '<p>Aucun plat disponible pour cette étape.<br>Veuillez contacter le personnel.</p></div>';
    } else {
        var selected = formulaSelections[courseType];
        content.innerHTML = '<div class="formula-item-grid">' +
            items.map(function(item) {
                var isSelected = selected && String(selected.id) === String(item.id);
                return '<div class="formula-item' + (isSelected ? ' selected' : '') + '" onclick="selectFormulaItem(' + stepIndex + ', ' + item.id + ')">' +
                    '<div class="formula-item-img">' +
                        (item.image ? '<img src="' + proxyImg(item.image) + '" alt="' + item.name + '" loading="lazy" onerror="this.parentElement.innerHTML=\'<i class=\\\"fas fa-utensils\\\"></i>\'">' :
                            '<div class="formula-item-placeholder"><i class="fas fa-utensils"></i></div>') +
                        (isSelected ? '<div class="formula-item-check"><i class="fas fa-check"></i></div>' : '') +
                    '</div>' +
                    '<div class="formula-item-info">' +
                        '<p class="formula-item-name">' + item.name + '</p>' +
                        '<p class="formula-item-price">' + formatPrice(item.price) + '</p>' +
                    '</div>' +
                '</div>';
            }).join('') +
        '</div>';
    }

    updateFormulaSummary();
    updateFormulaFooterButtons();
    updateFormulaProgress();
}

function selectFormulaItem(stepIndex, itemId) {
    if (!currentFormula) return;
    var courseType = currentFormula.steps[stepIndex];
    var item = (menuItems || []).find(function(m) { return String(m.id) === String(itemId); });
    if (!item) return;

    formulaSelections[courseType] = item;

    // Refresh grid to show checkmark
    renderFormulaStep(stepIndex);

    // Auto-advance after short delay if not on last step
    if (stepIndex < currentFormula.steps.length - 1) {
        setTimeout(function() { formulaNextStep(); }, 380);
    }
}

function formulaNextStep() {
    if (!currentFormula) return;
    var courseType = currentFormula.steps[currentFormulaStep];
    if (!formulaSelections[courseType]) {
        showToast('Veuillez sélectionner un article pour continuer', 'warning');
        return;
    }
    currentFormulaStep++;
    if (currentFormulaStep >= currentFormula.steps.length) {
        currentFormulaStep = currentFormula.steps.length - 1;
    }
    renderFormulaStep(currentFormulaStep);
}

function formulaPreviousStep() {
    if (currentFormulaStep > 0) {
        currentFormulaStep--;
        renderFormulaStep(currentFormulaStep);
    }
}

function updateFormulaFooterButtons() {
    var backBtn  = document.getElementById('formulaBackBtn');
    var nextBtn  = document.getElementById('formulaNextBtn');
    var addBtn   = document.getElementById('formulaAddToCartBtn');
    if (!currentFormula) return;

    var isLast = currentFormulaStep === currentFormula.steps.length - 1;
    var allSelected = currentFormula.steps.every(function(s) { return !!formulaSelections[s]; });

    if (backBtn) backBtn.style.display = currentFormulaStep > 0 ? '' : 'none';
    if (nextBtn) nextBtn.style.display = (isLast && allSelected) ? 'none' : '';
    if (addBtn)  addBtn.style.display  = (isLast && allSelected) ? '' : 'none';

    updateFormulaTotal();
}

function updateFormulaTotal() {
    var total = Object.values(formulaSelections).reduce(function(sum, item) {
        return sum + (item ? item.price : 0);
    }, 0);
    var el = document.getElementById('formulaTotalPreview');
    if (el) el.textContent = 'Total : ' + formatPrice(total);
}

function updateFormulaSummary() {
    var el = document.getElementById('formulaSummary');
    if (!el || !currentFormula) return;
    var entries = currentFormula.steps
        .filter(function(s) { return !!formulaSelections[s]; })
        .map(function(s) {
            var item = formulaSelections[s];
            return '<div class="formula-summary-row">' +
                '<span class="formula-summary-course">' + (COURSE_STEP_LABELS[s] || s) + '</span>' +
                '<span class="formula-summary-name">' + item.name + '</span>' +
                '<span class="formula-summary-price">' + formatPrice(item.price) + '</span>' +
            '</div>';
        });
    el.innerHTML = entries.length ? entries.join('') : '';
}

function addFormulaToCart() {
    if (!currentFormula) return;
    var allSelected = currentFormula.steps.every(function(s) { return !!formulaSelections[s]; });
    if (!allSelected) {
        showToast('Veuillez compléter tous les choix de la formule', 'warning');
        return;
    }

    // Calculate total price
    var total = Object.values(formulaSelections).reduce(function(sum, item) {
        return sum + item.price;
    }, 0);

    // Build sub-items list
    var subItems = currentFormula.steps.map(function(s) {
        return formulaSelections[s];
    });

    // Add as grouped formula cart entry
    var formulaCartItem = {
        id: 'formula-' + currentFormula.id + '-' + Date.now(),
        isFormula: true,
        formulaName: currentFormula.name,
        formulaIcon: currentFormula.icon,
        items: subItems,
        name: currentFormula.name,
        price: total,
        quantity: 1,
        image: subItems[0] ? subItems[0].image : '',
        category: 'formula'
    };

    cart.push(formulaCartItem);
    saveCart();
    updateCartUI();

    showToast('Formule "' + currentFormula.name + '" ajoutée au panier !', 'success');
    closeFormulaBuilderModal();
    filterCategory('all'); // Return to full menu view
}

/**
 * Expand formula cart items into individual product_id lines for the API.
 */
function flattenCartForSubmission(cartItems) {
    var result = [];
    cartItems.forEach(function(item) {
        if (item.isFormula) {
            item.items.forEach(function(subItem) {
                result.push({
                    product_id: subItem.id,
                    quantity: 1,
                    option_ids: []
                });
            });
        } else {
            result.push({
                product_id: item.id,
                quantity: item.quantity,
                option_ids: item.optionIds || []
            });
        }
    });
    return result;
}

// Export formula functions
window.renderFormulas            = renderFormulas;
window.openFormulaBuilderModal   = openFormulaBuilderModal;
window.closeFormulaBuilderModal  = closeFormulaBuilderModal;
window.selectFormulaItem         = selectFormulaItem;
window.formulaNextStep           = formulaNextStep;
window.formulaPreviousStep       = formulaPreviousStep;
window.addFormulaToCart          = addFormulaToCart;

// Export functions
window.addToCart = addToCart;
window.showWaveUnavailableModal = showWaveUnavailableModal;
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
// User Profile Functions
// ========================================
async function showProfileModal() {
    if (!currentUser) {
        showToast(currentLanguage === 'fr' ? 'Veuillez vous connecter' : 'Please log in', 'error');
        return;
    }

    // Check if user is a guest - guests don't have profile
    if (currentUser.isGuest) {
        showToast(currentLanguage === 'fr' ? 'Les invités n\'ont pas de profil. Connectez-vous pour accéder à votre profil.' : 'Guests do not have a profile. Please log in to access your profile.', 'info');
        return;
    }

    try {
        // Fetch complete user data from API
        const response = await fetch(`/api/user/profile?user_id=${currentUser.id}`);
        const data = await response.json();

        if (response.ok && data.status === 'success') {
            const user = data.user;
            
            // Display profile information from database
            document.getElementById('profileName').textContent = user.full_name || '-';
            document.getElementById('profileEmail').textContent = user.email || '-';
            document.getElementById('profilePhone').textContent = user.phone || '-';

            // Update currentUser object with complete data
            currentUser.name = user.full_name;
            currentUser.email = user.email;
            currentUser.phone = user.phone;
            currentUser.department = user.department;
            currentUser.employee_id = user.employee_id;

            // Save updated user data to localStorage
            localStorage.setItem('zina_user', JSON.stringify(currentUser));
        } else {
            // Fallback to existing currentUser data if API fails
            document.getElementById('profileName').textContent = currentUser.name || '-';
            document.getElementById('profileEmail').textContent = currentUser.email || '-';
            document.getElementById('profilePhone').textContent = currentUser.phone || '-';
            
            if (data.error) {
                showToast(data.error, 'warning');
            }
        }
    } catch (error) {
        console.error('Error fetching profile data:', error);
        // Fallback to existing currentUser data on network error
        document.getElementById('profileName').textContent = currentUser.name || '-';
        document.getElementById('profileEmail').textContent = currentUser.email || '-';
        document.getElementById('profilePhone').textContent = currentUser.phone || '-';
        showToast(currentLanguage === 'fr' ? 'Erreur lors du chargement du profil' : 'Error loading profile', 'warning');
    }

    // Show modal
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        // Make sure profile view is visible, edit form is hidden
        document.querySelector('.profile-view').style.display = 'block';
        document.getElementById('profileEditForm').style.display = 'none';
    }
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
    // Reset to view mode
    document.querySelector('.profile-view').style.display = 'block';
    document.getElementById('profileEditForm').style.display = 'none';
}

function editProfile() {
    // Populate edit form with current values
    document.getElementById('editName').value = currentUser.name || '';
    document.getElementById('editEmail').value = currentUser.email || '';
    document.getElementById('editPhone').value = currentUser.phone || '';

    // Switch to edit mode
    document.querySelector('.profile-view').style.display = 'none';
    document.getElementById('profileEditForm').style.display = 'block';
}

function cancelEdit() {
    // Switch back to view mode
    document.querySelector('.profile-view').style.display = 'block';
    document.getElementById('profileEditForm').style.display = 'none';
}

function saveProfile(event) {
    event.preventDefault();

    const name = document.getElementById('editName').value;
    const email = document.getElementById('editEmail').value;
    const phone = document.getElementById('editPhone').value;

    // Update currentUser object
    currentUser.name = name;
    currentUser.email = email;
    currentUser.phone = phone;

    // Update localStorage
    localStorage.setItem('zina_user', JSON.stringify(currentUser));
    sessionStorage.setItem('zina_user', JSON.stringify(currentUser));

    // Update header/burger menu if displayed
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = name;
    }

    // Update profile display
    document.getElementById('profileName').textContent = name;
    document.getElementById('profileEmail').textContent = email;
    document.getElementById('profilePhone').textContent = phone;

    // Switch back to view mode
    document.querySelector('.profile-view').style.display = 'block';
    document.getElementById('profileEditForm').style.display = 'none';

    showToast(currentLanguage === 'fr' ? 'Profil mis à jour avec succès' : 'Profile updated successfully', 'success');
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
window.closePaymentMethodModal = closePaymentMethodModal;
window.proceedWithPayment = proceedWithPayment;
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
window.showProfileModal = showProfileModal;
window.closeProfileModal = closeProfileModal;
window.editProfile = editProfile;
window.cancelEdit = cancelEdit;
window.saveProfile = saveProfile;
