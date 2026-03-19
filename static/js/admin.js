/**
 * ZINA Cantine BAD — Admin Dashboard JS
 * Ultimate Edition: real KPIs, canvas charts, auto-refresh
 */

// ═══════════════════════════════════
// State
// ═══════════════════════════════════
let menus      = [];
let categories = [];
let orders     = [];
let users      = [];
let currentSection  = 'dashboard';
let refreshTimer    = null;
let notifications   = [];

// ═══════════════════════════════════
// Page Loader
// ═══════════════════════════════════
let loadProgress = 0, progressInterval = null;

function startLoader() {
  loadProgress = 0;
  progressInterval = setInterval(() => {
    loadProgress = Math.min(loadProgress + Math.random() * 10, 90);
    _setLoaderProgress(loadProgress);
  }, 120);
}
function completeLoader() {
  clearInterval(progressInterval);
  _setLoaderProgress(100);
  setTimeout(() => {
    const el = document.getElementById('pageLoader');
    if (el) el.classList.add('hidden');
  }, 600);
}
function _setLoaderProgress(v) {
  const fill = document.getElementById('loaderFill');
  const bar  = document.getElementById('loaderProgress');
  if (fill) fill.style.height = v + '%';
  if (bar)  bar.style.width  = v + '%';
}

function showSectionDataLoader(name) {
  const el = document.getElementById(`${name}LoaderContainer`) ||
             document.getElementById(`${name}LoaderRow`);
  if (!el) return;
  if (el.tagName === 'TR') el.classList.add('show');
  else el.style.display = 'flex';
  const fill = document.getElementById(`${name}LoaderFill`);
  if (fill) { fill.style.height = '0%'; setTimeout(() => animateSmallLoader(fill), 100); }
}
function hideDataLoader(name) {
  const el = document.getElementById(`${name}LoaderContainer`) ||
             document.getElementById(`${name}LoaderRow`);
  if (!el) return;
  if (el.tagName === 'TR') el.classList.remove('show');
  else el.style.display = 'none';
}
function animateSmallLoader(fill) {
  let p = 0;
  const iv = setInterval(() => {
    p = Math.min(p + Math.random() * 15, 90);
    fill.style.height = p + '%';
    if (p >= 90) clearInterval(iv);
  }, 150);
}

// ═══════════════════════════════════
// Auth
// ═══════════════════════════════════
function handleAdminLogin(e) {
  e.preventDefault();
  const u = document.getElementById('adminUsername').value;
  const p = document.getElementById('adminPassword').value;
  if (u === 'admin' && p === 'admin123') {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('adminWrapper').style.display = 'flex';
    document.getElementById('adminName').textContent = 'Admin';
    document.getElementById('adminAvatar').textContent = 'A';
    startApp();
  } else {
    showToast('Identifiants incorrects', 'error');
    document.getElementById('adminPassword').value = '';
  }
}
function handleLogout() {
  document.getElementById('adminWrapper').style.display = 'none';
  document.getElementById('loginOverlay').style.display = 'flex';
  clearInterval(refreshTimer);
  showToast('Déconnecté avec succès', 'info');
}

// ═══════════════════════════════════
// Init
// ═══════════════════════════════════
function startApp() {
  startLoader();
  Promise.all([loadDashboard(), loadCategories()]).finally(() => completeLoader());
  // Auto-refresh every 60s
  refreshTimer = setInterval(() => {
    if (currentSection === 'dashboard') loadDashboard();
    updateLastUpdated();
  }, 60000);
}

// ═══════════════════════════════════
// Navigation
// ═══════════════════════════════════
const SECTION_TITLES = {
  dashboard:  'Tableau de Bord',
  menu:       'Plats',
  categories: 'Catégories',
  orders:     'Commandes',
  users:      'Utilisateurs',
  settings:   'Paramètres',
};
function showSection(name) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const sec = document.getElementById(name + 'Section');
  const nav = document.getElementById('nav-' + name);
  if (sec) sec.classList.add('active');
  if (nav) nav.classList.add('active');
  document.getElementById('pageTitle').textContent = SECTION_TITLES[name] || name;
  currentSection = name;

  if (name === 'menu')       loadMenus();
  if (name === 'categories') loadCategoriesSection();
  if (name === 'orders')     loadOrders();
  if (name === 'users')      loadUsers();
}

function toggleSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const main    = document.getElementById('adminMain');
  sidebar.classList.toggle('collapsed');
  main.classList.toggle('expanded');
}
function toggleMobileSidebar() {
  document.getElementById('adminSidebar').classList.toggle('mobile-open');
}

// ═══════════════════════════════════
// Dashboard KPIs
// ═══════════════════════════════════
async function loadDashboard() {
  try {
    const [ordersRes, menusRes, usersRes] = await Promise.all([
      fetch('/api/admin/orders').then(r => r.json()),
      fetch('/api/admin/menus').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
    ]);

    orders = Array.isArray(ordersRes) ? ordersRes : [];
    menus  = Array.isArray(menusRes)  ? menusRes  : [];
    users  = Array.isArray(usersRes)  ? usersRes  : [];

    computeAndRenderKPIs();
    renderRecentOrders();
    renderPopularItems();
    renderCharts();
    updatePendingBadge();
    updateLastUpdated();
  } catch (err) {
    console.error('Dashboard load error:', err);
    showToast('Erreur de chargement du tableau de bord', 'error');
  }
}

function computeAndRenderKPIs() {
  const today = new Date().toISOString().slice(0, 10);

  const todayOrders = orders.filter(o => (o.created_at || '').slice(0, 10) === today);
  const completedToday = todayOrders.filter(o => o.order_status === 'completed');
  const pendingToday   = todayOrders.filter(o => o.order_status === 'pending' || o.order_status === 'processing');

  const revenue = completedToday.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);
  const avgBasket = completedToday.length > 0 ? revenue / completedToday.length : 0;
  const completionRate = todayOrders.length > 0
    ? Math.round((completedToday.length / todayOrders.length) * 100) : 0;

  // Yesterday for trends
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const yOrders  = orders.filter(o => (o.created_at || '').slice(0, 10) === yesterday);
  const yRevenue = yOrders.filter(o => o.order_status === 'completed')
                          .reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);

  // Render KPI values
  setText('kpiRevenue',    formatFCFA(revenue));
  setText('kpiOrders',     todayOrders.length);
  setText('kpiOrdersSub',  `${completedToday.length} complétées · ${pendingToday.length} en attente`);
  setText('kpiAvg',        formatFCFA(avgBasket));
  setText('kpiCompletion', completionRate + '%');
  setText('kpiCompletionSub', `${completedToday.length} / ${todayOrders.length} commandes`);
  setText('statMenus',     menus.length);
  setText('statPending',   pendingToday.length);
  setText('statUsers',     users.length);

  // Trends
  renderTrend('trendRevenue', revenue, yRevenue, '', 'FCFA');
  renderTrend('trendOrders',  todayOrders.length, yOrders.length);
  renderTrend('trendAvg',     avgBasket, 0, '', '');
  renderTrend('trendCompletion', completionRate, 0, '', '%');

  // Alert if many pending
  if (pendingToday.length > 5) {
    pushNotif(`⚠️ ${pendingToday.length} commandes en attente`, 'warning');
  }

  // Sparklines (last 7 days mini data)
  const sparkData = getLast7DaysData();
  drawSparkline('sparkRevenue',    sparkData.revenue,     '#C4002B');
  drawSparkline('sparkOrders',     sparkData.orders,      '#F5A623');
  drawSparkline('sparkAvg',        sparkData.avg,         '#00A651');
  drawSparkline('sparkCompletion', sparkData.completion,  '#0984E3');
}

function renderTrend(id, current, previous, prefix = '', suffix = '') {
  const el = document.getElementById(id);
  if (!el) return;
  if (previous === 0 || previous === undefined) {
    el.className = 'kpi-trend neutral';
    el.innerHTML = `— <i class="fas fa-minus"></i>`;
    return;
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) {
    el.className = 'kpi-trend up';
    el.innerHTML = `+${pct}% <i class="fas fa-arrow-up"></i>`;
  } else if (pct < 0) {
    el.className = 'kpi-trend down';
    el.innerHTML = `${pct}% <i class="fas fa-arrow-down"></i>`;
  } else {
    el.className = 'kpi-trend neutral';
    el.innerHTML = `0% <i class="fas fa-minus"></i>`;
  }
}

