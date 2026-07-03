// Product Catalog Controller

import { request, showToast } from "./api.js";
import { openModal, closeModal } from "./modal.js";
import { addToCart } from "./cart.js";

const productsGrid = document.getElementById("products-grid");
const modalContentWrapper = document.getElementById("modal-content-wrapper");
const quickViewClose = document.getElementById("quick-view-close");
const quickViewOverlay = document.getElementById("quick-view-overlay");

export let loadedProducts = [];

export async function fetchAndRenderProducts(category = "all", searchQuery = "") {
    if (!productsGrid) return;
    productsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 4rem;"><i class="fa-solid fa-spinner fa-spin fa-3x" style="color: var(--color-art-pink);"></i><p style="margin-top: 1rem; font-weight: 700;">Loading Caravan Styles...</p></div>`;
    
    try {
        let endpoint = `/products?category=${category}`;
        if (searchQuery) {
            endpoint = `/search?q=${encodeURIComponent(searchQuery)}`;
        }
        
        const data = await request(endpoint);
        loadedProducts = data;
        renderProductsGrid(data, searchQuery);
    } catch (err) {
        productsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--color-art-pink);"><i class="fa-solid fa-triangle-exclamation fa-3x"></i><p style="margin-top: 1rem; font-weight: 700;">Failed to load catalog. Please refresh.</p></div>`;
    }
}

function renderProductsGrid(productsList, searchQuery = "") {
    productsGrid.innerHTML = "";
    
    if (productsList.length === 0) {
        productsGrid.innerHTML = `
            <div class="empty-store text-center" style="grid-column: 1 / -1; padding: 4rem 1rem;">
                <div class="empty-icon" style="font-size: 3.5rem; color: var(--color-art-pink); margin-bottom: 1.5rem;"><i class="fa-solid fa-caravan"></i></div>
                <h3 style="font-family: var(--font-serif); font-size: 1.8rem; margin-bottom: 0.5rem;">No Outfits Found in the Caravan</h3>
                <p style="color: var(--color-secondary); margin-bottom: 1.5rem;">We couldn't find matches for "${searchQuery}". Try exploring other beautiful styles!</p>
                <button class="btn btn-primary" id="clear-search-btn">Show All Styles</button>
            </div>
        `;
        
        const clearBtn = document.getElementById("clear-search-btn");
        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                const searchInput = document.getElementById("search-input");
                if (searchInput) searchInput.value = "";
                fetchAndRenderProducts("all");
            });
        }
        return;
    }
    
    productsList.forEach(product => {
        const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
        const image = product.images && product.images.length > 0 ? product.images[0] : "assets/prod_yellow_kurta.png";
        
        const card = document.createElement("article");
        card.className = "product-card";
        card.setAttribute("data-category", product.category);
        
        card.innerHTML = `
            <div class="product-img-wrapper">
                <img src="${image}" alt="${product.name}" class="product-image" loading="lazy">
                <span class="product-badge ${product.badge.toLowerCase() === 'new' ? 'new' : 'hot'}">${product.badge}</span>
                <div class="product-actions">
                    <button class="prod-action-btn quick-view-btn" data-id="${product._id}" aria-label="Quick View"><i class="fa-regular fa-eye"></i></button>
                    <button class="prod-action-btn add-cart-btn" data-id="${product._id}" aria-label="Add to Cart"><i class="fa-solid fa-bag-shopping"></i></button>
                </div>
            </div>
            <div class="product-info">
                <span class="product-subcat">${getCategoryLabel(product.category)}</span>
                <h3 class="product-title">${product.name}</h3>
                <div class="product-rating">
                    <div class="stars">
                        ${renderStars(product.rating)}
                    </div>
                    <span class="review-count">(${product.reviews})</span>
                </div>
                <div class="product-price">
                    <span class="current-price">₹${product.price.toLocaleString("en-IN")}</span>
                    <span class="original-price">₹${product.originalPrice.toLocaleString("en-IN")}</span>
                    <span class="discount-tag">${discount}% OFF</span>
                </div>
            </div>
        `;
        
        card.querySelector(".quick-view-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            openQuickView(product._id);
        });
        
        card.querySelector(".add-cart-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            const size = product.sizes[0];
            const color = product.colors[0] ? product.colors[0].name : "Standard";
            addToCart(product._id, size, color);
        });

        card.addEventListener("click", () => openQuickView(product._id));
        
        productsGrid.appendChild(card);
    });
}

