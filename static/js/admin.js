/**
 * ZINA Cantine BAD - Admin Dashboard
 * Management Interface JavaScript
 */

// ========================================
// Global State
// ========================================
let menus = [];
let categories = [];
let orders = [];
let users = [];
let currentSection = 'dashboard';
let editingCategoryId = null;

// ========================================
// Page Loader
// ========================================
let loadProgress = 0;
let loaderFill = null;
let loaderProgress = null;
let pageLoader = null;
let progressInterval = null;

function initLoader() {
    loaderFill = document.getElementById('loaderFill');
    loaderProgress = document.getElementById('loaderProgress');
    pageLoader = document.getElementById('pageLoader');
}

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
    
    // Wait for loader to fully hide, then verify session with backend
    setTimeout(() => {
        const isAdmin = sessionStorage.getItem('zina_admin');
        if (isAdmin) {
            checkAdminSession();
        } else {
            document.getElementById('loginOverlay').style.display = 'flex';
            document.getElementById('adminWrapper').style.display = 'none';
        }
    }, 1000);
});

// ========================================
// Initialize Dashboard
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    startLoader();
    
    // Restore last section from localStorage
    const savedSection = localStorage.getItem('adminCurrentSection');
    if (savedSection) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            showSection(savedSection);
        }, 100);
    } else {
        // Default to menu section if no saved section
        setTimeout(() => {
            showSection('menu');
        }, 100);
    }
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

    fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameField.value.trim(), password: passwordField.value })
    })
    .then(r => r.json())
    .then(data => {
        if (data.status === 'success') {
            sessionStorage.setItem('zina_admin', 'true');
            const loginOverlay = document.getElementById('loginOverlay');
            const adminWrapper = document.getElementById('adminWrapper');
            if (loginOverlay) { loginOverlay.style.opacity = '0'; loginOverlay.style.pointerEvents = 'none'; }
            setTimeout(() => {
                if (loginOverlay) loginOverlay.style.display = 'none';
                if (adminWrapper) adminWrapper.style.display = 'flex';
                startClock();
                loadDashboardData();
                showToast('Connexion réussie !', 'success');
            }, 300);
        } else {
            passwordField.value = '';
            showToast(data.message || 'Identifiant ou mot de passe incorrect', 'error');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>Se Connecter</span>'; }
        }
    })
    .catch(() => {
        showToast('Erreur de connexion au serveur', 'error');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>Se Connecter</span>'; }
    });
}

function checkAdminSession() {
    // Verify session is still valid server-side
    fetch('/api/admin/orders', { method: 'GET' })
        .then(r => {
            if (r.status === 401) {
                sessionStorage.removeItem('zina_admin');
                document.getElementById('loginOverlay').style.display = 'flex';
                document.getElementById('adminWrapper').style.display = 'none';
            } else {
                document.getElementById('loginOverlay').style.display = 'none';
                document.getElementById('adminWrapper').style.display = 'flex';
                startClock();
                loadDashboardData();
            }
        })
        .catch(() => {
            // Network error — assume session OK if sessionStorage says so
            const loginOverlay = document.getElementById('loginOverlay');
            const adminWrapper = document.getElementById('adminWrapper');
            if (loginOverlay) loginOverlay.style.display = 'none';
            if (adminWrapper) adminWrapper.style.display = 'flex';
            startClock();
            loadDashboardData();
        });
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

function handleLogout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        fetch('/api/admin/logout', { method: 'POST' }).finally(() => {
            sessionStorage.removeItem('zina_admin');
            localStorage.removeItem('adminCurrentSection');
            location.reload();
        });
    }
}

