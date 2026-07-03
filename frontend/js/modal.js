// Central Modal Open/Close Manager

export function openModal(modalId, overlayId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById(overlayId);
    if (modal) modal.classList.add("active");
    if (overlay) overlay.classList.add("active");
    document.body.style.overflow = "hidden";
}

export function closeModal(modalId, overlayId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById(overlayId);
    if (modal) modal.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
    
    // Check if any other drawers/modals are active before restoring scroll
    const activeOverlays = document.querySelectorAll(".modal.active, .modal-drawer.active, .cart-drawer.active");
    if (activeOverlays.length === 0) {
        document.body.style.overflow = "";
    }
}
