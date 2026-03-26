/** ordering-formulas.js — Formula meal builder */
// ========================================
// Formula Feature
// ========================================

/**
 * Maps a DB category_name (lowercased) to a course type.
 * Used to filter which menu items appear at each formula step.
 */
const COURSE_TYPE_MAP = {
    'entrées':        'entree',
    'entrée':         'entree',
    'entrees':        'entree',
    'entree':         'entree',
    'salades':        'entree',
    'salade':         'entree',
    'snacks':         'entree',
    'petit déjeuner': 'entree',
    'petit-déjeuner': 'entree',
    'soupes':         'entree',
    'soupe':          'entree',
    'déjeuner':       'plat',
    'dejeuner':       'plat',
    'plats complets': 'plat',
    'plats':          'plat',
    'spécialités':    'plat',
    'specialites':    'plat',
    'dîner':          'plat',
    'diner':          'plat',
    'desserts':       'dessert',
    'dessert':        'dessert',
    'boissons':       'boisson',
};

function getCourseType(categoryName) {
    if (!categoryName) return null;
    return COURSE_TYPE_MAP[categoryName.toLowerCase().trim()] || null;
}

const FORMULAS = [
    {
        id: 'f1',
        name: 'Entrée + Plat',
        description: 'Une entrée et un plat de votre choix',
        icon: 'fas fa-utensils',
        steps: ['entree', 'plat'],
        labels: { entree: 'Votre Entrée', plat: 'Votre Plat' }
    },
    {
        id: 'f2',
        name: 'Entrée + Plat + Dessert',
        description: 'La formule complète sans boisson',
        icon: 'fas fa-star',
        badge: 'Populaire',
        steps: ['entree', 'plat', 'dessert'],
        labels: { entree: 'Votre Entrée', plat: 'Votre Plat', dessert: 'Votre Dessert' }
    },
    {
        id: 'f3',
        name: 'Plat + Dessert',
        description: 'Un plat et une douceur en fin de repas',
        icon: 'fas fa-ice-cream',
        steps: ['plat', 'dessert'],
        labels: { plat: 'Votre Plat', dessert: 'Votre Dessert' }
    },
    {
        id: 'f4',
        name: 'Formule Complète',
        description: 'Entrée, plat, dessert et boisson — le repas idéal',
        icon: 'fas fa-crown',
        badge: 'Complet',
        steps: ['entree', 'plat', 'dessert', 'boisson'],
        labels: { entree: 'Votre Entrée', plat: 'Votre Plat', dessert: 'Votre Dessert', boisson: 'Votre Boisson' }
    }
];

// Formula builder state
var currentFormula = null;
var currentFormulaStep = 0;
var formulaSelections = {};

var COURSE_STEP_LABELS = {
    entree:  'Entrée',
    plat:    'Plat',
    dessert: 'Dessert',
    boisson: 'Boisson'
};

/**
 * Render the formula cards grid in the menu area.
 */
