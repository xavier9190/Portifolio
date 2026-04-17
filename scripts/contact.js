/**
 * contact.js
 * 
 * Controls contact form submission, including validation, anti-spam (honeypot + cooldown),
 * dynamic loading states with spinner, and lightweight toast notifications.
 */

// Retaining your EmailJS configuration so the form continues to actually work
// (Replacing this with the dummy /api/contact would break your setup)
const EMAILJS_SERVICE_ID = 'service_8iakptb';
const EMAILJS_TEMPLATE_ID = 'template_k19ipy9';
const EMAILJS_PUBLIC_KEY = 'WhH1-PkQGLIirYqAz';

let lastSubmissionTime = 0;
const SUBMISSION_COOLDOWN_MS = 10000; // 10 seconds

document.addEventListener('DOMContentLoaded', initContactForm);

/**
 * Initializes the form, injects honeypot, and binds event listeners.
 */
function initContactForm() {
    const form = document.querySelector('.contact-form');
    if (!form) return;

    // 7A) Simple Anti-Spam Protection: Honeypot field
    // Dynamically created to avoid modifying existing static HTML
    const honeypot = document.createElement('input');
    honeypot.type = 'text';
    honeypot.name = 'company';
    honeypot.style.display = 'none';
    honeypot.tabIndex = -1;
    honeypot.autocomplete = 'off';
    form.appendChild(honeypot);

    // 1) Form Event Handling
    form.addEventListener('submit', handleFormSubmit);
}

/**
 * Handles the submit event, validates fields, formats payload, and sends data.
 */
async function handleFormSubmit(e) {
    e.preventDefault(); // Prevent page reload

    const form = e.target;
    
    // 7B) Simple Anti-Spam Protection: Submission cooldown
    const now = Date.now();
    if (now - lastSubmissionTime < SUBMISSION_COOLDOWN_MS) {
        showToast('Please wait before submitting again.', 'error');
        return;
    }

    // Extract values
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const subjectInput = document.getElementById('subject');
    const messageInput = document.getElementById('message');
    const honeypotInput = form.querySelector('input[name="company"]');

    // Silent honeypot rejection
    if (honeypotInput && honeypotInput.value.trim() !== '') {
        console.warn('Spam detected. Silently cancelling submission.');
        return; 
    }

    const formData = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        subject: subjectInput ? subjectInput.value : '',
        message: messageInput.value.trim()
    };

    // 2) Input Validation
    if (!validateForm(formData)) {
        return; // Stops here if validation failed
    }

    // 5) Send Data
    await sendFormData(form, formData);
}

/**
 * Validates the form data based on required rules.
 * Uses showToast() instead of alerts on failures.
 */
function validateForm({ name, email, message }) {
    if (!name) {
        showToast('Please fill in your name.', 'error');
        return false;
    }

    if (!email || !isValidEmail(email)) {
        showToast('Please provide a valid email format.', 'error');
        return false;
    }

    if (!message) {
        showToast('Please fill in the message field.', 'error');
        return false;
    }

    return true; // Formatting passed
}

/**
 * Helper to validate an email string structure.
 */
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * 4) Loading State
 * Manipulates the submit button UI visually during data transit.
 */
function setLoadingState(form, isLoading) {
    const submitBtn = form.querySelector('.submit-button');
    if (!submitBtn) return;

    if (isLoading) {
        // Save original HTML if not saved yet
        if (!submitBtn.dataset.originalHtml) {
            submitBtn.dataset.originalHtml = submitBtn.innerHTML;
        }
        
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
        submitBtn.style.cursor = 'not-allowed';
        
        // Inline SVG spinner embedded directly in the button
        submitBtn.innerHTML = `
            SENDING...
            <svg class="spinner" viewBox="0 0 50 50" style="width:20px;height:20px;margin-left:8px;animation:spin 1s linear infinite;">
                <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="31.4 31.4" stroke-linecap="round"></circle>
            </svg>
            <style>
                @keyframes spin { 100% { transform: rotate(360deg); } }
            </style>
        `;
    } else {
        // Restore properties and element structure
        submitBtn.disabled = false;
        submitBtn.style.opacity = '';
        submitBtn.style.cursor = '';
        submitBtn.innerHTML = submitBtn.dataset.originalHtml;
    }
}

/**
 * Executes a POST network request handling errors and resolutions.
 */
async function sendFormData(form, formData) {
    setLoadingState(form, true);

    try {
        // Executing the POST request utilizing the existing EmailJS integration.
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                service_id: EMAILJS_SERVICE_ID,
                template_id: EMAILJS_TEMPLATE_ID,
                user_id: EMAILJS_PUBLIC_KEY,
                template_params: formData
            })
        });

        if (response.ok) {
            showToast("Message sent successfully.", 'success');
            form.reset();
            lastSubmissionTime = Date.now(); // Record success time for cooldown
        } else {
            // 6) Error Logging
            console.error('Unexpected server response. Status Code:', response.status);
            throw new Error('Server returned an error.');
        }
    } catch (error) {
        // 6) Error Logging (Network / Syntax errors)
        console.error('Fetch failure / network error:', error);
        showToast("Something went wrong. Please try again.", 'error');
    } finally {
        setLoadingState(form, false);
    }
}

/**
 * 3) Toast Notifications
 * A localized UI modal mechanism for smooth messages.
 */
function showToast(message, type = 'success') {
    // Ensure minimal DOM initialization for toasts (only runs if needed)
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        // Container styling strictly to bottom-right
        Object.assign(toastContainer.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: '9999',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        });
        document.body.appendChild(toastContainer);
    }

    // Build the visual toast
    const toast = document.createElement('div');
    toast.textContent = message;
    
    // Style switching depending on context
    const bgColor = type === 'success' ? '#4ade80' : '#f87171'; // Green / Red layout shades
    const color = type === 'success' ? '#064e3b' : '#450a0a';
    
    Object.assign(toast.style, {
        backgroundColor: bgColor,
        color: color,
        padding: '12px 24px',
        borderRadius: '8px',
        fontFamily: 'var(--font-headline), sans-serif',
        fontSize: '0.85rem',
        fontWeight: '600',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        opacity: '0',
        transform: 'translateY(20px)',
        transition: 'all 0.3s ease-out'
    });

    toastContainer.appendChild(toast);

    // Initial trigger reflow
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // Handle timeout destruction
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        
        // Remove completely 300ms after visually disappearing
        setTimeout(() => {
            if(toast.parentElement) toast.remove();
        }, 300);
    }, 3000);
}
