/* ============================================================
   ZINA Gamification System
   XP, Levels, Badges — stored in localStorage
   ============================================================ */

(function () {
  'use strict';

  const STORAGE_KEY = 'zina_gamification';

  const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5800, 8000];
  const LEVEL_NAMES = [
    'Novice', 'Amateur', 'Régulier', 'Habitué', 'Gourmet',
    'Expert', 'Maître', 'Grand Chef', 'Légende', 'ZINA VIP', 'Champion BAD'
  ];

  const BADGE_DEFINITIONS = [
    { id: 'premier_repas', name: 'Premier Repas', emoji: '🍽️', desc: 'Première commande passée', condition: (s) => s.totalOrders >= 1 },
    { id: 'regulier', name: 'Régulier', emoji: '📅', desc: '5 commandes passées', condition: (s) => s.totalOrders >= 5 },
    { id: 'gourmet', name: 'Gourmet', emoji: '👨‍🍳', desc: '10 commandes passées', condition: (s) => s.totalOrders >= 10 },
    { id: 'vip', name: 'VIP', emoji: '💎', desc: '25 commandes passées', condition: (s) => s.totalOrders >= 25 },
    { id: 'legende', name: 'Légende', emoji: '🏆', desc: '50 commandes passées', condition: (s) => s.totalOrders >= 50 },
    { id: 'reactif', name: 'Réactif', emoji: '⚡', desc: '10 réactions émoji', condition: (s) => s.totalReactions >= 10 },
    { id: 'critique', name: 'Critique', emoji: '⭐', desc: 'Premier avis laissé', condition: (s) => s.totalReviews >= 1 },
  ];

  const MOCKED_LEADERBOARD = [
    { name: 'Kofi A.', points: 4200, level: 8, avatar: 'K', color: '#C4002B' },
    { name: 'Marie D.', points: 3800, level: 7, avatar: 'M', color: '#F5A623' },
    { name: 'Aminata S.', points: 3100, level: 7, avatar: 'A', color: '#00A651' },
    { name: 'Ibrahim K.', points: 2800, level: 6, avatar: 'I', color: '#7C3AED' },
    { name: 'Fatou N.', points: 2400, level: 6, avatar: 'F', color: '#DB2777' },
    { name: 'Jean P.', points: 2100, level: 6, avatar: 'J', color: '#0891B2' },
    { name: 'Akosua M.', points: 1800, level: 5, avatar: 'A', color: '#059669' },
    { name: 'Kwame B.', points: 1500, level: 5, avatar: 'K', color: '#D97706' },
    { name: 'Nadia O.', points: 1200, level: 4, avatar: 'N', color: '#DC2626' },
    { name: 'Cheikh T.', points: 900, level: 4, avatar: 'C', color: '#7C3AED' },
  ];

  function defaultState() {
    return {
      xp: 0,
      level: 1,
      totalOrders: 0,
      totalReactions: 0,
      totalReviews: 0,
      badges: [],
      createdAt: Date.now()
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return defaultState();
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* ignore */ }
  }

  function getLevelForXP(xp) {
    let level = 1;
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i]) {
        level = i + 1;
        break;
      }
    }
    return Math.min(level, 10);
  }

  function getXPForNextLevel(currentLevel) {
    if (currentLevel >= LEVEL_THRESHOLDS.length - 1) return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    return LEVEL_THRESHOLDS[currentLevel];
  }

  function getXPForCurrentLevel(currentLevel) {
    return LEVEL_THRESHOLDS[Math.max(0, currentLevel - 1)];
  }

  function checkBadges(state) {
    const newBadges = [];
    BADGE_DEFINITIONS.forEach(def => {
      if (!state.badges.includes(def.id) && def.condition(state)) {
        state.badges.push(def.id);
        newBadges.push(def);
      }
    });
    return newBadges;
  }

  function showLevelUpAnimation(newLevel) {
    let overlay = document.getElementById('levelup-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'levelup-overlay';
      overlay.className = 'levelup-overlay';
      overlay.innerHTML = `
        <div class="levelup-content">
          <span class="levelup-text">NIVEAU ${newLevel} !</span>
          <div style="color: var(--bad-gold); font-size: 1.1rem; font-weight: 600; margin-top: 0.5rem;">
            ${LEVEL_NAMES[newLevel - 1] || 'Expert'}
          </div>
        </div>`;
      document.body.appendChild(overlay);
    } else {
      overlay.querySelector('.levelup-text').textContent = `NIVEAU ${newLevel} !`;
      const nameEl = overlay.querySelector('.levelup-content div');
      if (nameEl) nameEl.textContent = LEVEL_NAMES[newLevel - 1] || 'Expert';
    }

    overlay.classList.remove('show');
    void overlay.offsetWidth; // reflow
    overlay.classList.add('show');

    setTimeout(() => overlay.classList.remove('show'), 2200);

    if (window.triggerConfetti) window.triggerConfetti();
  }

  /**
   * Public: renderXPBar()
   * Updates the XP bar elements in the navbar
   */
  window.renderXPBar = function () {
    const state = loadState();
    const level = state.level;
    const xp = state.xp;
    const xpForCurrent = getXPForCurrentLevel(level);
    const xpForNext = getXPForNextLevel(level);
    const progress = xpForNext > xpForCurrent
      ? Math.min(100, ((xp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100)
      : 100;

    const barFill = document.getElementById('xp-bar-fill');
    const xpLabel = document.getElementById('xp-label');
    const xpValueEl = document.getElementById('xp-value');
    const pointsValue = document.getElementById('points-value');

    if (barFill) barFill.style.width = `${progress}%`;
    if (xpLabel) xpLabel.textContent = `Niv. ${level}`;
    if (xpValueEl) xpValueEl.textContent = `${xp} / ${xpForNext} XP`;
    if (pointsValue) pointsValue.textContent = `${xp} pts`;
  };

  /**
   * Public: showBadgeUnlocked(badge)
   */
  window.showBadgeUnlocked = function (badge) {
    const existing = document.querySelector('.badge-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.className = 'badge-popup';
    popup.innerHTML = `
      <span class="badge-popup-emoji">${badge.emoji}</span>
      <div class="badge-popup-title">Badge Débloqué !</div>
      <div class="badge-popup-name">${badge.name}</div>
    `;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 3200);
  };

  /**
   * Public: awardXP(amount, reason)
   */
  window.awardXP = function (amount, reason) {
    const state = loadState();
    const oldLevel = state.level;
    state.xp += amount;
    state.level = getLevelForXP(state.xp);

    const newBadges = checkBadges(state);
    saveState(state);
    window.renderXPBar();

    // Level up?
    if (state.level > oldLevel) {
      setTimeout(() => showLevelUpAnimation(state.level), 200);
      if (window.showToast) {
        window.showToast(`🎉 Niveau ${state.level} atteint — ${LEVEL_NAMES[state.level - 1]} !`, 'success');
      }
    }

    // New badges
    newBadges.forEach((badge, idx) => {
      setTimeout(() => {
        window.showBadgeUnlocked(badge);
        if (window.showToast) {
          window.showToast(`🏅 Badge débloqué : ${badge.name}`, 'info');
        }
      }, 500 + idx * 800);
    });

    return state;
  };

  /**
   * Public: recordOrder()
   */
  window.recordOrder = function () {
    const state = loadState();
    state.totalOrders = (state.totalOrders || 0) + 1;
    saveState(state);
    return window.awardXP(50, 'order');
  };

  /**
   * Public: recordReaction()
   */
  window.recordReaction = function () {
    const state = loadState();
    state.totalReactions = (state.totalReactions || 0) + 1;
    saveState(state);
    return window.awardXP(5, 'reaction');
  };

  /**
   * Public: recordReview()
   */
  window.recordReview = function () {
    const state = loadState();
    state.totalReviews = (state.totalReviews || 0) + 1;
    saveState(state);
    return window.awardXP(20, 'review');
  };

  /**
   * Public: getGamificationState()
   */
  window.getGamificationState = function () {
    return loadState();
  };

  /**
   * Public: getLeaderboardData()
   * Returns mocked top-10 leaderboard + current user position
   */
  window.getLeaderboardData = function () {
    const state = loadState();
    const userEntry = {
      name: 'Vous',
      points: state.xp,
      level: state.level,
      avatar: 'V',
      color: '#C4002B',
      isCurrentUser: true
    };

    const sorted = [...MOCKED_LEADERBOARD].map(e => ({ ...e, isCurrentUser: false }));
    sorted.push(userEntry);
    sorted.sort((a, b) => b.points - a.points);

    return sorted.slice(0, 10).map((e, i) => ({ ...e, rank: i + 1 }));
  };

  /**
   * Public: getBadgeDefinitions()
   */
  window.getBadgeDefinitions = function () {
    return BADGE_DEFINITIONS;
  };

  /**
   * Public: renderGamificationModal()
   * Fills in the gamification modal content
   */
  window.renderGamificationModal = function () {
    const state = loadState();

    const levelEl = document.getElementById('gami-level-number');
    const levelNameEl = document.getElementById('gami-level-name');
    const badgesGrid = document.getElementById('gami-badges-grid');
    const lbList = document.getElementById('gami-leaderboard');

    if (levelEl) levelEl.textContent = state.level;
    if (levelNameEl) levelNameEl.textContent = LEVEL_NAMES[state.level - 1] || 'Expert';

    if (badgesGrid) {
      badgesGrid.innerHTML = BADGE_DEFINITIONS.map(def => {
        const unlocked = state.badges.includes(def.id);
        return `
          <div class="badge-item ${unlocked ? 'unlocked' : 'locked'}" title="${def.desc}">
            <div class="badge-emoji">${def.emoji}</div>
            <div class="badge-name">${def.name}</div>
          </div>`;
      }).join('');
    }

    if (lbList) {
      const data = window.getLeaderboardData();
      const rankColors = ['gold', 'silver', 'bronze'];
      lbList.innerHTML = data.map((e, i) => `
        <div class="leaderboard-row ${e.isCurrentUser ? 'current-user' : ''}">
          <span class="lb-rank ${rankColors[i] || ''}">${i < 3 ? ['🥇','🥈','🥉'][i] : e.rank}</span>
          <div class="lb-avatar" style="background: ${e.color}">${e.avatar}</div>
          <span class="lb-name">${e.name}</span>
          <span class="lb-points">${e.points} pts</span>
        </div>`).join('');
    }
  };

  // Init on load
  document.addEventListener('DOMContentLoaded', () => {
    window.renderXPBar();
  });

})();
