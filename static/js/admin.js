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
var menus = [];
var categories = [];
var orders = [];
var users = [];
var adminUsers = [];
var adminRoles = [];
var currentSection = 'dashboard';
var editingCategoryId = null;
var selectedMenuIds = new Set();

// Role / permission state (populated after session check)
var adminPermissions = {};
var isSuperAdmin = false;
var adminRole = '';
var currentAdminUsername = 'Admin';

function hasPermission(perm) {
    if (isSuperAdmin) return true;
    return !!adminPermissions[perm];
}

function applyPermissions() {
    // Show/hide nav items based on permissions
    document.querySelectorAll('.perm-nav-admins').forEach(el => {
        el.style.display = hasPermission('admins') ? '' : 'none';
    });
    document.querySelectorAll('.perm-nav-roles').forEach(el => {
        el.style.display = hasPermission('roles') ? '' : 'none';
    });
    document.querySelectorAll('.perm-roles-manage').forEach(el => {
        el.style.display = hasPermission('roles_manage') ? '' : 'none';
    });
    // Update header info
    const nameEl = document.getElementById('adminName');
    const roleEl = document.getElementById('adminRoleLabel');
    const avatarEl = document.getElementById('adminAvatar');
    if (nameEl) nameEl.textContent = currentAdminUsername;
    if (roleEl) roleEl.textContent = adminRole || 'Admin';
    if (avatarEl) avatarEl.textContent = (currentAdminUsername[0] || 'A').toUpperCase();
}

