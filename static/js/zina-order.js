/* ============================================================
   ZINA Order App — Main ordering logic
   ZinaApp class: menu, cart, orders, tracking
   ============================================================ */

(function () {
  'use strict';

  const CART_SESSION_KEY = 'zina_cart_v2';
  const TAX_RATE = 0.18; // 18% TVA

  const CATEGORY_ICONS = {
    default: '🍽️',
    'déjeuner': '🍛', 'dejeuner': '🍛', 'lunch': '🍛',
    'petit_déjeuner': '☕', 'petit-déjeuner': '☕', 'breakfast': '☕', 'petit_dejeuner': '☕',
    'boissons': '🥤', 'drinks': '🥤',
    'desserts': '🍰', 'dessert': '🍰',
    'salades': '🥗', 'salade': '🥗',
    'snacks': '🥪',
    'soupes': '🍜', 'soupe': '🍜',
    'dîner': '🌙', 'diner': '🌙', 'dinner': '🌙',
    'spécialités': '⭐', 'specialites': '⭐',
    'entrées': '🥩', 'entrees': '🥩',
  };

  const ORDER_STAGES = [
    { id: 'confirmed', label: 'Commande confirmée', icon: '✓' },
    { id: 'preparing', label: 'En préparation', icon: '👨‍🍳' },
    { id: 'ready', label: 'Prêt à récupérer', icon: '🔔' },
    { id: 'delivered', label: 'Récupéré', icon: '🎉' }
  ];

  class ZinaApp {
    constructor() {
      this.menu = {};
      this.allItems = [];
      this.cart = this.loadCart();
      this.currentCategory = null;
      this.userInfo = null;
      this.activeOrderId = null;
      this.trackingStage = 0;
      this.trackingInterval = null;
      this.reactions = {};
    }

    // ── Initialization ──────────────────────────────────────
    async init() {
      this._detectUserInfo();
      this._bindNavbarEvents();
      this._bindCartEvents();
      this._bindVoiceBtn();
      this._renderUserInfo();
      this.renderCart();

      await this.fetchMenu();

      if (window.renderFlashDeals) window.renderFlashDeals('flash-deals-scroll');
      if (window.initActivityFeed) window.initActivityFeed('activity-feed');
      if (window.renderXPBar) window.renderXPBar();
    }

    _detectUserInfo() {
      // Try from meta tags injected by Jinja
      const metaName = document.querySelector('meta[name="user-name"]');
      const metaId = document.querySelector('meta[name="user-id"]');
      const metaGuest = document.querySelector('meta[name="is-guest"]');
      this.userInfo = {
        name: metaName ? metaName.content : 'Invité',
        id: metaId ? metaId.content : null,
        isGuest: metaGuest ? metaGuest.content === 'true' : true
      };
    }

    _renderUserInfo() {
      const avatarEl = document.getElementById('user-avatar');
      const greetingEl = document.getElementById('user-greeting-name');
      if (avatarEl) {
        const initial = (this.userInfo.name || 'I')[0].toUpperCase();
        avatarEl.textContent = initial;
      }
      if (greetingEl) {
        const firstName = (this.userInfo.name || 'Invité').split(' ')[0];
        greetingEl.textContent = firstName;
      }
    }

    _bindNavbarEvents() {
      const themeBtn = document.getElementById('theme-toggle-btn');
      if (themeBtn) {
        themeBtn.addEventListener('click', () => this._toggleTheme());
      }

      const historyBtn = document.getElementById('history-btn');
      if (historyBtn) {
        historyBtn.addEventListener('click', () => this._openOrderHistory());
      }

      const gamiBtn = document.getElementById('gamification-btn');
      if (gamiBtn) {
        gamiBtn.addEventListener('click', () => this._openGamificationModal());
      }

      const pointsDisplay = document.getElementById('points-display');
      if (pointsDisplay) {
        pointsDisplay.addEventListener('click', () => this._openGamificationModal());
      }

      // Close modals
      document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const targetId = btn.dataset.closeModal;
          const overlay = document.getElementById(targetId);
          if (overlay) overlay.classList.remove('open');
        });
      });

      document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) overlay.classList.remove('open');
        });
      });

      // Sidebar toggle for mobile
      const sidebarToggle = document.getElementById('sidebar-toggle');
      const sidebar = document.getElementById('category-sidebar');
      const sidebarOverlay = document.getElementById('sidebar-overlay');

      if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
          sidebar.classList.toggle('open');
          if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
        });
      }

      if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
          if (sidebar) sidebar.classList.remove('open');
          sidebarOverlay.classList.remove('active');
        });
      }
    }

    _bindCartEvents() {
      const cartFab = document.getElementById('cart-fab');
      if (cartFab) cartFab.addEventListener('click', () => this.toggleCart());

      const cartClose = document.getElementById('cart-close');
      if (cartClose) cartClose.addEventListener('click', () => this.toggleCart(false));

      const orderBtn = document.getElementById('order-btn');
      if (orderBtn) orderBtn.addEventListener('click', () => this.placeOrder());
    }

    _bindVoiceBtn() {
      const btn = document.getElementById('voice-btn');
      if (btn) btn.addEventListener('click', () => window.startVoiceOrdering && window.startVoiceOrdering());
    }

    _toggleTheme() {
      document.body.classList.toggle('light-theme');
      const btn = document.getElementById('theme-toggle-btn');
      if (btn) {
        const icon = btn.querySelector('i');
        if (icon) {
          icon.className = document.body.classList.contains('light-theme')
            ? 'fas fa-sun'
            : 'fas fa-moon';
        }
      }
      localStorage.setItem('zina_theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
    }

    // ── Menu Fetching ────────────────────────────────────────
    async fetchMenu() {
      const grid = document.getElementById('menu-grid');
      if (grid) grid.innerHTML = this._renderSkeletons(8);

      try {
        const resp = await fetch('/api/menu');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        this.menu = await resp.json();

        if (this.menu.error) throw new Error(this.menu.error);

        // Build flat list
        this.allItems = [];
        Object.entries(this.menu).forEach(([cat, items]) => {
          items.forEach(item => {
            this.allItems.push({ ...item, categoryKey: cat });
          });
        });

        this._renderCategoryList();

        // Select first category
        const firstCat = Object.keys(this.menu)[0];
        if (firstCat) this.switchCategory(firstCat);

        // Feed voice ordering
        if (window.setVoiceMenuItems) window.setVoiceMenuItems(this.allItems);
        if (window.setActivityMenuItems) window.setActivityMenuItems(this.allItems);

      } catch (err) {
        console.error('[ZinaApp] fetchMenu error:', err);
        if (grid) {
          grid.innerHTML = `<div class="page-loading">
            <i class="fas fa-exclamation-triangle" style="font-size:2rem;color:var(--bad-red)"></i>
            <p>Impossible de charger le menu. Veuillez réessayer.</p>
            <button onclick="window.zinaApp.fetchMenu()" class="add-to-cart-btn" style="width:auto; padding:0.5rem 1.5rem; margin-top:0.5rem">
              <i class="fas fa-refresh"></i> Réessayer
            </button>
          </div>`;
        }
      }
    }

    _renderSkeletons(count) {
      return Array.from({ length: count }, () => `
        <div class="skeleton-card">
          <div class="skeleton-image"></div>
          <div style="padding:1rem">
            <div class="skeleton-text medium"></div>
            <div class="skeleton-text short" style="margin-top:8px"></div>
            <div class="skeleton-text" style="height:32px; margin-top:12px; border-radius:8px"></div>
          </div>
        </div>`).join('');
    }

    _getCategoryIcon(key) {
      return CATEGORY_ICONS[key] || CATEGORY_ICONS[key.replace(/_/g, '-')] || CATEGORY_ICONS.default;
    }

    _formatCategoryName(key) {
      return key.replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    }

    // ── Category List ────────────────────────────────────────
    _renderCategoryList() {
      const sidebar = document.getElementById('category-list');
      if (!sidebar) return;

      const allHtml = `
        <div class="category-item all-items" data-cat="all" onclick="window.zinaApp.switchCategory('all')">
          <div class="category-left">
            <span class="category-icon">🏠</span>
            <span class="category-name">Tout</span>
          </div>
          <span class="category-count">${this.allItems.length}</span>
        </div>
        <div class="sidebar-divider"></div>`;

      const catHtml = Object.entries(this.menu).map(([key, items]) => `
        <div class="category-item" data-cat="${key}" onclick="window.zinaApp.switchCategory('${key}')">
          <div class="category-left">
            <span class="category-icon">${this._getCategoryIcon(key)}</span>
            <span class="category-name">${this._formatCategoryName(key)}</span>
          </div>
          <span class="category-count">${items.length}</span>
        </div>`).join('');

      sidebar.innerHTML = allHtml + catHtml;
    }

    // ── Switch Category ──────────────────────────────────────
    switchCategory(category) {
      this.currentCategory = category;

      // Update sidebar active state
      document.querySelectorAll('.category-item').forEach(el => {
        el.classList.toggle('active', el.dataset.cat === category);
      });

      // Update title
      const titleEl = document.getElementById('menu-section-title');
      if (titleEl) {
        titleEl.textContent = category === 'all'
          ? 'Tout le menu'
          : this._formatCategoryName(category);
      }

      const items = category === 'all' ? this.allItems : (this.menu[category] || []);
      this.renderMenuItems(items);

      // Close mobile sidebar
      const sidebar = document.getElementById('category-sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
    }

    // ── Render Menu Items ────────────────────────────────────
    renderMenuItems(items) {
      const grid = document.getElementById('menu-grid');
      if (!grid) return;

      if (!items || items.length === 0) {
        grid.innerHTML = `<div class="page-loading" style="grid-column:1/-1">
          <span style="font-size:2.5rem">🍽️</span>
          <p>Aucun plat disponible dans cette catégorie.</p>
        </div>`;
        return;
      }

      grid.innerHTML = items.map((item, idx) => this._renderMenuCard(item, idx)).join('');

      // Animate cards in
      grid.querySelectorAll('.menu-card').forEach((card, i) => {
        card.style.animationDelay = `${i * 0.05}s`;
        card.classList.add('fade-in');
      });
    }

    _renderMenuCard(item, idx) {
      const deal = window.getDealForProduct ? window.getDealForProduct(item.name) : null;
      const isPopular = item.is_popular || (item.id && item.id % 3 === 0);
      const isNew = item.id && item.id % 7 === 0;
      const isAvailable = item.is_available !== false;

      const displayPrice = deal
        ? Math.round(item.price * (1 - deal.discount / 100))
        : item.price;

      const reactions = this.reactions[item.id] || { '❤️': 0, '🔥': 0, '😍': 0 };
      const reactionHtml = ['❤️', '🔥', '😍'].map(emoji => `
        <button class="reaction-btn" onclick="window.zinaApp.handleEmojiReaction(${item.id}, '${emoji}', this)" data-emoji="${emoji}">
          ${emoji} <span class="reaction-count">${reactions[emoji] || ''}</span>
        </button>`).join('');

      const stars = this._renderStars(item.rating || (3 + (item.id % 3) * 0.5));

      const badgeHtml = [
        isPopular ? '<span class="badge badge-popular">⭐ Populaire</span>' : '',
        isNew ? '<span class="badge badge-new">Nouveau</span>' : '',
        deal ? `<span class="badge badge-deal">-${deal.discount}%</span>` : ''
      ].filter(Boolean).join('');

      const priceHtml = deal
        ? `<span class="menu-card-price">${displayPrice.toLocaleString('fr-FR')} F
           <span class="menu-card-price-original">${item.price.toLocaleString('fr-FR')} F</span></span>`
        : `<span class="menu-card-price">${item.price.toLocaleString('fr-FR')} F</span>`;

      const imageUrl = item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';

      return `
        <div class="menu-card fade-in stagger-${(idx % 5) + 1}" data-product-id="${item.id}">
          <div class="menu-card-image-wrap">
            <img class="menu-card-image"
                 src="${imageUrl}"
                 alt="${item.name}"
                 loading="lazy"
                 onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'">
            <div class="menu-card-badges">${badgeHtml}</div>
            <div class="availability-dot ${isAvailable ? 'available' : 'unavailable'}"
                 title="${isAvailable ? 'Disponible' : 'Non disponible'}"></div>
          </div>
          <div class="menu-card-body">
            <div class="menu-card-name">${item.name}</div>
            ${item.description ? `<div class="menu-card-desc">${item.description}</div>` : ''}
            <div class="menu-card-meta">
              ${priceHtml}
              <div class="menu-card-rating">${stars} <span style="margin-left:2px">${(item.rating || (3 + (item.id % 3) * 0.5)).toFixed(1)}</span></div>
            </div>
            <div class="menu-card-reactions">${reactionHtml}</div>
            <button class="add-to-cart-btn"
                    onclick="window.zinaApp.addToCart(${item.id}, '${item.name.replace(/'/g, "\\'")}', ${displayPrice}, [])"
                    ${!isAvailable ? 'disabled' : ''}>
              <i class="fas fa-plus"></i>
              ${isAvailable ? 'Ajouter au panier' : 'Non disponible'}
            </button>
          </div>
        </div>`;
    }

    _renderStars(rating) {
      const full = Math.floor(rating);
      const half = rating % 1 >= 0.5;
      const empty = 5 - full - (half ? 1 : 0);
      return '★'.repeat(full) +
        (half ? '☆' : '') +
        '☆'.repeat(empty);
    }

    // ── Search ───────────────────────────────────────────────
    handleSearch(query) {
      if (!query.trim()) {
        this.switchCategory(this.currentCategory || 'all');
        return;
      }
      const q = query.toLowerCase();
      const filtered = this.allItems.filter(item =>
        item.name.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
      );
      this.renderMenuItems(filtered);
    }

    // ── Cart Operations ──────────────────────────────────────
    addToCart(productId, name, price, options) {
      const existing = this.cart.find(i => i.id === productId);
      if (existing) {
        existing.qty++;
      } else {
        const item = this.allItems.find(i => i.id === productId);
        this.cart.push({
          id: productId,
          name,
          price,
          qty: 1,
          image: item ? item.image : null,
          options: options || []
        });
      }
      this._saveCart();
      this.renderCart();
      this._animateCartFab();
      this.showToast(`${name} ajouté au panier`, 'success');

      // Animate the button
      const btn = document.querySelector(`[data-product-id="${productId}"] .add-to-cart-btn`);
      if (btn) {
        btn.classList.add('adding');
        setTimeout(() => btn.classList.remove('adding'), 300);
      }
    }

    removeFromCart(productId) {
      const idx = this.cart.findIndex(i => i.id === productId);
      if (idx === -1) return;

      const itemEl = document.querySelector(`.cart-item[data-id="${productId}"]`);
      if (itemEl) {
        itemEl.classList.add('removing');
        setTimeout(() => {
          this.cart.splice(idx, 1);
          this._saveCart();
          this.renderCart();
        }, 300);
      } else {
        this.cart.splice(idx, 1);
        this._saveCart();
        this.renderCart();
      }
    }

    updateQuantity(productId, delta) {
      const item = this.cart.find(i => i.id === productId);
      if (!item) return;
      item.qty = Math.max(0, item.qty + delta);
      if (item.qty === 0) {
        this.removeFromCart(productId);
        return;
      }
      this._saveCart();
      this.renderCart();
    }

    clearCart() {
      this.cart = [];
      this._saveCart();
      this.renderCart();
    }

    _animateCartFab() {
      const fab = document.getElementById('cart-fab');
      if (fab) {
        fab.classList.remove('bounce');
        void fab.offsetWidth;
        fab.classList.add('bounce');
        setTimeout(() => fab.classList.remove('bounce'), 400);
      }
      const badge = document.getElementById('cart-badge');
      if (badge) {
        badge.classList.remove('pop');
        void badge.offsetWidth;
        badge.classList.add('pop');
        setTimeout(() => badge.classList.remove('pop'), 300);
      }
    }

    loadCart() {
      try {
        const raw = sessionStorage.getItem(CART_SESSION_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) { return []; }
    }

    _saveCart() {
      try {
        sessionStorage.setItem(CART_SESSION_KEY, JSON.stringify(this.cart));
      } catch (e) { /* ignore */ }
    }

    // ── Render Cart ──────────────────────────────────────────
    renderCart() {
      const body = document.getElementById('cart-body');
      const badge = document.getElementById('cart-badge');
      const orderBtn = document.getElementById('order-btn');
      const totalsEl = document.getElementById('cart-totals');

      const totalQty = this.cart.reduce((sum, i) => sum + i.qty, 0);
      if (badge) badge.textContent = totalQty || '';

      if (!body) return;

      if (this.cart.length === 0) {
        body.innerHTML = `
          <div class="cart-empty">
            <div class="cart-empty-icon">🛒</div>
            <div class="cart-empty-text">Votre panier est vide</div>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.5rem">
              Ajoutez des plats pour commencer votre commande
            </p>
          </div>`;
        if (orderBtn) orderBtn.disabled = true;
        if (totalsEl) totalsEl.style.display = 'none';
        return;
      }

      body.innerHTML = this.cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
          ${item.image ? `<img class="cart-item-image" src="${item.image}" alt="${item.name}"
              onerror="this.style.display='none'" loading="lazy">` : ''}
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price">${(item.price * item.qty).toLocaleString('fr-FR')} F</div>
          </div>
          <div class="qty-controls">
            <button class="qty-btn" onclick="window.zinaApp.updateQuantity(${item.id}, -1)">−</button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn" onclick="window.zinaApp.updateQuantity(${item.id}, 1)">+</button>
          </div>
          <button class="qty-btn" onclick="window.zinaApp.removeFromCart(${item.id})"
                  style="color:var(--bad-red); border-color:rgba(196,0,43,0.3); margin-left:4px">
            <i class="fas fa-trash" style="font-size:0.7rem"></i>
          </button>
        </div>`).join('');

      const subtotal = this.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
      const tax = subtotal * TAX_RATE;
      const total = subtotal + tax;

      if (totalsEl) {
        totalsEl.style.display = 'block';
        totalsEl.innerHTML = `
          <div class="cart-total-row"><span>Sous-total</span><span>${subtotal.toLocaleString('fr-FR')} F</span></div>
          <div class="cart-total-row"><span>TVA (18%)</span><span>${Math.round(tax).toLocaleString('fr-FR')} F</span></div>
          <div class="cart-total-row grand"><span>Total</span><span>${Math.round(total).toLocaleString('fr-FR')} F</span></div>`;
      }

      if (orderBtn) orderBtn.disabled = false;
    }

    // ── Toggle Cart ──────────────────────────────────────────
    toggleCart(forceState) {
      const panel = document.getElementById('cart-panel');
      if (!panel) return;
      if (forceState === undefined) {
        panel.classList.toggle('open');
      } else {
        panel.classList.toggle('open', forceState);
      }
    }

    // ── Place Order ──────────────────────────────────────────
    async placeOrder() {
      if (this.cart.length === 0) {
        this.showToast('Votre panier est vide', 'error');
        return;
      }

      const orderBtn = document.getElementById('order-btn');
      const notes = document.getElementById('order-notes');
      const pickupSelect = document.getElementById('pickup-time-select');

      if (orderBtn) {
        orderBtn.disabled = true;
        orderBtn.innerHTML = '<div class="loading-spinner" style="width:20px;height:20px;border-width:2px"></div> En cours...';
      }

      const payload = {
        user_id: this.userInfo.id || null,
        items: this.cart.map(i => ({
          product_id: i.id,
          quantity: i.qty,
          option_ids: i.options || []
        })),
        notes: notes ? notes.value : '',
        pickup_time: pickupSelect ? pickupSelect.value : null
      };

      try {
        const resp = await fetch('/api/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await resp.json();

        if (!resp.ok || data.error) throw new Error(data.error || `HTTP ${resp.status}`);

        this.activeOrderId = data.order_id;
        this.clearCart();
        this.toggleCart(false);

        this.showToast('🎉 Commande passée avec succès !', 'success');
        if (window.triggerConfetti) window.triggerConfetti();
        if (window.recordOrder) window.recordOrder();

        this._showOrderTracking(data);

        if (window.pushCustomActivity) {
          const name = (this.userInfo.name || 'Vous').split(' ')[0];
          window.pushCustomActivity(`<span>${name}</span> vient de passer une commande 🎉`);
        }

      } catch (err) {
        console.error('[ZinaApp] placeOrder error:', err);
        this.showToast(`Erreur: ${err.message}`, 'error');
        if (orderBtn) {
          orderBtn.disabled = false;
          orderBtn.innerHTML = '<i class="fas fa-check"></i> Passer la commande';
        }
      }
    }

    _showOrderTracking(orderData) {
      const trackingSection = document.getElementById('order-tracking-section');
      if (!trackingSection) return;

      trackingSection.style.display = 'block';
      this.trackingStage = 0;

      this._renderTrackingTimeline();

      if (this.trackingInterval) clearInterval(this.trackingInterval);
      this.trackingInterval = setInterval(() => {
        this.trackingStage++;
        this._renderTrackingTimeline();
        if (this.trackingStage >= ORDER_STAGES.length - 1) {
          clearInterval(this.trackingInterval);
          this.showToast('✅ Commande prête ! Venez récupérer votre repas.', 'success');
        }
      }, 30000);
    }

    _renderTrackingTimeline() {
      const timeline = document.getElementById('tracking-timeline');
      if (!timeline) return;

      timeline.innerHTML = ORDER_STAGES.map((stage, idx) => {
        const isCompleted = idx < this.trackingStage;
        const isActive = idx === this.trackingStage;
        return `
          <div class="tracking-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}">
            <div class="step-icon">${isCompleted ? '✓' : stage.icon}</div>
            <div class="step-info">
              <div class="step-label">${stage.label}</div>
            </div>
          </div>`;
      }).join('');
    }

    startOrderTracking(orderId) {
      this.activeOrderId = orderId;
      this._showOrderTracking({ order_id: orderId });
    }

    // ── Emoji Reactions ──────────────────────────────────────
    handleEmojiReaction(productId, emoji, btnEl) {
      if (!this.reactions[productId]) {
        this.reactions[productId] = { '❤️': 0, '🔥': 0, '😍': 0 };
      }
      this.reactions[productId][emoji] = (this.reactions[productId][emoji] || 0) + 1;

      if (btnEl) {
        const reacted = btnEl.classList.toggle('reacted');
        const countEl = btnEl.querySelector('.reaction-count');
        if (countEl) {
          const count = this.reactions[productId][emoji];
          countEl.textContent = count > 0 ? count : '';
        }

        // Animate
        btnEl.style.transform = 'scale(1.3)';
        setTimeout(() => { btnEl.style.transform = ''; }, 200);
      }

      if (window.recordReaction) window.recordReaction();

      // Fire-and-forget to API
      fetch('/api/emoji-reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, emoji, user_id: this.userInfo.id })
      }).catch(() => { /* API might not exist, ignore */ });
    }

    // ── Toast Notifications ──────────────────────────────────
    showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info} toast-icon"></i>
        <span class="toast-msg">${message}</span>`;
      container.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('dismissing');
        setTimeout(() => toast.remove(), 350);
      }, 3500);
    }

    // ── Order History Modal ──────────────────────────────────
    async _openOrderHistory() {
      const overlay = document.getElementById('history-modal');
      if (overlay) overlay.classList.add('open');

      const list = document.getElementById('order-history-list');
      if (!list) return;
      list.innerHTML = `<div class="page-loading"><div class="loading-spinner"></div> Chargement...</div>`;

      try {
        const uid = this.userInfo.id;
        if (!uid) {
          list.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:1rem">Connectez-vous pour voir vos commandes.</p>';
          return;
        }
        const resp = await fetch(`/api/user/orders?user_id=${uid}`);
        const orders = await resp.json();

        if (!Array.isArray(orders) || orders.length === 0) {
          list.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:1rem">Aucune commande pour le moment.</p>';
          return;
        }

        list.innerHTML = `<div class="order-history-list">${orders.map(o => `
          <div class="order-history-item">
            <div class="order-history-header">
              <span class="order-id">#${o.order_id}</span>
              <span class="status-badge ${o.order_status}">${o.order_status || 'en attente'}</span>
            </div>
            <div class="order-items-list">${(o.items || []).map(i => `${i.quantity}x ${i.product_name}`).join(', ') || '—'}</div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span class="order-date">${o.created_at ? new Date(o.created_at).toLocaleDateString('fr-FR') : '—'}</span>
              <span class="order-total">${(o.total_amount || 0).toLocaleString('fr-FR')} F</span>
            </div>
          </div>`).join('')}</div>`;
      } catch (err) {
        list.innerHTML = `<p style="color:var(--bad-red); text-align:center; padding:1rem">Erreur: ${err.message}</p>`;
      }
    }

    // ── Gamification Modal ───────────────────────────────────
    _openGamificationModal() {
      const overlay = document.getElementById('gamification-modal');
      if (overlay) overlay.classList.add('open');
      if (window.renderGamificationModal) window.renderGamificationModal();
    }
  }

  // ── Boot ─────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // Restore theme
    const savedTheme = localStorage.getItem('zina_theme');
    if (savedTheme === 'light') document.body.classList.add('light-theme');

    // Wire search input
    const searchInput = document.getElementById('menu-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        if (window.zinaApp) window.zinaApp.handleSearch(e.target.value);
      });
    }

    const app = new ZinaApp();
    window.zinaApp = app;
    app.init();

    // Also expose showToast globally for other modules
    window.showToast = (msg, type) => app.showToast(msg, type);
  });

})();
