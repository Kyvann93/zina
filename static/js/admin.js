/**
 * ZINA Cantine BAD - Admin Dashboard
 * Management Interface JavaScript
 */

// ========================================
// Image proxy — routes Supabase URLs through /api/img-proxy to avoid
// browser QUIC/HTTP3 errors (ERR_QUIC_PROTOCOL_ERROR) with external hosts.
// ========================================
function proxyImg(url) {
    if (!url || !url.startsWith('http')) return url;
    return '/api/img-proxy?url=' + encodeURIComponent(url);
}

// ========================================
// Global State
// ========================================
let menus = [];
let categories = [];
let orders = [];
let users = [];
let currentSection = 'dashboard';
let editingCategoryId = null;
let selectedMenuIds = new Set();

function showAdminLoginOverlay() {
    const loginOverlay = document.getElementById('loginOverlay');
    const adminWrapper = document.getElementById('adminWrapper');
    if (loginOverlay) {
        loginOverlay.style.opacity = '1';
        loginOverlay.style.pointerEvents = 'auto';
        loginOverlay.style.display = 'flex';
    }
    if (adminWrapper) {
        adminWrapper.style.display = 'none';
    }
}

async function adminFetch(url, options = {}) {
    const merged = {
        credentials: 'same-origin',
        ...options,
        headers: {
            ...(options.headers || {}),
        },
    };

    const response = await fetch(url, merged);
    if (response.status === 401) {
        showAdminLoginOverlay();
        throw new Error('Unauthorized');
    }
    return response;
}

// ========================================
// Page Loader
// ========================================
let loadProgress = 0;
let progressInterval;

let adminOrdersInFlight = null;
let adminOrdersCache = null;
let adminOrdersCacheAt = 0;
let adminOrdersCooldownUntil = 0;

async function fetchAdminOrders({ force = false } = {}) {
    const now = Date.now();
    if (!force && adminOrdersCache && (now - adminOrdersCacheAt) < 10000) {
        return adminOrdersCache;
    }

    if (!force && now < adminOrdersCooldownUntil) {
        throw new Error('Orders fetch temporarily suspended');
    }

    if (!force && adminOrdersInFlight) {
        return adminOrdersInFlight;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        adminOrdersCooldownUntil = now + 15000;
        throw new Error('Offline');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    adminOrdersInFlight = fetch('/api/admin/orders', { signal: controller.signal })
        .then(async (response) => {
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                const msg = data && data.error ? data.error : `Erreur HTTP ${response.status}`;
                throw new Error(msg);
            }
            if (!Array.isArray(data)) {
                const msg = data && data.error ? data.error : 'Réponse invalide du serveur';
                throw new Error(msg);
            }
            adminOrdersCache = data;
            adminOrdersCacheAt = Date.now();
            return data;
        })
        .catch((err) => {
            adminOrdersCooldownUntil = Date.now() + 15000;
            throw err;
        })
        .finally(() => {
            clearTimeout(timeoutId);
            adminOrdersInFlight = null;
        });

    return adminOrdersInFlight;
}

let loaderFill = null;
let loaderProgress = null;
let pageLoader = null;

function initLoader() {
    loaderFill = document.getElementById('loaderFill');
    loaderProgress = document.getElementById('loaderProgress');
    pageLoader = document.getElementById('pageLoader');
}

window.addEventListener('online', () => {
    if (typeof currentSection !== 'undefined' && currentSection === 'orders') {
        showSectionDataLoader('orders');
        loadOrders();
    }
});

function startLoader() {
    initLoader();
    loadProgress = 0;
    
    // Simulate loading progress quickly
    progressInterval = setInterval(() => {
        loadProgress += Math.random() * 12;
        if (loadProgress > 90) {
            loadProgress = 90;
        }
        updateLoader();
    }, 150);
}

function updateLoader() {
    if (loaderFill) {
        loaderFill.style.height = `${loadProgress}%`;
    }
    if (loaderProgress) {
        loaderProgress.style.width = `${loadProgress}%`;
    }
}

function completeLoader() {
    // Force to 100% with smooth transition
    loadProgress = 100;
    updateLoader();
    
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    
    // Wait for animation to complete then hide
    setTimeout(() => {
        if (pageLoader) {
            pageLoader.classList.add('hidden');
        }
    }, 800);
}

function showSectionLoader() {
    // This function is no longer used for full-page loader
    // Section loaders are now shown inline with data containers
    // Keep for backward compatibility but it's a no-op
}

function showSectionDataLoader(sectionName) {
    const el = document.getElementById(`${sectionName}LoaderContainer`) ||
               document.getElementById(`${sectionName}LoaderRow`);
    if (!el) return;
    if (el.tagName === 'TR') {
        el.classList.add('show');
    } else {
        el.style.display = 'flex';
    }
}

function hideSectionDataLoader(sectionName) {
    const el = document.getElementById(`${sectionName}LoaderContainer`) ||
               document.getElementById(`${sectionName}LoaderRow`);
    if (!el) return;
    if (el.tagName === 'TR') {
        el.classList.remove('show');
    } else {
        el.style.display = 'none';
    }
}

// Hide loader when page is fully loaded
window.addEventListener('load', function() {
    // Complete the loader and ensure it hides
    completeLoader();
    
    // Wait for loader to fully hide
    setTimeout(() => {
        const isAdmin = sessionStorage.getItem('zina_admin');
        
        // Ensure login overlay is visible if not authenticated
        if (isAdmin) {
            const loginOverlay = document.getElementById('loginOverlay');
            if (loginOverlay) {
                loginOverlay.style.display = 'none';
            }
            document.getElementById('adminWrapper').style.display = 'flex';
            loadDashboardData();
            const section = getSectionFromHash() || localStorage.getItem('adminCurrentSection') || 'menu';
            showSection(section);
        } else {
            // Show login overlay
            const loginOverlay = document.getElementById('loginOverlay');
            if (loginOverlay) {
                loginOverlay.style.display = 'flex';
            }
            document.getElementById('adminWrapper').style.display = 'none';
        }
        fetch('/api/admin/session', { credentials: 'same-origin' })
            .then(r => r.json())
            .then(data => {
                const authenticated = !!(data && data.authenticated);

                const loginOverlay = document.getElementById('loginOverlay');
                const adminWrapper = document.getElementById('adminWrapper');

                if (authenticated) {
                    if (loginOverlay) {
                        loginOverlay.style.display = 'none';
                    }
                    if (adminWrapper) {
                        adminWrapper.style.display = 'flex';
                    }
                    loadDashboardData();
                    const section = getSectionFromHash() || localStorage.getItem('adminCurrentSection') || 'menu';
                    showSection(section);
                } else {
                    if (loginOverlay) {
                        loginOverlay.style.display = 'flex';
                    }
                    if (adminWrapper) {
                        adminWrapper.style.display = 'none';
                    }
                }
            })
            .catch(() => {
                const loginOverlay = document.getElementById('loginOverlay');
                const adminWrapper = document.getElementById('adminWrapper');
                if (loginOverlay) {
                    loginOverlay.style.display = 'flex';
                }
                if (adminWrapper) {
                    adminWrapper.style.display = 'none';
                }
            });
    }, 1000);
});

