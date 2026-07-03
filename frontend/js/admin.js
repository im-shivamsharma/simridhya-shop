// SIMRDHYA Admin Panel Dashboard Controller

import { request, showToast } from "./api.js";

// Session State
let token = localStorage.getItem("simrdhya_token");
let productsList = [];
let ordersList = [];
let couponsList = [];
let productToDeleteId = null;
let isSavingProduct = false;
let isSavingCoupon = false;

// DOM Elements
const loginScreen = document.getElementById("admin-login-screen");
const dashboard = document.getElementById("admin-dashboard");
const loginForm = document.getElementById("admin-login-form");
const adminUserName = document.getElementById("admin-user-name");
const logoutBtn = document.getElementById("admin-logout-btn");

// Navigation Tabs
const navBtns = document.querySelectorAll(".admin-nav-btn");
const tabPanels = document.querySelectorAll(".admin-tab-panel");

// Table Containers
const productsTableBody = document.getElementById("products-table-body");
const ordersTableBody = document.getElementById("orders-table-body");
const couponsTableBody = document.getElementById("coupons-table-body");

// Search Box Input
const searchInput = document.getElementById("admin-search-input");
let searchTimeout = null;

// Product CRUD Modal Elements
const productModal = document.getElementById("product-modal");
const productOverlay = document.getElementById("product-modal-overlay");
const productClose = document.getElementById("product-modal-close");
const productForm = document.getElementById("product-crud-form");
const openAddProductBtn = document.getElementById("open-add-product-modal-btn");
const fileInput = document.getElementById("prod-images");
const previewContainer = document.getElementById("prod-img-preview-container");
const previewImg = document.getElementById("prod-img-preview");

// Coupon CRUD Modal Elements
const couponModal = document.getElementById("coupon-modal");
const couponOverlay = document.getElementById("coupon-modal-overlay");
const couponClose = document.getElementById("coupon-modal-close");
const couponForm = document.getElementById("coupon-crud-form");
const openAddCouponBtn = document.getElementById("open-add-coupon-modal-btn");

// Custom Delete Confirmation Modal Elements
const deleteConfirmModal = document.getElementById("delete-confirm-modal");
const deleteConfirmOverlay = document.getElementById("delete-confirm-overlay");
const deleteConfirmClose = document.getElementById("delete-confirm-close");
const deleteConfirmCancel = document.getElementById("delete-confirm-cancel");
const deleteConfirmAction = document.getElementById("delete-confirm-action");

// Initializer
document.addEventListener("DOMContentLoaded", () => {
    checkAdminAuth();
    setupAdminNavigation();
    setupProductCRUD();
    setupCouponCRUD();
    setupDeleteConfirmation();
    setupInstantSearch();
    setupImagePreview();
    
    if (loginForm) loginForm.addEventListener("submit", handleAdminLogin);
    if (logoutBtn) logoutBtn.addEventListener("click", handleAdminLogout);
});

// --- Authentication & Session Manager ---

async function checkAdminAuth() {
    if (!token) {
        showLoginScreen();
        return;
    }
    
    showGlobalLoader(true);
    try {
        const data = await request("/profile");
        if (data.user && data.user.isAdmin) {
            showDashboard(data.user);
        } else {
            showToast("Access Denied: Admin privileges required!", "error");
            handleAdminLogout();
        }
    } catch (err) {
        handleAdminLogout();
    } finally {
        showGlobalLoader(false);
    }
}

function showLoginScreen() {
    if (loginScreen) loginScreen.style.setProperty("display", "flex", "important");
    if (dashboard) dashboard.style.setProperty("display", "none", "important");
}

function showDashboard(adminUser) {
    if (loginScreen) loginScreen.style.setProperty("display", "none", "important");
    if (dashboard) dashboard.style.setProperty("display", "grid", "important");
    if (adminUserName) adminUserName.textContent = adminUser.fullName;
    
    // Cache/Load initial dashboard grids
    loadProducts();
    loadOrders();
    loadCoupons();
}

