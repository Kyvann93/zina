/** ordering-cart.js — Cart, checkout, Wave payment, success modal */
// ========================================
// Cart System
// ========================================
function addToCart(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    if (!item || !item.available) return;

    // Add item directly to cart with quantity 1
    addToCartDirectly(item, 1);
}

function addToCartDirectly(item, quantity) {
    const existingItem = cart.find(i => i.id === item.id);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: quantity,
            image: item.image,
            category: item.category,
            prepTime: item.prepTime,
            optionIds: [],
            siders: {}
        });
    }

    updateCartUI();
    saveCart();  // Save to localStorage
    showToast(currentLanguage === 'fr' ? 'Article ajouté au panier' : 'Item added to cart', 'success');
}

function updateCartUI() {
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const navCartCount = document.getElementById('navCartCount');
    const desktopCartCount = document.getElementById('desktopCartCount');

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Update all cart count badges
    if (cartCount) cartCount.textContent = totalItems;

    [navCartCount, desktopCartCount].forEach(function(badge) {
        if (!badge) return;
        badge.textContent = totalItems;
        badge.style.display = totalItems === 0 ? 'none' : 'flex';
        if (totalItems > 0) {
            badge.style.animation = 'none';
            badge.offsetHeight; // reflow to restart
            badge.style.animation = 'badgePop 0.3s ease';
        }
    });


    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-basket-shopping"></i>
                <p>${currentLanguage === 'fr' ? 'Votre panier est vide' : 'Your cart is empty'}</p>
                <span>${currentLanguage === 'fr' ? 'Ajoutez des articles pour commencer' : 'Add items to get started'}</span>
            </div>
        `;
    } else {
        cartItems.innerHTML = cart.map(function(item) {
            if (item.isFormula) {
                var subList = item.items.map(function(sub) {
                    return '<li><i class="fas fa-check"></i> ' + sub.name + '</li>';
                }).join('');
                return '<div class="cart-item cart-item-formula">' +
                    '<div class="cart-formula-icon"><i class="' + item.formulaIcon + '"></i></div>' +
                    '<div class="cart-item-details">' +
                        '<div class="cart-item-title">' + item.formulaName + '</div>' +
                        '<ul class="formula-cart-subitems">' + subList + '</ul>' +
                    '</div>' +
                    '<button class="remove-item" onclick="removeFromCart(\'' + item.id + '\')" title="Retirer">' +
                        '<i class="fas fa-trash-alt"></i>' +
                    '</button>' +
                '</div>';
            }
            // Normal item with qty controls
            return '<div class="cart-item" data-id="' + item.id + '">' +
                '<div class="cart-item-image">' +
                    '<img src="' + proxyImg(item.image) + '" alt="' + item.name + '" onerror="this.parentElement.innerHTML=\'<i class=\\\"fas fa-utensils\\\"></i>\'">' +
                '</div>' +
                '<div class="cart-item-details">' +
                    '<div class="cart-item-title">' + item.name + '</div>' +
                    '<div class="cart-qty-controls">' +
                        '<button class="cart-qty-btn" onclick="updateQuantity(' + item.id + ', -1)" title="Réduire">' +
                            '<i class="fas fa-minus"></i>' +
                        '</button>' +
                        '<span class="cart-qty-val">' + item.quantity + '</span>' +
                        '<button class="cart-qty-btn" onclick="updateQuantity(' + item.id + ', 1)" title="Augmenter">' +
                            '<i class="fas fa-plus"></i>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
                '<div class="cart-item-right">' +
                    '<span class="cart-item-total">' + formatPrice(item.price * item.quantity) + '</span>' +
                    '<button class="remove-item" onclick="removeFromCart(' + item.id + ')" title="Retirer">' +
                        '<i class="fas fa-trash-alt"></i>' +
                    '</button>' +
                '</div>' +
            '</div>';
        }).join('');
    }
    
    updateCartTotals();
}

function updateQuantity(itemId, change) {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;

    item.quantity += change;
    if (item.quantity <= 0) {
        cart = cart.filter(i => i.id !== itemId);
        showToast(currentLanguage === 'fr' ? 'Article retiré du panier' : 'Item removed from cart', 'warning');
    } else {
        showToast(currentLanguage === 'fr' ? 'Quantité mise à jour' : 'Quantity updated', 'info');
    }

    updateCartUI();
    saveCart();  // Save to localStorage
}

function removeFromCart(itemId) {
    cart = cart.filter(i => i.id !== itemId);
    updateCartUI();
    saveCart();  // Save to localStorage
    showToast(currentLanguage === 'fr' ? 'Article retiré du panier' : 'Item removed from cart', 'warning');
}

function updateCartTotals() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    document.getElementById('cartTotal').textContent = formatPrice(total);
}

function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('active');
    document.getElementById('cartOverlay').classList.toggle('active');
}

// ========================================
// Meal Selection Modal (Siders Selection)
// ========================================
function openMealSelectionModal(meal) {
    console.log('Opening meal selection modal for:', meal.name);
    currentMealSelection = meal;
    currentStep = 1;
    siderQuantities = { fries: 0, alloco: 0, attieke: 0 };
    selectedPickupTime = null;

    // Update selected meal info
    const mealInfoEl = document.getElementById('selectedMealInfo');
    if (mealInfoEl) {
        mealInfoEl.textContent = `${meal.name} - ${formatPrice(meal.price)}`;
    }

    // Reset sider quantities display
    updateSiderDisplay();

    // Show modal
    const modal = document.getElementById('mealSelectionModal');
    console.log('Modal element:', modal);
    if (modal) {
        modal.classList.add('active');
        console.log('Modal classes:', modal.classList);
    }

    // Show step 1
    showStep(1);
}

function closeMealSelectionModal() {
    document.getElementById('mealSelectionModal').classList.remove('active');
    currentMealSelection = null;
    currentStep = 1;
    siderQuantities = { fries: 0, alloco: 0, attieke: 0 };
}

function updateSiderQuantity(siderType, change) {
    if (siderQuantities[siderType] === undefined) return;

    const newValue = siderQuantities[siderType] + change;
    if (newValue < 0) return;

    siderQuantities[siderType] = newValue;
    updateSiderDisplay();
}

function updateSiderDisplay() {
    document.getElementById('friesQty').textContent = siderQuantities.fries;
    document.getElementById('allocoQty').textContent = siderQuantities.alloco;
    document.getElementById('attiekeQty').textContent = siderQuantities.attieke;

    // Disable minus buttons if quantity is 0
    document.querySelector('.qty-btn-minus[onclick*="fries"]').disabled = siderQuantities.fries === 0;
    document.querySelector('.qty-btn-minus[onclick*="alloco"]').disabled = siderQuantities.alloco === 0;
    document.querySelector('.qty-btn-minus[onclick*="attieke"]').disabled = siderQuantities.attieke === 0;
}

function nextStep() {
    if (currentStep === 1) {
        // Validate at least one sider is selected
        const totalSiders = siderQuantities.fries + siderQuantities.alloco + siderQuantities.attieke;
        if (totalSiders === 0) {
            showToast(currentLanguage === 'fr' ? 'Veuillez sélectionner au moins un accompagnement' : 'Please select at least one side', 'warning');
            return;
        }

        // Show verification step
        showVerificationStep();
        showStep(2);
    } else if (currentStep === 2) {
        // Show pickup time step
        showPickupTimeStep();
        showStep(3);
    }
}

function previousStep() {
    if (currentStep === 2) {
        showStep(1);
    } else if (currentStep === 3) {
        showStep(2);
    }
}

function showStep(step) {
    currentStep = step;

    // Update step visibility
    document.querySelectorAll('.modal-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');

    // Update progress indicator
    document.querySelectorAll('.progress-step').forEach((s, index) => {
        const stepNum = index + 1;
        s.classList.remove('active', 'completed');
        if (stepNum === step) {
            s.classList.add('active');
        } else if (stepNum < step) {
            s.classList.add('completed');
        }
    });

    // Update buttons
    document.getElementById('backBtn').style.display = step === 1 ? 'none' : 'flex';
    document.getElementById('nextBtn').style.display = step === 3 ? 'none' : 'flex';
    document.getElementById('confirmBtn').style.display = step === 3 ? 'flex' : 'none';
}

function showVerificationStep() {
    const meal = currentMealSelection;

    // Update meal info
    document.getElementById('verifyMealName').textContent = meal.name;
    document.getElementById('verifyMealPrice').textContent = formatPrice(meal.price);
    document.getElementById('verifyMealQty').textContent = `x1`;

    // Set meal image
    const imageContainer = document.getElementById('verifyMealImage');
    if (meal.image && meal.image.startsWith('<')) {
        imageContainer.innerHTML = meal.image;
    } else {
        imageContainer.innerHTML = `<img src="${meal.image}" alt="${meal.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>🍽️</text></svg>'">`;
    }

    // Update siders list
    const sidersContainer = document.getElementById('verificationSiders');
    const siderNamesFr = {
        fries: 'Frites',
        alloco: 'Alloco',
        attieke: 'Attiéké'
    };
    const siderNamesEn = {
        fries: 'Fries',
        alloco: 'Alloco',
        attieke: 'Attiéké'
    };
    const siderIcons = {
        fries: '🍟',
        alloco: '🍌',
        attieke: '🍚'
    };
    const siderNames = currentLanguage === 'fr' ? siderNamesFr : siderNamesEn;

    let sidersHtml = '';
    for (const [key, qty] of Object.entries(siderQuantities)) {
        if (qty > 0) {
            sidersHtml += `
                <div class="verification-sider-item">
                    <div class="sider-info">
                        <span class="sider-icon">${siderIcons[key]}</span>
                        <span class="sider-name">${siderNames[key]}</span>
                    </div>
                    <span class="sider-qty-label">x${qty} ${currentLanguage === 'fr' ? 'portion' : 'portion'}${qty > 1 ? 's' : ''}</span>
                </div>
            `;
        }
    }
    sidersContainer.innerHTML = sidersHtml;

    // Update total
    document.getElementById('verifyTotal').textContent = formatPrice(meal.price);
}

function showPickupTimeStep() {
    const prepTime = currentMealSelection.prepTime || 15;
    document.getElementById('prepTimeDisplay').textContent = prepTime;

    // Calculate earliest pickup time
    const earliestTime = new Date();
    earliestTime.setMinutes(earliestTime.getMinutes() + prepTime + 5);
    const locale = currentLanguage === 'fr' ? 'fr-FR' : 'en-US';
    const earliestTimeStr = earliestTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    document.getElementById('earliestTime').textContent = currentLanguage === 'fr' ? `Prêt vers ${earliestTimeStr}` : `Ready around ${earliestTimeStr}`;

    // Populate custom time options
    populatePickupTimeOptions(prepTime);

    // Reset to ASAP
    document.querySelector('input[name="pickupTime"][value="asap"]').checked = true;
    document.getElementById('customTimeInput').style.display = 'none';
    selectedPickupTime = 'asap';
}

function populatePickupTimeOptions(prepTimeMinutes) {
    const select = document.getElementById('pickupTimeSelect');
    const now = new Date();
    const minPickupMinutes = prepTimeMinutes + 5;

    select.innerHTML = '';

    // Create time options every 15 minutes for the next 3 hours
    for (let i = minPickupMinutes; i <= minPickupMinutes + 180; i += 15) {
        const time = new Date(now.getTime() + i * 60000);
        const locale = currentLanguage === 'fr' ? 'fr-FR' : 'en-US';
        const timeStr = time.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        const label = i < 60 ? (currentLanguage === 'fr' ? `Dans ${i} min (${timeStr})` : `In ${i} min (${timeStr})`) : (currentLanguage === 'fr' ? `À ${timeStr}` : `At ${timeStr}`);

        const option = document.createElement('option');
        option.value = i;
        option.textContent = label;
        select.appendChild(option);
    }
}

function updateCustomTime() {
    document.getElementById('customTimeInput').style.display = 'none';
    selectedPickupTime = 'asap';
}

function enableCustomTime() {
    document.getElementById('customTimeInput').style.display = 'block';
    // Select first option by default
    const select = document.getElementById('pickupTimeSelect');
    if (select.options.length > 0) {
        selectedPickupTime = parseInt(select.value);
    }
}

function updatePickupTime() {
    const select = document.getElementById('pickupTimeSelect');
    selectedPickupTime = parseInt(select.value);
}

function confirmMealOrder() {
        console.log('confirmMealOrder called');
        // Loader/modal debug logs
        console.log('Attempting to show loader/modal...');
        console.log('successModal:', successModal);
        console.log('orderLoading:', orderLoading);
        console.log('orderReceipt:', orderReceipt);
        // After showing modal/loader
        setTimeout(() => {
            console.log('Loader should now be hidden, receipt shown.');
        }, 1200);
    if (!currentMealSelection) return;

    // Calculate pickup time
    const prepTime = currentMealSelection.prepTime || 15;
    let pickupTime;

    if (selectedPickupTime === 'asap') {
        pickupTime = new Date();
        pickupTime.setMinutes(pickupTime.getMinutes() + prepTime + 5);
    } else {
        pickupTime = new Date();
        pickupTime.setMinutes(pickupTime.getMinutes() + selectedPickupTime);
    }

    // Add meal to cart with siders
    const mealWithSiders = {
        id: currentMealSelection.id,
        name: currentMealSelection.name,
        price: currentMealSelection.price,
        quantity: 1,
        image: currentMealSelection.image,
        category: currentMealSelection.category,
        prepTime: prepTime,
        optionIds: [],
        siders: { ...siderQuantities }
    };

    cart.push(mealWithSiders);
    updateCartUI();
    saveCart();

    // Close modal
    closeMealSelectionModal();

    // Show loader and success modal instantly
    const successModal = document.getElementById('successModal');
    const orderLoading = document.getElementById('orderLoading');
    const orderReceipt = document.getElementById('orderReceipt');

    if (successModal) {
        successModal.style.transition = 'none';
        successModal.style.display = 'flex';
        successModal.offsetHeight; // Force reflow
        successModal.style.opacity = '1';
        successModal.style.visibility = 'visible';
        successModal.classList.add('active');
    }
    if (orderLoading) {
        orderLoading.style.display = 'block';
    }
    if (orderReceipt) {
        orderReceipt.style.display = 'none';
    }

    // Show success after a short delay (simulate processing)
    setTimeout(() => {
        if (orderLoading) orderLoading.style.display = 'none';
        if (orderReceipt) orderReceipt.style.display = 'block';
        // Optionally set order number, etc.
    }, 1200);

    // Show success toast
    showToast(currentLanguage === 'fr' ? 'Commande ajoutée au panier' : 'Order added to cart', 'success');
}

// ========================================
// Checkout
// ========================================
function proceedToCheckout() {
    console.log('proceedToCheckout called, cart length:', cart.length);

    if (cart.length === 0) {
        showToast(currentLanguage === 'fr' ? 'Votre panier est vide' : 'Your cart is empty', 'error');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Calculate total prep time (max of all items)
    const totalPrepTime = Math.max(...cart.map(item => item.prepTime || 15));

    const orderSummary = document.getElementById('orderSummary');
    console.log('orderSummary element:', orderSummary);

    if (!orderSummary) {
        console.error('orderSummary element not found!');
        showToast('Error: Order summary not found', 'error');
        return;
    }

    orderSummary.innerHTML = `
        <h4 style="margin-bottom: 1rem;">${currentLanguage === 'fr' ? 'Récapitulatif de la commande' : 'Order Summary'}</h4>
        <div class="order-items-detail" style="margin-bottom: 1rem; max-height: 200px; overflow-y: auto;">
            ${cart.map(item => `
                <div class="order-item-detail" style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                    <span>${item.quantity}x ${item.name}</span>
                    <strong>${formatPrice(item.price * item.quantity)}</strong>
                </div>
            `).join('')}
        </div>
        <div class="order-prep-time" style="margin-bottom: 1rem; color:white; padding: 0.5rem; background: #581b1f; border-radius: 4px; font-size: 0.9rem;">
            <i class="fas fa-clock"></i> ${currentLanguage === 'fr' ? 'Temps de préparation estimé' : 'Estimated prep time'}: <strong>${totalPrepTime} ${currentLanguage === 'fr' ? 'minutes' : 'minutes'}</strong>
        </div>
        <div class="order-item" style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #ddd;">
            <strong>${currentLanguage === 'fr' ? 'Total à payer' : 'Total to pay'}</strong>
            <strong style="color: var(--primary);">${formatPrice(total)}</strong>
        </div>
    `;

    // Update pickup time options based on prep time
    updatePickupTimeOptions(totalPrepTime);

    const orderModal = document.getElementById('orderModal');
    console.log('orderModal element:', orderModal);

    if (orderModal) {
        orderModal.style.display = 'flex';
        // Force reflow
        orderModal.offsetHeight;
        orderModal.classList.add('active');
        console.log('orderModal active class added');
    }

    // Close cart sidebar
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    if (cartSidebar && cartSidebar.classList.contains('active')) {
        cartSidebar.classList.remove('active');
    }
    if (cartOverlay && cartOverlay.classList.contains('active')) {
        cartOverlay.classList.remove('active');
    }
}

function updatePickupTimeOptions(prepTimeMinutes) {
    const pickupSelect = document.getElementById('pickupTime');
    // Clear existing options
    pickupSelect.innerHTML = '';

    // Calculate minimum pickup time (prep time + 5 min buffer)
    const minPickupMinutes = prepTimeMinutes + 5;

    // Create options that are all >= minPickupMinutes
    const options = [
        { value: minPickupMinutes, label: `Dans ${minPickupMinutes} minutes (le plus tôt)` },
        { value: Math.max(30, minPickupMinutes + 15), label: `Dans ${Math.max(30, minPickupMinutes + 15)} minutes` },
        { value: Math.max(45, minPickupMinutes + 30), label: `Dans ${Math.max(45, minPickupMinutes + 30)} minutes` },
        { value: Math.max(60, minPickupMinutes + 45), label: `Dans ${Math.max(60, minPickupMinutes + 45)} minutes` },
        { value: Math.max(90, minPickupMinutes + 60), label: `Dans ${Math.max(90, minPickupMinutes + 60)} minutes` }
    ];

    // Remove duplicates and add options
    const seen = new Set();
    options.forEach(opt => {
        if (!seen.has(opt.value)) {
            seen.add(opt.value);
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            pickupSelect.appendChild(option);
        }
    });
}

function closeOrderModal() {
    const orderModal = document.getElementById('orderModal');
    if (orderModal) {
        orderModal.classList.remove('active');
        orderModal.style.display = 'none';
    }
}

function confirmOrder() {
    // Hide orderModal, show payment method selection
    const orderModal = document.getElementById('orderModal');
    if (orderModal) {
        orderModal.style.display = 'none';
        orderModal.classList.remove('active');
    }
    const pmModal = document.getElementById('paymentMethodModal');
    if (pmModal) {
        pmModal.style.display = 'flex';
        pmModal.offsetHeight;
        pmModal.classList.add('active');
    }
}

function closePaymentMethodModal() {
    const pmModal = document.getElementById('paymentMethodModal');
    if (pmModal) {
        pmModal.classList.remove('active');
        pmModal.style.display = 'none';
    }
}

function proceedWithPayment() {
    const selected = document.querySelector('input[name="paymentMethod"]:checked');
    const paymentMethod = selected ? selected.value : 'cash';

    // Mobile money not yet available — show toast and stay on modal
    if (paymentMethod === 'orange_money' || paymentMethod === 'mtn_momo' || paymentMethod === 'moov_money') {
        showToast(
            currentLanguage === 'fr'
                ? 'Ce mode de paiement n\'est pas disponible pour le moment'
                : 'This payment method is not available at the moment',
            'warning'
        );
        return;
    }

    closePaymentMethodModal();

    console.log('proceedWithPayment called, method:', paymentMethod);

    // Show the success modal with loader immediately
    const successModal = document.getElementById('successModal');
    const orderLoading = document.getElementById('orderLoading');
    const orderReceipt = document.getElementById('orderReceipt');

    console.log('Elements found:', { successModal, orderLoading, orderReceipt });

    // Show the modal instantly (skip transition)
    if (successModal) {
        successModal.style.transition = 'none';
        successModal.style.display = 'flex';
        successModal.offsetHeight; // Force reflow
        successModal.style.opacity = '1';
        successModal.style.visibility = 'visible';
        successModal.classList.add('active');
        console.log('Modal shown');
    }

    // Show loading spinner, hide receipt
    if (orderLoading) {
        orderLoading.style.display = 'block';
        console.log('Loader shown');
    }
    if (orderReceipt) {
        orderReceipt.style.display = 'none';
    }

    console.log('Modal and loader shown');

    // Use setTimeout to ensure UI updates before fetch (guarantees loader is painted)
    setTimeout(() => {
        const pickupMinutes = parseInt(document.getElementById('pickupTime').value);

        // Calculate pickup time
        const pickupTime = new Date();
        pickupTime.setMinutes(pickupTime.getMinutes() + pickupMinutes);

        // Calculate total prep time
        const totalPrepTime = Math.max(...cart.map(item => item.prepTime || 15));

        // Format items for backend API
        const orderItems = flattenCartForSubmission(cart);

        const orderData = {
            // Only include user_id if it exists (guest users have null ID)
            ...(currentUser.id && { user_id: currentUser.id }),
            items: orderItems,
            payment_method: paymentMethod,
            pickup_time: pickupTime.toISOString(),
            prep_time_minutes: totalPrepTime
        };

        // Send to API
        apiFetch('/api/order', {
            method: 'POST',
            body: JSON.stringify(orderData)
        })
        .then(data => {
            if (data.status === 'success' || data.order_id) {
                // Calculate total amount from order items
                const totalAmount = data.items ? data.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) : 0;

                // Update guest user with the assigned user_id from backend
                if (currentUser && currentUser.isGuest && data.user_id) {
                    currentUser.id = data.user_id;
                    localStorage.setItem('zina_user', JSON.stringify(currentUser));
                    sessionStorage.setItem('zina_user', JSON.stringify(currentUser));
                }

                // Hide loading modal
                const successModal = document.getElementById('successModal');
                if (successModal) {
                    successModal.style.display = 'none';
                    successModal.classList.remove('active');
                }

                // Clear cart
                cart = [];
                saveCart();
                updateCartUI();

                if (paymentMethod === 'wave') {
                    // Show Wave modal in "unavailable" mode — user pays at counter
                    showWaveUnavailableModal(data.order_id, totalAmount, pickupTime, totalPrepTime, data.items || []);
                } else {
                    // Show receipt directly for cash
                    showSuccess(data.order_id, pickupTime, totalPrepTime, data.items || [], totalAmount);
                }

            } else {
                const successModal = document.getElementById('successModal');
                if (successModal) { successModal.style.display = 'none'; successModal.classList.remove('active'); }
                showToast(currentLanguage === 'fr' ? 'Erreur: ' + (data.error || 'Échec de la commande') : 'Error: ' + (data.error || 'Order failed'), 'error');
            }
        })
        .catch(error => {
            console.error('Order error:', error);
            const successModal = document.getElementById('successModal');
            if (successModal) { successModal.style.display = 'none'; successModal.classList.remove('active'); }
            showToast(currentLanguage === 'fr' ? 'Erreur lors de la commande: ' + error.message : 'Order error: ' + error.message, 'error');
        });
    }, 50);
}

// ── Wave Payment ──────────────────────────────────────────────────────────────

let _wavePollingInterval = null;
let _wavePendingReceipt = null; // { orderId, pickupTime, prepTime, items, total }

function showWaveUnavailableModal(orderId, totalAmount, pickupTime, prepTimeMinutes, orderItems) {
    _wavePendingReceipt = { orderId, pickupTime, prepTimeMinutes, orderItems, totalAmount };

    // Update amount / order id displays
    document.getElementById('waveAmountDisplay').textContent = formatPrice(totalAmount);
    document.getElementById('waveOrderIdDisplay').textContent = orderId;

    // Show unavailable section, hide everything else
    document.getElementById('waveQrLoading').style.display = 'none';
    document.getElementById('waveQrWrapper').style.display = 'none';
    document.getElementById('waveQrError').style.display = 'none';
    document.getElementById('waveUnavailable').style.display = 'flex';
    document.getElementById('waveStatusBar').style.display = 'none';
    document.getElementById('waveModalFooter').style.display = 'none';

    const modal = document.getElementById('wavePaymentModal');
    modal.style.display = 'flex';
    modal.offsetHeight;
    modal.classList.add('active');
}

function showWavePaymentModal(orderId, totalAmount, pickupTime, prepTimeMinutes, orderItems) {
    _wavePendingReceipt = { orderId, pickupTime, prepTimeMinutes, orderItems, totalAmount };

    // Update display values
    document.getElementById('waveAmountDisplay').textContent = formatPrice(totalAmount);
    document.getElementById('waveOrderIdDisplay').textContent = orderId;

    // Reset QR section
    document.getElementById('waveQrLoading').style.display = 'flex';
    document.getElementById('waveQrWrapper').style.display = 'none';
    document.getElementById('waveQrError').style.display = 'none';
    document.getElementById('waveUnavailable').style.display = 'none';
    document.getElementById('waveScanHint').style.display = 'none';
    document.getElementById('waveStatusBar').style.display = '';
    document.getElementById('waveModalFooter').style.display = '';
    document.getElementById('waveStatusWaiting').style.display = 'flex';
    document.getElementById('waveStatusConfirmed').style.display = 'none';
    document.getElementById('waveBtnSkip').style.display = 'flex';
    document.getElementById('waveQrCode').innerHTML = '';

    const modal = document.getElementById('wavePaymentModal');
    modal.style.display = 'flex';
    modal.offsetHeight;
    modal.classList.add('active');

    // Call backend to create Wave checkout session
    apiFetch('/api/payment/wave/initiate', {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId, amount: totalAmount })
    })
    .then(res => {
        document.getElementById('waveQrLoading').style.display = 'none';
        if (res.status === 'success' && res.wave_launch_url) {
            // Generate QR code
            document.getElementById('waveQrWrapper').style.display = 'flex';
            new QRCode(document.getElementById('waveQrCode'), {
                text: res.wave_launch_url,
                width: 210,
                height: 210,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
            document.getElementById('waveScanHint').style.display = 'flex';

            // Show "Open Wave" link for mobile users
            const mobileLink = document.getElementById('waveMobileLink');
            mobileLink.href = res.wave_launch_url;
            mobileLink.style.display = 'flex';

            // Start polling for payment confirmation
            _startWavePolling(orderId);
        } else {
            document.getElementById('waveQrError').style.display = 'flex';
            document.getElementById('waveQrErrorMsg').textContent =
                res.message || (currentLanguage === 'fr' ? 'Impossible de générer le QR code.' : 'Could not generate QR code.');
        }
    })
    .catch(() => {
        document.getElementById('waveQrLoading').style.display = 'none';
        document.getElementById('waveQrError').style.display = 'flex';
    });
}

function _startWavePolling(orderId) {
    if (_wavePollingInterval) clearInterval(_wavePollingInterval);
    _wavePollingInterval = setInterval(() => {
        apiFetch(`/api/payment/wave/status/${orderId}`)
            
            .then(res => {
                if (res.paid) {
                    clearInterval(_wavePollingInterval);
                    _wavePollingInterval = null;
                    _onWavePaymentConfirmed();
                }
            })
            .catch(() => {});
    }, 3000); // poll every 3s

    // Stop polling after 10 minutes
    setTimeout(() => {
        if (_wavePollingInterval) {
            clearInterval(_wavePollingInterval);
            _wavePollingInterval = null;
        }
    }, 600000);
}

function _onWavePaymentConfirmed() {
    document.getElementById('waveStatusWaiting').style.display = 'none';
    document.getElementById('waveStatusConfirmed').style.display = 'flex';
    document.getElementById('waveBtnSkip').style.display = 'none';
    showToast(currentLanguage === 'fr' ? 'Paiement Wave confirmé !' : 'Wave payment confirmed!', 'success');
    setTimeout(() => {
        closeWavePaymentModal();
        if (_wavePendingReceipt) {
            const r = _wavePendingReceipt;
            showSuccess(r.orderId, r.pickupTime, r.prepTimeMinutes, r.orderItems, r.totalAmount);
        }
    }, 1800);
}

function closeWavePaymentModal() {
    if (_wavePollingInterval) {
        clearInterval(_wavePollingInterval);
        _wavePollingInterval = null;
    }
    const modal = document.getElementById('wavePaymentModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    // Reset states for next use
    const unavail = document.getElementById('waveUnavailable');
    if (unavail) unavail.style.display = 'none';
    const hint = document.getElementById('waveScanHint');
    if (hint) hint.style.display = 'none';
    const footer = document.getElementById('waveModalFooter');
    if (footer) footer.style.display = '';
    const statusBar = document.getElementById('waveStatusBar');
    if (statusBar) statusBar.style.display = '';
}

function skipWavePayment() {
    closeWavePaymentModal();
    if (_wavePendingReceipt) {
        const r = _wavePendingReceipt;
        showSuccess(r.orderId, r.pickupTime, r.prepTimeMinutes, r.orderItems, r.totalAmount);
    }
}

function showSuccess(orderId, pickupTime, prepTimeMinutes, orderItems, totalAmount) {
    console.log('showSuccess called with orderId:', orderId);

    // Ensure the success modal is visible
    const successModal = document.getElementById('successModal');
    if (successModal) {
        successModal.style.transition = 'none';
        successModal.style.display = 'flex';
        successModal.offsetHeight;
        successModal.style.opacity = '1';
        successModal.style.visibility = 'visible';
        successModal.classList.add('active');
    }

    // Hide loading, show receipt
    const orderLoading = document.getElementById('orderLoading');
    const orderReceipt = document.getElementById('orderReceipt');

    if (orderLoading) {
        orderLoading.style.display = 'none';
    }
    if (orderReceipt) {
        orderReceipt.style.display = 'block';
    }

    // Set order number
    const orderNumberEl = document.getElementById('orderNumber');
    console.log('orderNumberEl:', orderNumberEl);

    if (orderNumberEl) {
        orderNumberEl.textContent = orderId;
        console.log('Order number set to:', orderId);
    } else {
        console.error('orderNumber element not found!');
    }

    // Format pickup time
    const locale = currentLanguage === 'fr' ? 'fr-FR' : 'en-US';
    const pickupTimeStr = pickupTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

    // Update receipt fields
    const receiptPickupTime = document.getElementById('receiptPickupTime');
    if (receiptPickupTime) {
        receiptPickupTime.textContent = pickupTimeStr;
    }

    const receiptPrepTime = document.getElementById('receiptPrepTime');
    if (receiptPrepTime) {
        receiptPrepTime.textContent = prepTimeMinutes + ' ' + (currentLanguage === 'fr' ? 'min' : 'min');
    }

    // Calculate subtotal
    const subtotal = orderItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

    // Update totals
    const receiptSubtotal = document.getElementById('receiptSubtotal');
    if (receiptSubtotal) {
        receiptSubtotal.textContent = formatPrice(subtotal);
    }

    const receiptTotal = document.getElementById('receiptTotal');
    if (receiptTotal) {
        receiptTotal.textContent = formatPrice(totalAmount);
    }

    // Render items list
    const receiptItemsList = document.getElementById('receiptItemsList');
    if (receiptItemsList && orderItems.length > 0) {
        receiptItemsList.innerHTML = orderItems.map(item => `
            <div class="receipt-item">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span class="receipt-item-qty">${item.quantity}</span>
                    <div class="receipt-item-details">
                        <div class="receipt-item-name">${item.product_name}</div>
                    </div>
                </div>
                <span class="receipt-item-total">${formatPrice(item.unit_price * item.quantity)}</span>
            </div>
        `).join('');
    } else if (receiptItemsList) {
        receiptItemsList.innerHTML = '<p style="text-align: center; color: var(--medium-gray); padding: 1rem;">Aucun article</p>';
    }
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

// ========================================
// Utilities
// ========================================
// formatPrice, showToast → see utils.js
// Esc key / focus trap handled globally by utils.js

// Cart sidebar is not a dialog — close it on Esc separately
document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    var sidebar = document.getElementById('cartSidebar');
    if (sidebar && sidebar.classList.contains('active')) toggleCart();
});

// ========================================
// Exports
// ========================================
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.proceedToCheckout = proceedToCheckout;
window.confirmOrder = confirmOrder;
window.closeOrderModal = closeOrderModal;
window.closePaymentMethodModal = closePaymentMethodModal;
window.proceedWithPayment = proceedWithPayment;
window.closeSuccessModal = closeSuccessModal;
window.showSuccess = showSuccess;
window.showWaveUnavailableModal = showWaveUnavailableModal;
// Meal Selection Modal
window.openMealSelectionModal = openMealSelectionModal;
window.closeMealSelectionModal = closeMealSelectionModal;
window.updateSiderQuantity = updateSiderQuantity;
window.nextStep = nextStep;
window.previousStep = previousStep;
window.confirmMealOrder = confirmMealOrder;
window.updateCustomTime = updateCustomTime;
window.enableCustomTime = enableCustomTime;
window.updatePickupTime = updatePickupTime;

