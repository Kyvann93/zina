/** admin-access.js — Admin user management, roles and permissions */
// ========================================
// Admin Users Management
// ========================================
function loadAdmins() {
    adminFetch('/api/admin/admin-users')
        .then(r => r.ok ? r.json() : [])
        .then(data => {
            adminUsers = data || [];
            // Load roles for the approve modal dropdown
            adminFetch('/api/admin/roles')
                .then(r => r.ok ? r.json() : [])
                .then(roles => { adminRoles = roles || []; renderAdmins(); })
                .catch(() => { adminRoles = []; renderAdmins(); });
        })
        .catch(() => {
            adminUsers = [];
            renderAdmins();
        });
}

function renderAdmins() {
    const pending = adminUsers.filter(u => !u.is_approved);
    const active  = adminUsers.filter(u => u.is_approved);

    // Pending card
    const pendingCard = document.getElementById('pendingAdminsCard');
    const pendingBadge = document.getElementById('pendingAdminsBadge');
    const navBadge = document.getElementById('navPendingAdmins');
    if (pendingCard) pendingCard.style.display = pending.length ? '' : 'none';
    if (pendingBadge) pendingBadge.textContent = pending.length;
    if (navBadge) {
        navBadge.textContent = pending.length;
        navBadge.style.display = pending.length ? 'inline-flex' : 'none';
    }

    const pendingBody = document.getElementById('pendingAdminsBody');
    if (pendingBody) {
        if (!pending.length) {
            pendingBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--medium-gray)">Aucune demande en attente</td></tr>';
        } else {
            pendingBody.innerHTML = pending.map(u => `
                <tr>
                    <td><strong>${escHtml(u.username)}</strong></td>
                    <td>${escHtml(u.email)}</td>
                    <td>${u.created_at ? formatDate(u.created_at) : '-'}</td>
                    <td>
                        <div style="display:flex;gap:6px">
                            <button class="btn-action btn-edit" onclick="openApproveAdminModal(${u.id}, '${escHtml(u.username)}')" title="Approuver">
                                <i class="fas fa-check"></i> Approuver
                            </button>
                            <button class="btn-action btn-delete" onclick="deleteAdminUserConfirm(${u.id}, '${escHtml(u.username)}')" title="Rejeter">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </td>
                </tr>`).join('');
        }
    }

    const activeBody = document.getElementById('activeAdminsBody');
    if (activeBody) {
        if (!active.length) {
            activeBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--medium-gray)">Aucun administrateur actif</td></tr>';
        } else {
            activeBody.innerHTML = active.map(u => `
                <tr>
                    <td><strong>${escHtml(u.username)}</strong></td>
                    <td>${escHtml(u.email)}</td>
                    <td>
                        ${hasPermission('admins_manage')
                            ? `<select onchange="changeAdminRole(${u.id}, this.value)" style="padding:4px 8px;border-radius:6px;border:1px solid var(--light-gray);font-size:13px">
                                <option value="">-- Aucun --</option>
                                ${adminRoles.map(r => `<option value="${r.id}" ${u.role_id == r.id ? 'selected' : ''}>${escHtml(r.role_name)}</option>`).join('')}
                               </select>`
                            : `<span class="status-badge" style="background:rgba(88,27,31,0.1);color:var(--primary)">${escHtml(u.role_name || '—')}</span>`
                        }
                    </td>
                    <td>${u.created_at ? formatDate(u.created_at) : '-'}</td>
                    <td>
                        ${hasPermission('admins_manage')
                            ? `<button class="btn-action btn-delete" onclick="deleteAdminUserConfirm(${u.id}, '${escHtml(u.username)}')" title="Supprimer">
                                   <i class="fas fa-trash"></i>
                               </button>`
                            : '—'
                        }
                    </td>
                </tr>`).join('');
        }
    }
}

