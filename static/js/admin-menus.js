/** admin-menus.js — Menu and category CRUD management */
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
            const popularEl = document.getElementById('menuPopular');
            if (popularEl) popularEl.checked = !!menu.popular;
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
        is_available: document.getElementById('menuAvailable')?.value !== 'false',
        is_popular: document.getElementById('menuPopular')?.checked || false
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