async function handleAdminLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById("admin-email").value.trim();
    const password = document.getElementById("admin-password").value;
    
    const submitBtn = loginForm.querySelector("button[type='submit']");
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;
    
    try {
        const data = await request("/login", {
            method: "POST",
            body: { email, password }
        });
        
        if (data.user && data.user.isAdmin) {
            token = data.token;
            localStorage.setItem("simrdhya_token", token);
            showToast("Namaste Admin! Caravan portal unlocked.");
            showDashboard(data.user);
            loginForm.reset();
        } else {
            showToast("Access Denied: Customer accounts cannot enter portal!", "error");
        }
    } catch (err) {
        // error toasted in api.js
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function handleAdminLogout() {
    token = null;
    localStorage.removeItem("simrdhya_token");
    showLoginScreen();
    showToast("Logged out from admin portal successfully.");
}

// Global Spinner Toggle
function showGlobalLoader(show) {
    const spinner = document.getElementById("admin-global-spinner");
    if (spinner) {
        spinner.style.setProperty("display", show ? "flex" : "none", "important");
    }
}

// Side Nav Tabs Toggle
function setupAdminNavigation() {
    navBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            navBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const targetTab = btn.getAttribute("data-tab");
            tabPanels.forEach(p => p.classList.remove("active"));
            document.getElementById(`tab-panel-${targetTab}`).classList.add("active");
        });
    });
}

// --- Product Catalog Operations (CRUD) ---

async function loadProducts() {
    showGlobalLoader(true);
    try {
        const data = await request("/products");
        productsList = data;
        renderProductsTable();
    } catch (err) {
        // error toasted
    } finally {
        showGlobalLoader(false);
    }
}

