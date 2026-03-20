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
    // Show the inline loader for the section
    const loaderElement = document.getElementById(`${sectionName}LoaderContainer`) ||
                         document.getElementById(`${sectionName}LoaderRow`) ||
                         document.getElementById(`${sectionName}LoaderFill`);
    
    if (loaderElement) {
        if (loaderElement.tagName === 'TR') {
            // For table rows, use the show class
            loaderElement.classList.add('show');
        } else {
            loaderElement.style.display = 'flex';
        }
    }
    
    const loaderFill = document.getElementById(`${sectionName}LoaderFill`);
    if (loaderFill) {
        // Reset animation
        loaderFill.style.height = '0%';
        // Start animation after a small delay
        setTimeout(() => {
            animateSmallLoader(loaderFill);
        }, 100);
    }
}

function hideSectionDataLoader(sectionName) {
    // Hide the inline loader for the section
    const loaderElement = document.getElementById(`${sectionName}LoaderContainer`) ||
                         document.getElementById(`${sectionName}LoaderRow`);
    
    if (loaderElement) {
        if (loaderElement.tagName === 'TR') {
            // For table rows, remove the show class
            loaderElement.classList.remove('show');
        } else {
            loaderElement.style.display = 'none';
        }
    }
    
    const loaderFill = document.getElementById(`${sectionName}LoaderFill`);
    if (loaderFill) {
        loaderFill.style.height = '0%';
    }
}

function animateSmallLoader(fillElement) {
    // Animate the fill from 0 to 100% with easing
    let progress = 0;
    const startTime = Date.now();
    const duration = 2000; // 2 second animation
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed < duration) {
            // Ease-out function for natural deceleration
            progress = Math.min(100, (elapsed / duration) * 100);
            // Apply easing function
            const easeProgress = progress - (progress / 100) * (progress / 100) * 0.3;
            fillElement.style.height = `${easeProgress}%`;
            requestAnimationFrame(animate);
        } else {
            fillElement.style.height = '100%';
        }
    };
    
    requestAnimationFrame(animate);
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
    
    if (!usernameField || !passwordField) {
        console.error('Login form fields not found');
        return;
    }
    
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
}

function handleLogout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        sessionStorage.removeItem('zina_admin');
        localStorage.removeItem('adminCurrentSection'); // Clear saved section
        location.reload();
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
        .then(response => response.json())
=======
    // Load orders from API
    fetchAdminOrders()
>>>>>>> Stashed changes
        .then(data => {
            orders = data.length > 0 ? data : [];
        })
        .catch(error => {
            console.error('Error loading orders:', error);
            orders = [];
        });

    // Users will be loaded when the users API is implemented
    users = [];
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
    document.getElementById('totalMenus').textContent = menus.length;
    document.getElementById('todayOrders').textContent = orders.length;
    document.getElementById('totalUsers').textContent = users.length;
    
    const revenue = orders.reduce((sum, order) => sum + order.total, 0);
    document.getElementById('todayRevenue').textContent = revenue.toLocaleString('fr-FR');
}

// ========================================
// Menu Management
// ========================================
function loadMenus() {
    loadMenusFromBackend();
}

function loadMenusFromBackend() {
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
            renderMenus();
        })
        .catch(error => {
            console.error('Error loading menus:', error);
            menus = [];
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
        filteredMenus = filteredMenus.filter(m => m.category === categoryFilter);
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

    if (menuId) {
        // Update existing menu - for now just update basic info
        const menuData = {
            product_name: document.getElementById('menuName').value,
            category_id: parseInt(document.getElementById('menuCategory').value),
            price: parseInt(document.getElementById('menuPrice').value),
            description: document.getElementById('menuDescription').value,
            is_available: document.getElementById('menuAvailable').value === 'true'
        };

        fetch(`/api/admin/menus/${menuId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(menuData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                showToast('Plat modifié avec succès', 'success');
                loadMenusFromBackend();
            } else {
                showToast('Erreur: ' + (data.message || 'Échec de la modification'), 'error');
            }
        })
        .catch(error => {
            console.error('Error updating menu:', error);
            showToast('Erreur lors de la modification', 'error');
        });
    } else {
        // Create new menu with image
        fetch('/api/products', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                showToast('Plat ajouté avec succès', 'success');
                loadMenusFromBackend();
            } else {
                showToast('Erreur: ' + (data.error || 'Échec de l\'ajout'), 'error');
            }
        })
        .catch(error => {
            console.error('Error creating menu:', error);
            showToast('Erreur lors de l\'ajout', 'error');
        });
    }

    closeMenuModal();
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
            fetch(`/api/admin/menus/${id}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    showToast('Plat supprimé avec succès', 'success');
                    loadMenus();
                } else {
                    showToast('Erreur: ' + (data.message || 'Échec de la suppression'), 'error');
                }
            })
            .catch(error => {
                console.error('Error deleting menu:', error);
                showToast('Erreur lors de la suppression', 'error');
            });
        }
    );
}