// ========================================
// Initialize Dashboard
// ========================================
function getSectionFromHash() {
    const hash = (window.location.hash || '').replace('#', '').trim();
    const allowed = new Set(['menu', 'categories', 'orders', 'users', 'settings']);
    return allowed.has(hash) ? hash : null;
}

document.addEventListener('DOMContentLoaded', function() {
    startLoader();

    // React to hash navigation (e.g. /admin#orders)
    window.addEventListener('hashchange', () => {
        const section = getSectionFromHash();
        if (section) {
            showSection(section);
        }
    });
    
    // Prefer URL hash over localStorage
    const hashSection = getSectionFromHash();
    const savedSection = localStorage.getItem('adminCurrentSection');
    const initialSection = hashSection || savedSection || 'menu';

    // Small delay to ensure DOM is ready
    setTimeout(() => {
        showSection(initialSection);
    }, 100);
});

// ========================================
// Authentication
// ========================================
function handleAdminLogin(event) {
    event.preventDefault();

    const usernameField = document.getElementById('adminUsername');
    const passwordField = document.getElementById('adminPassword');
    if (!usernameField || !passwordField) return;

    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...'; }

    const username = usernameField.value;
    const password = passwordField.value;
    
    // Simple authentication (in production, use proper backend auth)
    if (username === 'admin' && password === 'admin123') {
        sessionStorage.setItem('zina_admin', 'true');
        
        const loginOverlay = document.getElementById('loginOverlay');
        const adminWrapper = document.getElementById('adminWrapper');
        
        // Smooth transition to dashboard
        if (loginOverlay) {
            loginOverlay.style.opacity = '0';
            loginOverlay.style.pointerEvents = 'none';
        }
        
        setTimeout(() => {
            if (loginOverlay) loginOverlay.style.display = 'none';
            if (adminWrapper) adminWrapper.style.display = 'flex';
            loadDashboardData();
            const section = getSectionFromHash() || localStorage.getItem('adminCurrentSection') || 'menu';
            showSection(section);
            showToast('Connexion réussie !', 'success');
        }, 300);
    } else {
        usernameField.value = '';
        passwordField.value = '';
        showToast('Identifiant ou mot de passe incorrect', 'error');
    }
}

function checkAdminSession() {
    const isAdmin = sessionStorage.getItem('zina_admin');
    if (isAdmin) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('adminWrapper').style.display = 'flex';
        loadDashboardData();
    }

    fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
        .then(r => r.json().then(data => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) {
                usernameField.value = '';
                passwordField.value = '';
                showToast((data && data.message) ? data.message : 'Identifiant ou mot de passe incorrect', 'error');
                return;
            }

            const loginOverlay = document.getElementById('loginOverlay');
            const adminWrapper = document.getElementById('adminWrapper');

            if (loginOverlay) {
                loginOverlay.style.opacity = '0';
                loginOverlay.style.pointerEvents = 'none';
            }

            setTimeout(() => {
                if (loginOverlay) loginOverlay.style.display = 'none';
                if (adminWrapper) adminWrapper.style.display = 'flex';
                loadDashboardData();
                const section = getSectionFromHash() || localStorage.getItem('adminCurrentSection') || 'menu';
                showSection(section);
                showToast('Connexion réussie !', 'success');
            }, 300);
        })
        .catch(() => {
            showToast('Erreur réseau lors de la connexion', 'error');
        })
        .finally(() => {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
            }
        });
}

function handleLogout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' })
            .finally(() => {
                localStorage.removeItem('adminCurrentSection'); // Clear saved section
                location.reload();
            });
    }
}

// ========================================
// Live Clock
// ========================================
let _clockInterval = null;

function startClock() {
    if (_clockInterval) clearInterval(_clockInterval);

    function tick() {
        const now = new Date();

        const clockEl = document.getElementById('liveClock');
        if (clockEl) {
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            const ss = String(now.getSeconds()).padStart(2, '0');
            clockEl.textContent = `${hh}:${mm}:${ss}`;
        }

        const dateEl = document.getElementById('liveDate');
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            });
        }
    }

    tick();
    _clockInterval = setInterval(tick, 1000);
}

// ========================================
// Refresh Dashboard
// ========================================
function refreshDashboard() {
    const btn = document.querySelector('.header-refresh-btn');
    if (btn) {
        btn.classList.add('spinning');
        btn.disabled = true;
    }

    loadDashboardData();

    // Re-enable button after max 3s (loadDashboardData has no Promise return)
    setTimeout(() => {
        if (btn) {
            btn.classList.remove('spinning');
            btn.disabled = false;
        }
        showToast('Tableau de bord actualisé', 'success');
    }, 1500);
}