function getLast7DaysData() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push(d);
  }
  const revenue    = days.map(d => orders.filter(o => (o.created_at||'').slice(0,10)===d && o.order_status==='completed').reduce((s,o)=>s+(parseFloat(o.total_amount)||0),0));
  const orderCount = days.map(d => orders.filter(o => (o.created_at||'').slice(0,10)===d).length);
  const avg        = orderCount.map((c, i) => c > 0 ? revenue[i] / c : 0);
  const completion = days.map(d => {
    const total = orders.filter(o => (o.created_at||'').slice(0,10)===d).length;
    const done  = orders.filter(o => (o.created_at||'').slice(0,10)===d && o.order_status==='completed').length;
    return total > 0 ? Math.round((done/total)*100) : 0;
  });
  return { revenue, orders: orderCount, avg, completion };
}

// ═══════════════════════════════════
// Recent Orders Table
// ═══════════════════════════════════
function renderRecentOrders() {
  const tbody = document.getElementById('recentOrdersBody');
  if (!tbody) return;
  const recent = orders.slice(0, 8);
  if (!recent.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-receipt"></i><h3>Aucune commande</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = recent.map(o => `
    <tr>
      <td><strong>#${String(o.order_id).slice(-4) || '—'}</strong></td>
      <td style="color:var(--text-secondary)">${shortId(o.user_id)}</td>
      <td><strong>${formatFCFA(o.total_amount)}</strong></td>
      <td>${statusBadge(o.order_status)}</td>
      <td style="color:var(--text-muted);font-size:12px;">${formatTime(o.created_at)}</td>
    </tr>`).join('');
}

// ═══════════════════════════════════
// Popular Items
// ═══════════════════════════════════
function renderPopularItems() {
  const container = document.getElementById('popularItemsList');
  if (!container) return;
  // Count by category as proxy for popularity
  const catCount = {};
  menus.forEach(m => {
    catCount[m.name] = (catCount[m.name] || 0) + 1;
  });
  // Use menus sorted by price as a visual stand-in for popularity
  const sorted = [...menus].sort((a, b) => b.price - a.price).slice(0, 7);
  const max = sorted[0] ? sorted[0].price : 1;

  const rankClass = ['gold-rank','silver-rank','bronze-rank'];
  container.innerHTML = sorted.map((item, i) => `
    <div class="popular-item">
      <div class="popular-rank ${rankClass[i] || ''}">${i+1}</div>
      <div class="popular-info">
        <div class="popular-name">${item.name}</div>
        <div class="popular-cat">${item.category || '—'}</div>
      </div>
      <div class="popular-bar-wrap">
        <div class="popular-bar-bg">
          <div class="popular-bar-fill" style="width:${Math.round((item.price/max)*100)}%"></div>
        </div>
      </div>
      <div class="popular-count">${formatFCFA(item.price)}</div>
    </div>`).join('');
}

// ═══════════════════════════════════
// Charts
// ═══════════════════════════════════
function renderCharts() {
  drawBarChart7d();
  drawDonutChart();
  updateChartDateRange();
}

function updateChartDateRange() {
  const el = document.getElementById('chartDateRange');
  if (!el) return;
  const end   = new Date();
  const start = new Date(Date.now() - 6 * 86400000);
  el.textContent = `${start.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} – ${end.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}`;
}

function drawBarChart7d() {
  const canvas = document.getElementById('chartOrders7d');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const data = getLast7DaysData();
  const vals = data.orders;
  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    labels.push(d.toLocaleDateString('fr-FR', {weekday:'short'}));
  }

  const W = canvas.offsetWidth || 500;
  const H = 180;
  canvas.width  = W * devicePixelRatio;
  canvas.height = H * devicePixelRatio;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, W, H);

  const pad = { top: 16, right: 16, bottom: 36, left: 40 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const max = Math.max(...vals, 1);

  // Grid lines
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth   = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + chartH - (i / 4) * chartH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke();
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '10px Poppins, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round((i / 4) * max), pad.left - 6, y + 4);
  }

  const barW = chartW / vals.length * 0.55;
  const gap  = chartW / vals.length;

  vals.forEach((v, i) => {
    const x = pad.left + i * gap + (gap - barW) / 2;
    const barH = chartH * (v / max);
    const y = pad.top + chartH - barH;
    const isToday = i === vals.length - 1;

    // Bar fill gradient
    const grad = ctx.createLinearGradient(0, y, 0, pad.top + chartH);
    grad.addColorStop(0, isToday ? '#C4002B' : '#E8334A');
    grad.addColorStop(1, isToday ? 'rgba(196,0,43,0.15)' : 'rgba(232,51,74,0.08)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
    ctx.fill();

    // Value label on top
    if (v > 0) {
      ctx.fillStyle = isToday ? '#C4002B' : '#6B7280';
      ctx.font = `${isToday ? 'bold ' : ''}10px Poppins, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(v, x + barW / 2, y - 5);
    }

    // Day label
    ctx.fillStyle = isToday ? '#C4002B' : '#6B7280';
    ctx.font = `${isToday ? 'bold ' : ''}11px Poppins, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + barW / 2, H - 8);
  });
}

function drawDonutChart() {
  const canvas = document.getElementById('chartDonut');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const statusMap = { pending:'En Attente', processing:'En Cours', completed:'Complétées', cancelled:'Annulées' };
  const colors    = { pending:'#F59E0B', processing:'#3B82F6', completed:'#10B981', cancelled:'#EF4444' };

  const counts = {};
  orders.forEach(o => {
    const s = o.order_status || 'pending';
    counts[s] = (counts[s] || 0) + 1;
  });

  const total = orders.length || 1;
  const slices = Object.entries(counts).map(([k, v]) => ({ key: k, value: v, pct: v / total }));

  const S = 180;
  const dpr = devicePixelRatio;
  canvas.width  = S * dpr;
  canvas.height = S * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, S, S);

  const cx = S / 2, cy = S / 2, r = 72, innerR = 46;
  let angle = -Math.PI / 2;

  if (!slices.length) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#E5E7EB'; ctx.fill();
  } else {
    slices.forEach(s => {
      const sweep = s.pct * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + sweep);
      ctx.closePath();
      ctx.fillStyle = colors[s.key] || '#9CA3AF';
      ctx.fill();
      angle += sweep;
    });
  }

  // Hole
  ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF'; ctx.fill();

  // Center text
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 22px Poppins, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(orders.length, cx, cy + 4);
  ctx.fillStyle = '#6B7280';
  ctx.font = '10px Poppins, sans-serif';
  ctx.fillText('total', cx, cy + 18);

  // Legend
  const legend = document.getElementById('donutLegend');
  if (legend) {
    legend.innerHTML = slices.map(s => `
      <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="width:10px;height:10px;border-radius:3px;background:${colors[s.key]||'#9CA3AF'};flex-shrink:0;"></div>
          <span style="color:var(--text-secondary)">${statusMap[s.key] || s.key}</span>
        </div>
        <div>
          <strong style="color:var(--text-primary)">${s.value}</strong>
          <span style="color:var(--text-muted);margin-left:4px;">${Math.round(s.pct*100)}%</span>
        </div>
      </div>`).join('') || '<div style="color:var(--text-muted);font-size:12px;text-align:center;">Aucune donnée</div>';
  }
}

function drawSparkline(id, data, color) {
  const canvas = document.getElementById(id);
  if (!canvas || !data || !data.length) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 120;
  const H = 36;
  const dpr = devicePixelRatio;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const n = data.length;
  const pts = data.map((v, i) => ({
    x: (i / (n - 1)) * W,
    y: H - ((v - min) / range) * (H - 4) - 2,
  }));

  // Fill
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, color + '40');
  grad.addColorStop(1, color + '00');
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  // Line
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.stroke();
}

// ═══════════════════════════════════
// Menu Management
// ═══════════════════════════════════
async function loadMenus() {
  showSectionDataLoader('menu');
  try {
    const res  = await fetch('/api/admin/menus');
    menus = await res.json();
    if (!Array.isArray(menus)) menus = [];
    renderMenuGrid(menus);
    populateCategoryFilter();
  } catch (e) {
    showToast('Erreur de chargement des plats', 'error');
  } finally {
    hideDataLoader('menu');
  }
}

function renderMenuGrid(items) {
  const grid = document.getElementById('menuGrid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!items.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-utensils"></i><h3>Aucun plat trouvé</h3><p>Ajoutez un premier plat.</p></div>`;
    return;
  }
  items.forEach(m => {
    const card = document.createElement('div');
    card.className = 'menu-card';
    const imgHTML = m.image
      ? `<img class="menu-card-img" src="${m.image}" alt="${m.name}" onerror="this.style.display='none';this.nextSibling.style.display='flex'">
         <div class="menu-card-img-placeholder" style="display:none;">🍽️</div>`
      : `<div class="menu-card-img-placeholder">🍽️</div>`;
    card.innerHTML = `
      ${imgHTML}
      <div class="menu-card-body">
        <div class="menu-card-name">${m.name}</div>
        <div class="menu-card-cat">${m.category || '—'}</div>
        <div class="menu-card-price">${formatFCFA(m.price)}</div>
        <div class="menu-card-desc">${m.description || 'Aucune description.'}</div>
      </div>
      <div class="menu-card-footer">
        <span class="${m.available ? 'badge badge-available' : 'badge badge-unavailable'}">
          <span class="badge-dot"></span>${m.available ? 'Disponible' : 'Indisponible'}
        </span>
        <div>
          <button class="icon-btn icon-btn-edit" onclick="editMenu(${m.id})" title="Modifier"><i class="fas fa-edit"></i></button>
          <button class="icon-btn icon-btn-delete" onclick="deleteMenu(${m.id},'${escHtml(m.name)}')" title="Supprimer"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

function filterMenus() {
  const q    = (document.getElementById('menuSearch')?.value || '').toLowerCase();
  const cat  = document.getElementById('categoryFilter')?.value || '';
  const avail= document.getElementById('availabilityFilter')?.value || '';
  const filtered = menus.filter(m => {
    if (q   && !m.name.toLowerCase().includes(q)) return false;
    if (cat && m.category !== cat) return false;
    if (avail === 'available'   && !m.available)  return false;
    if (avail === 'unavailable' &&  m.available)  return false;
    return true;
  });
  renderMenuGrid(filtered);
}

function populateCategoryFilter() {
  const sel = document.getElementById('categoryFilter');
  if (!sel) return;
  const cats = [...new Set(menus.map(m => m.category).filter(Boolean))];
  sel.innerHTML = `<option value="">Toutes les catégories</option>` +
    cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

// Menu Modal
function openMenuModal(prefill = {}) {
  document.getElementById('menuModalTitle').textContent = 'Ajouter un Plat';
  document.getElementById('menuId').value = '';
  document.getElementById('menuName').value = '';
  document.getElementById('menuPrice').value = '';
  document.getElementById('menuPrepTime').value = '15';
  document.getElementById('menuDescription').value = '';
  document.getElementById('menuImage').value = '';
  document.getElementById('menuAvailable').value = 'true';
  document.getElementById('menuPopular').checked = false;

  const sel = document.getElementById('menuCategory');
  sel.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  openModal('menuModal');
}
function closeMenuModal() { closeModal('menuModal'); }

function editMenu(id) {
  const m = menus.find(x => x.id === id);
  if (!m) return;
  document.getElementById('menuModalTitle').textContent = 'Modifier le Plat';
  document.getElementById('menuId').value = m.id;
  document.getElementById('menuName').value = m.name;
  document.getElementById('menuPrice').value = m.price;
  document.getElementById('menuDescription').value = m.description || '';
  document.getElementById('menuImage').value = m.image || '';
  document.getElementById('menuAvailable').value = m.available ? 'true' : 'false';

  const sel = document.getElementById('menuCategory');
  sel.innerHTML = categories.map(c => `<option value="${c.id}" ${c.name.toLowerCase()===m.category?'selected':''}>${c.name}</option>`).join('');
  openModal('menuModal');
}

async function saveMenu(e) {
  e.preventDefault();
  const id = document.getElementById('menuId').value;
  const data = {
    product_name: document.getElementById('menuName').value,
    category_id:  parseInt(document.getElementById('menuCategory').value),
    price:        parseFloat(document.getElementById('menuPrice').value),
    description:  document.getElementById('menuDescription').value,
    image_url:    document.getElementById('menuImage').value || null,
    is_available: document.getElementById('menuAvailable').value === 'true',
  };
  try {
    const url    = id ? `/api/admin/menus/${id}` : '/api/admin/menus';
    const method = id ? 'PUT' : 'POST';
    const res    = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
    const json   = await res.json();
    if (json.status === 'success') {
      showToast(id ? 'Plat mis à jour' : 'Plat créé avec succès', 'success');
      closeMenuModal();
      loadMenus();
    } else {
      showToast(json.message || 'Erreur', 'error');
    }
  } catch (err) {
    showToast('Erreur réseau', 'error');
  }
}

function deleteMenu(id, name) {
  showConfirm(`Supprimer "${name}" ?`, async () => {
    try {
      const res = await fetch(`/api/admin/menus/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.status === 'success') { showToast('Plat supprimé', 'success'); loadMenus(); }
      else showToast(json.message, 'error');
    } catch { showToast('Erreur réseau', 'error'); }
  });
}

