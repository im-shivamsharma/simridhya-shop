// Wishlist State Controller

import { request, showToast } from "./api.js";

export let wishlist = [];

export async function fetchWishlist() {
    const token = localStorage.getItem("simrdhya_token");
    if (!token) return;
    
    try {
        const data = await request("/wishlist");
        wishlist = data;
    } catch (err) {
        wishlist = [];
    }
}

export async function toggleWishlist(productId) {
    const token = localStorage.getItem("simrdhya_token");
    if (!token) {
        showToast("Please log in to add items to your wishlist!", "error");
        return;
    }
    
    const isWished = wishlist.some(p => p._id === productId);
    try {
        if (isWished) {
            wishlist = await request("/wishlist", {
                method: "DELETE",
                body: { productId }
            });
            showToast("Item removed from your wishlist.");
        } else {
            wishlist = await request("/wishlist", {
                method: "POST",
                body: { productId }
            });
            showToast("Item added to your wishlist!");
        }
    } catch (err) {
        // error toasted
    }
}
