/**
 * ordering-api.js — Centralized API client for the ordering interface.
 * Mirrors adminFetch() on the admin side.
 *
 * Usage:
 *   apiFetch('/api/order', { method: 'POST', body: JSON.stringify(data) })
 *     .then(data => { ... })
 *     .catch(() => {}); // already toasted by apiFetch
 */

function apiFetch(url, options) {
    options = options || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    return fetch(url, Object.assign({ credentials: 'same-origin' }, options, { headers: headers }))
        .then(function (r) {
            var contentType = r.headers.get('content-type') || '';
            var isJson = contentType.indexOf('application/json') !== -1;
            if (!r.ok) {
                return (isJson ? r.json() : r.text()).then(function (body) {
                    var msg = (body && (body.error || body.message)) || r.statusText || 'Erreur serveur';
                    throw new Error(msg);
                });
            }
            return isJson ? r.json() : r.text();
        })
        .catch(function (err) {
            var msg = err.message || 'Erreur de connexion. Veuillez réessayer.';
            if (typeof showToast === 'function') showToast(msg, 'error');
            throw err;
        });
}

window.apiFetch = apiFetch;
