import { auth } from './firebase-config.js';
import { showStatus } from './utils.js';

export function initAuth() {
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Check auth state
    auth.onAuthStateChanged(user => {
        if (user && window.location.pathname.includes('login.html')) {
            window.location.href = 'index.html';
        } else if (!user && !window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    });
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginButton');
    const loginText = document.getElementById('loginText');
    const loginSpinner = document.getElementById('loginSpinner');
    
    // Show loading state
    loginText.classList.add('d-none');
    loginSpinner.classList.remove('d-none');
    loginBtn.disabled = true;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        window.location.href = 'index.html';
    } catch (error) {
        let errorMessage = "Login failed";
        switch (error.code) {
            case "auth/invalid-email":
                errorMessage = "Invalid email address";
                break;
            case "auth/user-disabled":
                errorMessage = "Account disabled";
                break;
            case "auth/user-not-found":
            case "auth/wrong-password":
                errorMessage = "Invalid email or password";
                break;
        }
        showStatus(errorMessage, "danger");
    } finally {
        loginText.classList.remove('d-none');
        loginSpinner.classList.add('d-none');
        loginBtn.disabled = false;
    }
}

function handleLogout() {
    auth.signOut()
        .then(() => {
            window.location.href = 'login.html';
        })
        .catch(error => {
            showStatus("Logout failed: " + error.message, "danger");
        });
}