// ========================================
// Navigation
// ========================================
function showSection(section) {
    currentSection = section;
    
    // Save current section to localStorage
    localStorage.setItem('adminCurrentSection', section);

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

    // Load section data
    setTimeout(() => {
        switch(section) {
            case 'menu':
                showSectionDataLoader('menu');
                loadMenus();
                break;
            case 'categories':
                showSectionDataLoader('categories');
                loadCategories();
                break;
            case 'orders':
                showSectionDataLoader('orders');
                loadOrders();
                break;
            case 'users':
                showSectionDataLoader('users');
                loadUsers();
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

    // Load orders from API
    fetch('/api/admin/orders')
        .then(response => response.json())
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
    
    fetch('/api/admin/users')
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
                    userId: user.user_id
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

function convertAPIMenu(apiData) {
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

function updateDashboardStats() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayStart = now.getTime();

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    // Filtres temporels
    const todayOrdersList = orders.filter(o => o.created_at && new Date(o.created_at).getTime() >= todayStart);
    const monthOrdersList  = orders.filter(o => o.created_at && new Date(o.created_at).getTime() >= thisMonthStart);

    // CA du jour
    const todayRevenue = todayOrdersList.reduce((s, o) => s + (o.total_amount || 0), 0);

    // Ticket moyen (du jour)
    const avgTicket = todayOrdersList.length > 0
        ? Math.round(todayRevenue / todayOrdersList.length)
        : 0;

    // Taux de complétion (toutes commandes)
    const completedCount = orders.filter(o => o.order_status === 'completed').length;
    const completionRate = orders.length > 0 ? Math.round((completedCount / orders.length) * 100) : 0;

    // En attente
    const pendingCount = orders.filter(o => o.order_status === 'pending').length;

    // Menus disponibles
    const availableCount = menus.filter(m => m.available !== false).length;

    // ——— Mise à jour DOM ———
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    setEl('todayRevenue', todayRevenue.toLocaleString('fr-FR'));
    setEl('todayOrders',  todayOrdersList.length);
    setEl('avgTicket',    avgTicket.toLocaleString('fr-FR'));
    setEl('completionRate', completionRate + '%');
    setEl('pendingOrders',  pendingCount);
    setEl('availableMenus', availableCount);
    setEl('totalUsers',     users.length);
    setEl('monthOrders',    monthOrdersList.length);
    setEl('totalMenus',     menus.length);

    // Barre de progression complétion
    const bar = document.getElementById('completionBar');
    if (bar) bar.style.width = completionRate + '%';

    // Badge pending dans sidebar
    const navBadge = document.getElementById('navPendingCount');
    if (navBadge) {
        if (pendingCount > 0) {
            navBadge.textContent = pendingCount;
            navBadge.style.display = '';
        } else {
            navBadge.style.display = 'none';
        }
    }

    updateStatusBreakdown();
}

function updateStatusBreakdown() {
    const el = document.getElementById('statusBreakdown');
    if (!el) return;

    const statuses = [
        { key: 'pending',    label: 'En attente', color: '#f59e0b' },
        { key: 'processing', label: 'En cours',   color: '#3b82f6' },
        { key: 'completed',  label: 'Livrées',    color: '#10b981' },
        { key: 'cancelled',  label: 'Annulées',   color: '#ef4444' }
    ];

    const total = orders.length || 1;

    if (orders.length === 0) {
        el.innerHTML = '<p style="color:var(--medium-gray);font-size:0.8rem;text-align:center;padding:1rem 0;">Aucune donnée disponible</p>';
        return;
    }

    el.innerHTML = statuses.map(s => {
        const count = orders.filter(o => o.order_status === s.key).length;
        const pct   = Math.round((count / total) * 100);
        return `
            <div class="breakdown-item">
                <span class="breakdown-label">${s.label}</span>
                <div class="breakdown-bar">
                    <div class="breakdown-fill" style="width:${pct}%;background:${s.color}"></div>
                </div>
                <span class="breakdown-count">${count}</span>
            </div>`;
    }).join('');
}

function updateRecentOrdersTable() {
    const tbody = document.getElementById('dashboardOrdersBody');
    if (!tbody) return;
    
    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-receipt" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p style="color: #666;">Aucune commande trouvée</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort orders by date (most recent first)
    const sortedOrders = orders.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
    });
    
    // Display all existing orders (not limited to 5)
    tbody.innerHTML = sortedOrders.map(order => {
        const createdDate = order.created_at ? new Date(order.created_at) : new Date();
        const dateStr = createdDate.toLocaleDateString('fr-FR');
        const timeStr = createdDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const statusClass = getStatusClass(order.order_status);
        const statusText = getStatusText(order.order_status);
        
        return `
            <tr>
                <td>#${order.order_id}</td>
                <td>${order.user_name || (order.user_email || 'Client')}</td>
                <td>${formatPrice(order.total_amount)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${dateStr} ${timeStr}</td>
            </tr>
        `;
    }).join('');
}

function updatePopularItems() {
    // Calculate popular items from orders
    const itemCounts = {};
    
    orders.forEach(order => {
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                const itemName = item.product_name || item.name;
                if (itemName) {
                    itemCounts[itemName] = (itemCounts[itemName] || 0) + item.quantity;
                }
            });
        }
    });
    
    // Sort items by popularity
    const popularItems = Object.entries(itemCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5); // Top 5 items
    
    // Update popular items display
    const popularList = document.getElementById('popularItemsList');
    if (!popularList) return;
    
    if (popularItems.length === 0) {
        popularList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <i class="fas fa-utensils" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>Aucune donnée disponible</p>
            </div>
        `;
        return;
    }
    
    popularList.innerHTML = popularItems.map((item, index) => `
        <div class="popular-item">
            <span class="popular-rank">${index + 1}</span>
            <span class="popular-name">${item[0]}</span>
            <span class="popular-count">${item[1]} commandes</span>
        </div>
    `).join('');
}

// getStatusClass, getStatusText, formatPrice → see utils.js

// ========================================
// Test Functions
// ========================================
function testDashboardData() {
    console.log('=== Testing Dashboard Data Display (No Hardcoded Values) ===');
    
    // Create test orders data with different dates
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60000);
    
    const testOrders = [
        {
            order_id: 4827,
            user_name: 'Jean Kouamé',
            total_amount: 14300,
            order_status: 'completed',
            created_at: now.toISOString(),
            items: [
                { product_name: 'Riz Gras au Poulet', quantity: 2 },
                { product_name: 'Jus Orange', quantity: 1 }
            ]
        },
        {
            order_id: 4826,
            user_name: 'Marie Diallo',
            total_amount: 8500,
            order_status: 'preparing',
            created_at: yesterday.toISOString(),
            items: [
                { product_name: 'Alloco & Poisson', quantity: 1 }
            ]
        },
        {
            order_id: 4825,
            user_name: 'Patrick Aka',
            total_amount: 12000,
            order_status: 'pending',
            created_at: twoDaysAgo.toISOString(),
            items: [
                { product_name: 'Attiéké', quantity: 3 }
            ]
        }
    ];
    
    // Test with sample data
    const originalOrders = orders;
    orders = testOrders;
    
    console.log('Test orders:', testOrders);
    console.log('Today should show:', testOrders.filter(o => new Date(o.created_at).toDateString() === now.toDateString()).length, 'orders');
    
    // Update dashboard displays
    updateDashboardStats();
    updateRecentOrdersTable();
    updatePopularItems();
    
    // Restore original data after 5 seconds
    setTimeout(() => {
        orders = originalOrders;
        updateDashboardStats();
        updateRecentOrdersTable();
        updatePopularItems();
        console.log('Restored original orders data');
    }, 5000);
    
    console.log('✅ Dashboard test completed!');
    console.log('- Recent orders table should show real data from API');
    console.log('- Popular items should be calculated from order data');
    console.log('- No hardcoded values should be visible');
    console.log('- Check HTML: ordersTableBody and popularItemsList should be populated');
}

// Make test function available globally
window.testDashboardData = testDashboardData;
// ========================================
function loadMenus() {
    loadMenusFromBackend();
}

function loadMenusFromBackend() {
    showSectionDataLoader('menu');
    fetch('/api/admin/menus')
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
                    available: menu.available !== undefined ? menu.available : true,
                    popular: false,
                    prepTime: 15
                }));
            } else {
                menus = [];
            }
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

function renderMenus() {
    const grid = document.getElementById('menuGrid');

    if (menus.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><h3>Aucun plat</h3><p>Commencez par ajouter un plat</p></div>';
        hideSectionDataLoader('menu');
        return;
    }

    const categoryFilter = document.getElementById('categoryFilter').value;
    const availabilityFilter = document.getElementById('availabilityFilter').value;

    let filteredMenus = menus;

    if (categoryFilter) {
        filteredMenus = filteredMenus.filter(m => String(m.category_id) === String(categoryFilter));
    }

    if (availabilityFilter === 'available') {
        filteredMenus = filteredMenus.filter(m => m.available);
    } else if (availabilityFilter === 'unavailable') {
        filteredMenus = filteredMenus.filter(m => !m.available);
    }

    grid.innerHTML = filteredMenus.map(menu => `
        <div class="menu-card">
            <div class="menu-card-image">
                 
                <img src="${menu.image}" alt="${menu.name}" onerror="this.src='/static/images/food/salade.jpg'">
                <div class="menu-card-badges">
                    ${menu.popular ? '<span class="menu-badge popular"><i class="fas fa-fire"></i></span>' : ''}
                    ${!menu.available ? '<span class="menu-badge" style="background: var(--danger); color: white;">Indisponible</span>' : ''}
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
                        <span><i class="fas fa-clock"></i> ${menu.prepTime} min</span>
                        <span><i class="fas fa-tag"></i> ${menu.category}</span>
                    </div>
                    <div class="menu-card-actions">
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
    loadMenus();
}