// ═══════════════════════════════════
// Categories
// ═══════════════════════════════════
async function loadCategories() {
  try {
    const res = await fetch('/api/admin/categories');
    categories = await res.json();
    if (!Array.isArray(categories)) categories = [];
  } catch (e) { categories = []; }
}

async function loadCategoriesSection() {
  showSectionDataLoader('categories');
  await loadCategories();
  renderCategories();
  hideDataLoader('categories');
}

function renderCategories() {
  const grid = document.getElementById('categoriesGrid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!categories.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-tags"></i><h3>Aucune catégorie</h3></div>`;
    return;
  }
  categories.forEach(c => {
    const card = document.createElement('div');
    card.className = 'category-card';
    card.innerHTML = `
      <span class="category-emoji">${c.emoji || '🍽️'}</span>
      <div class="category-name">${c.name}</div>
      <div class="category-count">${menus.filter(m=>m.category===c.name.toLowerCase()).length} plats</div>
      <div class="category-card-footer">
        <button class="icon-btn icon-btn-delete" onclick="deleteCategory(${c.id},'${escHtml(c.name)}')" title="Supprimer"><i class="fas fa-trash"></i></button>
      </div>`;
    grid.appendChild(card);
  });
}

function openCategoryModal() { openModal('categoryModal'); }
function closeCategoryModal() { closeModal('categoryModal'); }

