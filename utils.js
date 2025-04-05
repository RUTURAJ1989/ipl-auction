// Utility functions used across the application
export function showStatus(message, type = "info") {
    const alert = document.getElementById('statusAlert');
    const messageEl = document.getElementById('statusMessage');
    
    if (!alert || !messageEl) return;
    
    alert.className = `alert status-alert alert-${type} show`;
    messageEl.textContent = message;
    
    setTimeout(() => {
        alert.classList.remove('show');
    }, 5000);
}

export function clearErrorMessages(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const errorMessages = form.querySelectorAll('.error-message');
    errorMessages.forEach(el => el.textContent = '');
}

export function createConfetti() {
    const container = document.getElementById('confettiContainer');
    if (!container) return;
    
    const colors = ['#fdb913', '#e63946', '#1a3e72', '#ffffff', '#198754'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.width = (Math.random() * 10 + 5) + 'px';
        confetti.style.height = (Math.random() * 10 + 5) + 'px';
        confetti.style.animation = `float-up ${Math.random() * 2 + 1}s linear forwards`;
        
        container.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 1000);
    }
}

export function formatPrice(amount) {
    return (amount / 10000000).toFixed(2);
}