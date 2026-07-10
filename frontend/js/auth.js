import { request, showToast } from "./api.js";
import { openModal, closeModal } from "./modal.js";
import { openOtpModal } from "./otp.js";

export let currentUser = null;

// Cached DOM Elements for Mobile Navigation Drawer
let mobWelcomeEl = null;
let mobHome = null;
let mobNew = null;
let mobWish = null;
let mobCart = null;
let mobOrders = null;
let mobProfile = null;
let mobLogin = null;
let mobLogout = null;
let mobWhy = null;
let mobAbout = null;

function initDomCache() {
    if (mobWelcomeEl) return;
    
    mobWelcomeEl = document.getElementById("mobile-welcome-text");
    mobHome = document.getElementById("mob-home-lnk");
    mobNew = document.getElementById("mob-new-lnk");
    mobWish = document.getElementById("mob-wishlist-lnk");
    mobCart = document.getElementById("mob-cart-lnk");
    mobOrders = document.getElementById("mob-orders-lnk");
    mobProfile = document.getElementById("mob-profile-lnk");
    mobLogin = document.getElementById("mob-auth-login");
    mobLogout = document.getElementById("mob-auth-logout");
    mobWhy = document.getElementById("mob-why-lnk");
    mobAbout = document.getElementById("mob-about-lnk");
}

export async function checkSession() {
    const token = localStorage.getItem("simrdhya_token");
    if (!token) {
        updateUserUI(null);
        return;
    }
    
    try {
        const data = await request("/auth/profile");
        currentUser = data.user;
        updateUserUI(currentUser);
    } catch (err) {
        if (err.status === 401 || err.status === 403) {
            localStorage.removeItem("simrdhya_token");
            updateUserUI(null);
        }
    }
}

function updateUserUI(user) {
    const nameEl = document.getElementById("user-profile-name");
    
    if (user) {
        currentUser = user;
        const firstName = user.fullName.split(" ")[0];
        if (nameEl) {
            nameEl.textContent = `Namaste, ${firstName}`;
            nameEl.style.display = "inline";
        }
    } else {
        currentUser = null;
        if (nameEl) {
            nameEl.textContent = "";
            nameEl.style.display = "none";
        }
    }
    
    // Dynamically update mobile hamburger menu options according to state
    updateMobileMenu(user);
}
export { updateUserUI };

export function setupAuth() {
    initDomCache();
    const trigger = document.getElementById("user-profile-trigger");
    const authClose = document.getElementById("auth-close");
    const authOverlay = document.getElementById("auth-overlay");
    const profileClose = document.getElementById("profile-close");
    const profileOverlay = document.getElementById("profile-overlay");
    
    const tabBtns = document.querySelectorAll(".auth-tab-btn");
    const authPanels = document.querySelectorAll(".auth-panel");
    
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const logoutBtn = document.getElementById("logout-btn");
    
    if (trigger) {
        trigger.addEventListener("click", (e) => {
            e.preventDefault();
            if (currentUser) {
                renderProfileDashboard();
                openModal("profile-modal", "profile-overlay");
            } else {
                openModal("auth-modal", "auth-overlay");
            }
        });
    }
    
    if (authClose) authClose.addEventListener("click", () => closeModal("auth-modal", "auth-overlay"));
    if (authOverlay) authOverlay.addEventListener("click", () => closeModal("auth-modal", "auth-overlay"));
    
    if (profileClose) profileClose.addEventListener("click", () => closeModal("profile-modal", "profile-overlay"));
    if (profileOverlay) profileOverlay.addEventListener("click", () => closeModal("profile-modal", "profile-overlay"));
    
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const targetTab = btn.getAttribute("data-tab");
            authPanels.forEach(p => p.classList.remove("active"));
            document.getElementById(`auth-panel-${targetTab}`).classList.add("active");
        });
    });
    
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email").value.trim();
            const password = document.getElementById("login-password").value;
            
            const submitBtn = loginForm.querySelector("button[type='submit']");
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Logging in...`;
            
            try {
                const data = await request("/auth/login", {
                    method: "POST",
                    body: { email, password }
                });
                
                localStorage.setItem("simrdhya_token", data.token);
                updateUserUI(data.user);
                showToast("Namaste! Logged in successfully.");
                closeModal("auth-modal", "auth-overlay");
                loginForm.reset();
                
                window.dispatchEvent(new CustomEvent("simrdhya:auth_changed"));
            } catch (err) {
                // If account is unverified, open the OTP verification screen
                if (err.status === 403) {
                    closeModal("auth-modal", "auth-overlay");
                    openOtpModal(email);
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const fullName = document.getElementById("register-name").value.trim();
            const email = document.getElementById("register-email").value.trim();
            const phone = document.getElementById("register-phone").value.trim();
            const password = document.getElementById("register-password").value;
            
            if (password.length < 6) {
                showToast("Password must be at least 6 characters!", "error");
                return;
            }
            
            const submitBtn = registerForm.querySelector("button[type='submit']");
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Registering...`;
            
            try {
                await request("/auth/register", {
                    method: "POST",
                    body: { fullName, email, phone, password }
                });
                
                closeModal("auth-modal", "auth-overlay");
                registerForm.reset();
                
                // Open OTP verification modal directly
                openOtpModal(email);
                showToast("Verification code sent to your email!");
            } catch (err) {
                // toasted
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("simrdhya_token");
            updateUserUI(null);
            showToast("Logged out successfully.");
            closeModal("profile-modal", "profile-overlay");
            
            window.dispatchEvent(new CustomEvent("simrdhya:auth_changed"));
        });
    }

    // Close nav menu drawer helper
    const closeNavDrawer = () => {
        const navMenu = document.getElementById("nav-menu");
        if (navMenu) navMenu.classList.remove("active");
    };

    // Mobile Account Action Links Bindings

    if (mobWish) {
        mobWish.addEventListener("click", (e) => {
            e.preventDefault();
            closeNavDrawer();
            if (currentUser) {
                renderProfileDashboard();
                openModal("profile-modal", "profile-overlay");
            } else {
                openModal("auth-modal", "auth-overlay");
            }
        });
    }

    if (mobCart) {
        mobCart.addEventListener("click", (e) => {
            e.preventDefault();
            closeNavDrawer();
            const cartTrigger = document.getElementById("cart-trigger");
            if (cartTrigger) cartTrigger.click();
        });
    }

    const triggerProfileModal = (e) => {
        e.preventDefault();
        closeNavDrawer();
        if (currentUser) {
            renderProfileDashboard();
            openModal("profile-modal", "profile-overlay");
        }
    };

    if (mobOrders) mobOrders.addEventListener("click", triggerProfileModal);
    if (mobProfile) mobProfile.addEventListener("click", triggerProfileModal);
    if (mobEdit) mobEdit.addEventListener("click", triggerProfileModal);
    if (mobSettings) mobSettings.addEventListener("click", triggerProfileModal);

    if (mobLogin) {
        mobLogin.addEventListener("click", (e) => {
            e.preventDefault();
            closeNavDrawer();
            openModal("auth-modal", "auth-overlay");
        });
    }

    if (mobLogout) {
        mobLogout.addEventListener("click", (e) => {
            e.preventDefault();
            closeNavDrawer();
            localStorage.removeItem("simrdhya_token");
            updateUserUI(null);
            showToast("Logged out successfully.");
            
            window.dispatchEvent(new CustomEvent("simrdhya:auth_changed"));
        });
    }
}