function openApproveAdminModal(userId, username) {
    document.getElementById('approveAdminId').value = userId;
    document.getElementById('approveAdminUsername').textContent = username;
    const select = document.getElementById('approveAdminRole');
    select.innerHTML = '<option value="">Sélectionner un rôle...</option>' +
        adminRoles.map(r => `<option value="${r.id}">${escHtml(r.role_name)}</option>`).join('');
    document.getElementById('approveAdminModal').classList.add('active');
}

function closeApproveAdminModal() {
    document.getElementById('approveAdminModal').classList.remove('active');
}

function confirmApproveAdmin(event) {
    event.preventDefault();
    const userId = document.getElementById('approveAdminId').value;
    const roleId = document.getElementById('approveAdminRole').value;
    const btn = event.target.querySelector('button[type="submit"]');
    setButtonLoading(btn, 'Approbation...');

    adminFetch(`/api/admin/admin-users/${userId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: roleId || null }),
    })
        .then(r => r.json())
        .then(d => {
            if (d.status === 'success') {
                showToast(d.message, 'success');
                closeApproveAdminModal();
                loadAdmins();
            } else {
                showToast(d.message || 'Erreur', 'error');
            }
        })
        .catch(() => showToast('Erreur réseau', 'error'))
        .finally(() => resetButton(btn));
}

function changeAdminRole(userId, roleId) {
    adminFetch(`/api/admin/admin-users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: roleId || null }),
    })
        .then(r => r.json())
        .then(d => showToast(d.message || 'Rôle mis à jour', d.status === 'success' ? 'success' : 'error'))
        .catch(() => showToast('Erreur réseau', 'error'));
}

