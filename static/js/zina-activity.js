/* ============================================================
   ZINA Live Activity Feed — fake but believable
   ============================================================ */

(function () {
  'use strict';

  const NAMES = [
    'Kofi', 'Ama', 'Yaw', 'Adjoa', 'Kwame', 'Akosua', 'Kojo', 'Abena',
    'Fiifi', 'Efua', 'Jean', 'Marie', 'Paul', 'Fatou', 'Moussa',
    'Aminata', 'Ibrahim', 'Nadia', 'Cheikh', 'Sali'
  ];

  const BADGE_EVENTS = [
    'a débloqué le badge "Premier Repas" 🍽️',
    'vient de passer au niveau 3 ⭐',
    'a gagné le badge "Gourmet" 🏆',
    'a atteint 500 points 💎',
    'vient de passer au niveau 5 🌟',
    'a débloqué le badge "Régulier" 📅',
  ];

  let menuItems = [];
  let feedContainer = null;
  let activityQueue = [];
  let tickInterval = null;
  const MAX_VISIBLE = 3;
  const DISMISS_DELAY = 5000;

  function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randomBetween(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function generateActivity() {
    const name = randomItem(NAMES);
    const isBadge = Math.random() < 0.2; // 20% chance of badge event

    if (isBadge) {
      return `<span>${name}</span> ${randomItem(BADGE_EVENTS)}`;
    }

    const items = menuItems.length > 0 ? menuItems : [
      { name: 'Attiéké Poulet' }, { name: 'Riz Sauce Graine' },
      { name: 'Placali' }, { name: 'Jus Bissap' }, { name: 'Menu Complet' },
      { name: 'Salade Fraîche' }, { name: 'Foutou Poisson' }
    ];

    const item = randomItem(items);
    return `<span>${name}</span> vient de commander ${item.name} 🍽️`;
  }

  function createActivityEl(html) {
    const el = document.createElement('div');
    el.className = 'activity-item';
    el.innerHTML = html;
    return el;
  }

  function pushActivity() {
    if (!feedContainer) return;

    const current = feedContainer.querySelectorAll('.activity-item:not(.fading)');

    // Remove oldest if at max
    if (current.length >= MAX_VISIBLE) {
      const oldest = current[0];
      oldest.classList.add('fading');
      setTimeout(() => oldest.remove(), 400);
    }

    const html = generateActivity();
    const el = createActivityEl(html);
    feedContainer.appendChild(el);

    // Auto-dismiss after delay
    setTimeout(() => {
      if (el.parentNode) {
        el.classList.add('fading');
        setTimeout(() => el.remove(), 400);
      }
    }, DISMISS_DELAY);
  }

  function startFeed() {
    if (tickInterval) return;

    // First activity after 3s
    setTimeout(pushActivity, 3000);

    tickInterval = setInterval(() => {
      pushActivity();
    }, randomBetween(8000, 15000));

    // Make interval non-deterministic by re-scheduling
    function reschedule() {
      clearInterval(tickInterval);
      tickInterval = setInterval(() => {
        pushActivity();
        reschedule();
      }, randomBetween(8000, 15000));
    }
    setTimeout(reschedule, randomBetween(10000, 20000));
  }

  function stopFeed() {
    if (tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
  }

  /**
   * Public: initActivityFeed(containerId)
   */
  window.initActivityFeed = function (containerId) {
    feedContainer = document.getElementById(containerId);
    if (!feedContainer) return;
    startFeed();
  };

  /**
   * Public: setActivityMenuItems(items)
   * Provide menu items for more realistic activity messages
   */
  window.setActivityMenuItems = function (items) {
    menuItems = items || [];
  };

  /**
   * Public: stopActivityFeed()
   */
  window.stopActivityFeed = stopFeed;

  /**
   * Public: pushCustomActivity(html)
   */
  window.pushCustomActivity = function (html) {
    if (!feedContainer) return;
    const current = feedContainer.querySelectorAll('.activity-item:not(.fading)');
    if (current.length >= MAX_VISIBLE) {
      const oldest = current[0];
      oldest.classList.add('fading');
      setTimeout(() => oldest.remove(), 400);
    }
    const el = createActivityEl(html);
    feedContainer.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) {
        el.classList.add('fading');
        setTimeout(() => el.remove(), 400);
      }
    }, DISMISS_DELAY);
  };

})();