export async function renderProfileDashboard() {
    if (!currentUser) return;
    
    document.getElementById("profile-dashboard-name").textContent = currentUser.fullName;
    document.getElementById("profile-dashboard-email").textContent = currentUser.email;
    const phoneEl = document.getElementById("profile-dashboard-phone");
    if (phoneEl) {
        phoneEl.textContent = currentUser.phone ? `Phone: ${currentUser.phone}` : "No phone saved";
    }
    
    const container = document.getElementById("profile-orders-history-container");
    if (!container) return;
    
    container.innerHTML = `<div style="text-align: center; padding: 2rem;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><p>Loading Caravan Orders...</p></div>`;
    
    try {
        const orders = await request("/orders");
        if (orders.length === 0) {
            container.innerHTML = `
                <div class="no-profile-orders">
                    <div class="no-profile-orders-icon"><i class="fa-solid fa-caravan"></i></div>
                    <p>Your fashion Caravan hasn't set off yet. Book your first order today!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = "";
        orders.forEach(order => {
            const card = document.createElement("div");
            card.className = "profile-order-card";
            
            const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
            
            let itemsHtml = "";
            order.products.forEach(p => {
                itemsHtml += `
                    <div class="profile-order-prod-item">
                        <span class="profile-order-prod-name">${p.name} (${p.selectedSize})</span>
                        <span class="profile-order-prod-qty">x${p.quantity} - ₹${(p.price * p.quantity).toLocaleString("en-IN")}</span>
                    </div>
                `;
            });
            
            card.innerHTML = `
                <div class="profile-order-header">
                    <span class="profile-order-id"><i class="fa-solid fa-hashtag"></i> ${order._id}</span>
                    <span class="profile-order-date">${dateStr}</span>
                </div>
                <div class="profile-order-body">
                    ${itemsHtml}
                </div>
                <div class="profile-order-footer">
                    <span class="profile-order-status-badge ${order.orderStatus.toLowerCase()}">${order.orderStatus}</span>
                    <span class="profile-order-total">₹${order.total.toLocaleString("en-IN")}</span>
                </div>
            `;
            
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = `<div style="text-align: center; color: var(--color-art-pink); padding: 2rem;"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load orders. Please retry.</p></div>`;
    }
}

// Dynamically sync mobile hamburger menu list options based on user auth status
export function updateMobileMenu(user) {
    initDomCache();
    
    // Core links always displayed in both states
    if (mobHome) mobHome.parentElement.style.display = "block";
    if (mobNew) mobNew.parentElement.style.display = "block";
    if (mobWish) mobWish.parentElement.style.display = "block";
    if (mobCart) mobCart.parentElement.style.display = "block";
    if (mobWhy) mobWhy.parentElement.style.display = "block";
    if (mobAbout) mobAbout.parentElement.style.display = "block";

    if (user) {
        // Logged In
        const firstName = user.fullName.split(" ")[0];
        if (mobWelcomeEl) {
            mobWelcomeEl.innerHTML = `Hello,<br>${firstName} 👋`;
            mobWelcomeEl.parentElement.style.display = "block";
        }
        
        if (mobOrders) mobOrders.parentElement.style.display = "block";
        if (mobProfile) mobProfile.parentElement.style.display = "block";
        if (mobLogout) mobLogout.parentElement.style.display = "block";
        
        if (mobLogin) mobLogin.parentElement.style.display = "none";
    } else {
        // Logged Out
        if (mobWelcomeEl) {
            mobWelcomeEl.innerHTML = "";
            mobWelcomeEl.parentElement.style.display = "none";
        }
        
        if (mobOrders) mobOrders.parentElement.style.display = "none";
        if (mobProfile) mobProfile.parentElement.style.display = "none";
        if (mobLogout) mobLogout.parentElement.style.display = "none";
        
        if (mobLogin) mobLogin.parentElement.style.display = "block";
    }
}

