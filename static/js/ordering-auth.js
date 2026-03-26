/** ordering-auth.js — Authentication, session, order history */
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
    apiFetch('/api/register', {
        method: 'POST',
        body: JSON.stringify({
            employee_id: employeeId,
            full_name: fullName,
            email: email,
            department: department,
            phone: phone
        })
    })
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
async function checkSession() {
    const justLoggedIn = localStorage.getItem('login_success_flag') === 'true';
    let savedUser = localStorage.getItem('zina_user') || sessionStorage.getItem('zina_user');

    // If we have the success flag but no local user, we came from the /login form —
    // fetch the authenticated user from the Flask session via /api/me
    if (!savedUser && justLoggedIn) {
        localStorage.removeItem('login_success_flag');
        try {
            const r = await fetch('/api/me');
            if (r.ok) {
                const data = await r.json();
                if (data.authenticated && data.user) {
                    localStorage.setItem('zina_user', JSON.stringify(data.user));
                    savedUser = localStorage.getItem('zina_user');
                }
            }
        } catch (e) {
            console.error('Session restore error:', e);
        }
    }

    if (savedUser) {
        currentUser = JSON.parse(savedUser);

        // Update guest user name and department based on current language
        if (currentUser.isGuest) {
            currentUser.name = currentLanguage === 'fr' ? 'Invité' : 'Guest';
            currentUser.department = currentLanguage === 'fr' ? 'Visiteur' : 'Visitor';
            localStorage.setItem('zina_user', JSON.stringify(currentUser));
        }

        const loginOverlay = document.getElementById('loginOverlay');
        const appContainer = document.getElementById('appContainer');
        const userName = document.getElementById('userName');
        const userDept = document.getElementById('userDept');

        if (loginOverlay) loginOverlay.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
        if (userName) userName.textContent = currentUser.name;
        if (userDept) userDept.textContent = currentUser.department;

        restoreCart();

        if (justLoggedIn && !currentUser.isGuest) {
            showToast(currentLanguage === 'fr' ? 'Connexion réussie ! Bienvenue ' + currentUser.name : 'Login successful! Welcome ' + currentUser.name, 'success');
        }
    } else {
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
// Exports
// ========================================
window.switchToManual = switchToManual;
window.showRegistration = showRegistration;
window.showLogin = showLogin;
window.handleRegistration = handleRegistration;
window.handleGuestAccess = handleGuestAccess;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.saveCart = saveCart;
window.restoreCart = restoreCart;
window.checkSession = checkSession;
window.showOrderHistory = showOrderHistory;
window.closeOrderHistoryModal = closeOrderHistoryModal;
window.fetchUserOrders = fetchUserOrders;