export function openQuickView(productId) {
    const product = loadedProducts.find(p => p._id === productId);
    if (!product) return;
    
    let selectedSize = product.sizes[0];
    let selectedColor = product.colors[0] ? product.colors[0].name : "Standard";
    
    const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
    const image = product.images && product.images.length > 0 ? product.images[0] : "assets/prod_yellow_kurta.png";
    
    modalContentWrapper.innerHTML = `
        <div class="modal-gallery">
            <img src="${image}" alt="${product.name}" id="modal-primary-image">
        </div>
        <div class="modal-details">
            <h2 class="modal-title">${product.name}</h2>
            <div class="product-rating">
                <div class="stars">
                    ${renderStars(product.rating)}
                </div>
                <span class="review-count">(${product.reviews} customer reviews)</span>
            </div>
            <div class="modal-price">
                <span class="price-val">₹${product.price.toLocaleString("en-IN")}</span>
                <span class="orig-val">₹${product.originalPrice.toLocaleString("en-IN")}</span>
                <span class="discount-tag">${discount}% OFF</span>
            </div>
            <p class="modal-desc">${product.description}</p>
            
            <div class="modal-option-group">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
                    <span class="option-label" style="margin-bottom: 0;">Select Size</span>
                    <button class="size-guide-trigger-btn" id="size-guide-trigger" style="background: none; border: none; font-size: 0.75rem; text-decoration: underline; font-weight: 700; cursor: pointer; color: var(--color-art-pink);">Size Guide <i class="fa-solid fa-ruler-horizontal"></i></button>
                </div>
                <div class="size-selector" id="modal-size-selector">
                    ${product.sizes.map(size => `
                        <button class="size-btn ${size === selectedSize ? 'active' : ''}" data-size="${size}">${size}</button>
                    `).join('')}
                </div>
            </div>
            
            ${product.colors.length > 0 ? `
                <div class="modal-option-group">
                    <span class="option-label">Select Color</span>
                    <div class="color-selector" id="modal-color-selector">
                        ${product.colors.map(color => `
                            <button class="color-btn ${color.name === selectedColor ? 'active' : ''}" 
                                    data-color="${color.name}" 
                                    style="background-color: ${color.hex};" 
                                    title="${color.name}">
                            </button>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <button class="btn btn-primary modal-add-to-cart" id="modal-add-to-cart-btn">
                Add to Caravan <i class="fa-solid fa-bag-shopping"></i>
            </button>
        </div>
    `;
    
    const sizeGuideBtn = modalContentWrapper.querySelector("#size-guide-trigger");
    if (sizeGuideBtn) {
        sizeGuideBtn.addEventListener("click", () => {
            openModal("size-guide-modal", "size-guide-overlay");
        });
    }
    
    const sizeBtns = modalContentWrapper.querySelectorAll(".size-btn");
    sizeBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            sizeBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedSize = btn.getAttribute("data-size");
        });
    });
    
    const colorBtns = modalContentWrapper.querySelectorAll(".color-btn");
    colorBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            colorBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedColor = btn.getAttribute("data-color");
        });
    });
    
    modalContentWrapper.querySelector("#modal-add-to-cart-btn").addEventListener("click", () => {
        addToCart(product._id, selectedSize, selectedColor);
        closeModal("quick-view-modal", "quick-view-overlay");
    });
    
    openModal("quick-view-modal", "quick-view-overlay");
}

export function setupProducts() {
    if (quickViewClose) quickViewClose.addEventListener("click", () => closeModal("quick-view-modal", "quick-view-overlay"));
    if (quickViewOverlay) quickViewOverlay.addEventListener("click", () => closeModal("quick-view-modal", "quick-view-overlay"));
    
    const sizeGuideClose = document.getElementById("size-guide-close");
    const sizeGuideOverlay = document.getElementById("size-guide-overlay");
    if (sizeGuideClose) sizeGuideClose.addEventListener("click", () => closeModal("size-guide-modal", "size-guide-overlay"));
    if (sizeGuideOverlay) sizeGuideOverlay.addEventListener("click", () => closeModal("size-guide-modal", "size-guide-overlay"));
    
    const filterButtons = document.querySelectorAll(".filter-btn");
    filterButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            filterButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const filterValue = btn.getAttribute("data-filter");
            const searchInput = document.getElementById("search-input");
            const query = searchInput ? searchInput.value : "";
            
            productsGrid.style.opacity = "0";
            productsGrid.style.transform = "translateY(10px)";
            productsGrid.style.transition = "opacity 0.25s ease, transform 0.25s ease";
            
            setTimeout(() => {
                fetchAndRenderProducts(filterValue, query);
                productsGrid.style.opacity = "1";
                productsGrid.style.transform = "translateY(0)";
            }, 250);
        });
    });
}

function getCategoryLabel(cat) {
    switch(cat) {
        case "kurtas": return "Kurtas & Kurtis";
        case "sarees": return "Sarees & Lehengas";
        case "fusion": return "Fusion Wear";
        default: return "Ethnic Luxury";
    }
}

function renderStars(rating) {
    let starsHtml = "";
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            starsHtml += `<i class="fa-solid fa-star"></i>`;
        } else if (i === fullStars + 1 && halfStar) {
            starsHtml += `<i class="fa-solid fa-star-half-stroke"></i>`;
        } else {
            starsHtml += `<i class="fa-regular fa-star"></i>`;
        }
    }
    return starsHtml;
}
