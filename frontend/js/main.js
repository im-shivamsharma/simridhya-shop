import { checkSession, setupAuth } from "./auth.js";
import { fetchAndRenderProducts, setupProducts, openQuickView, loadedProducts } from "./products.js";
import { setupCart } from "./cart.js";
import { setupSearch } from "./search.js";
import { setupCheckout } from "./checkout.js";
import { openModal, closeModal } from "./modal.js";
import { request, showToast } from "./api.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Initial Session Validation
    await checkSession();
    
    // Retrieve Products Catalog
    fetchAndRenderProducts("all");
    
    // Launch Subsystem Bindings
    setupProducts();
    setupCart();
    setupSearch();
    setupCheckout();
    setupAuth();
    
    setupContactAndNewsletter();
    setupInstagramLightbox();
    setupMobileMenu();
});

// Setup Mobile Menu Drawer
function setupMobileMenu() {
    const menuToggle = document.getElementById("menu-toggle");
    const menuClose = document.getElementById("menu-close");
    const navMenu = document.getElementById("nav-menu");
    
    const openMenu = () => {
        if (navMenu) navMenu.classList.add("active");
        document.body.style.overflow = "hidden"; // Prevent scrolling behind
    };
    
    const closeMenu = () => {
        if (navMenu) navMenu.classList.remove("active");
        document.body.style.overflow = "";
    };
    
    if (menuToggle) {
        menuToggle.addEventListener("click", openMenu);
    }
    
    if (menuClose) {
        menuClose.addEventListener("click", closeMenu);
    }
    
    // Close menu when clicking outside of the drawer
    const handleOutsideClick = (e) => {
        if (navMenu && navMenu.classList.contains("active")) {
            const isClickInsideMenu = navMenu.contains(e.target);
            const isClickOnToggle = menuToggle && menuToggle.contains(e.target);
            if (!isClickInsideMenu && !isClickOnToggle) {
                closeMenu();
            }
        }
    };
    document.addEventListener("click", handleOutsideClick);

    // Close menu when pressing Escape key
    const handleEscapeKey = (e) => {
        if (e.key === "Escape" && navMenu && navMenu.classList.contains("active")) {
            closeMenu();
        }
    };
    document.addEventListener("keydown", handleEscapeKey);

    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", closeMenu);
    });
}

// Contact Inquiry and Newsletter Subscriptions
function setupContactAndNewsletter() {
    const contactForm = document.getElementById("contact-form");
    const formFeedback = document.getElementById("form-feedback");
    const newsletterForm = document.getElementById("newsletter-form");
    const newsletterFeedback = document.getElementById("newsletter-feedback");
    
    if (contactForm) {
        contactForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const nameEl = document.getElementById("contact-name");
            const emailEl = document.getElementById("contact-email");
            const subjectEl = document.getElementById("contact-subject");
            const messageEl = document.getElementById("contact-message");
            
            const name = nameEl ? nameEl.value.trim() : "";
            const email = emailEl ? emailEl.value.trim() : "";
            const subject = subjectEl ? subjectEl.value.trim() : "General Inquiry";
            const message = messageEl ? messageEl.value.trim() : "";
            
            const submitBtn = contactForm.querySelector("button[type='submit']");
            const originalText = submitBtn.innerHTML;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending Caravan...`;
            
            if (formFeedback) {
                formFeedback.className = "form-feedback";
                formFeedback.style.display = "none";
            }
            
            try {
                const res = await request("/contact", {
                    method: "POST",
                    body: { name, email, subject, message }
                });
                
                showToast(res.message);
                if (formFeedback) {
                    formFeedback.textContent = "🌸 " + res.message;
                    formFeedback.classList.add("success");
                    formFeedback.style.display = "block";
                }
                contactForm.reset();
            } catch (err) {
                // error toasted
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
    
    if (newsletterForm) {
        newsletterForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const emailInput = newsletterForm.querySelector("input[type='email']");
            const email = emailInput ? emailInput.value.trim() : "";
            
            const submitBtn = newsletterForm.querySelector("button[type='submit']");
            const originalText = submitBtn.innerHTML;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
            
            if (newsletterFeedback) {
                newsletterFeedback.className = "newsletter-feedback";
                newsletterFeedback.style.display = "none";
            }
            
            try {
                const res = await request("/newsletter", {
                    method: "POST",
                    body: { email }
                });
                
                showToast(res.message);
                if (newsletterFeedback) {
                    newsletterFeedback.innerHTML = `Namaste! Welcome to our Caravan. We've applied code <strong>${res.couponCode || "CARAVAN10"}</strong> (10% off) directly to your shopping session!`;
                    newsletterFeedback.classList.add("success");
                    newsletterFeedback.style.display = "block";
                }
                
                // Inject coupon automatically
                if (res.couponCode) {
                    const cartCouponInput = document.getElementById("cart-coupon-input");
                    if (cartCouponInput) {
                        cartCouponInput.value = res.couponCode;
                        const applyBtn = document.getElementById("cart-coupon-apply-btn");
                        if (applyBtn) applyBtn.click();
                    }
                }
                newsletterForm.reset();
            } catch (err) {
                // toasted
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
}

// Instagram shop mapping lightbox
function setupInstagramLightbox() {
    const feedContainer = document.getElementById("instagram-feed");
    const instaModal = document.getElementById("insta-modal");
    const instaOverlay = document.getElementById("insta-overlay");
    const instaClose = document.getElementById("insta-close");
    const instaLightboxImg = document.getElementById("insta-lightbox-img");
    const instaLightboxHandle = document.getElementById("insta-lightbox-handle");
    const instaShopLookBtn = document.getElementById("insta-shop-look-btn");
    
    if (!feedContainer) return;
    
    feedContainer.addEventListener("click", (e) => {
        const item = e.target.closest(".instagram-item");
        if (!item) return;
        
        const img = item.querySelector("img");
        const handle = item.querySelector(".instagram-hover span").textContent;
        
        if (instaLightboxImg) instaLightboxImg.src = img.src;
        if (instaLightboxHandle) instaLightboxHandle.textContent = handle;
        
        let productIdToShop = "";
        const imgSrc = img.getAttribute("src");
        
        let category = "all";
        if (imgSrc.includes("cat_kurtis")) category = "kurtas";
        else if (imgSrc.includes("cat_sarees")) category = "sarees";
        else if (imgSrc.includes("cat_fusion")) category = "fusion";
        else if (imgSrc.includes("pink_lehenga")) category = "sarees";
        else if (imgSrc.includes("blue_fusion")) category = "fusion";
        
        const found = loadedProducts.find(p => p.category === category);
        if (found) {
            productIdToShop = found._id;
        } else if (loadedProducts.length > 0) {
            productIdToShop = loadedProducts[0]._id;
        }
        
        if (productIdToShop && instaShopLookBtn) {
            const newBtn = instaShopLookBtn.cloneNode(true);
            instaShopLookBtn.parentNode.replaceChild(newBtn, instaShopLookBtn);
            
            newBtn.addEventListener("click", () => {
                closeModal("insta-modal", "insta-overlay");
                openQuickView(productIdToShop);
            });
        }
        
        openModal("insta-modal", "insta-overlay");
    });
    
    if (instaClose) instaClose.addEventListener("click", () => closeModal("insta-modal", "insta-overlay"));
    if (instaOverlay) instaOverlay.addEventListener("click", () => closeModal("insta-modal", "insta-overlay"));
}
