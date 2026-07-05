// Shopping Cart Controller

import { request, showToast } from "./api.js";
import { openModal, closeModal } from "./modal.js";
import { currentUser } from "./auth.js";

export let cart = [];
export let activeDiscount = 0;      // E.g., 0.10
export let activeCouponCode = "";    // E.g., CARAVAN10

// DOM Selectors
const cartDrawer = document.getElementById("cart-drawer");
const cartOverlay = document.getElementById("cart-drawer-overlay");
const cartCountBadges = [document.getElementById("cart-count"), document.getElementById("cart-drawer-count")];
const cartItemsList = document.getElementById("cart-items-list");
const emptyCartState = document.getElementById("empty-cart-state");
const cartSubtotal = document.getElementById("cart-subtotal");
const calcSubtotalLabel = document.getElementById("calc-subtotal");
const discountContainer = document.getElementById("calc-discount-container");
const discountLabel = document.getElementById("calc-coupon-label");
const discountVal = document.getElementById("calc-discount-val");
const cartFooter = document.getElementById("cart-footer");

const couponInput = document.getElementById("cart-coupon-input");
const couponApplyBtn = document.getElementById("cart-coupon-apply-btn");
const couponMessage = document.getElementById("cart-coupon-message");

export async function fetchCart() {
    const token = localStorage.getItem("simrdhya_token");
    
    if (token) {
        try {
            const data = await request("/cart");
            cart = data;
        } catch (err) {
            cart = [];
        }
    } else {
        cart = JSON.parse(localStorage.getItem("simrdhya_cart")) || [];
    }
    renderCart();
}

export async function addToCart(productId, size, color) {
    const token = localStorage.getItem("simrdhya_token");
    
    if (token) {
        try {
            const data = await request("/cart/add", {
                method: "POST",
                body: { productId, selectedSize: size, selectedColor: color, quantity: 1 }
            });
            cart = data;
            showToast("Item loaded into Caravan!");
        } catch (err) {
            // error toasted
        }
    } else {
        const existingIndex = cart.findIndex(item => 
            (item.id === productId || item.productId === productId) && 
            item.selectedSize === size && 
            item.selectedColor === color
        );
        
        if (existingIndex > -1) {
            cart[existingIndex].quantity += 1;
            localStorage.setItem("simrdhya_cart", JSON.stringify(cart));
            showToast("Item added to local Caravan.");
            renderCart();
            openCartDrawer();
        } else {
            // Asynchronously resolve product list to prevent circular import issues
            import("./products.js").then(module => {
                const product = module.loadedProducts.find(p => p._id === productId);
                const itemDetail = product ? {
                    productId: product._id,
                    id: product._id,
                    name: product.name,
                    price: product.price,
                    image: product.images && product.images.length > 0 ? product.images[0] : "assets/prod_yellow_kurta.png",
                    selectedSize: size,
                    selectedColor: color,
                    quantity: 1
                } : {
                    productId: productId,
                    id: productId,
                    name: "Saree / Kurta",
                    price: 2499,
                    image: "assets/prod_yellow_kurta.png",
                    selectedSize: size,
                    selectedColor: color,
                    quantity: 1
                };
                cart.push(itemDetail);
                localStorage.setItem("simrdhya_cart", JSON.stringify(cart));
                showToast("Item added to local Caravan.");
                renderCart();
                openCartDrawer();
            });
        }
    }
}

export async function updateQuantity(productId, size, color, newQty) {
    const token = localStorage.getItem("simrdhya_token");
    
    if (token) {
        try {
            const data = await request("/cart/update", {
                method: "PATCH",
                body: { productId, selectedSize: size, selectedColor: color, quantity: newQty }
            });
            cart = data;
        } catch (err) {
            // toasted
        }
    } else {
        const itemIndex = cart.findIndex(item => 
            (item.id === productId || item.productId === productId) && 
            item.selectedSize === size && 
            item.selectedColor === color
        );
        
        if (itemIndex > -1) {
            if (newQty <= 0) {
                cart.splice(itemIndex, 1);
            } else {
                cart[itemIndex].quantity = newQty;
            }
            localStorage.setItem("simrdhya_cart", JSON.stringify(cart));
        }
    }
    renderCart();
}