function renderProductsTable(searchQuery = "") {
    if (!productsTableBody) return;
    productsTableBody.innerHTML = "";
    
    let filtered = productsList;
    if (searchQuery) {
        filtered = productsList.filter(p => 
            p.name.toLowerCase().includes(searchQuery) ||
            p.category.toLowerCase().includes(searchQuery) ||
            p.description.toLowerCase().includes(searchQuery)
        );
    }
    
    if (filtered.length === 0) {
        productsTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--color-admin-text-muted); padding: 3rem 1rem;">No matching garments found in Caravan.</td></tr>`;
        return;
    }
    
    filtered.forEach(p => {
        const tr = document.createElement("tr");
        const imgUrl = p.images && p.images.length > 0 ? p.images[0] : "assets/prod_yellow_kurta.png";
        
        tr.innerHTML = `
            <td><img src="${imgUrl}" alt="${p.name}"></td>
            <td style="font-weight: 700;">${p.name}</td>
            <td style="text-transform: capitalize;">${p.category}</td>
            <td>₹${p.price.toLocaleString("en-IN")}</td>
            <td style="color: var(--color-admin-text-muted);">₹${p.originalPrice.toLocaleString("en-IN")}</td>
            <td style="font-weight: 700; color: ${p.stock < 5 ? 'var(--color-danger)' : 'inherit'}">${p.stock}</td>
            <td><span class="admin-badge">${p.badge}</span></td>
            <td>
                <button class="admin-btn admin-btn-secondary admin-btn-sm edit-prod-btn" data-id="${p._id}" aria-label="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="admin-btn admin-btn-danger admin-btn-sm delete-prod-btn" data-id="${p._id}" aria-label="Delete"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        
        tr.querySelector(".edit-prod-btn").addEventListener("click", () => openEditProductModal(p._id));
        tr.querySelector(".delete-prod-btn").addEventListener("click", () => deleteProduct(p._id));
        
        productsTableBody.appendChild(tr);
    });
}

function setupProductCRUD() {
    if (openAddProductBtn) {
        openAddProductBtn.addEventListener("click", () => {
            document.getElementById("product-modal-title").textContent = "Add New Product";
            document.getElementById("edit-product-id").value = "";
            document.getElementById("prod-img-current-path").textContent = "";
            if (previewContainer) previewContainer.style.display = "none";
            if (previewImg) previewImg.src = "";
            
            productForm.reset();
            openModal("product-modal", "product-modal-overlay");
        });
    }
    
    if (productClose) productClose.addEventListener("click", () => closeModal("product-modal", "product-modal-overlay"));
    if (productOverlay) productOverlay.addEventListener("click", () => closeModal("product-modal", "product-modal-overlay"));
    
    if (productForm) {
        productForm.addEventListener("submit", handleProductSave);
    }
}

function openEditProductModal(productId) {
    const prod = productsList.find(p => p._id === productId);
    if (!prod) return;
    
    document.getElementById("product-modal-title").textContent = "Edit Product";
    document.getElementById("edit-product-id").value = prod._id;
    document.getElementById("prod-name").value = prod.name;
    document.getElementById("prod-category").value = prod.category;
    document.getElementById("prod-desc").value = prod.description;
    document.getElementById("prod-price").value = prod.price;
    document.getElementById("prod-orig-price").value = prod.originalPrice;
    document.getElementById("prod-stock").value = prod.stock;
    document.getElementById("prod-badge").value = prod.badge;
    document.getElementById("prod-img-current-path").textContent = `Current image: ${prod.images[0]}`;
    
    if (prod.images && prod.images.length > 0) {
        if (previewImg) previewImg.src = prod.images[0];
        if (previewContainer) previewContainer.style.display = "block";
    } else {
        if (previewContainer) previewContainer.style.display = "none";
    }
    
    openModal("product-modal", "product-modal-overlay");
}

async function handleProductSave(e) {
    e.preventDefault();
    if (isSavingProduct) return;
    
    const id = document.getElementById("edit-product-id").value;
    const submitBtn = document.getElementById("product-modal-submit-btn");
    const originalText = submitBtn.innerHTML;
    
    // Disable inputs to prevent double submissions
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;
    isSavingProduct = true;
    
    const formData = new FormData();
    formData.append("name", document.getElementById("prod-name").value.trim());
    formData.append("category", document.getElementById("prod-category").value);
    formData.append("description", document.getElementById("prod-desc").value.trim());
    formData.append("price", document.getElementById("prod-price").value);
    formData.append("originalPrice", document.getElementById("prod-orig-price").value);
    formData.append("stock", document.getElementById("prod-stock").value);
    formData.append("badge", document.getElementById("prod-badge").value);
    
    if (fileInput && fileInput.files.length > 0) {
        formData.append("images", fileInput.files[0]);
    }
    
    try {
        let url = "/products";
        let method = "POST";
        
        if (id) {
            url = `/products/${id}`;
            method = "PATCH";
        }
        
        const responseData = await request(url, {
            method,
            body: formData
        });
        
        showToast("Product saved successfully!");
        closeModal("product-modal", "product-modal-overlay");
        
        // Optimistic / Instant UI Updates
        if (method === "POST") {
            productsList.unshift(responseData);
        } else {
            const idx = productsList.findIndex(p => p._id === id);
            if (idx > -1) productsList[idx] = responseData;
        }
        
        // Clear search parameters
        if (searchInput) searchInput.value = "";
        renderProductsTable();
    } catch (err) {
        // error toasted
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        isSavingProduct = false;
    }
}

// Styled custom delete box handlers
function setupDeleteConfirmation() {
    if (deleteConfirmClose) {
        deleteConfirmClose.addEventListener("click", () => {
            closeModal("delete-confirm-modal", "delete-confirm-overlay");
            productToDeleteId = null;
        });
    }
    if (deleteConfirmCancel) {
        deleteConfirmCancel.addEventListener("click", () => {
            closeModal("delete-confirm-modal", "delete-confirm-overlay");
            productToDeleteId = null;
        });
    }
    
    if (deleteConfirmAction) {
        deleteConfirmAction.addEventListener("click", async () => {
            if (!productToDeleteId) return;
            
            closeModal("delete-confirm-modal", "delete-confirm-overlay");
            showGlobalLoader(true);
            
            try {
                await request(`/products/${productToDeleteId}`, {
                    method: "DELETE"
                });
                showToast("Garment deleted successfully.");
                
                // Real-time local array filter
                productsList = productsList.filter(p => p._id !== productToDeleteId);
                renderProductsTable();
            } catch (err) {
                // error toasted
            } finally {
                showGlobalLoader(false);
                productToDeleteId = null;
            }
        });
    }
}

function deleteProduct(productId) {
    productToDeleteId = productId;
    openModal("delete-confirm-modal", "delete-confirm-overlay");
}

// --- Image Preview Handler ---
function setupImagePreview() {
    if (fileInput) {
        fileInput.addEventListener("change", () => {
            const file = fileInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (previewImg) previewImg.src = e.target.result;
                    if (previewContainer) previewContainer.style.display = "block";
                };
                reader.readAsDataURL(file);
            } else {
                if (previewContainer) previewContainer.style.display = "none";
            }
        });
    }
}

// --- Instant Debounced Search Handler ---
function setupInstantSearch() {
    if (!searchInput) return;
    
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            renderProductsTable(query);
        }, 300);
    });
}

// --- Orders Management Operations ---

async function loadOrders() {
    showGlobalLoader(true);
    try {
        const data = await request("/orders");
        ordersList = data;
        renderOrdersTable();
    } catch (err) {
        // error toasted
    } finally {
        showGlobalLoader(false);
    }
}

function renderOrdersTable() {
    if (!ordersTableBody) return;
    ordersTableBody.innerHTML = "";
    
    if (ordersList.length === 0) {
        ordersTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-admin-text-muted); padding: 3rem 1rem;">No orders loaded yet.</td></tr>`;
        return;
    }
    
    ordersList.forEach(order => {
        const tr = document.createElement("tr");
        
        const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
        
        let itemsSummary = order.products.map(p => `${p.name} (${p.selectedSize}) x${p.quantity}`).join("<br>");
        
        tr.innerHTML = `
            <td style="font-family: monospace; font-size: 0.8rem; font-weight: 700;">#${order._id}</td>
            <td>
                <strong>${order.shippingAddress.fullName}</strong><br>
                <span style="font-size: 0.75rem; color: var(--color-admin-text-muted);">
                    ${order.shippingAddress.phone} | ${order.shippingAddress.city}
                </span>
            </td>
            <td style="font-size: 0.82rem;" title="${itemsSummary.replace(/<br>/g, ', ')}">${itemsSummary}</td>
            <td style="font-weight: 700; color: var(--color-primary);">₹${order.total.toLocaleString("en-IN")}</td>
            <td><span class="admin-status-badge ${order.paymentStatus.toLowerCase()}">${order.paymentStatus}</span></td>
            <td>
                <select class="admin-table-select order-status-select" data-id="${order._id}">
                    <option value="Processing" ${order.orderStatus === 'Processing' ? 'selected' : ''}>Processing</option>
                    <option value="Shipped" ${order.orderStatus === 'Shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="Delivered" ${order.orderStatus === 'Delivered' ? 'selected' : ''}>Delivered</option>
                </select>
            </td>
            <td>${dateStr}</td>
        `;
        
        tr.querySelector(".order-status-select").addEventListener("change", async (e) => {
            const status = e.target.value;
            showGlobalLoader(true);
            
            try {
                await request(`/orders/${order._id}/status`, {
                    method: "PATCH",
                    body: { orderStatus: status }
                });
                showToast(`Order status updated to ${status}.`);
                
                // Real-time update in cached list
                const idx = ordersList.findIndex(o => o._id === order._id);
                if (idx > -1) ordersList[idx].orderStatus = status;
                
            } catch (err) {
                // reset select on fail
                e.target.value = order.orderStatus;
            } finally {
                showGlobalLoader(false);
            }
        });
        
        ordersTableBody.appendChild(tr);
    });
}