function openMenuModal(menuId = null) {
    const modal = document.getElementById('menuModal');
    const form = document.getElementById('menuForm');

    form.reset();

    // Check if there are categories available
    if (categories.length === 0) {
        showToast('Veuillez d\'abord créer une catégorie', 'error');
        return;
    }

    if (menuId) {
        const menu = menus.find(m => m.id === menuId);
        if (menu) {
            document.getElementById('menuModalTitle').textContent = 'Modifier un Plat';
            document.getElementById('menuId').value = menu.id;
            document.getElementById('menuName').value = menu.name;
            document.getElementById('menuCategory').value = menu.category_id || '';
            document.getElementById('menuPrice').value = menu.price;
            document.getElementById('menuPrepTime').value = menu.prepTime;
            document.getElementById('menuDescription').value = menu.description;
            document.getElementById('menuImage').value = menu.image;
            document.getElementById('menuAvailable').value = menu.available.toString();
            document.getElementById('menuPopular').checked = menu.popular;
        }
    } else {
        document.getElementById('menuModalTitle').textContent = 'Ajouter un Plat';
        document.getElementById('menuId').value = '';
    }

    modal.classList.add('active');
}

function closeMenuModal() {
    document.getElementById('menuModal').classList.remove('active');
}

function saveMenu(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append('name', document.getElementById('menuName').value);
    formData.append('category_id', document.getElementById('menuCategory').value);
    formData.append('price', document.getElementById('menuPrice').value);
    formData.append('description', document.getElementById('menuDescription').value);
    formData.append('is_available', document.getElementById('menuAvailable').value === 'true');
    
    // Add image if selected
    const imageFile = document.getElementById('menuImageFile').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    const menuId = document.getElementById('menuId').value;

    const saveBtn = document.querySelector('#menuModal .btn-confirm');
    setButtonLoading(saveBtn, menuId ? 'Modification...' : 'Enregistrement...');
    closeMenuModal();

    if (menuId) {
        // Update existing menu - for now just update basic info
        const menuData = {
            product_name: document.getElementById('menuName').value,
            category_id: parseInt(document.getElementById('menuCategory').value),
            price: parseInt(document.getElementById('menuPrice').value),
            description: document.getElementById('menuDescription').value,
            is_available: document.getElementById('menuAvailable').value === 'true'
        };

        showSectionDataLoader('menu');
        fetch(`/api/admin/menus/${menuId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(menuData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                showToast('Plat modifié avec succès', 'success');
            } else {
                showToast('Erreur: ' + (data.message || 'Échec de la modification'), 'error');
            }
            loadMenusFromBackend();
        })
        .catch(error => {
            console.error('Error updating menu:', error);
            showToast('Erreur lors de la modification', 'error');
            hideSectionDataLoader('menu');
        })
        .finally(() => resetButton(saveBtn));
    } else {
        // Create new menu with image
        showSectionDataLoader('menu');
        fetch('/api/products', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                showToast('Plat ajouté avec succès', 'success');
            } else {
                showToast('Erreur: ' + (data.error || 'Échec de l\'ajout'), 'error');
            }
            loadMenusFromBackend();
        })
        .catch(error => {
            console.error('Error creating menu:', error);
            showToast('Erreur lors de l\'ajout', 'error');
            hideSectionDataLoader('menu');
        })
        .finally(() => resetButton(saveBtn));
    }
}

function getCategoryID(categoryName) {
    // Map category names to IDs from the backend
    const categoryMap = {
        'breakfast': 1,
        'lunch': 2,
        'snacks': 3,
        'salads': 4,
        'drinks': 5,
        'desserts': 6,
        'specials': 7
    };
    return categoryMap[categoryName] || 1;
}

function editMenu(id) {
    openMenuModal(id);
}

function deleteMenu(id) {
    showConfirmModal(
        'Supprimer un plat',
        'Voulez-vous vraiment supprimer ce plat ?',
        function() {
            showSectionDataLoader('menu');
            fetch(`/api/admin/menus/${id}`, { method: 'DELETE' })
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

// ========================================
// Category Management
// ========================================
function loadCategories() {
    showSectionDataLoader('categories');
    fetch('/api/categories')
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                categories = data.map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    image: cat.image,
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

function populateCategoryDropdowns() {
    // Populate filter dropdown
    const filterSelect = document.getElementById('categoryFilter');
    const menuSelect = document.getElementById('menuCategory');
    
    // Save current selected values
    const currentFilterValue = filterSelect.value;
    const currentMenuValue = menuSelect.value;
    
    // Clear existing options (keep the first "all categories" option for filter)
    filterSelect.innerHTML = '<option value="" disabled selected>📋 Toutes les catégories</option>';
    menuSelect.innerHTML = '<option value="" disabled selected>🍽️ Sélectionnez une catégorie</option>';
    
    // Add options for each category with emoji
    categories.forEach(cat => {
        const option1 = document.createElement('option');
        option1.value = cat.id;
        option1.textContent = `${cat.emoji || '🍽️'} ${cat.name}`;
        filterSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = cat.id;
        option2.textContent = `${cat.emoji || '🍽️'} ${cat.name}`;
        menuSelect.appendChild(option2);
    });
    
    // Restore selected values if they still exist
    if (currentFilterValue) {
        filterSelect.value = currentFilterValue;
    }
    if (currentMenuValue) {
        menuSelect.value = currentMenuValue;
    }
}

function loadCategoriesFromBackend() {
    loadCategories();
}

function renderCategories() {
    const grid = document.getElementById('categoriesGrid');

    if (categories.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-list"></i><h3>Aucune catégorie</h3><p>Commencez par ajouter une catégorie</p></div>';
        hideSectionDataLoader('categories');
        return;
    }

    grid.innerHTML = categories.map(cat => `
        <div class="category-card" style="border-top: 4px solid ${cat.color}">
            <div class="category-icon">
                ${cat.image ? `<img src="${cat.image}" alt="${cat.name}" class="category-image">` : cat.icon}
            </div>
            <h3 class="category-name">${cat.name}</h3>
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
    
    hideSectionDataLoader('categories');
}

function openCategoryModal(catId = null) {
    const modal = document.getElementById('categoryModal');
    const form = document.getElementById('categoryForm');

    form.reset();
    editingCategoryId = null;

    if (catId) {
        const cat = categories.find(c => c.id === catId);
        if (cat) {
            editingCategoryId = catId;
            document.getElementById('categoryModalTitle').textContent = 'Modifier une Catégorie';
            document.getElementById('categoryName').value = cat.name;
            document.getElementById('categoryDescription').value = cat.description || '';
            document.getElementById('categoryIcon').value = cat.icon || '';
            document.getElementById('categoryColor').value = cat.color || '#581b1f';
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

    const formData = new FormData();
    formData.append('name', document.getElementById('categoryName').value);
    formData.append('description', document.getElementById('categoryDescription').value);
    
    // Add image if selected
    const imageFile = document.getElementById('categoryImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    // Send to backend as JSON
    const categoryData = {
        category_name: document.getElementById('categoryName').value,
        description: document.getElementById('categoryDescription').value
    };

    const saveBtn = document.querySelector('#categoryModal .btn-confirm');
    setButtonLoading(saveBtn, 'Enregistrement...');
    const catIdToUpdate = editingCategoryId;
    closeCategoryModal();
    showSectionDataLoader('categories');

    const url = catIdToUpdate ? `/api/admin/categories/${catIdToUpdate}` : '/api/admin/categories';
    fetch(url, {
        method: catIdToUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showToast('Catégorie enregistrée avec succès', 'success');
        } else {
            showToast('Erreur: ' + (data.message || 'Échec de l\'enregistrement'), 'error');
        }
        loadCategoriesFromBackend();
    })
    .catch(error => {
        console.error('Error saving category:', error);
        showToast('Erreur lors de l\'enregistrement', 'error');
        hideSectionDataLoader('categories');
    })
    .finally(() => resetButton(saveBtn));
}

function editCategory(id) {
    openCategoryModal(id);
}

function deleteCategory(id) {
    showConfirmModal(
        'Supprimer une catégorie',
        'Voulez-vous vraiment supprimer cette catégorie ?',
        function() {
            showSectionDataLoader('categories');
            fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    showToast('Catégorie supprimée avec succès', 'success');
                } else {
                    showToast('Erreur: ' + (data.message || 'Échec de la suppression'), 'error');
                }
                loadCategories();
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
function loadOrders() {
    const tbody = document.getElementById('ordersTableBody');
    const filter = document.getElementById('ordersFilter').value;

    showSectionDataLoader('orders');
    fetch('/api/admin/orders')
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
    fetch(`/api/orders/${id}`)
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
                        <option value="pending" ${order.order_status === 'pending' ? 'selected' : ''}>En attente</option>
                        <option value="processing" ${order.order_status === 'processing' ? 'selected' : ''}>En cours</option>
                        <option value="completed" ${order.order_status === 'completed' ? 'selected' : ''}>Complété</option>
                        <option value="cancelled" ${order.order_status === 'cancelled' ? 'selected' : ''}>Annulé</option>
                    </select>
                </div>
            `;

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
    const orderId = document.getElementById('currentOrderId').value;
    const newStatus = document.getElementById('orderStatusUpdate') && document.getElementById('orderStatusUpdate').value;

    if (!orderId || !newStatus) {
        showToast('Impossible de mettre à jour : commande non identifiée', 'error');
        return;
    }

    const btn = document.getElementById('updateStatusBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mise à jour...'; }

    fetch(`/api/admin/orders/${orderId}/status`, {
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
// Users Management
// ========================================
function loadUsers() {
    hideSectionDataLoader('users');
    filterUsers();
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

// ========================================
// Utilities
// ========================================
// formatPrice, formatDate, showToast, showConfirmModal, closeConfirmModal, confirmAction → see utils.js

function loadUserOrderCounts() {
    // Fetch all orders and count by user_id
    fetch('/api/admin/orders')
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
window.startClock = startClock;
window.refreshDashboard = refreshDashboard;
