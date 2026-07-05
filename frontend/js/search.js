// Debounced Catalog Search Controller

import { fetchAndRenderProducts } from "./products.js";

export function setupSearch() {
    const searchInput = document.getElementById("search-input");
    const mobileSearchInput = document.getElementById("mobile-search-input");
    if (!searchInput && !mobileSearchInput) return;
    
    let debounceTimer = null;
    
    const handleSearchInput = (e) => {
        const query = e.target.value;
        const activeFilterBtn = document.querySelector(".filter-btn.active");
        const category = activeFilterBtn ? activeFilterBtn.getAttribute("data-filter") : "all";
        
        // Synchronize search input text fields
        if (searchInput && e.target !== searchInput) searchInput.value = query;
        if (mobileSearchInput && e.target !== mobileSearchInput) mobileSearchInput.value = query;
        
        // Clear previous timeout and set a 300ms debounce buffer
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            fetchAndRenderProducts(category, query);
        }, 300);
    };

    if (searchInput) {
        searchInput.addEventListener("input", handleSearchInput);
    }
    if (mobileSearchInput) {
        mobileSearchInput.addEventListener("input", handleSearchInput);
    }
}