// ========================================
// Navigation
// ========================================
function showSection(section) {
    currentSection = section;
    
    // Save current section to localStorage
    localStorage.setItem('adminCurrentSection', section);

    // Update breadcrumb title
    const sectionTitles = {
        dashboard:  'Tableau de Bord',
        menu:       'Plats & Menus',
        categories: 'Catégories',
        orders:     'Commandes',
        users:      'Employés',
        settings:   'Paramètres'
    };
    const pageTitleEl = document.getElementById('pageTitle');
    if (pageTitleEl) pageTitleEl.textContent = sectionTitles[section] || section;

    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === `#${section}`) {
            item.classList.add('active');
        }
    });

    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(sec => {
        sec.classList.remove('active');
    });

    // Show current section
    const targetSection = document.getElementById(`${section}Section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Clear menu selection when switching sections
    if (section !== 'menu') {
        selectedMenuIds.clear();
        updateBulkBar();
    }

    // Load section data
    setTimeout(() => {
        switch(section) {
            case 'menu':
                showSectionDataLoader('menu');
                loadMenus();
                break;
            case 'categories':
                showSectionDataLoader('categories');
                loadCategoriesFromBackend();
                break;
            case 'orders':
                showSectionDataLoader('orders');
                loadOrders();
                break;
            case 'users':
                showSectionDataLoader('users');
                loadUsers();
                break;
            case 'settings':
                loadFormulasSettings();
                break;
        }
    }, 100);

    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
}

function toggleSidebar() {
    document.querySelector('.admin-sidebar').classList.toggle('active');
}

function toggleNotifs() {
    document.getElementById('notifDropdown').classList.toggle('active');
}

// ========================================
// Dashboard Data - Load from Backend
// ========================================
function loadDashboardData() {
    // Load menus from API
    fetch('/api/menu')
        .then(response => response.json())
        .then(data => {
            if (data && Object.keys(data).length > 0) {
                menus = convertAPIMenu(data);
            } else {
                menus = [];
            }
            updateDashboardStats();
        })
        .catch(error => {
            console.error('Error loading menu:', error);
            menus = [];
            updateDashboardStats();
        });

    // Load categories from API
    loadCategoriesFromBackend();

<<<<<<< Updated upstream
    // Load orders from API (placeholder - implement when orders API is ready)
    fetch('/api/admin/orders')
    // Load orders from API
    adminFetch('/api/admin/orders')
        .then(response => response.json())
=======
    // Load orders from API
    fetchAdminOrders()
>>>>>>> Stashed changes
        .then(data => {
            orders = data && data.length > 0 ? data : [];
            updateDashboardStats();
            updateRecentOrdersTable();
        })
        .catch(error => {
            console.error('Error loading orders:', error);
            orders = [];
            updateDashboardStats();
            updateRecentOrdersTable();
        });

    // Load users from API (if endpoint exists)
    // Show loader first
    showSectionDataLoader('users');
    
    adminFetch('/api/admin/users')
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                // Users endpoint might not exist, set empty array
                return [];
            }
        })
        .then(data => {
            if (data && data.length > 0) {
                // Map API data to frontend format (order_count comes from backend)
                users = data.map(user => ({
                    matricule: user.employee_id || user.user_id || '-',
                    name: user.full_name || 'Utilisateur sans nom',
                    email: user.email || '-',
                    phone: user.phone || '-',
                    joined: user.created_at ? formatDate(user.created_at) : '-',
                    orders: user.order_count || 0,
                    userId: user.user_id,
                    department: user.department || '-'
                }));
                hideSectionDataLoader('users');
                loadUsers();
            } else {
                users = [];
                hideSectionDataLoader('users');
            }
            updateDashboardStats();
        })
        .catch(error => {
            console.error('Error loading users:', error);
            users = [];
            hideSectionDataLoader('users');
            updateDashboardStats();
        });

    // Load popular items from orders data
    updatePopularItems();
}

function loadMenusFromBackend() {
    showSectionDataLoader('menu');
    adminFetch('/api/admin/menus')
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                menus = data.map(menu => ({
                    id: menu.id,
                    name: menu.name,
                    description: menu.description || '',
                    price: menu.price,
                    category: menu.category,
                    category_id: menu.category_id || null,
                    image: menu.image || '🍽️',
                    available: menu.available !== false,
                    popular: false,
                    prepTime: 15
                }));
            } else {
                menus = [];
            }
            selectedMenuIds.clear();
            hideSectionDataLoader('menu');
            renderMenus();
        })
        .catch(error => {
            console.error('Error loading menus:', error);
            menus = [];
            hideSectionDataLoader('menu');
            renderMenus();
        });
}

function loadCategoriesFromBackend() {
    showSectionDataLoader('categories');
    adminFetch('/api/admin/categories')
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                categories = data.map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    image: cat.image_url || cat.image || '',
                    description: cat.description || '',
                    emoji: cat.emoji || '📁',
                    icon: cat.emoji || '📁',
                    color: cat.color || '#581b1f',
                    count: 0
                }));
                categories.forEach(cat => {
                    cat.count = menus.filter(m => m.category === cat.name.toLowerCase().replace(' ', '_')).length;
                });
                // Populate category dropdowns
                populateCategoryDropdowns();
            } else {
                categories = [];
            }
            hideSectionDataLoader('categories');
            renderCategories();
        })
        .catch(error => {
            console.error('Error loading categories:', error);
            categories = [];
            hideSectionDataLoader('categories');
            renderCategories();
        });
}

function deleteMenu(id) {
    showConfirmModal(
        'Supprimer un plat',
        'Voulez-vous vraiment supprimer ce plat ?',
        function() {
            showSectionDataLoader('menu');
            adminFetch(`/api/admin/menus/${id}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    showToast('Plat supprimé avec succès', 'success');
                } else {
                    showToast('Erreur: ' + (data.message || 'Échec de la suppression'), 'error');
                }
                loadMenus();
            })
            .catch(error => {
                console.error('Error deleting menu:', error);
                showToast('Erreur lors de la suppression', 'error');
                hideSectionDataLoader('menu');
            });
        }
    );
}

function deleteCategory(id) {
    showConfirmModal(
        'Supprimer une catégorie',
        'Voulez-vous vraiment supprimer cette catégorie ?',
        function() {
            showSectionDataLoader('categories');
            adminFetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    showToast('Catégorie supprimée avec succès', 'success');
                } else {
                    showToast('Erreur: ' + (data.message || 'Échec de la suppression'), 'error');
                }
                loadCategoriesFromBackend();
            })
            .catch(error => {
                console.error('Error deleting category:', error);
                showToast('Erreur lors de la suppression', 'error');
                hideSectionDataLoader('categories');
            });
        }
    );
}