async function saveCategory(e) {
  e.preventDefault();
  const data = {
    category_name: document.getElementById('categoryName').value,
    description:   document.getElementById('categoryDescription').value || null,
  };
  try {
    const res  = await fetch('/api/admin/categories', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
    const json = await res.json();
    if (json.status === 'success') {
      showToast('Catégorie créée', 'success');
      closeCategoryModal();
      loadCategoriesSection();
    } else showToast(json.message || 'Erreur', 'error');
  } catch { showToast('Erreur réseau', 'error'); }
}

async function deleteCategory(id, name) {
  showConfirm(`Supprimer la catégorie "${name}" ?`, async () => {
    try {
      const res  = await fetch(`/api/admin/categories/${id}`, { method:'DELETE' });
      const json = await res.json();
      if (json.status === 'success') { showToast('Catégorie supprimée', 'success'); loadCategoriesSection(); }
      else showToast(json.message, 'error');
    } catch { showToast('Erreur réseau', 'error'); }
  });
}

// ═══════════════════════════════════
// Orders
// ═══════════════════════════════════
async function loadOrders() {
  showSectionDataLoader('orders');
  try {
    const res = await fetch('/api/admin/orders');
    orders = await res.json();
    if (!Array.isArray(orders)) orders = [];
    const filter = document.getElementById('ordersFilter')?.value || 'all';
    const filtered = filter === 'all' ? orders : orders.filter(o => o.order_status === filter);
    renderOrdersTable(filtered);
    updatePendingBadge();
  } catch (e) {
    showToast('Erreur de chargement des commandes', 'error');
  } finally {
    hideDataLoader('orders');
  }
}

function renderOrdersTable(list) {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fas fa-receipt"></i><h3>Aucune commande</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(o => `
    <tr>
      <td><strong>#${String(o.order_id||'—').slice(-6)}</strong></td>
      <td style="color:var(--text-secondary);font-size:12px;">${shortId(o.user_id)}</td>
      <td>—</td>
      <td><strong>${formatFCFA(o.total_amount)}</strong></td>
      <td>${statusBadge(o.order_status)}</td>
      <td style="color:var(--text-muted);font-size:12px;">${formatTime(o.created_at)}</td>
      <td class="actions-cell">
        <button class="icon-btn icon-btn-view" onclick="viewOrderDetails('${o.order_id}')" title="Voir"><i class="fas fa-eye"></i></button>
        <button class="icon-btn icon-btn-edit" onclick="quickStatusOrder('${o.order_id}')" title="Statut"><i class="fas fa-exchange-alt"></i></button>
      </td>
    </tr>`).join('');
}

let _currentOrderId = null;
function viewOrderDetails(id) {
  _currentOrderId = id;
  const o = orders.find(x => String(x.order_id) === String(id));
  const content = document.getElementById('orderDetailsContent');
  if (!o || !content) return;
  content.innerHTML = `
    <div class="order-detail-section">
      <h4>Informations</h4>
      <div class="order-info-grid">
        <div class="order-info-item"><div class="order-info-label">Commande #</div><div class="order-info-value">${String(o.order_id).slice(-6)}</div></div>
        <div class="order-info-item"><div class="order-info-label">Statut</div><div class="order-info-value">${statusBadge(o.order_status)}</div></div>
        <div class="order-info-item"><div class="order-info-label">Montant Total</div><div class="order-info-value" style="color:var(--brand)">${formatFCFA(o.total_amount)}</div></div>
        <div class="order-info-item"><div class="order-info-label">Date</div><div class="order-info-value">${formatDateTime(o.created_at)}</div></div>
      </div>
    </div>
    <div class="order-detail-section">
      <h4>Mettre à jour le statut</h4>
      <select class="order-status-select" id="newOrderStatus">
        <option value="pending"    ${o.order_status==='pending'?'selected':''}>En Attente</option>
        <option value="processing" ${o.order_status==='processing'?'selected':''}>En Cours</option>
        <option value="completed"  ${o.order_status==='completed'?'selected':''}>Complétée</option>
        <option value="cancelled"  ${o.order_status==='cancelled'?'selected':''}>Annulée</option>
      </select>
    </div>`;
  openModal('orderDetailsModal');
}

async function updateOrderStatus() {
  const newStatus = document.getElementById('newOrderStatus')?.value;
  if (!_currentOrderId || !newStatus) return;
  try {
    const res  = await fetch(`/api/admin/orders/${_currentOrderId}/status`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ status: newStatus })
    });
    const json = await res.json();
    showToast('Statut mis à jour', 'success');
    closeOrderDetails();
    loadOrders();
  } catch { showToast('Erreur réseau', 'error'); }
}

function closeOrderDetails() { closeModal('orderDetailsModal'); }

function quickStatusOrder(id) { viewOrderDetails(id); }

function updatePendingBadge() {
  const pending = orders.filter(o => o.order_status === 'pending' || o.order_status === 'processing').length;
  const badge = document.getElementById('pendingBadge');
  if (badge) {
    if (pending > 0) { badge.textContent = pending; badge.style.display = 'flex'; }
    else badge.style.display = 'none';
  }
}

// ═══════════════════════════════════
// Users
// ═══════════════════════════════════
async function loadUsers() {
  showSectionDataLoader('users');
  try {
    const res = await fetch('/api/admin/users');
    users = await res.json();
    if (!Array.isArray(users)) users = [];
    renderUsersTable(users);
  } catch (e) {
    showToast('Erreur de chargement des utilisateurs', 'error');
  } finally {
    hideDataLoader('users');
  }
}

function renderUsersTable(list) {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-users"></i><h3>Aucun utilisateur</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(u => {
    const name    = u.full_name || u.email || 'Inconnu';
    const initial = name[0].toUpperCase();
    const colors  = ['#C4002B','#F5A623','#00A651','#0984E3','#7C3AED','#DB2777'];
    const color   = colors[name.charCodeAt(0) % colors.length];
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;">${initial}</div>
          <div>
            <div style="font-weight:600;">${escHtml(name)}</div>
            <div style="font-size:11px;color:var(--text-muted);">${u.employee_id ? 'ID: '+u.employee_id : ''}</div>
          </div>
        </div>
      </td>
      <td style="color:var(--text-secondary)">${escHtml(u.email || '—')}</td>
      <td>${escHtml(u.phone || '—')}</td>
      <td>${escHtml(u.department || '—')}</td>
      <td style="color:var(--text-muted);font-size:12px;">${formatDate(u.created_at)}</td>
      <td class="actions-cell">
        <button class="icon-btn icon-btn-view" title="Voir"><i class="fas fa-eye"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function filterUsers() {
  const q = (document.getElementById('userSearch')?.value || '').toLowerCase();
  const filtered = q ? users.filter(u => (u.full_name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q)) : users;
  renderUsersTable(filtered);
}

// ═══════════════════════════════════
// Settings (stubs)
// ═══════════════════════════════════
function saveGeneralSettings(e) { e.preventDefault(); showToast('Paramètres enregistrés', 'success'); }
function saveHoursSettings(e)   { e.preventDefault(); showToast('Horaires enregistrés',   'success'); }
function saveFeesSettings(e)    { e.preventDefault(); showToast('Frais enregistrés',        'success'); }

// ═══════════════════════════════════
// Notifications
// ═══════════════════════════════════
function toggleNotifs() {
  document.getElementById('notifDropdown').classList.toggle('show');
  document.removeEventListener('click', _closeNotifsOutside);
  setTimeout(() => document.addEventListener('click', _closeNotifsOutside), 50);
}
function _closeNotifsOutside(e) {
  if (!document.getElementById('notifBtn').contains(e.target)) {
    document.getElementById('notifDropdown').classList.remove('show');
    document.removeEventListener('click', _closeNotifsOutside);
  }
}
function clearNotifs() {
  notifications = [];
  document.getElementById('notifList').innerHTML = `<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-muted);">Aucune notification</div>`;
  const cnt = document.getElementById('notifCount');
  cnt.style.display = 'none';
}
function pushNotif(msg, type = 'info') {
  notifications.push({ msg, type });
  const cnt = document.getElementById('notifCount');
  cnt.textContent = notifications.length;
  cnt.style.display = 'flex';
  const list = document.getElementById('notifList');
  const icons = { info:'info-circle', warning:'exclamation-triangle', success:'check-circle', error:'times-circle' };
  list.insertAdjacentHTML('afterbegin', `
    <div class="notif-item">
      <i class="fas fa-${icons[type]||'info-circle'}" style="color:var(--brand)"></i>
      <div><strong>${msg}</strong><p>${new Date().toLocaleTimeString('fr-FR')}</p></div>
    </div>`);
}

