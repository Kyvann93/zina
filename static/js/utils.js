/**
 * ZINA Cantine BAD - Shared Utilities
 * Common functions used by both ordering and admin pages.
 * Load this file BEFORE ordering.js and admin.js.
 */

// ========================================
// Price & Date Formatting
// ========================================

/**
 * Format a number as FCFA currency (fr-FR locale)
 * @param {number} price
 * @returns {string} e.g. "1 500 FCFA"
 */
function formatPrice(price) {
    return new Intl.NumberFormat('fr-FR').format(price || 0) + ' FCFA';
}

/**
 * Format a date string or Date object to a short French date (e.g. "15 mars 2025")
 * @param {string|Date} dateInput
 * @returns {string}
 */
function formatDate(dateInput) {
    if (!dateInput) return '-';
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Format a date string or Date object to a short French time (e.g. "14:30")
 * @param {string|Date} dateInput
 * @returns {string}
 */
function formatTime(dateInput) {
    if (!dateInput) return '-';
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ========================================
// Order Status Helpers
// ========================================

/**
 * Map an order status key to a CSS badge class token.
 * Used as: `status-badge ${getStatusClass(status)}`
 * @param {string} status
 * @returns {string}
 */
function getStatusClass(status) {
    const map = {
        'pending':    'pending',
        'confirmed':  'confirmed',
        'preparing':  'preparing',
        'ready':      'ready',
        'completed':  'completed',
        'cancelled':  'cancelled'
    };
    return map[status] || 'info';
}

/**
 * Translate an order status key to a human-readable label.
 * @param {string} status
 * @param {string} lang  'fr' (default) or 'en'
 * @returns {string}
 */
function getStatusText(status, lang) {
    const fr = {
        'pending':   'En attente',
        'confirmed': 'Confirmée',
        'preparing': 'En préparation',
        'ready':     'Prête',
        'completed': 'Terminée',
        'cancelled': 'Annulée'
    };
    const en = {
        'pending':   'Pending',
        'confirmed': 'Confirmed',
        'preparing': 'Preparing',
        'ready':     'Ready',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
    };
    const map = (lang && lang !== 'fr') ? en : fr;
    return map[status] || status;
}

// ========================================
// Toast Notifications
// ========================================

/**
 * Display a floating toast notification.
 * Requires a `<div id="toastContainer">` in the page.
 * @param {string} message
 * @param {'info'|'success'|'error'|'warning'} type
 */
function showToast(message, type) {
    type = type || 'info';
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.warn('[Toast] #toastContainer not found –', message);
        return;
    }
    const iconMap = {
        success: 'check-circle',
        error:   'exclamation-circle',
        warning: 'exclamation-triangle',
        info:    'info-circle'
    };
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML =
        '<i class="fas fa-' + (iconMap[type] || 'info-circle') + '"></i>' +
        '<span>' + message + '</span>';
    container.appendChild(toast);

    setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-8px)';
        toast.style.transition = 'opacity 0.3s, transform 0.3s';
        setTimeout(function() { toast.remove(); }, 320);
    }, 3200);
}

// ========================================
// Generic Modal Helpers
// ========================================

/**
 * Open a modal by its element ID.
 * @param {string} id
 */
function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('active');
        el.style.display = '';  // clear any inline display:none
    }
}

/**
 * Close a modal by its element ID.
 * @param {string} id
 */
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('active');
    }
}

// ========================================
// Confirm Dialog
// ========================================

let _confirmCallback = null;

/**
 * Show the shared confirm modal.
 * Requires #confirmModal, #confirmModalTitle, #confirmMessage in the page.
 * @param {string}   title
 * @param {string}   message
 * @param {Function} onConfirm
 * @param {boolean}  [danger=true]  style confirm button as danger
 */
function showConfirmModal(title, message, onConfirm, danger) {
    _confirmCallback = onConfirm;
    const titleEl = document.getElementById('confirmModalTitle');
    const msgEl   = document.getElementById('confirmMessage');
    const btn     = document.getElementById('confirmBtn');
    if (titleEl) titleEl.textContent = title;
    if (msgEl)   msgEl.textContent   = message;
    if (btn) {
        btn.className = danger !== false ? 'btn-danger' : 'btn-primary';
    }
    openModal('confirmModal');
}

/**
 * Close the confirm modal without acting.
 */
function closeConfirmModal() {
    _confirmCallback = null;
    closeModal('confirmModal');
}

/**
 * Execute the confirm callback then close.
 * Wired to #confirmBtn via DOMContentLoaded in each page's JS.
 */
function confirmAction() {
    if (_confirmCallback) {
        _confirmCallback();
    }
    closeConfirmModal();
}

// ========================================
// Button Loading State
// ========================================

/**
 * Put a button into a loading/disabled state.
 * Stores the original HTML on the element so resetButton can restore it.
 * @param {HTMLElement} btn
 * @param {string} [loadingText]  label shown next to the spinner
 */
function setButtonLoading(btn, loadingText) {
    if (!btn) return;
    btn.dataset.originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML =
        '<i class="fas fa-circle-notch fa-spin" style="margin-right:.4em;font-size:.9em;"></i>' +
        (loadingText || '');
}

/**
 * Restore a button that was put into loading state by setButtonLoading.
 * @param {HTMLElement} btn
 */
function resetButton(btn) {
    if (!btn) return;
    if (btn.dataset.originalHtml !== undefined) {
        btn.innerHTML = btn.dataset.originalHtml;
        delete btn.dataset.originalHtml;
    }
    btn.disabled = false;
}

// ========================================
// Exports (for pages that load this file)
// ========================================
window.setButtonLoading  = setButtonLoading;
window.resetButton       = resetButton;
window.formatPrice       = formatPrice;
window.formatDate        = formatDate;
window.formatTime        = formatTime;
window.getStatusClass    = getStatusClass;
window.getStatusText     = getStatusText;
window.showToast         = showToast;
window.openModal         = openModal;
window.closeModal        = closeModal;
window.showConfirmModal  = showConfirmModal;
window.closeConfirmModal = closeConfirmModal;
window.confirmAction     = confirmAction;
