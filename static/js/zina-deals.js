/* ============================================================
   ZINA Flash Deals — countdown timers, sessionStorage
   ============================================================ */

(function () {
  'use strict';

  const SESSION_KEY = 'zina_flash_deals';
  const NOW = Date.now();

  // Hardcoded deals with expiry timestamps
  const INITIAL_DEALS = [
    {
      id: 'deal_1',
      name: 'Attiéké Poulet',
      discount: 20,
      originalPrice: 2500,
      expiresAt: NOW + 2 * 60 * 60 * 1000, // 2h
      emoji: '🍗',
      productMatch: 'attiéké poulet'
    },
    {
      id: 'deal_2',
      name: 'Jus Bissap',
      discount: 15,
      originalPrice: 800,
      expiresAt: NOW + 45 * 60 * 1000, // 45min
      emoji: '🍹',
      productMatch: 'bissap'
    },
    {
      id: 'deal_3',
      name: 'Menu Complet',
      discount: 25,
      originalPrice: 3500,
      expiresAt: NOW + 3 * 60 * 60 * 1000, // 3h
      emoji: '🍽️',
      productMatch: 'menu complet'
    }
  ];

  function loadDeals() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const deals = JSON.parse(raw);
        // Verify structure
        if (Array.isArray(deals) && deals.length > 0) return deals;
      }
    } catch (e) { /* ignore */ }
    saveDeals(INITIAL_DEALS);
    return INITIAL_DEALS;
  }

  function saveDeals(deals) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(deals));
    } catch (e) { /* ignore */ }
  }

  function formatCountdown(ms) {
    if (ms <= 0) return 'Expiré';
    const totalSecs = Math.floor(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
    if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
    return `${s}s`;
  }

  function discountedPrice(deal) {
    return Math.round(deal.originalPrice * (1 - deal.discount / 100));
  }

  /**
   * Public: renderFlashDeals(containerId)
   * Renders deal cards into the given container
   */
  window.renderFlashDeals = function (containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const deals = loadDeals();

    function renderCards() {
      const now = Date.now();
      container.innerHTML = deals.map(deal => {
        const remaining = deal.expiresAt - now;
        const expired = remaining <= 0;
        const discounted = discountedPrice(deal);
        return `
          <div class="flash-deal-card ${expired ? 'expired' : ''}"
               data-deal-id="${deal.id}"
               onclick="window.applyDeal('${deal.id}')"
               title="${expired ? 'Offre expirée' : 'Cliquer pour appliquer la réduction'}">
            <span style="font-size:1.3rem">${deal.emoji}</span>
            <div style="flex:1; min-width:0;">
              <div class="flash-deal-name">${deal.name}</div>
              <div style="display:flex; align-items:center; gap:0.4rem;">
                <span class="flash-deal-discount">-${deal.discount}%</span>
                <span style="font-size:0.72rem; color:var(--text-muted); text-decoration:line-through">${deal.originalPrice.toLocaleString('fr-FR')} F</span>
                <span style="font-size:0.82rem; color:var(--bad-gold); font-weight:700">${discounted.toLocaleString('fr-FR')} F</span>
              </div>
            </div>
            <div class="flash-deal-countdown" id="countdown-${deal.id}">
              ${expired ? 'Expiré' : formatCountdown(remaining)}
            </div>
          </div>`;
      }).join('');
    }

    renderCards();

    // Tick every second
    const intervalId = setInterval(() => {
      const now = Date.now();
      deals.forEach(deal => {
        const el = document.getElementById(`countdown-${deal.id}`);
        if (!el) return;
        const remaining = deal.expiresAt - now;
        const card = el.closest('.flash-deal-card');
        if (remaining <= 0) {
          el.textContent = 'Expiré';
          if (card && !card.classList.contains('expired')) {
            card.classList.add('expired');
          }
        } else {
          el.textContent = formatCountdown(remaining);
        }
      });
    }, 1000);

    // Store interval so it can be cleared
    container._flashDealsInterval = intervalId;
  };

  /**
   * Public: applyDeal(dealId)
   * Returns deal discount info so ZinaApp can apply it to cart
   */
  window.applyDeal = function (dealId) {
    const deals = loadDeals();
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;
    if (Date.now() > deal.expiresAt) {
      if (window.showToast) window.showToast('Cette offre a expiré', 'error');
      return;
    }

    const discounted = discountedPrice(deal);
    if (window.showToast) {
      window.showToast(`Offre "${deal.name}" appliquée : ${discounted.toLocaleString('fr-FR')} F (-${deal.discount}%)`, 'success');
    }

    // Expose deal info globally for ZinaApp
    window._activeDeal = {
      id: deal.id,
      name: deal.name,
      discount: deal.discount,
      discountedPrice: discounted,
      productMatch: deal.productMatch
    };

    return window._activeDeal;
  };

  /**
   * Public: getDealForProduct(productName)
   * Returns active deal if product name matches
   */
  window.getDealForProduct = function (productName) {
    const deals = loadDeals();
    const now = Date.now();
    const nameLower = (productName || '').toLowerCase();
    return deals.find(d => {
      return d.expiresAt > now && nameLower.includes(d.productMatch.toLowerCase());
    }) || null;
  };

  /**
   * Public: getDeals()
   */
  window.getDeals = function () {
    return loadDeals();
  };

})();