// ═══════════════════════════════════
// Modals
// ═══════════════════════════════════
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('show');
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('show');
}

let _confirmCallback = null;
function showConfirm(msg, cb) {
  document.getElementById('confirmMessage').textContent = msg;
  _confirmCallback = cb;
  openModal('confirmModal');
  document.getElementById('confirmBtn').onclick = () => {
    closeModal('confirmModal');
    if (_confirmCallback) _confirmCallback();
  };
}
function closeConfirmModal() { closeModal('confirmModal'); }

// Close modals on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal') && e.target.classList.contains('show')) {
    e.target.classList.remove('show');
  }
});

// ═══════════════════════════════════
// Toast
// ═══════════════════════════════════
function showToast(msg, type = 'info') {
  const icons = { success:'check-circle', error:'times-circle', info:'info-circle', warning:'exclamation-triangle' };
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fas fa-${icons[type]||'info-circle'}"></i><div class="toast-msg">${msg}</div>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('hide'); setTimeout(() => toast.remove(), 300); }, 3500);
}

// ═══════════════════════════════════
// Helpers
// ═══════════════════════════════════
function formatFCFA(v) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' FCFA';
}
function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
}
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' });
}
function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
}
function shortId(id) {
  if (!id) return '—';
  return String(id).slice(0, 8) + '…';
}
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function statusBadge(status) {
  const map = {
    pending:    ['badge-pending',    'En Attente'],
    processing: ['badge-processing', 'En Cours'],
    completed:  ['badge-completed',  'Complétée'],
    cancelled:  ['badge-cancelled',  'Annulée'],
  };
  const [cls, label] = map[status] || ['badge-pending','Inconnu'];
  return `<span class="badge ${cls}"><span class="badge-dot"></span>${label}</span>`;
}
function updateLastUpdated() {
  const el = document.getElementById('lastUpdated');
  if (el) el.textContent = 'Mis à jour à ' + new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
}

// ═══════════════════════════════════
// Boot
// ═══════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  // Auto-login for dev if already set (or show login)
  startLoader();
  setTimeout(completeLoader, 800);
});
