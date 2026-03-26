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
var cart = [];
var currentUser = null;
var currentCategory = 'all';
var currentFilter = 'all';
var currentSubcategory = 'all';
var currentLanguage = 'fr';
var currentTheme = 'light';

// Client-side progressive rendering
var PAGE_SIZE = 50;
var currentPage = 0;
var currentFilteredMenu = [];
var menuObserver = null;

// Server-side pagination
var API_PAGE_SIZE = 100;
var apiOffset = 0;
var apiHasMore = true;
var apiFetching = false;

// Meal Selection Modal State
var currentMealSelection = null;
var siderQuantities = {
    fries: 0,
    alloco: 0,
    attieke: 0
};
var currentStep = 1;
var selectedPickupTime = null;

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
            breakfast: 'Petit déjeuner',
            lunch: 'Plats Complets',
            snacks: 'Snacks',
            salads: 'Salades',
            drinks: 'Boissons',
            dessert: 'Dessert',
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
            Boisson: 'Drinks',
            Dessert: 'Desserts',
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

    // Update dynamic category nav buttons
    document.querySelectorAll('.cat-btn-dynamic').forEach(function(btn) {
        var catId = btn.getAttribute('data-category');
        var catInfo = window.apiCategories && window.apiCategories[catId];
        if (!catInfo) return;
        var nameEl = btn.querySelector('.cat-name');
        if (!nameEl) return;
        nameEl.textContent = (currentLanguage === 'en' && catInfo.nameEn) ? catInfo.nameEn : catInfo.name;
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


// addToCart and showWaveUnavailableModal are exported in ordering-cart.js
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

    // Open modal immediately
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    modal.style.display = 'flex';
    modal.classList.add('active');
    const profileView = document.querySelector('.profile-view');
    if (profileView) profileView.style.display = 'block';
    const editForm = document.getElementById('profileEditForm');
    if (editForm) editForm.style.display = 'none';

    // For guests, show placeholder info
    if (currentUser.isGuest) {
        document.getElementById('profileName').textContent = currentLanguage === 'fr' ? 'Invité' : 'Guest';
        document.getElementById('profileEmail').textContent = '-';
        document.getElementById('profilePhone').textContent = '-';
        return;
    }

    // Populate with live data for logged-in users
    try {
        const response = await fetch(`/api/user/profile?user_id=${currentUser.id}`);
        const data = await response.json();

        if (response.ok && data.status === 'success') {
            const user = data.user;
            document.getElementById('profileName').textContent = user.full_name || '-';
            document.getElementById('profileEmail').textContent = user.email || '-';
            document.getElementById('profilePhone').textContent = user.phone || '-';
            currentUser.name = user.full_name;
            currentUser.email = user.email;
            currentUser.phone = user.phone;
            currentUser.department = user.department;
            currentUser.employee_id = user.employee_id;
            localStorage.setItem('zina_user', JSON.stringify(currentUser));
        } else {
            document.getElementById('profileName').textContent = currentUser.name || '-';
            document.getElementById('profileEmail').textContent = currentUser.email || '-';
            document.getElementById('profilePhone').textContent = currentUser.phone || '-';
        }
    } catch (error) {
        console.error('Error fetching profile data:', error);
        document.getElementById('profileName').textContent = currentUser.name || '-';
        document.getElementById('profileEmail').textContent = currentUser.email || '-';
        document.getElementById('profilePhone').textContent = currentUser.phone || '-';
    }
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    const profileView = document.querySelector('.profile-view');
    if (profileView) profileView.style.display = 'block';
    const editForm = document.getElementById('profileEditForm');
    if (editForm) editForm.style.display = 'none';
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
// Exports — only functions defined in this file
// (ordering-cart.js, ordering-menu.js, ordering-auth.js each export their own)
// ========================================
window.toggleBurgerMenu = toggleBurgerMenu;
window.toggleLanguage = toggleLanguage;
window.toggleTheme = toggleTheme;
window.setTheme = setTheme;
window.changeLanguage = changeLanguage;
window.updateTranslations = updateTranslations;
window.openSearchPage = openSearchPage;
window.startScanner = function() {
    showToast('Fonctionnalité de scan QR à implémenter', 'info');
};

// Profile Modal (defined here)
window.showProfileModal = showProfileModal;
window.closeProfileModal = closeProfileModal;
window.editProfile = editProfile;
window.cancelEdit = cancelEdit;
window.saveProfile = saveProfile;
// Meal Selection Modal — exported in ordering-cart.js
