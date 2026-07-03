// Debounced Catalog Search Controller

import { fetchAndRenderProducts } from "./products.js";

export function setupSearch() {
    const searchInput = document.getElementById("search-input");
    if (!searchInput) return;
    
    let debounceTimer = null;
    
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value;
        const activeFilterBtn = document.querySelector(".filter-btn.active");
        const category = activeFilterBtn ? activeFilterBtn.getAttribute("data-filter") : "all";
        
        // Clear previous timeout and set a 300ms debounce buffer
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            fetchAndRenderProducts(category, query);
        }, 300);
    });
}
