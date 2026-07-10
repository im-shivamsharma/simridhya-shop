import { request, showToast } from "./api.js";
import { openModal, closeModal } from "./modal.js";
import { updateUserUI } from "./auth.js";

let expiryTimer = null;
let resendTimer = null;
let targetEmail = "";
let expirySeconds = 300; // 5 minutes
let resendSeconds = 60;  // 1 minute

export function openOtpModal(email) {
    targetEmail = email;
    const emailDisplay = document.getElementById("otp-display-email");
    if (emailDisplay) emailDisplay.textContent = email;
    
    // Clear any existing timers
    clearInterval(expiryTimer);
    clearInterval(resendTimer);
    
    expirySeconds = 300;
    resendSeconds = 60;
    
    // Reset input fields
    const inputs = document.querySelectorAll(".otp-input-box");
    inputs.forEach(input => {
        input.value = "";
        input.disabled = false;
    });
    
    const submitBtn = document.getElementById("otp-submit-btn");
    if (submitBtn) submitBtn.disabled = false;
    
    // Focus first input box
    setTimeout(() => {
        if (inputs[0]) inputs[0].focus();
    }, 100);
    
    // Start Timers
    startExpiryTimer();
    startResendTimer();
    
    openModal("otp-modal", "otp-overlay");
}

function startExpiryTimer() {
    const timerDisplay = document.getElementById("otp-timer");
    const submitBtn = document.getElementById("otp-submit-btn");
    const inputs = document.querySelectorAll(".otp-input-box");
    
    const updateDisplay = () => {
        const mins = Math.floor(expirySeconds / 60);
        const secs = expirySeconds % 60;
        if (timerDisplay) {
            timerDisplay.textContent = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        }
    };
    
    updateDisplay();
    
    expiryTimer = setInterval(() => {
        expirySeconds--;
        if (expirySeconds <= 0) {
            clearInterval(expiryTimer);
            if (timerDisplay) timerDisplay.textContent = "Expired";
            if (submitBtn) submitBtn.disabled = true;
            inputs.forEach(input => input.disabled = true);
            showToast("Verification code expired. Please request a new one.", "error");
        } else {
            updateDisplay();
        }
    }, 1000);
}

function startResendTimer() {
    const resendBtn = document.getElementById("otp-resend-btn");
    const countdownSpan = document.getElementById("otp-resend-countdown");
    
    if (resendBtn) resendBtn.disabled = true;
    if (countdownSpan) countdownSpan.textContent = resendSeconds;
    
    resendTimer = setInterval(() => {
        resendSeconds--;
        if (resendSeconds <= 0) {
            clearInterval(resendTimer);
            if (resendBtn) {
                resendBtn.disabled = false;
                resendBtn.innerHTML = "Resend Code";
            }
        } else {
            if (countdownSpan) countdownSpan.textContent = resendSeconds;
            if (resendBtn) {
                resendBtn.innerHTML = `Resend Code (<span id="otp-resend-countdown">${resendSeconds}</span>s)`;
            }
        }
    }, 1000);
}

export function setupOtpVerification() {
    const otpClose = document.getElementById("otp-close");
    const otpOverlay = document.getElementById("otp-overlay");
    const otpForm = document.getElementById("otp-form");
    const inputs = document.querySelectorAll(".otp-input-box");
    const resendBtn = document.getElementById("otp-resend-btn");
    
    if (otpClose) otpClose.addEventListener("click", () => {
        closeModal("otp-modal", "otp-overlay");
        clearInterval(expiryTimer);
        clearInterval(resendTimer);
    });
    
    if (otpOverlay) otpOverlay.addEventListener("click", () => {
        closeModal("otp-modal", "otp-overlay");
        clearInterval(expiryTimer);
        clearInterval(resendTimer);
    });
    
    // Inputs focus behavior & paste support
    inputs.forEach((input, index) => {
        input.addEventListener("input", (e) => {
            const val = e.target.value;
            // Clean non-digits
            e.target.value = val.replace(/[^0-9]/g, "");
            
            if (e.target.value && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });
        
        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !input.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
        
        input.addEventListener("paste", (e) => {
            e.preventDefault();
            const pasteData = (e.clipboardData || window.clipboardData).getData("text");
            const cleanDigits = pasteData.replace(/[^0-9]/g, "").slice(0, 6);
            
            cleanDigits.split("").forEach((digit, digitIdx) => {
                if (inputs[digitIdx]) {
                    inputs[digitIdx].value = digit;
                }
            });
            
            // Focus last filled or last input box
            const nextFocusIdx = Math.min(cleanDigits.length, inputs.length - 1);
            if (inputs[nextFocusIdx]) inputs[nextFocusIdx].focus();
        });
    });
    
    // Resend trigger
    if (resendBtn) {
        resendBtn.addEventListener("click", async () => {
            const originalText = resendBtn.innerHTML;
            resendBtn.disabled = true;
            resendBtn.textContent = "Resending...";
            
            try {
                await request("/auth/resend-otp", {
                    method: "POST",
                    body: { email: targetEmail }
                });
                
                showToast("Verification code resent successfully!");
                
                // Restart expiry and resend timers
                clearInterval(expiryTimer);
                clearInterval(resendTimer);
                
                expirySeconds = 300;
                resendSeconds = 60;
                
                inputs.forEach(input => {
                    input.value = "";
                    input.disabled = false;
                });
                
                const submitBtn = document.getElementById("otp-submit-btn");
                if (submitBtn) submitBtn.disabled = false;
                if (inputs[0]) inputs[0].focus();
                
                startExpiryTimer();
                startResendTimer();
            } catch (err) {
                resendBtn.disabled = false;
                resendBtn.innerHTML = originalText;
            }
        });
    }
    
    // Form verification submit
    if (otpForm) {
        otpForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            let code = "";
            inputs.forEach(input => code += input.value);
            
            if (code.length !== 6) {
                showToast("Please enter a valid 6-digit code.", "error");
                return;
            }
            
            const submitBtn = document.getElementById("otp-submit-btn");
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Verifying...`;
            
            try {
                const data = await request("/auth/verify-otp", {
                    method: "POST",
                    body: { email: targetEmail, otp: code }
                });
                
                // Successful Verification
                localStorage.setItem("simrdhya_token", data.token);
                updateUserUI(data.user);
                showToast("Email verified and registered successfully!");
                closeModal("otp-modal", "otp-overlay");
                
                clearInterval(expiryTimer);
                clearInterval(resendTimer);
                
                window.dispatchEvent(new CustomEvent("simrdhya:auth_changed"));
            } catch (err) {
                // error toasted
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
}
