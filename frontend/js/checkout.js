// Checkout Stepper and Order Booking Controller

import { request, showToast } from "./api.js";
import { openModal, closeModal } from "./modal.js";
import { cart, activeDiscount, activeCouponCode, resetCouponState, fetchCart } from "./cart.js";
import { currentUser } from "./auth.js";

let checkoutSubtotal = 0;
let checkoutDiscount = 0;
let checkoutTotal = 0;

export function setupCheckout() {
    const checkoutTrigger = document.getElementById("checkout-trigger-btn");
    const checkoutClose = document.getElementById("checkout-close");
    const checkoutOverlay = document.getElementById("checkout-overlay");
    
    const shippingForm = document.getElementById("shipping-details-form");
    const payMethodCards = document.querySelectorAll(".pay-method-card");
    const payDetailsContainers = document.querySelectorAll(".payment-details-container");
    
    const paySubmitBtn = document.getElementById("pay-submit-btn");
    const payBackBtn = document.getElementById("pay-back-btn");
    const successCloseBtn = document.getElementById("checkout-success-close-btn");
    
    if (checkoutTrigger) {
        checkoutTrigger.addEventListener("click", () => {
            if (cart.length === 0) {
                showToast("Your Caravan is empty!", "error");
                return;
            }
            
            // AUTH INTERCEPT
            if (!currentUser) {
                showToast("Please log in or register before checking out!", "error");
                openModal("auth-modal", "auth-overlay");
                return;
            }
            
            const sub = cart.reduce((total, item) => total + ((item.price || 0) * item.quantity), 0);
            checkoutSubtotal = sub;
            checkoutDiscount = activeDiscount > 0 ? Math.round(sub * activeDiscount) : 0;
            checkoutTotal = checkoutSubtotal - checkoutDiscount;
            
            // Pre-fill shipping details
            const nameInput = document.getElementById("shipping-name");
            const emailInput = document.getElementById("shipping-email");
            const phoneInput = document.getElementById("shipping-phone");
            
            if (nameInput && currentUser.fullName) nameInput.value = currentUser.fullName;
            if (emailInput && currentUser.email) emailInput.value = currentUser.email;
            if (phoneInput && currentUser.phone) phoneInput.value = currentUser.phone;
            
            closeModal("cart-drawer", "cart-drawer-overlay");
            openCheckoutStep(1);
        });
    }
    
    if (checkoutClose) checkoutClose.addEventListener("click", () => closeModal("checkout-modal", "checkout-overlay"));
    if (checkoutOverlay) checkoutOverlay.addEventListener("click", () => closeModal("checkout-modal", "checkout-overlay"));
    
    if (shippingForm) {
        shippingForm.addEventListener("submit", (e) => {
            e.preventDefault();
            openCheckoutStep(2);
        });
    }
    
    payMethodCards.forEach(card => {
        card.addEventListener("click", () => {
            payMethodCards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            
            const selectedMethod = card.getAttribute("data-method");
            payDetailsContainers.forEach(container => {
                container.classList.remove("active");
            });
            
            const targetContainer = document.getElementById(`pay-container-${selectedMethod}`);
            if (targetContainer) targetContainer.classList.add("active");
        });
    });
    
    if (payBackBtn) {
        payBackBtn.addEventListener("click", () => {
            openCheckoutStep(1);
        });
    }
    
    if (paySubmitBtn) {
        paySubmitBtn.addEventListener("click", () => {
            placeOrder();
        });
    }
    
    if (successCloseBtn) {
        successCloseBtn.addEventListener("click", () => {
            closeModal("checkout-modal", "checkout-overlay");
        });
    }
}

function openCheckoutStep(stepNumber) {
    const steps = document.querySelectorAll(".step-indicator");
    steps.forEach((el, index) => {
        if (index + 1 <= stepNumber) {
            el.classList.add("active");
        } else {
            el.classList.remove("active");
        }
    });
    
    document.querySelectorAll(".checkout-step-panel").forEach(panel => {
        panel.classList.remove("active");
    });
    
    const targetPanel = document.getElementById(`checkout-step-${stepNumber}`);
    if (targetPanel) targetPanel.classList.add("active");
    
    if (stepNumber === 2) {
        const upiTotalEl = document.getElementById("upi-total-amount");
        if (upiTotalEl) upiTotalEl.textContent = `₹${checkoutTotal.toLocaleString("en-IN")}`;
    }
    
    openModal("checkout-modal", "checkout-overlay");
}