function renderFormulas() {
    var grid = document.getElementById('menuGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="formula-cards-grid">' +
        FORMULAS.map(function(f) {
            var stepBadges = f.steps.map(function(s) {
                return '<span class="formula-step-badge">' + (COURSE_STEP_LABELS[s] || s) + '</span>';
            }).join('');

            return '<div class="formula-card">' +
                '<div class="formula-card-header">' +
                    '<div class="formula-card-icon"><i class="' + f.icon + '"></i></div>' +
                    (f.badge ? '<span class="formula-card-badge">' + f.badge + '</span>' : '') +
                '</div>' +
                '<div class="formula-card-body">' +
                    '<h3 class="formula-card-name">' + f.name + '</h3>' +
                    '<p class="formula-card-desc">' + f.description + '</p>' +
                    '<div class="formula-step-badges">' + stepBadges + '</div>' +
                '</div>' +
                '<button class="formula-compose-btn" onclick="openFormulaBuilderModal(\'' + f.id + '\')">' +
                    '<i class="fas fa-plus-circle"></i> Composer' +
                '</button>' +
            '</div>';
        }).join('') +
    '</div>';
}

function openFormulaBuilderModal(formulaId) {
    currentFormula = FORMULAS.find(function(f) { return f.id === formulaId; });
    if (!currentFormula) return;
    currentFormulaStep = 0;
    formulaSelections = {};

    document.getElementById('formulaBuilderTitle').innerHTML =
        '<i class="' + currentFormula.icon + '"></i> ' + currentFormula.name;

    buildFormulaProgress();
    renderFormulaStep(0);
    openModal('formulaBuilderModal');
}

function closeFormulaBuilderModal() {
    currentFormula = null;
    currentFormulaStep = 0;
    formulaSelections = {};
    closeModal('formulaBuilderModal');
}

function buildFormulaProgress() {
    var el = document.getElementById('formulaProgress');
    if (!el || !currentFormula) return;
    el.innerHTML = currentFormula.steps.map(function(step, i) {
        return '<div class="formula-prog-step" id="fprog-' + i + '">' +
            '<div class="formula-prog-dot">' + (i + 1) + '</div>' +
            '<span>' + (COURSE_STEP_LABELS[step] || step) + '</span>' +
        '</div>';
    }).join('<div class="formula-prog-connector"></div>');
    updateFormulaProgress();
}

function updateFormulaProgress() {
    if (!currentFormula) return;
    currentFormula.steps.forEach(function(_, i) {
        var el = document.getElementById('fprog-' + i);
        if (!el) return;
        el.className = 'formula-prog-step' +
            (i < currentFormulaStep ? ' done' : '') +
            (i === currentFormulaStep ? ' active' : '');
    });
}

function renderFormulaStep(stepIndex) {
    if (!currentFormula) return;
    var courseType = currentFormula.steps[stepIndex];
    var label = currentFormula.labels[courseType] || COURSE_STEP_LABELS[courseType] || courseType;

    // Update step label
    var labelEl = document.getElementById('formulaStepLabel');
    if (labelEl) labelEl.textContent = 'Étape ' + (stepIndex + 1) + ' / ' + currentFormula.steps.length + ' — ' + label;

    // Filter menu items for this course type
    var items = (menuItems || []).filter(function(item) {
        return getCourseType(item.category) === courseType && item.available !== false;
    });

    var content = document.getElementById('formulaStepContent');
    if (!content) return;

    if (items.length === 0) {
        content.innerHTML = '<div class="formula-empty-step"><i class="fas fa-exclamation-circle"></i>' +
            '<p>Aucun plat disponible pour cette étape.<br>Veuillez contacter le personnel.</p></div>';
    } else {
        var selected = formulaSelections[courseType];
        content.innerHTML = '<div class="formula-item-grid">' +
            items.map(function(item) {
                var isSelected = selected && String(selected.id) === String(item.id);
                return '<div class="formula-item' + (isSelected ? ' selected' : '') + '" onclick="selectFormulaItem(' + stepIndex + ', ' + item.id + ')">' +
                    '<div class="formula-item-img">' +
                        (item.image ? '<img src="' + proxyImg(item.image) + '" alt="' + item.name + '" loading="lazy" onerror="this.parentElement.innerHTML=\'<i class=\\\"fas fa-utensils\\\"></i>\'">' :
                            '<div class="formula-item-placeholder"><i class="fas fa-utensils"></i></div>') +
                        (isSelected ? '<div class="formula-item-check"><i class="fas fa-check"></i></div>' : '') +
                    '</div>' +
                    '<div class="formula-item-info">' +
                        '<p class="formula-item-name">' + item.name + '</p>' +
                        '<p class="formula-item-price">' + formatPrice(item.price) + '</p>' +
                    '</div>' +
                '</div>';
            }).join('') +
        '</div>';
    }

    updateFormulaSummary();
    updateFormulaFooterButtons();
    updateFormulaProgress();
}

function selectFormulaItem(stepIndex, itemId) {
    if (!currentFormula) return;
    var courseType = currentFormula.steps[stepIndex];
    var item = (menuItems || []).find(function(m) { return String(m.id) === String(itemId); });
    if (!item) return;

    formulaSelections[courseType] = item;

    // Refresh grid to show checkmark
    renderFormulaStep(stepIndex);

    // Auto-advance after short delay if not on last step
    if (stepIndex < currentFormula.steps.length - 1) {
        setTimeout(function() { formulaNextStep(); }, 380);
    }
}

function formulaNextStep() {
    if (!currentFormula) return;
    var courseType = currentFormula.steps[currentFormulaStep];
    if (!formulaSelections[courseType]) {
        showToast('Veuillez sélectionner un article pour continuer', 'warning');
        return;
    }
    currentFormulaStep++;
    if (currentFormulaStep >= currentFormula.steps.length) {
        currentFormulaStep = currentFormula.steps.length - 1;
    }
    renderFormulaStep(currentFormulaStep);
}

function formulaPreviousStep() {
    if (currentFormulaStep > 0) {
        currentFormulaStep--;
        renderFormulaStep(currentFormulaStep);
    }
}

function updateFormulaFooterButtons() {
    var backBtn  = document.getElementById('formulaBackBtn');
    var nextBtn  = document.getElementById('formulaNextBtn');
    var addBtn   = document.getElementById('formulaAddToCartBtn');
    if (!currentFormula) return;

    var isLast = currentFormulaStep === currentFormula.steps.length - 1;
    var allSelected = currentFormula.steps.every(function(s) { return !!formulaSelections[s]; });

    if (backBtn) backBtn.style.display = currentFormulaStep > 0 ? '' : 'none';
    if (nextBtn) nextBtn.style.display = (isLast && allSelected) ? 'none' : '';
    if (addBtn)  addBtn.style.display  = (isLast && allSelected) ? '' : 'none';

    updateFormulaTotal();
}

function updateFormulaTotal() {
    var total = Object.values(formulaSelections).reduce(function(sum, item) {
        return sum + (item ? item.price : 0);
    }, 0);
    var el = document.getElementById('formulaTotalPreview');
    if (el) el.textContent = 'Total : ' + formatPrice(total);
}

function updateFormulaSummary() {
    var el = document.getElementById('formulaSummary');
    if (!el || !currentFormula) return;
    var entries = currentFormula.steps
        .filter(function(s) { return !!formulaSelections[s]; })
        .map(function(s) {
            var item = formulaSelections[s];
            return '<div class="formula-summary-row">' +
                '<span class="formula-summary-course">' + (COURSE_STEP_LABELS[s] || s) + '</span>' +
                '<span class="formula-summary-name">' + item.name + '</span>' +
                '<span class="formula-summary-price">' + formatPrice(item.price) + '</span>' +
            '</div>';
        });
    el.innerHTML = entries.length ? entries.join('') : '';
}

function addFormulaToCart() {
    if (!currentFormula) return;
    var allSelected = currentFormula.steps.every(function(s) { return !!formulaSelections[s]; });
    if (!allSelected) {
        showToast('Veuillez compléter tous les choix de la formule', 'warning');
        return;
    }

    // Calculate total price
    var total = Object.values(formulaSelections).reduce(function(sum, item) {
        return sum + item.price;
    }, 0);

    // Build sub-items list
    var subItems = currentFormula.steps.map(function(s) {
        return formulaSelections[s];
    });

    // Add as grouped formula cart entry
    var formulaCartItem = {
        id: 'formula-' + currentFormula.id + '-' + Date.now(),
        isFormula: true,
        formulaName: currentFormula.name,
        formulaIcon: currentFormula.icon,
        items: subItems,
        name: currentFormula.name,
        price: total,
        quantity: 1,
        image: subItems[0] ? subItems[0].image : '',
        category: 'formula'
    };

    cart.push(formulaCartItem);
    saveCart();
    updateCartUI();

    showToast('Formule "' + currentFormula.name + '" ajoutée au panier !', 'success');
    closeFormulaBuilderModal();
    filterCategory('all'); // Return to full menu view
}

/**
 * Expand formula cart items into individual product_id lines for the API.
 */
function flattenCartForSubmission(cartItems) {
    var result = [];
    cartItems.forEach(function(item) {
        if (item.isFormula) {
            item.items.forEach(function(subItem) {
                result.push({
                    product_id: subItem.id,
                    quantity: 1,
                    option_ids: []
                });
            });
        } else {
            result.push({
                product_id: item.id,
                quantity: item.quantity,
                option_ids: item.optionIds || []
            });
        }
    });
    return result;
}

// Export formula functions
window.renderFormulas            = renderFormulas;
window.openFormulaBuilderModal   = openFormulaBuilderModal;
window.closeFormulaBuilderModal  = closeFormulaBuilderModal;
window.selectFormulaItem         = selectFormulaItem;
window.formulaNextStep           = formulaNextStep;
window.formulaPreviousStep       = formulaPreviousStep;
window.addFormulaToCart          = addFormulaToCart;