// ========================================
// Orders Management
// ========================================
async function loadOrders() {
    const tbody = document.getElementById('ordersTableBody');
    const filter = document.getElementById('ordersFilter').value;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch('/api/admin/orders', { signal: controller.signal });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
            const msg = data && data.error ? data.error : `Erreur HTTP ${response.status}`;
            tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Erreur de chargement</h3><p>${msg}</p></div></td></tr>`;
            return;
        }

        if (!Array.isArray(data)) {
            const msg = data && data.error ? data.error : 'Réponse invalide du serveur';
            tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Erreur de chargement</h3><p>${msg}</p></div></td></tr>`;
            return;
        }

        // Convert API orders to our format
        orders = data.map(order => ({
            id: order.order_id,
            client: order.user_id || 'Client',
            items: order.items || [],
            itemsCount: (order.items || []).length,
            total: Number(order.total_amount || 0),
            payment: order.payment?.payment_method || 'Non spécifié',
            status: order.order_status,
            time: order.created_at ? new Date(order.created_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}) : 'N/A',
            pickup_time: order.pickup_time,
            prep_time_minutes: order.prep_time_minutes || 15
        }));
    showSectionDataLoader('orders');
    adminFetch('/api/admin/orders')
        .then(response => response.json())
        .then(apiOrders => {
            // Convert API orders to our format
            orders = apiOrders.map(order => ({
                id: order.order_id,
                client: order.user_id || 'Client',
                items: order.items || [],
                itemsCount: (order.items || []).length,
                total: order.total_amount,
                payment: order.payment?.payment_method || 'Non spécifié',
                status: order.order_status,
                time: order.created_at ? new Date(order.created_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}) : 'N/A',
                pickup_time: order.pickup_time,
                prep_time_minutes: order.prep_time_minutes || 15
            }));

        let filteredOrders = orders;

        if (filter !== 'all') {
            filteredOrders = orders.filter(o => o.status === filter);
        }

        if (filteredOrders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="fas fa-shopping-cart"></i><h3>Aucune commande</h3><p>Aucune commande trouvée</p></div></td></tr>';
        } else {
            tbody.innerHTML = filteredOrders.map(order => `
                <tr>
                    <td>#${order.id}</td>
                    <td>${order.client}</td>
                    <td>${order.itemsCount} articles</td>
                    <td><strong>${order.total.toLocaleString('fr-FR')} FCFA</strong></td>
                    <td>${order.payment}</td>
                    <td>
                        <span class="status-badge ${order.status}">
                            ${order.status === 'completed' ? 'Complété' :
                              order.status === 'processing' ? 'En cours' :
                              order.status === 'pending' ? 'En attente' : 'Annulé'}
                        </span>
                    </td>
                    <td>${order.time}</td>
                    <td>
                        <button class="action-btn edit" onclick="viewOrderDetails(${order.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        const isTimeout = error && error.name === 'AbortError';
        if (!isTimeout) {
            console.error('Error loading orders:', error);
        }

        const msg = isTimeout
            ? 'Le chargement des commandes a pris trop de temps. Vérifiez votre connexion ou réessayez.'
            : 'Impossible de charger les commandes';
        tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Erreur de chargement</h3><p>${msg}</p></div></td></tr>`;
    } finally {
        clearTimeout(timeoutId);
        hideSectionDataLoader('orders');
    }
            if (filteredOrders.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="fas fa-shopping-cart"></i><h3>Aucune commande</h3><p>Aucune commande trouvée</p></div></td></tr>';
            } else {
                tbody.innerHTML = filteredOrders.map(order => `
                    <tr>
                        <td>#${order.id}</td>
                        <td>${order.client}</td>
                        <td>${order.itemsCount} articles</td>
                        <td><strong>${order.total.toLocaleString('fr-FR')} FCFA</strong></td>
                        <td>${order.payment}</td>
                        <td>
                            <span class="status-badge ${getStatusClass(order.status)}">
                                ${getStatusText(order.status)}
                            </span>
                        </td>
                        <td>${order.time}</td>
                        <td>
                            <button class="action-btn edit" onclick="viewOrderDetails(${order.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }

            hideSectionDataLoader('orders');
        })
        .catch(error => {
            console.error('Error loading orders:', error);
            tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Erreur de chargement</h3><p>Impossible de charger les commandes</p></div></td></tr>';
            hideSectionDataLoader('orders');
        });
}

function viewOrderDetails(id) {
    const content = document.getElementById('orderDetailsContent');
    if (content) {
        content.innerHTML = `<div class="zina-loader zina-loader--inline" style="min-height:180px;"><div class="zl-inner"><div class="zl-logo-wrap"><div class="zl-ring"></div><img src="/static/images/logo.PNG" alt="ZINA" class="zl-logo" style="width:48px;height:48px;"></div><div class="zl-dots"><span></span><span></span><span></span></div></div></div>`;
    }
    document.getElementById('orderDetailsModal').classList.add('active');

    // Fetch order details from API
    adminFetch(`/api/admin/orders/${id}`)
        .then(response => response.json())
        .then(order => {
            if (!order || order.error) {
                showToast('Commande introuvable', 'error');
                document.getElementById('orderDetailsModal').classList.remove('active');
                return;
            }

            const content = document.getElementById('orderDetailsContent');

            // Format pickup time
            let pickupTimeDisplay = 'Non spécifié';
            if (order.pickup_time) {
                const pickupDate = new Date(order.pickup_time);
                pickupTimeDisplay = pickupDate.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            // Format order items
            const itemsHtml = (order.items || []).map(item => `
                <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                    <span>${item.quantity}x ${item.product_name}</span>
                    <span>${(item.unit_price * item.quantity).toLocaleString('fr-FR')} FCFA</span>
                </div>
            `).join('');

            content.innerHTML = `
                <div class="order-details">
                    <div class="detail-row">
                        <strong>Commande #:</strong>
                        <span>#${order.order_id}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Client:</strong>
                        <span>${order.user_id || 'Client'}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Heure de récupération:</strong>
                        <span style="color: var(--primary); font-weight: 600;">${pickupTimeDisplay}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Temps de préparation:</strong>
                        <span>${order.prep_time_minutes || 15} minutes</span>
                    </div>
                    <div class="detail-row">
                        <strong>Articles commandés:</strong>
                    </div>
                    <div style="padding: 0.5rem; background: #f8f9fa; border-radius: 4px; margin-bottom: 1rem;">
                        ${itemsHtml || '<span>Aucun détail disponible</span>'}
                    </div>
                    <div class="detail-row">
                        <strong>Total:</strong>
                        <span><strong style="color: var(--primary)">${order.total_amount.toLocaleString('fr-FR')} FCFA</strong></span>
                    </div>
                    <div class="detail-row">
                        <strong>Paiement:</strong>
                        <span>${order.payment?.payment_method || 'Non spécifié'} (${order.payment?.payment_status || 'N/A'})</span>
                    </div>
                    <div class="detail-row">
                        <strong>Statut actuel:</strong>
                        <span><span class="status-badge ${order.order_status}">${order.order_status}</span></span>
                    </div>
                    <div class="detail-row">
                        <strong>Date de commande:</strong>
                        <span>${order.created_at ? new Date(order.created_at).toLocaleString('fr-FR') : 'N/A'}</span>
                    </div>
                </div>
                <div class="form-group" style="margin-top: 1rem;">
                    <label>Mettre à jour le statut</label>
                    <select id="orderStatusUpdate">
                        <option value="pending"   ${order.order_status === 'pending'   ? 'selected' : ''}>En attente</option>
                        <option value="confirmed" ${order.order_status === 'confirmed' ? 'selected' : ''}>Confirmée</option>
                        <option value="preparing" ${order.order_status === 'preparing' ? 'selected' : ''}>En préparation</option>
                        <option value="ready"     ${order.order_status === 'ready'     ? 'selected' : ''}>Prête</option>
                        <option value="completed" ${order.order_status === 'completed' ? 'selected' : ''}>Terminée</option>
                        <option value="cancelled" ${order.order_status === 'cancelled' ? 'selected' : ''}>Annulée</option>
                    </select>
                </div>
            `;

            // Store order ID in modal for update function
            document.getElementById('orderDetailsModal').dataset.orderId = order.order_id;
            document.getElementById('currentOrderId').value = id;
            document.getElementById('orderDetailsModal').classList.add('active');
        })
        .catch(error => {
            console.error('Error loading order details:', error);
            showToast('Erreur lors du chargement des détails', 'error');
        });
}

function closeOrderDetails() {
    document.getElementById('orderDetailsModal').classList.remove('active');
}

function updateOrderStatus() {
    const orderId = document.querySelector('#orderDetailsModal').dataset.orderId;
    const newStatus = document.getElementById('orderStatusUpdate').value;

    if (!orderId || !newStatus) {
        showToast('Erreur lors de la mise à jour', 'error');
        return;
    }

    fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showToast('Statut de la commande mis à jour', 'success');
            closeOrderDetails();
            loadOrders();
        } else {
            showToast('Erreur lors de la mise à jour', 'error');
        }
    })
    .catch(error => {
        console.error('Error updating order status:', error);
        showToast('Erreur lors de la mise à jour', 'error');
    });
    const orderId = document.getElementById('currentOrderId').value;
    const newStatus = document.getElementById('orderStatusUpdate') && document.getElementById('orderStatusUpdate').value;

    if (!orderId || !newStatus) {
        showToast('Impossible de mettre à jour : commande non identifiée', 'error');
        return;
    }

    const btn = document.getElementById('updateStatusBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mise à jour...'; }

    adminFetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showToast('Statut mis à jour avec succès', 'success');
            closeOrderDetails();
            loadOrders();
        } else {
            showToast('Erreur: ' + (data.message || 'Échec'), 'error');
        }
    })
    .catch(error => {
        console.error('Error updating order status:', error);
        showToast('Erreur lors de la mise à jour', 'error');
    })
    .finally(() => {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> <span>Mettre à Jour le Statut</span>'; }
    });
}

// ========================================
// Menu Management
// ========================================
function loadMenus() {
    loadMenusFromBackend();
}

function renderMenus() {
    const grid = document.getElementById('menuGrid');
    if (!grid) return;

    if (menus.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><h3>Aucun plat</h3><p>Commencez par ajouter un plat</p></div>';
        hideSectionDataLoader('menu');
        return;
    }

    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const availabilityFilter = document.getElementById('availabilityFilter')?.value || '';
    const searchQuery = (document.getElementById('menuSearch')?.value || '').toLowerCase().trim();

    let filteredMenus = menus;

    if (categoryFilter) {
        filteredMenus = filteredMenus.filter(m => String(m.category_id) === String(categoryFilter));
    }
    if (availabilityFilter === 'available') {
        filteredMenus = filteredMenus.filter(m => m.available);
    } else if (availabilityFilter === 'unavailable') {
        filteredMenus = filteredMenus.filter(m => !m.available);
    }
    if (searchQuery) {
        filteredMenus = filteredMenus.filter(m =>
            (m.name || '').toLowerCase().includes(searchQuery) ||
            (m.description || '').toLowerCase().includes(searchQuery) ||
            (m.category || '').toLowerCase().includes(searchQuery)
        );
    }

    if (filteredMenus.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><h3>Aucun résultat</h3><p>Essayez d\'autres critères</p></div>';
        hideSectionDataLoader('menu');
        return;
    }

    grid.innerHTML = filteredMenus.map(menu => `
        <div class="menu-card${selectedMenuIds.has(menu.id) ? ' selected' : ''}" data-id="${menu.id}">
            <label class="mc-select" onclick="event.stopPropagation()">
                <input type="checkbox" ${selectedMenuIds.has(menu.id) ? 'checked' : ''}
                       onchange="toggleMenuSelection(${menu.id})">
                <span class="mc-sel-box">
                    <svg class="mc-sel-check" viewBox="0 0 12 10" fill="none">
                        <path d="M1 5L4.5 8.5L11 1" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </span>
            </label>
            <div class="menu-card-image">
                <img src="${proxyImg(menu.image)}" alt="${menu.name}" onerror="this.src='/static/images/food/salade.jpg'">
                <div class="menu-card-badges">
                    ${!menu.available ? '<span class="menu-badge" style="background:var(--danger);color:white;">Indisponible</span>' : ''}
                </div>
            </div>
            <div class="menu-card-content">
                <div class="menu-card-header">
                    <h4 class="menu-card-title">${menu.name}</h4>
                    <span class="menu-card-price">${menu.price.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <p class="menu-card-description">${menu.description || ''}</p>
                <div class="menu-card-footer">
                    <div class="menu-card-meta">
                        <span><i class="fas fa-tag"></i> ${menu.category}</span>
                    </div>
                    <div class="menu-card-actions">
                        <button class="action-btn toggle-avail ${menu.available ? 'is-available' : 'is-unavailable'}"
                                onclick="quickToggleAvailability(${menu.id})"
                                title="${menu.available ? 'Rendre indisponible' : 'Rendre disponible'}">
                            <i class="fas fa-${menu.available ? 'eye-slash' : 'eye'}"></i>
                        </button>
                        <button class="action-btn edit" onclick="editMenu(${menu.id})" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteMenu(${menu.id})" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    hideSectionDataLoader('menu');
}

function filterMenus() {
    renderMenus();
}

// ========================================
// Menu Selection & Bulk Actions
// ========================================
function toggleMenuSelection(id) {
    if (selectedMenuIds.has(id)) {
        selectedMenuIds.delete(id);
    } else {
        selectedMenuIds.add(id);
    }
    const card = document.querySelector(`.menu-card[data-id="${id}"]`);
    if (card) {
        card.classList.toggle('selected', selectedMenuIds.has(id));
        const cb = card.querySelector('.mc-select input');
        if (cb) cb.checked = selectedMenuIds.has(id);
    }
    updateBulkBar();
}

function selectAllMenus() {
    document.querySelectorAll('.menu-card[data-id]').forEach(card => {
        selectedMenuIds.add(parseInt(card.dataset.id));
        card.classList.add('selected');
        const cb = card.querySelector('.mc-select input');
        if (cb) cb.checked = true;
    });
    updateBulkBar();
}

function deselectAllMenus() {
    selectedMenuIds.clear();
    document.querySelectorAll('.menu-card[data-id]').forEach(card => {
        card.classList.remove('selected');
        const cb = card.querySelector('.mc-select input');
        if (cb) cb.checked = false;
    });
    updateBulkBar();
}

function toggleSelectAll(checkbox) {
    if (checkbox.checked) {
        selectAllMenus();
    } else {
        deselectAllMenus();
    }
}

function updateBulkBar() {
    const bar = document.getElementById('bulkActionBar');
    const count = selectedMenuIds.size;
    if (bar) {
        bar.style.display = count > 0 ? 'flex' : 'none';
        const countEl = document.getElementById('bulkCount');
        if (countEl) countEl.textContent = count;
    }
    const selectAllCb = document.getElementById('selectAllMenus');
    const checkmark = document.getElementById('selectAllCheckmark');
    const minus = document.getElementById('selectAllMinus');
    if (selectAllCb) {
        const visibleCards = document.querySelectorAll('.menu-card[data-id]');
        const total = visibleCards.length;
        const allSelected = total > 0 && Array.from(visibleCards).every(c => selectedMenuIds.has(parseInt(c.dataset.id)));
        const someSelected = !allSelected && count > 0;
        selectAllCb.checked = allSelected;
        selectAllCb.indeterminate = someSelected;
        if (checkmark) checkmark.style.display = allSelected ? 'block' : 'none';
        if (minus) minus.style.display = someSelected ? 'block' : 'none';
    }
}

function quickToggleAvailability(id) {
    const menu = menus.find(m => m.id === id);
    if (!menu) return;
    const newVal = !menu.available;
    adminFetch(`/api/admin/menus/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: newVal })
    })
    .then(r => r.json())
    .then(data => {
        if (data.status === 'success') {
            menu.available = newVal;
            showToast(`"${menu.name}" marqué ${newVal ? 'disponible' : 'indisponible'}`, 'success');
            renderMenus();
        } else {
            showToast(data.message || 'Erreur', 'error');
        }
    })
    .catch(() => showToast('Erreur réseau', 'error'));
}

function bulkSetAvailable(isAvailable) {
    const ids = Array.from(selectedMenuIds);
    if (!ids.length) return;
    adminFetch('/api/admin/menus/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, data: { is_available: isAvailable } })
    })
    .then(r => r.json())
    .then(data => {
        if (data.status === 'success') {
            ids.forEach(id => {
                const m = menus.find(m => m.id === id);
                if (m) m.available = isAvailable;
            });
            showToast(data.message, 'success');
            deselectAllMenus();
            renderMenus();
        } else {
            showToast(data.message || 'Erreur', 'error');
        }
    })
    .catch(() => showToast('Erreur réseau', 'error'));
}

function bulkDeleteMenus() {
    const ids = Array.from(selectedMenuIds);
    if (!ids.length) return;
    showConfirmModal(
        'Supprimer les plats sélectionnés',
        `Voulez-vous vraiment supprimer ${ids.length} plat(s) ? Cette action est irréversible.`,
        function () {
            adminFetch('/api/admin/menus/bulk', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
            })
            .then(r => r.json())
            .then(data => {
                if (data.status === 'success') {
                    menus = menus.filter(m => !ids.includes(m.id));
                    showToast(data.message, 'success');
                    deselectAllMenus();
                    renderMenus();
                } else {
                    showToast(data.message || 'Erreur', 'error');
                }
            })
            .catch(() => showToast('Erreur réseau', 'error'));
        }
    );
}

function openMenuModal(menuId = null) {
    const modal = document.getElementById('menuModal');
    const form = document.getElementById('menuForm');
    form.reset();
    const editIdEl = document.getElementById('menuId');
    if (editIdEl) editIdEl.value = '';

    const preview = document.getElementById('menuImagePreview');
    if (preview) { preview.src = ''; preview.style.display = 'none'; }

    if (menuId) {
        const menu = menus.find(m => m.id === Number(menuId));
        if (menu) {
            if (editIdEl) editIdEl.value = menu.id;
            const titleEl = document.getElementById('menuModalTitle');
            if (titleEl) titleEl.textContent = 'Modifier un Plat';
            document.getElementById('menuName').value = menu.name;
            document.getElementById('menuPrice').value = menu.price;
            const catEl = document.getElementById('menuCategory');
            if (catEl) catEl.value = menu.category_id || '';
            const prepEl = document.getElementById('menuPrepTime');
            if (prepEl) prepEl.value = menu.prepTime || 15;
            document.getElementById('menuDescription').value = menu.description || '';
            const availEl = document.getElementById('menuAvailable');
            if (availEl) availEl.value = String(menu.available !== false);
            if (preview && menu.image && (menu.image.startsWith('http') || menu.image.startsWith('static'))) {
                preview.src = menu.image.startsWith('http') ? menu.image : '/' + menu.image;
                preview.style.display = 'block';
            }
        }
    } else {
        const titleEl = document.getElementById('menuModalTitle');
        if (titleEl) titleEl.textContent = 'Ajouter un Plat';
    }
    modal.classList.add('active');
}

function closeMenuModal() {
    document.getElementById('menuModal').classList.remove('active');
}

function saveMenu(event) {
    event.preventDefault();
    const editIdEl = document.getElementById('menuId');
    const menuId = editIdEl && editIdEl.value ? parseInt(editIdEl.value) : null;

    const menuData = {
        product_name: document.getElementById('menuName').value.trim(),
        price: parseFloat(document.getElementById('menuPrice').value),
        category_id: parseInt(document.getElementById('menuCategory').value),
        description: document.getElementById('menuDescription').value.trim(),
        is_available: document.getElementById('menuAvailable')?.value !== 'false'
    };

    // Capture the file before closing the modal (form.reset() would clear it)
    const fileInput = document.getElementById('menuImageFile');
    const imageFile = fileInput && fileInput.files[0] ? fileInput.files[0] : null;

    closeMenuModal();
    showSectionDataLoader('menu');

    const url = menuId ? `/api/admin/menus/${menuId}` : '/api/admin/menus';
    adminFetch(url, {
        method: menuId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menuData)
    })
    .then(r => r.json())
    .then(data => {
        if (data.status !== 'success') {
            showToast('Erreur: ' + (data.message || 'Échec'), 'error');
            hideSectionDataLoader('menu');
            return;
        }
        const savedId = menuId || data.id;
        if (imageFile && savedId) {
            const fd = new FormData();
            fd.append('image', imageFile);
            return adminFetch(`/api/admin/menus/${savedId}/image`, { method: 'POST', body: fd })
                .then(() => showToast(menuId ? 'Plat mis à jour' : 'Plat créé', 'success'))
                .catch(() => showToast('Plat enregistré (image non uploadée)', 'warning'))
                .finally(() => loadMenusFromBackend());
        }
        showToast(menuId ? 'Plat mis à jour' : 'Plat créé', 'success');
        loadMenusFromBackend();
    })
    .catch(err => {
        console.error('saveMenu error:', err);
        showToast('Erreur lors de l\'enregistrement', 'error');
        hideSectionDataLoader('menu');
    });
}

function editMenu(id) {
    openMenuModal(id);
}

// ========================================
// Categories Management
// ========================================
function renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;

    if (categories.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><h3>Aucune catégorie</h3><p>Commencez par ajouter une catégorie</p></div>';
        return;
    }

    grid.innerHTML = categories.map(cat => `
        <div class="category-card" id="cat-${cat.id}">
            ${cat.image
                ? `<img src="${proxyImg(cat.image)}" alt="${cat.name}" style="width:100%;height:100px;object-fit:cover;border-radius:8px 8px 0 0;display:block;" onerror="this.style.display='none'">`
                : `<div style="width:100%;height:80px;display:flex;align-items:center;justify-content:center;font-size:2.5rem;">${cat.emoji}</div>`
            }
            <h3 class="category-name">${cat.emoji} ${cat.name}</h3>
            <p class="category-count">${cat.count} plats</p>
            <div class="category-actions">
                <button class="action-btn edit" onclick="editCategory(${cat.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="deleteCategory(${cat.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function populateCategoryDropdowns() {
    const filterSelect = document.getElementById('categoryFilter');
    const menuSelect = document.getElementById('menuCategory');
    if (!filterSelect || !menuSelect) return;

    const prevFilter = filterSelect.value;
    const prevMenu = menuSelect.value;

    filterSelect.innerHTML = '<option value="">📋 Toutes les catégories</option>';
    menuSelect.innerHTML = '<option value="" disabled selected>🍽️ Sélectionnez une catégorie</option>';

    categories.forEach(cat => {
        [filterSelect, menuSelect].forEach(sel => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = `${cat.emoji || '🍽️'} ${cat.name}`;
            sel.appendChild(opt);
        });
    });

    if (prevFilter) filterSelect.value = prevFilter;
    if (prevMenu) menuSelect.value = prevMenu;
}

function openCategoryModal(catId = null) {
    const modal = document.getElementById('categoryModal');
    const form = document.getElementById('categoryForm');
    form.reset();
    editingCategoryId = null;

    const preview = document.getElementById('categoryImagePreview');
    if (preview) preview.style.display = 'none';

    if (catId) {
        const cat = categories.find(c => c.id === Number(catId));
        if (cat) {
            editingCategoryId = cat.id;
            document.getElementById('categoryModalTitle').textContent = 'Modifier une Catégorie';
            document.getElementById('categoryName').value = cat.name;
            document.getElementById('categoryDescription').value = cat.description || '';
            if (preview && cat.image) {
                preview.src = cat.image;
                preview.style.display = 'block';
            }
        } else {
            document.getElementById('categoryModalTitle').textContent = 'Ajouter une Catégorie';
        }
    } else {
        document.getElementById('categoryModalTitle').textContent = 'Ajouter une Catégorie';
    }
    modal.classList.add('active');
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
}

function saveCategory(event) {
    event.preventDefault();

    const name = document.getElementById('categoryName').value.trim();
    if (!name) { showToast('Le nom est requis', 'error'); return; }

    const categoryData = {
        category_name: name,
        description: document.getElementById('categoryDescription').value.trim()
    };

    const catIdToUpdate = editingCategoryId;
    // Capture file before modal closes (form reset would clear it)
    const imageFile = document.getElementById('categoryImage')?.files[0] || null;

    closeCategoryModal();
    showSectionDataLoader('categories');

    const url = catIdToUpdate ? `/api/admin/categories/${catIdToUpdate}` : '/api/admin/categories';
    adminFetch(url, {
        method: catIdToUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
    })
    .then(r => r.json())
    .then(data => {
        if (data.status !== 'success') {
            showToast('Erreur: ' + (data.message || 'Échec'), 'error');
            hideSectionDataLoader('categories');
            return;
        }
        const savedId = catIdToUpdate || data.id;
        if (imageFile && savedId) {
            const fd = new FormData();
            fd.append('image', imageFile);
            return fetch(`/api/categories/${savedId}/image`, {
                method: 'POST', credentials: 'same-origin', body: fd
            })
            .then(() => showToast(catIdToUpdate ? 'Catégorie et image mises à jour' : 'Catégorie créée', 'success'))
            .catch(() => showToast(catIdToUpdate ? 'Catégorie mise à jour (image non enregistrée)' : 'Catégorie créée (image non enregistrée)', 'warning'))
            .finally(() => loadCategoriesFromBackend());
        }
        showToast(catIdToUpdate ? 'Catégorie mise à jour' : 'Catégorie créée', 'success');
        loadCategoriesFromBackend();
    })
    .catch(err => {
        console.error('saveCategory error:', err);
        showToast('Erreur lors de l\'enregistrement', 'error');
        hideSectionDataLoader('categories');
    });
}

function editCategory(id) {
    openCategoryModal(id);
}

// ========================================
// Dashboard helpers
// ========================================
function convertAPIMenu(data) {
    const result = [];
    for (const [categoryKey, items] of Object.entries(data)) {
        (items || []).forEach(item => {
            result.push({
                id: item.id,
                name: item.name,
                description: item.description || '',
                price: item.price,
                category: categoryKey,
                category_id: item.category_id,
                image: item.image || '',
                available: item.is_available !== false,
                popular: false,
                prepTime: 15
            });
        });
    }
    return result;
}

function getSectionFromHash() {
    return window.location.hash.replace('#', '') || null;
}

function updateDashboardStats() {
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('totalMenus', menus.length);
    setEl('availableMenus', menus.filter(m => m.available !== false).length);
    setEl('pendingOrders', orders.filter(o => (o.order_status || o.status) === 'pending').length);
    setEl('totalUsers', users.length);
}

function updateRecentOrdersTable() {
    const tbody = document.getElementById('recentOrdersBody');
    if (!tbody) return;
    const recent = [...orders].sort((a, b) => {
        return (b.created_at || '').localeCompare(a.created_at || '');
    }).slice(0, 5);

    if (!recent.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Aucune commande récente</td></tr>';
        return;
    }
    tbody.innerHTML = recent.map(o => {
        const status = o.order_status || o.status;
        return `<tr>
            <td>#${o.order_id || o.id}</td>
            <td>${o.user_id || o.client || 'Client'}</td>
            <td>${(o.total_amount || o.total || 0).toLocaleString('fr-FR')} FCFA</td>
            <td><span class="status-badge ${getStatusClass(status)}">${getStatusText(status)}</span></td>
            <td><button class="action-btn edit" onclick="viewOrderDetails(${o.order_id || o.id})"><i class="fas fa-eye"></i></button></td>
        </tr>`;
    }).join('');
}

function updatePopularItems() { /* computed from orders */ }
function updateCategoryCounts() { /* computed on load */ }

function setButtonLoading(btn, text) {
    if (!btn) return;
    btn._originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
}

function resetButton(btn) {
    if (!btn) return;
    btn.disabled = false;
    if (btn._originalHTML) { btn.innerHTML = btn._originalHTML; delete btn._originalHTML; }
}

// ========================================
// Users Management
// ========================================
function loadUsers() {
    showSectionDataLoader('users');
    adminFetch('/api/admin/users')
        .then(r => r.ok ? r.json() : [])
        .then(data => {
            if (data && data.length > 0) {
                users = data.map(user => ({
                    matricule: user.employee_id || user.user_id || '-',
                    name: user.full_name || 'Utilisateur sans nom',
                    email: user.email || '-',
                    phone: user.phone || '-',
                    joined: user.created_at ? formatDate(user.created_at) : '-',
                    orders: user.order_count || 0,
                    userId: user.user_id,
                    department: user.department || '-'
                }));
            } else {
                users = [];
            }
            hideSectionDataLoader('users');
            filterUsers();
        })
        .catch(err => {
            console.error('loadUsers error:', err);
            hideSectionDataLoader('users');
            filterUsers();
        });
}

function filterUsers() {
    const query = (document.getElementById('userSearchInput')?.value || '').toLowerCase().trim();
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    const filtered = query
        ? users.filter(u =>
            (u.name || '').toLowerCase().includes(query) ||
            (u.email || '').toLowerCase().includes(query) ||
            (u.phone || '').toLowerCase().includes(query) ||
            (u.matricule || '').toLowerCase().includes(query)
          )
        : users;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-search"></i><h3>Aucun résultat</h3><p>Aucun utilisateur ne correspond à votre recherche</p></div></td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(user => `
        <tr>
            <td><strong>${user.name}</strong><br><small style="color:var(--medium-gray)">${user.matricule}</small></td>
            <td>${user.email}</td>
            <td>${user.phone}</td>
            <td><span class="status-badge info">${user.orders} commande${user.orders !== 1 ? 's' : ''}</span></td>
            <td>${user.joined}</td>
            <td>
                <button class="action-btn edit" onclick="viewUser('${user.matricule}')" title="Voir détails">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function viewUser(matricule) {
    const user = users.find(u => u.matricule === matricule);
    if (!user) return;

    document.getElementById('userDetailsContent').innerHTML = `
        <div style="display:flex;flex-direction:column;gap:1rem;">
            <div style="display:flex;align-items:center;gap:1rem;padding:1rem;background:var(--off-white);border-radius:12px;">
                <div style="width:60px;height:60px;border-radius:50%;background:var(--primary-gradient);display:flex;align-items:center;justify-content:center;font-size:1.75rem;color:white;flex-shrink:0;">
                    <i class="fas fa-user"></i>
                </div>
                <div>
                    <h3 style="color:var(--primary);margin:0">${user.name}</h3>
                    <small style="color:var(--medium-gray)">Matricule : ${user.matricule}</small>
                </div>
            </div>
            <div class="detail-row"><strong><i class="fas fa-envelope"></i> Email</strong><span>${user.email}</span></div>
            <div class="detail-row"><strong><i class="fas fa-phone"></i> Téléphone</strong><span>${user.phone}</span></div>
            ${user.department && user.department !== '-' ? `<div class="detail-row"><strong><i class="fas fa-building"></i> Département</strong><span>${user.department}</span></div>` : ''}
            <div class="detail-row"><strong><i class="fas fa-shopping-cart"></i> Commandes</strong><span><span class="status-badge info">${user.orders}</span></span></div>
            <div class="detail-row"><strong><i class="fas fa-calendar"></i> Inscrit le</strong><span>${user.joined}</span></div>
        </div>
    `;
    document.getElementById('userDetailsModal').classList.add('active');
}

// ========================================
// Settings
// ========================================
function saveGeneralSettings(event) {
    event.preventDefault();
    showToast('Paramètres généraux enregistrés', 'success');
}

function saveHoursSettings(event) {
    event.preventDefault();
    showToast('Horaires enregistrés', 'success');
}

function saveFeesSettings(event) {
    event.preventDefault();
    showToast('Frais enregistrés', 'success');
}

function loadFormulasSettings() {
    fetch('/api/admin/formulas')
        .then(r => r.json())
        .then(data => {
            const discounts = (data && data.discounts) ? data.discounts : {};
            const ep = document.getElementById('discountEP');
            const pd = document.getElementById('discountPD');
            const epd = document.getElementById('discountEPD');
            const epdb = document.getElementById('discountEPDB');
            if (ep) ep.value = parseInt(discounts.EP || 0);
            if (pd) pd.value = parseInt(discounts.PD || 0);
            if (epd) epd.value = parseInt(discounts.EPD || 0);
            if (epdb) epdb.value = parseInt(discounts.EPDB || 0);
        })
        .catch(() => {
            // ignore
        });
}

function saveFormulasSettings(event) {
    event.preventDefault();

    const ep = parseInt(document.getElementById('discountEP')?.value || 0);
    const pd = parseInt(document.getElementById('discountPD')?.value || 0);
    const epd = parseInt(document.getElementById('discountEPD')?.value || 0);
    const epdb = parseInt(document.getElementById('discountEPDB')?.value || 0);

    const payload = {
        discounts: {
            EP: Math.max(0, ep || 0),
            PD: Math.max(0, pd || 0),
            EPD: Math.max(0, epd || 0),
            EPDB: Math.max(0, epdb || 0)
        }
    };

    fetch('/api/admin/formulas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(r => r.json())
        .then(data => {
            if (data && data.status === 'success') {
                showToast('Remises formules enregistrées', 'success');
            } else {
                showToast('Erreur lors de l\'enregistrement', 'error');
            }
        })
        .catch(() => {
            showToast('Erreur lors de l\'enregistrement', 'error');
        });
}

// ========================================
// Utilities
// ========================================
function formatPrice(price) {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
}

<<<<<<< Updated upstream
=======
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function loadUserOrderCounts() {
    // Fetch all orders and count by user_id
    fetchAdminOrders()
        .then(orders => {
            console.log('Loaded orders:', orders);
            console.log('Current users:', users);
            
            if (orders && orders.length > 0) {
                // Count orders per user - normalize UUIDs by removing hyphens and converting to lowercase
                const orderCounts = {};
                orders.forEach(order => {
                    const userId = order.user_id;
                    if (userId) {
                        // Normalize UUID: remove hyphens, convert to lowercase for consistent comparison
                        const userIdNormalized = String(userId).replace(/-/g, '').toLowerCase();
                        orderCounts[userIdNormalized] = (orderCounts[userIdNormalized] || 0) + 1;
                    }
                });

                console.log('Order counts by user (normalized):', orderCounts);

                // Update users with order counts
                users.forEach(user => {
                    if (user.userId) {
                        // Normalize UUID for comparison
                        const userIdNormalized = String(user.userId).replace(/-/g, '').toLowerCase();
                        const count = orderCounts[userIdNormalized] || 0;
                        user.orders = count;
                        console.log(`User ${user.name} (${user.userId} -> ${userIdNormalized}): ${count} orders`);
                    }
                });

                console.log('Users after order count update:', users);

                // Hide loader and reload users table with updated order counts
                hideSectionDataLoader('users');
                loadUsers();
            } else {
                // No orders, hide loader and load users
                hideSectionDataLoader('users');
                loadUsers();
            }
        })
        .catch(error => {
            console.error('Error loading order counts:', error);
            hideSectionDataLoader('users');
            loadUsers();
        });
}

>>>>>>> Stashed changes
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
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
// formatPrice, formatDate, showToast, showConfirmModal, closeConfirmModal, confirmAction → see utils.js

function loadUserOrderCounts() {
    // Fetch all orders and count by user_id
    adminFetch('/api/admin/orders')
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            return [];
        })
        .then(orders => {
            console.log('Loaded orders:', orders);
            console.log('Current users:', users);
            
            if (orders && orders.length > 0) {
                // Count orders per user - normalize UUIDs by removing hyphens and converting to lowercase
                const orderCounts = {};
                orders.forEach(order => {
                    const userId = order.user_id;
                    if (userId) {
                        // Normalize UUID: remove hyphens, convert to lowercase for consistent comparison
                        const userIdNormalized = String(userId).replace(/-/g, '').toLowerCase();
                        orderCounts[userIdNormalized] = (orderCounts[userIdNormalized] || 0) + 1;
                    }
                });

                console.log('Order counts by user (normalized):', orderCounts);

                // Update users with order counts
                users.forEach(user => {
                    if (user.userId) {
                        // Normalize UUID for comparison
                        const userIdNormalized = String(user.userId).replace(/-/g, '').toLowerCase();
                        const count = orderCounts[userIdNormalized] || 0;
                        user.orders = count;
                        console.log(`User ${user.name} (${user.userId} -> ${userIdNormalized}): ${count} orders`);
                    }
                });

                console.log('Users after order count update:', users);

                // Hide loader and reload users table with updated order counts
                hideSectionDataLoader('users');
                loadUsers();
            } else {
                // No orders, hide loader and load users
                hideSectionDataLoader('users');
                loadUsers();
            }
        })
        .catch(error => {
            console.error('Error loading order counts:', error);
            hideSectionDataLoader('users');
            loadUsers();
        });
}

// Close modals on escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// Wire confirm button → confirmAction (defined in utils.js)
document.addEventListener('DOMContentLoaded', function() {
    const confirmBtn = document.getElementById('confirmBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', confirmAction);
});

// ========================================
// Image Preview Helpers
// ========================================
function previewMenuImage(input) {
    const preview = document.getElementById('menuImagePreview');
    if (!preview) return;
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => { preview.src = e.target.result; preview.style.display = 'block'; };
        reader.readAsDataURL(input.files[0]);
    }
}

function previewCategoryImage(input) {
    const preview = document.getElementById('categoryImagePreview');
    if (!preview) return;
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => { preview.src = e.target.result; preview.style.display = 'block'; };
        reader.readAsDataURL(input.files[0]);
    }
}

// Export functions
window.showSection = showSection;
window.showSectionLoader = showSectionLoader;
window.toggleSidebar = toggleSidebar;
window.toggleNotifs = toggleNotifs;
window.handleAdminLogin = handleAdminLogin;
window.handleLogout = handleLogout;
window.openMenuModal = openMenuModal;
window.closeMenuModal = closeMenuModal;
window.saveMenu = saveMenu;
window.editMenu = editMenu;
window.deleteMenu = deleteMenu;
window.filterMenus = filterMenus;
window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.saveCategory = saveCategory;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.previewMenuImage = previewMenuImage;
window.previewCategoryImage = previewCategoryImage;
window.loadOrders = loadOrders;
window.viewOrderDetails = viewOrderDetails;
window.closeOrderDetails = closeOrderDetails;
window.closeConfirmModal = closeConfirmModal;
window.updateOrderStatus = updateOrderStatus;
window.loadUsers = loadUsers;
window.filterUsers = filterUsers;
window.viewUser = viewUser;
window.saveGeneralSettings = saveGeneralSettings;
window.saveHoursSettings = saveHoursSettings;
window.saveFeesSettings = saveFeesSettings;
window.saveFormulasSettings = saveFormulasSettings;
window.loadFormulasSettings = loadFormulasSettings;
window.startClock = startClock;
window.refreshDashboard = refreshDashboard;
window.toggleMenuSelection = toggleMenuSelection;
window.selectAllMenus = selectAllMenus;
window.deselectAllMenus = deselectAllMenus;
window.toggleSelectAll = toggleSelectAll;
window.updateBulkBar = updateBulkBar;
window.quickToggleAvailability = quickToggleAvailability;
window.bulkSetAvailable = bulkSetAvailable;
window.bulkDeleteMenus = bulkDeleteMenus;