async function placeOrder() {
    const nextBtn = document.getElementById("pay-submit-btn");
    const originalText = nextBtn.innerHTML;
    
    nextBtn.disabled = true;
    nextBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Booking Order...`;
    
    const shippingAddress = {
        fullName: document.getElementById("shipping-name").value.trim(),
        email: document.getElementById("shipping-email").value.trim(),
        phone: document.getElementById("shipping-phone").value.trim(),
        address: document.getElementById("shipping-address").value.trim(),
        city: document.getElementById("shipping-city").value.trim(),
        zip: document.getElementById("shipping-zip").value.trim()
    };
    
    const activePayCard = document.querySelector(".pay-method-card.active");
    const paymentMethod = activePayCard ? activePayCard.getAttribute("data-method") : "cod";
    
    const productsList = cart.map(item => ({
        id: item.id || item.productId,
        name: item.name,
        price: item.price,
        selectedSize: item.selectedSize,
        selectedColor: item.selectedColor,
        quantity: item.quantity
    }));
    
    try {
        const data = await request("/checkout", {
            method: "POST",
            body: {
                products: productsList,
                subtotal: checkoutSubtotal,
                discount: checkoutDiscount,
                total: checkoutTotal,
                paymentMethod,
                shippingAddress
            }
        });
        
        const orderSuccessTextEl = document.getElementById("order-success-text-el");
        const orderSummaryBox = document.getElementById("checkout-order-summary");
        
        if (orderSuccessTextEl) {
            orderSuccessTextEl.innerHTML = `Your fashion Caravan has been booked! Our delivery partner is preparing to load your items and set off for <strong>${shippingAddress.city}</strong>. Details of the shipment are printed below:`;
        }
        
        if (orderSummaryBox) {
            orderSummaryBox.innerHTML = buildReceiptHtml(productsList, shippingAddress, checkoutSubtotal, checkoutDiscount, checkoutTotal);
        }
        
        showToast("Caravan Order booked successfully!");
        
        // Refetch/clear cart on server and reset coupons locally
        await fetchCart();
        resetCouponState();
        
        openCheckoutStep(3);
    } catch (err) {
        // error toasted
    } finally {
        nextBtn.disabled = false;
        nextBtn.innerHTML = originalText;
    }
}

function buildReceiptHtml(productsList, shippingAddress, subtotal, discount, total) {
    let receiptHtml = `
        <h4>🌸 CARAVAN RECEIPT</h4>
        <div class="order-summary-row">
            <span>Customer Name:</span>
            <strong>${shippingAddress.fullName}</strong>
        </div>
        <div class="order-summary-row">
            <span>Garments Ordered:</span>
            <strong>${productsList.reduce((acc, item) => acc + item.quantity, 0)} Items</strong>
        </div>
        <hr style="border: 0; border-top: 1px dashed rgba(0,0,0,0.1); margin: 0.5rem 0;">
    `;
    
    productsList.forEach(item => {
        receiptHtml += `
            <div class="order-summary-row" style="font-size: 0.85rem; color: var(--color-secondary);">
                <span>${item.name} (${item.selectedSize}) x${item.quantity}</span>
                <span>₹${(item.price * item.quantity).toLocaleString("en-IN")}</span>
            </div>
        `;
    });
    
    receiptHtml += `
        <hr style="border: 0; border-top: 1px dashed rgba(0,0,0,0.1); margin: 0.5rem 0;">
        <div class="order-summary-row">
            <span>Bag Subtotal:</span>
            <span>₹${subtotal.toLocaleString("en-IN")}</span>
        </div>
    `;
    
    if (discount > 0) {
        receiptHtml += `
            <div class="order-summary-row" style="color: var(--color-art-green);">
                <span>Coupon Discount (${activeCouponCode}):</span>
                <span>-₹${discount.toLocaleString("en-IN")}</span>
            </div>
        `;
    }
    
    receiptHtml += `
        <div class="order-summary-row" style="font-size: 0.88rem; font-weight: 600;">
            <span>Shipping & Highway Tolls:</span>
            <span style="color: var(--color-art-teal);">FREE</span>
        </div>
        <div class="order-summary-row total">
            <span>Paid Total:</span>
            <span>₹${total.toLocaleString("en-IN")}</span>
        </div>
    `;
    
    return receiptHtml;
}
