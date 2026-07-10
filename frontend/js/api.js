// Centralized API Client and Toast Notification System

const BASE_URL = "/api";

// Custom API Error Class
export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

// Dynamic Toast Helper
export function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        Object.assign(container.style, {
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            gap: "10px"
        });
        document.body.appendChild(container);
    }
    
    const toast = document.createElement("div");
    toast.textContent = message;
    
    // Palette selection (truck-art aesthetic: green, red, teal)
    let bgColor = "#38A169"; // Success green
    if (type === "error") bgColor = "#E53E3E"; // Error red
    if (type === "info") bgColor = "#00D2C4"; // Teal info
    
    Object.assign(toast.style, {
        backgroundColor: bgColor,
        color: "#ffffff",
        padding: "12px 24px",
        borderRadius: "4px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: "0.88rem",
        fontWeight: "700",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        opacity: "0",
        transform: "translateY(20px)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        borderLeft: "4px solid rgba(0,0,0,0.15)"
    });
    
    container.appendChild(toast);
    
    // Trigger slide-up
    setTimeout(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
    }, 10);
    
    // Slide out and remove
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-20px)";
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

// Request Wrapper
export async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    
    // Inject headers
    const headers = options.headers || {};
    const token = localStorage.getItem("simrdhya_token");
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    
    // Automatically stringify JSON body if object, unless FormData
    let body = options.body;
    if (body && typeof body === "object" && !(body instanceof FormData)) {
        body = JSON.stringify(body);
        headers["Content-Type"] = "application/json";
    }
    
    const config = {
        ...options,
        headers,
        body
    };
    
    try {
        const response = await fetch(url, config);
        let data;
        try {
            data = await response.json();
        } catch {
            data = {};
        }
        
        if (!response.ok) {
            throw new ApiError(data.message || `Request failed with status ${response.status}`, response.status);
        }
        return data;
    } catch (error) {
        showToast(error.message, "error");
        throw error;
    }
}