export async function removeFromCart(productId, size, color) {
    const token = localStorage.getItem("simrdhya_token");
    
    if (token) {
        try {
            const data = await request("/cart/remove", {
                method: "DELETE",
                body: { productId, selectedSize: size, selectedColor: color }
            });
            cart = data;
            showToast("Item removed from Caravan.");
        } catch (err) {
            // toasted
        }
    } else {
        cart = cart.filter(item => 
            !((item.id === productId || item.productId === productId) && 
              item.selectedSize === size && 
              item.selectedColor === color)
        );
        localStorage.setItem("simrdhya_cart", JSON.stringify(cart));
        showToast("Item removed.");
    }
    renderCart();
}

export function renderCart() {
    const totalCount = cart.reduce((total, item) => total + item.quantity, 0);
    cartCountBadges.forEach(badge => {
        if (badge) badge.textContent = totalCount;
    });
    
    if (!cartItemsList) return;
    
    if (cart.length === 0) {
        emptyCartState.style.display = "flex";
        cartItemsList.style.display = "none";
        cartFooter.style.display = "none";
    } else {
        emptyCartState.style.display = "none";
        cartItemsList.style.display = "flex";
        cartFooter.style.display = "block";
        
        cartItemsList.innerHTML = "";
        let subtotal = 0;
        
        cart.forEach(item => {
            // Standardize object keys from backend vs localStorage
            const id = item.id || item.productId;
            const price = item.price || 0;
            const itemTotal = price * item.quantity;
            subtotal += itemTotal;
            const image = item.image || "assets/prod_yellow_kurta.png";
            
            const itemElement = document.createElement("div");
            itemElement.className = "cart-item";
            
            itemElement.innerHTML = `
                <img src="${image}" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-details">
                    <h4 class="cart-item-title">${item.name}</h4>
                    <span class="cart-item-meta">Size: ${item.selectedSize} | Color: ${item.selectedColor}</span>
                    <div class="cart-item-actions">
                        <div class="qty-control">
                            <button class="qty-btn qty-minus" aria-label="Decrease quantity"><i class="fa-solid fa-minus"></i></button>
                            <span class="qty-val">${item.quantity}</span>
                            <button class="qty-btn qty-plus" aria-label="Increase quantity"><i class="fa-solid fa-plus"></i></button>
                        </div>
                        <span class="cart-item-price">₹${itemTotal.toLocaleString("en-IN")}</span>
                        <button class="cart-item-remove" aria-label="Remove item"><i class="fa-regular fa-trash-can"></i></button>
                    </div>
                </div>
            `;
            
            itemElement.querySelector(".qty-minus").addEventListener("click", () => {
                updateQuantity(id, item.selectedSize, item.selectedColor, item.quantity - 1);
            });
            
            itemElement.querySelector(".qty-plus").addEventListener("click", () => {
                updateQuantity(id, item.selectedSize, item.selectedColor, item.quantity + 1);
            });
            
            itemElement.querySelector(".cart-item-remove").addEventListener("click", () => {
                removeFromCart(id, item.selectedSize, item.selectedColor);
            });
            
            cartItemsList.appendChild(itemElement);
        });
        
        if (calcSubtotalLabel) calcSubtotalLabel.textContent = `₹${subtotal.toLocaleString("en-IN")}`;
        
        if (activeDiscount > 0) {
            const savings = Math.round(subtotal * activeDiscount);
            const discountedTotal = subtotal - savings;
            
            if (discountContainer) discountContainer.style.display = "flex";
            if (discountLabel) discountLabel.textContent = activeCouponCode;
            if (discountVal) discountVal.textContent = `-₹${savings.toLocaleString("en-IN")}`;
            if (cartSubtotal) cartSubtotal.textContent = `₹${discountedTotal.toLocaleString("en-IN")}`;
        } else {
            if (discountContainer) discountContainer.style.display = "none";
            if (cartSubtotal) cartSubtotal.textContent = `₹${subtotal.toLocaleString("en-IN")}`;
        }
    }
}