function deleteAdminUserConfirm(userId, username) {
    if (!confirm(`Supprimer l'administrateur "${username}" ? Cette action est irréversible.`)) return;
    adminFetch(`/api/admin/admin-users/${userId}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(d => {
            showToast(d.message || 'Supprimé', d.status === 'success' ? 'success' : 'error');
            if (d.status === 'success') loadAdmins();
        })
        .catch(() => showToast('Erreur réseau', 'error'));
}


// ========================================
// Roles & Permissions Management
// ========================================
const PERMISSION_GROUPS = [
    { label: 'Tableau de bord', perms: [{ key: 'dashboard', label: 'Voir le tableau de bord' }] },
    { label: 'Commandes',       perms: [{ key: 'orders', label: 'Voir les commandes' }, { key: 'orders_manage', label: 'Gérer les commandes' }] },
    { label: 'Plats & Menus',   perms: [{ key: 'menu', label: 'Voir les plats' }, { key: 'menu_manage', label: 'Gérer les plats' }] },
    { label: 'Catégories',      perms: [{ key: 'categories', label: 'Voir les catégories' }, { key: 'categories_manage', label: 'Gérer les catégories' }] },
    { label: 'Employés',        perms: [{ key: 'users', label: 'Voir les employés' }] },
    { label: 'Administrateurs', perms: [{ key: 'admins', label: 'Voir les administrateurs' }, { key: 'admins_manage', label: 'Approuver / supprimer des admins' }] },
    { label: 'Rôles',           perms: [{ key: 'roles', label: 'Voir les rôles' }, { key: 'roles_manage', label: 'Créer / modifier / supprimer des rôles' }] },
    { label: 'Paramètres',      perms: [{ key: 'settings', label: 'Voir les paramètres' }, { key: 'settings_manage', label: 'Modifier les paramètres' }] },
];

function loadRoles() {
    adminFetch('/api/admin/roles')
        .then(r => r.ok ? r.json() : [])
        .then(data => {
            adminRoles = data || [];
            renderRoles();
        })
        .catch(() => {
            adminRoles = [];
            renderRoles();
        });
}

function renderRoles() {
    const grid = document.getElementById('rolesGrid');
    if (!grid) return;
    if (!adminRoles.length) {
        grid.innerHTML = '<p style="color:var(--medium-gray);padding:24px">Aucun rôle trouvé.</p>';
        return;
    }

    // Get saved collapsed states from localStorage
    const collapsedStates = JSON.parse(localStorage.getItem('rolesCollapsedStates') || '{}');

    grid.innerHTML = adminRoles.map(role => {
        const perms = role.permissions || {};
        const isSuper = role.is_super_admin;
        const totalPerms = Object.values(perms).filter(Boolean).length;
        const totalKeys = PERMISSION_GROUPS.reduce((n, g) => n + g.perms.length, 0);
        const isCollapsed = collapsedStates[role.id] === true;

        return `
        <div class="settings-card role-card ${isCollapsed ? 'role-card--collapsed' : ''}" data-role-id="${role.id}" style="position:relative">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
                <div style="flex:1">
                    <h3 style="margin-bottom:4px;display:flex;align-items:center;gap:8px">
                        ${escHtml(role.role_name)}
                        ${isSuper ? '<span class="status-badge status-confirmed" style="font-size:10px;padding:2px 8px">Super Admin</span>' : ''}
                    </h3>
                    <p style="font-size:12px;color:var(--medium-gray)">${totalPerms} / ${totalKeys} permissions actives</p>
                </div>
                <button class="role-collapse-btn" onclick="toggleRoleCard(${role.id}, '${escHtml(role.role_name)}')" title="${isCollapsed ? 'Développer' : 'Réduire'}">
                    <i class="fas fa-chevron-${isCollapsed ? 'down' : 'up'}"></i>
                </button>
            </div>
            <div class="role-content" style="${isCollapsed ? 'display:none' : ''}">
                <div class="perm-summary-grid">
                    ${PERMISSION_GROUPS.map(g => `
                        <div class="perm-group-summary">
                            <span class="perm-group-label">${g.label}</span>
                            ${g.perms.map(p => `
                                <span class="perm-chip ${isSuper || perms[p.key] ? 'perm-chip--on' : 'perm-chip--off'}">
                                    <i class="fas fa-${isSuper || perms[p.key] ? 'check' : 'times'}"></i>
                                    ${p.label}
                                </span>`).join('')}
                        </div>`).join('')}
                </div>
                ${hasPermission('roles_manage') && !isSuper ? `
                <div style="display:flex;gap:8px;margin-top:16px;border-top:1px solid var(--light-gray);padding-top:16px">
                    <button class="btn-action btn-edit" onclick="editRole(${role.id})">
                        <i class="fas fa-edit"></i> Modifier
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteRoleConfirm(${role.id}, '${escHtml(role.role_name)}')">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                </div>` : ''}
            </div>
        </div>`;
    }).join('');
}

function openRoleModal(existingRole) {
    document.getElementById('roleModalTitle').innerHTML = existingRole
        ? '<i class="fas fa-edit"></i> Modifier le rôle'
        : '<i class="fas fa-key"></i> Nouveau Rôle';
    document.getElementById('roleId').value = existingRole ? existingRole.id : '';
    document.getElementById('roleName').value = existingRole ? existingRole.role_name : '';

    const perms = existingRole ? (existingRole.permissions || {}) : {};
    const grid = document.getElementById('permissionsGrid');
    grid.innerHTML = PERMISSION_GROUPS.map(g => `
        <div class="perm-group-block">
            <div class="perm-group-title">${g.label}</div>
            ${g.perms.map(p => `
                <label class="perm-checkbox-label">
                    <input type="checkbox" name="perm_${p.key}" value="${p.key}" ${perms[p.key] ? 'checked' : ''}>
                    <span class="perm-checkmark"><i class="fas fa-check"></i></span>
                    <span>${p.label}</span>
                </label>`).join('')}
        </div>`).join('');

    document.getElementById('roleModal').classList.add('active');
}

function closeRoleModal() {
    document.getElementById('roleModal').classList.remove('active');
}

function editRole(roleId) {
    const role = adminRoles.find(r => r.id === roleId);
    if (role) openRoleModal(role);
}

function saveRole(event) {
    event.preventDefault();
    const roleId = document.getElementById('roleId').value;
    const roleName = document.getElementById('roleName').value.trim();
    const checkboxes = document.querySelectorAll('#permissionsGrid input[type="checkbox"]');
    const permissions = {};
    checkboxes.forEach(cb => { permissions[cb.value] = cb.checked; });

    const isEdit = !!roleId;
    const url = isEdit ? `/api/admin/roles/${roleId}` : '/api/admin/roles';
    const method = isEdit ? 'PUT' : 'POST';
    const btn = event.target.querySelector('button[type="submit"]');
    setButtonLoading(btn, 'Enregistrement...');

    adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_name: roleName, permissions }),
    })
        .then(r => r.json())
        .then(d => {
            if (d.status === 'success') {
                showToast(d.message, 'success');
                closeRoleModal();
                loadRoles();
            } else {
                showToast(d.message || 'Erreur', 'error');
            }
        })
        .catch(() => showToast('Erreur réseau', 'error'))
        .finally(() => resetButton(btn));
}

function deleteRoleConfirm(roleId, roleName) {
    if (!confirm(`Supprimer le rôle "${roleName}" ? Les admins avec ce rôle n'auront plus de rôle assigné.`)) return;
    adminFetch(`/api/admin/roles/${roleId}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(d => {
            showToast(d.message || 'Supprimé', d.status === 'success' ? 'success' : 'error');
            if (d.status === 'success') loadRoles();
        })
        .catch(() => showToast('Erreur réseau', 'error'));
}

// Simple HTML escape helper
function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
window.applyOrderFilters = applyOrderFilters;
window.resetOrdersFilters = resetOrdersFilters;
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
window.toggleMenuSelection = toggleMenuSelection;
window.selectAllMenus = selectAllMenus;
window.deselectAllMenus = deselectAllMenus;
window.toggleSelectAll = toggleSelectAll;
window.updateBulkBar = updateBulkBar;
window.quickToggleAvailability = quickToggleAvailability;
window.bulkSetAvailable = bulkSetAvailable;
window.bulkDeleteMenus = bulkDeleteMenus;
window.showRegisterForm = showRegisterForm;
window.showLoginForm = showLoginForm;
window.handleAdminRegister = handleAdminRegister;
window.loadAdmins = loadAdmins;
window.openApproveAdminModal = openApproveAdminModal;
window.closeApproveAdminModal = closeApproveAdminModal;
window.confirmApproveAdmin = confirmApproveAdmin;
window.changeAdminRole = changeAdminRole;
window.deleteAdminUserConfirm = deleteAdminUserConfirm;
window.loadRoles = loadRoles;
window.openRoleModal = openRoleModal;
window.closeRoleModal = closeRoleModal;
window.editRole = editRole;
window.saveRole = saveRole;
window.deleteRoleConfirm = deleteRoleConfirm;
window.toggleRolesExpand = toggleRolesExpand;
window.toggleRoleCard = toggleRoleCard;

// Toggle individual role card collapse/expand
function toggleRoleCard(roleId, roleName) {
    // Get current states
    const collapsedStates = JSON.parse(localStorage.getItem('rolesCollapsedStates') || '{}');

    // Toggle this role's state
    collapsedStates[roleId] = !collapsedStates[roleId];

    // Save to localStorage
    localStorage.setItem('rolesCollapsedStates', JSON.stringify(collapsedStates));

    // Re-render roles to reflect the change
    renderRoles();
}

// Roles section collapse/expand (legacy - kept for compatibility)
function toggleRolesExpand() {
    const grid = document.getElementById('rolesGrid');
    const btn = document.getElementById('toggleRolesBtn');
    if (!grid || !btn) return;

    grid.classList.toggle('collapsed');
    btn.classList.toggle('collapsed');

    // Save state to localStorage
    const isCollapsed = grid.classList.contains('collapsed');
    localStorage.setItem('rolesGridCollapsed', isCollapsed);

    // Update icon
    const icon = btn.querySelector('i');
    if (icon) {
        icon.className = isCollapsed ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
    }
}