// --- Coupon Management Operations ---

async function loadCoupons() {
    showGlobalLoader(true);
    try {
        const data = await request("/coupons");
        couponsList = data;
        renderCouponsTable();
    } catch (err) {
        // error toasted
    } finally {
        showGlobalLoader(false);
    }
}

function renderCouponsTable() {
    if (!couponsTableBody) return;
    couponsTableBody.innerHTML = "";
    
    if (couponsList.length === 0) {
        couponsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-admin-text-muted); padding: 3rem 1rem;">No promo codes created yet.</td></tr>`;
        return;
    }
    
    couponsList.forEach(c => {
        const tr = document.createElement("tr");
        const expiryStr = c.expiryDate ? new Date(c.expiryDate).toLocaleDateString("en-IN") : "No Limit";
        
        tr.innerHTML = `
            <td style="font-weight: 800; color: var(--color-info); font-size: 0.95rem;">${c.code}</td>
            <td style="font-weight: 700;">${c.discountPercentage * 100}% OFF</td>
            <td>
                <input type="checkbox" class="coupon-status-chk" data-id="${c._id}" ${c.active ? 'checked' : ''}>
            </td>
            <td>${expiryStr}</td>
            <td>
                <button class="admin-btn admin-btn-danger admin-btn-sm delete-coup-btn" data-id="${c._id}"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        
        tr.querySelector(".coupon-status-chk").addEventListener("change", async (e) => {
            const active = e.target.checked;
            showGlobalLoader(true);
            
            try {
                await request(`/coupons/${c._id}`, {
                    method: "PATCH",
                    body: { active }
                });
                showToast(`Coupon active state updated.`);
                
                const idx = couponsList.findIndex(coup => coup._id === c._id);
                if (idx > -1) couponsList[idx].active = active;
                
            } catch (err) {
                e.target.checked = !active;
            } finally {
                showGlobalLoader(false);
            }
        });
        
        tr.querySelector(".delete-coup-btn").addEventListener("click", () => deleteCoupon(c._id));
        
        couponsTableBody.appendChild(tr);
    });
}

function setupCouponCRUD() {
    if (openAddCouponBtn) {
        openAddCouponBtn.addEventListener("click", () => {
            couponForm.reset();
            openModal("coupon-modal", "coupon-modal-overlay");
        });
    }
    
    if (couponClose) couponClose.addEventListener("click", () => closeModal("coupon-modal", "coupon-modal-overlay"));
    if (couponOverlay) couponOverlay.addEventListener("click", () => closeModal("coupon-modal", "coupon-modal-overlay"));
    
    if (couponForm) {
        couponForm.addEventListener("submit", handleCouponSave);
    }
}

async function handleCouponSave(e) {
    e.preventDefault();
    if (isSavingCoupon) return;
    
    const code = document.getElementById("coup-code").value.trim().toUpperCase();
    const discount = parseFloat(document.getElementById("coup-discount").value) / 100;
    const expiry = document.getElementById("coup-expiry").value;
    const active = document.getElementById("coup-active").checked;
    
    const submitBtn = couponForm.querySelector("button[type='submit']");
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;
    isSavingCoupon = true;
    
    try {
        const responseData = await request("/coupons", {
            method: "POST",
            body: {
                code,
                discountPercentage: discount,
                expiryDate: expiry ? new Date(expiry).toISOString() : null,
                active
            }
        });
        
        showToast("Coupon created successfully!");
        closeModal("coupon-modal", "coupon-modal-overlay");
        
        // Dynamic Update
        couponsList.unshift(responseData);
        renderCouponsTable();
    } catch (err) {
        // error toasted
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        isSavingCoupon = false;
    }
}

async function deleteCoupon(couponId) {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    
    showGlobalLoader(true);
    try {
        await request(`/coupons/${couponId}`, {
            method: "DELETE"
        });
        showToast("Coupon deleted successfully.");
        
        // Dynamic Update
        couponsList = couponsList.filter(c => c._id !== couponId);
        renderCouponsTable();
    } catch (err) {
        // error toasted
    } finally {
        showGlobalLoader(false);
    }
}

// Modal helper wrapper imports
function openModal(modalId, overlayId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById(overlayId);
    if (modal) modal.classList.add("active");
    if (overlay) overlay.classList.add("active");
}

function closeModal(modalId, overlayId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById(overlayId);
    if (modal) modal.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
}