export function resetCouponState() {
    activeDiscount = 0;
    activeCouponCode = "";
    if (couponInput) couponInput.value = "";
    if (couponMessage) {
        couponMessage.style.display = "none";
        couponMessage.textContent = "";
    }
    renderCart();
}

export function setupCart() {
    const cartTrigger = document.getElementById("cart-trigger");
    const cartClose = document.getElementById("cart-close");
    const cartOverlay = document.getElementById("cart-drawer-overlay");
    
    if (cartTrigger) {
        cartTrigger.addEventListener("click", (e) => {
            e.preventDefault();
            openCartDrawer();
        });
    }
    if (cartClose) cartClose.addEventListener("click", closeCartDrawer);
    if (cartOverlay) cartOverlay.addEventListener("click", closeCartDrawer);
    
    // Coupon submission handler
    if (couponApplyBtn) {
        couponApplyBtn.addEventListener("click", async () => {
            const code = couponInput.value.trim().toUpperCase();
            if (couponMessage) {
                couponMessage.className = "coupon-message";
                couponMessage.style.display = "none";
            }
            
            if (code === "") {
                if (couponMessage) {
                    couponMessage.textContent = "Please enter a coupon code.";
                    couponMessage.classList.add("error");
                    couponMessage.style.display = "block";
                }
                return;
            }
            
            const token = localStorage.getItem("simrdhya_token");
            if (token) {
                try {
                    const data = await request("/coupon/apply", {
                        method: "POST",
                        body: { code }
                    });
                    
                    activeDiscount = data.discountPercentage;
                    activeCouponCode = data.code;
                    
                    if (couponMessage) {
                        couponMessage.textContent = `🎉 Coupon Applied! ${activeDiscount * 100}% off discount subtracted.`;
                        couponMessage.classList.add("success");
                        couponMessage.style.display = "block";
                    }
                    renderCart();
                } catch (err) {
                    if (couponMessage) {
                        couponMessage.textContent = err.message || "Invalid coupon code.";
                        couponMessage.classList.add("error");
                        couponMessage.style.display = "block";
                    }
                }
            } else {
                // Offline fallback checks
                if (code === "CARAVAN10") {
                    activeDiscount = 0.10;
                    activeCouponCode = "CARAVAN10";
                    if (couponMessage) {
                        couponMessage.textContent = `🎉 Coupon Applied! 10% off discount subtracted.`;
                        couponMessage.classList.add("success");
                        couponMessage.style.display = "block";
                    }
                    renderCart();
                } else {
                    if (couponMessage) {
                        couponMessage.textContent = "Invalid code. Please register/login to check other coupons.";
                        couponMessage.classList.add("error");
                        couponMessage.style.display = "block";
                    }
                }
            }
        });
    }
    
    // Auth merger listener
    window.addEventListener("simrdhya:auth_changed", async () => {
        const token = localStorage.getItem("simrdhya_token");
        if (token) {
            const localCart = JSON.parse(localStorage.getItem("simrdhya_cart")) || [];
            if (localCart.length > 0) {
                for (const item of localCart) {
                    try {
                        await request("/cart/add", {
                            method: "POST",
                            body: {
                                productId: item.id || item.productId,
                                selectedSize: item.selectedSize,
                                selectedColor: item.selectedColor,
                                quantity: item.quantity
                            }
                        });
                    } catch (e) {
                        // ignore merges errors
                    }
                }
                localStorage.removeItem("simrdhya_cart");
            }
        }
        fetchCart();
    });
}

export function openCartDrawer() {
    if (cartDrawer) cartDrawer.classList.add("active");
    if (cartOverlay) cartOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
}

export function closeCartDrawer() {
    if (cartDrawer) cartDrawer.classList.remove("active");
    if (cartOverlay) cartOverlay.classList.remove("active");
    
    // Restore scroll if no other overlay is open
    const activeOverlays = document.querySelectorAll(".modal.active, .modal-overlay.active");
    if (activeOverlays.length === 0) {
        document.body.style.overflow = "";
    }
}