// ========================================
// Category Management
// ========================================
function loadCategories() {
    // Load from backend
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
            renderCategories();
        })
        .catch(error => {
            console.error('Error loading categories:', error);
            categories = [];
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

    if (catId) {
        const cat = categories.find(c => c.id === catId);
        if (cat) {
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

    // Send to backend
    fetch('/api/categories', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showToast('Catégorie enregistrée avec succès', 'success');
            // Reload categories from backend
            loadCategoriesFromBackend();
        } else {
            showToast('Erreur: ' + (data.error || 'Échec de l\'enregistrement'), 'error');
        }
    })
    .catch(error => {
        console.error('Error saving category:', error);
        showToast('Erreur lors de l\'enregistrement', 'error');
    });

    closeCategoryModal();
}

function editCategory(id) {
    openCategoryModal(id);
}

function deleteCategory(id) {
    showConfirmModal(
        'Supprimer une catégorie',
        'Voulez-vous vraiment supprimer cette catégorie ?',
        function() {
            fetch(`/api/admin/categories/${id}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    showToast('Catégorie supprimée avec succès', 'success');
                    loadCategories();
                } else {
                    showToast('Erreur: ' + (data.message || 'Échec de la suppression'), 'error');
                }
            })
            .catch(error => {
                console.error('Error deleting category:', error);
                showToast('Erreur lors de la suppression', 'error');
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
}

function viewOrderDetails(id) {
    // Fetch order details from API
    fetch(`/api/orders/${id}`)
        .then(response => response.json())
        .then(order => {
            if (!order || order.error) {
                showToast('Commande introuvable', 'error');
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

            // Store order ID in modal for update function
            document.getElementById('orderDetailsModal').dataset.orderId = order.order_id;
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
}

// ========================================
// Users Management
// ========================================
function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-users"></i><h3>Aucun utilisateur</h3><p>Aucun utilisateur enregistré</p></div></td></tr>';
    } else {
        tbody.innerHTML = users.map(user => `
            <tr>
                <td><strong>${user.matricule}</strong></td>
                <td>${user.name}</td>
                <td>${user.department}</td>
                <td>${user.orders}</td>
                <td>${user.joined}</td>
                <td>
                    <button class="action-btn edit" onclick="viewUser(${user.matricule})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    hideSectionDataLoader('users');
}

function filterUsers() {
    // Implement search functionality
}

function viewUser(matricule) {
    const user = users.find(u => u.matricule === matricule);
    showToast(`Profil de ${user.name}`, 'info');
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
}

// Close modals on escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// ========================================
// Confirmation Modal
// ========================================
let confirmCallback = null;

function showConfirmModal(title, message, onConfirm) {
    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = onConfirm;
    document.getElementById('confirmModal').classList.add('active');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
    confirmCallback = null;
}

function confirmAction() {
    if (confirmCallback) {
        confirmCallback();
    }
    closeConfirmModal();
}

// Add click listener to confirm button
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('confirmBtn').addEventListener('click', confirmAction);
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
window.filterUsers = filterUsers;
window.viewUser = viewUser;
window.saveGeneralSettings = saveGeneralSettings;
window.saveHoursSettings = saveHoursSettings;
window.saveFeesSettings = saveFeesSettings;
window.saveFormulasSettings = saveFormulasSettings;
window.loadFormulasSettings = loadFormulasSettings;
