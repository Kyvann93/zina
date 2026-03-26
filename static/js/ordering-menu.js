/** ordering-menu.js — Menu loading, categories, rendering, filtering */
// ========================================
// Menu System - Load from Backend
// ========================================
var menuItems = []; // Store all menu items from backend

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
    apiFetch('/api/categories')
        .then(function(data) {
            const nav = document.getElementById('categoryNav');
            if (!nav) return;

            // Category name translations (French → English)
            var categoryTranslations = {
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

            // Build category map with both French and English names
            window.apiCategories = {};
            data.forEach(function(cat) {
                var emoji = cat.emoji || getCategoryEmoji(cat.name);
                var englishName = categoryTranslations[cat.name.toLowerCase()] || cat.name;
                window.apiCategories[String(cat.id)] = {
                    name: cat.name,
                    nameEn: englishName,
                    emoji: emoji
                };
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
                // Set initial category name based on current language
                var displayName = (currentLanguage === 'en' && categoryTranslations[cat.name.toLowerCase()])
                    ? categoryTranslations[cat.name.toLowerCase()]
                    : cat.name;
                btn.innerHTML =
                    '<span class="cat-emoji">' + iconHTML + '</span>' +
                    '<span class="cat-name">' + displayName + '</span>';
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

    apiFetch('/api/menu/feed?limit=' + API_PAGE_SIZE + '&offset=' + apiOffset)
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
                        popular:          item.is_popular === true,
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
        var catName  = catInfo ? (currentLanguage === 'en' && catInfo.nameEn ? catInfo.nameEn : catInfo.name) : (currentLanguage === 'fr' ? 'Divers' : 'Other');
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

    apiFetch('/api/sous-categories?category_id=' + encodeURIComponent(categoryId))
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
// Exports
// ========================================
window.filterCategory = filterCategory;
window.filterSubcategory = filterSubcategory;
window.filterItems = filterItems;
window.searchMenu = searchMenu;