>>>>>>> Stashed changes
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
                    // Show login overlay only if not authenticated
                    if (loginOverlay) {
                        loginOverlay.style.display = 'flex';
                        loginOverlay.style.opacity = '1';
                        loginOverlay.style.pointerEvents = 'auto';
                    }
                    if (adminWrapper) {
                        adminWrapper.style.display = 'none';
                    }
                }
            })
            .catch(() => {
                // Show login overlay on error
                const loginOverlay = document.getElementById('loginOverlay');
                const adminWrapper = document.getElementById('adminWrapper');
                if (loginOverlay) {
                    loginOverlay.style.display = 'flex';
                    loginOverlay.style.opacity = '1';
                    loginOverlay.style.pointerEvents = 'auto';
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
        users:      'Utilisateurs',
        admins:     'Administrateurs',
        roles:      'Rôles & Permissions',
>>>>>>> Stashed changes
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
                    popular: menu.popular === true,
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

    showSectionDataLoader('orders');
    adminFetch('/api/admin/orders')
        .then(response => response.json())
        .then(apiOrders => {
            orders = apiOrders.map(order => ({
                id: order.order_id,
                client: order.user_id || 'Client',
                items: order.items || [],
                itemsCount: (order.items || []).length,
                total: order.total_amount,
                payment: order.payment?.payment_method || '',
                transaction_status: order.payment?.transaction_status || 'N/A',
                status: order.order_status,
                rawDate: order.created_at || null,
                time: order.created_at ? new Date(order.created_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}) : 'N/A',
                pickup_time: order.pickup_time,
                prep_time_minutes: order.prep_time_minutes || 15
            }));

            hideSectionDataLoader('orders');
            applyOrderFilters();
        })
        .catch(error => {
            console.error('Error loading orders:', error);
            tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Erreur de chargement</h3><p>Impossible de charger les commandes</p></div></td></tr>';
            hideSectionDataLoader('orders');
        });
}

function applyOrderFilters() {
    const tbody = document.getElementById('ordersTableBody');
    const search  = (document.getElementById('ordersSearch')?.value || '').trim().toLowerCase();
    const status  = document.getElementById('ordersFilter')?.value || 'all';
    const payment = document.getElementById('ordersPaymentFilter')?.value || 'all';
    const dateFrom = document.getElementById('ordersDateFrom')?.value || '';
    const dateTo   = document.getElementById('ordersDateTo')?.value || '';

    let filtered = orders.filter(o => {
        if (status !== 'all' && o.status !== status) return false;

        if (payment !== 'all') {
            const method = (o.payment || '').toLowerCase();
            if (!method.includes(payment)) return false;
        }

        if (dateFrom || dateTo) {
            if (!o.rawDate) return false;
            const d = new Date(o.rawDate);
            const dayStr = d.toISOString().slice(0, 10);
            if (dateFrom && dayStr < dateFrom) return false;
            if (dateTo   && dayStr > dateTo)   return false;
        }

        if (search) {
            const matchId = String(o.id).includes(search);
            const matchClient = o.client.toLowerCase().includes(search);
            if (!matchId && !matchClient) return false;
        }

        return true;
    });

    const countEl = document.getElementById('ordersResultCount');
    if (countEl) countEl.textContent = `${filtered.length} commande${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="fas fa-shopping-cart"></i><h3>Aucune commande</h3><p>Aucun résultat pour ces filtres</p></div></td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(order => `
        <tr>
            <td>#${order.id}</td>
            <td>${order.client}</td>
            <td>${order.itemsCount} article${order.itemsCount !== 1 ? 's' : ''}</td>
            <td><strong>${(order.total || 0).toLocaleString('fr-FR')} FCFA</strong></td>
            <td>${formatPaymentMethod(order.payment, order.transaction_status)}</td>
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

function resetOrdersFilters() {
    const el = id => document.getElementById(id);
    if (el('ordersSearch'))        el('ordersSearch').value = '';
    if (el('ordersFilter'))        el('ordersFilter').value = 'all';
    if (el('ordersPaymentFilter')) el('ordersPaymentFilter').value = 'all';
    if (el('ordersDateFrom'))      el('ordersDateFrom').value = '';
    if (el('ordersDateTo'))        el('ordersDateTo').value = '';
    applyOrderFilters();
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
<<<<<<< Updated upstream
                        <span>${order.payment?.payment_method || 'Non spécifié'} (${order.payment?.payment_status || 'N/A'})</span>
=======
                        <span id="paymentDisplay">
                            ${formatPaymentMethod(order.payment?.payment_method, order.payment?.transaction_status)}
                        </span>
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
=======
function updatePaymentMethod() {
    const orderId = document.getElementById('currentOrderId').value;

    if (!orderId) {
        showToast('Impossible de mettre à jour : commande non identifiée', 'error');
        return;
    }

    // Show confirmation dialog for counter payment
    showConfirmModal(
        'Paiement au Comptoir',
        'Confirmer que le client a payé au comptoir ?\n\nLe statut de la commande sera mis à jour automatiquement.',
        function() {
            const btn = document.getElementById('updatePaymentBtn');
            if (btn) { 
                btn.disabled = true; 
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Traitement...'; 
            }

            adminFetch(`/api/admin/orders/${orderId}/payment`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    payment_method: 'counter',
                    transaction_status: 'completed'
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    showToast(data.message || 'Paiement au comptoir enregistré', 'success');
                    closeOrderDetails();
                    loadOrders();
                } else {
                    showToast('Erreur: ' + (data.message || 'Échec'), 'error');
                }
            })
            .catch(error => {
                console.error('Error updating payment method:', error);
                showToast('Erreur lors de la mise à jour du paiement', 'error');
            })
            .finally(() => {
                if (btn) { 
                    btn.disabled = false; 
                    btn.innerHTML = '<i class="fas fa-cash-register"></i> <span>Paiement au Comptoir</span>'; 
                }
            });
        }
    );
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
                popular: item.is_popular === true,
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

    // Update status breakdown
    updateStatusBreakdown();
}

function updateStatusBreakdown() {
    const container = document.getElementById('statusBreakdown');
    if (!container) return;

    const statusCounts = {
        'pending': 0,
        'confirmed': 0,
        'preparing': 0,
        'ready': 0,
        'completed': 0,
        'cancelled': 0
    };

    orders.forEach(o => {
        const status = (o.order_status || o.status || 'pending').toLowerCase();
        if (statusCounts.hasOwnProperty(status)) {
            statusCounts[status]++;
        }
    });

    const total = orders.length || 1; // Avoid division by zero

    container.innerHTML = Object.entries(statusCounts).map(([status, count]) => {
        const percentage = Math.round((count / total) * 100);
        const statusClass = getStatusClass(status);
        const statusText = getStatusText(status);
        return `
            <div class="status-item">
                <div class="status-info">
                    <span class="status-label">${statusText}</span>
                    <span class="status-count">${count}</span>
                </div>
                <div class="status-bar">
                    <div class="status-progress ${statusClass}" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
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

<<<<<<< Updated upstream
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
=======
// ========================================
// Auth — Slide between Login and Register
// ========================================
function showRegisterForm() {
    document.getElementById('authStage').classList.add('show-register');
    // Clear register form when opening it
    const form = document.getElementById('adminRegisterForm');
    if (form) form.reset();
}

function showLoginForm() {
    document.getElementById('authStage').classList.remove('show-register');
}

function handleAdminRegister(event) {
    event.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regPasswordConfirm').value;

    if (password !== confirm) {
        showToast('Les mots de passe ne correspondent pas', 'error');
        return;
    }

    const btn = event.target.querySelector('button[type="submit"]');
    setButtonLoading(btn, 'Envoi...');

    fetch('/api/admin/register', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
    })
        .then(r => r.json().then(d => ({ ok: r.ok, d })))
        .then(({ ok, d }) => {
            if (ok) {
                showToast(d.message || 'Demande envoyée avec succès', 'success');
                event.target.reset();
                showLoginForm();
            } else {
                showToast(d.message || 'Erreur lors de l\'envoi', 'error');
            }
        })
        .catch(() => showToast('Erreur réseau', 'error'))
        .finally(() => resetButton(btn));
}


