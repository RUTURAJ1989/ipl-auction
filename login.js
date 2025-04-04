// Update the login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = e.target.querySelector('button[type="submit"]');
    const spinner = document.getElementById('loginSpinner');
    const errorDisplay = document.getElementById('loginError');
    
    // Reset error states
    document.getElementById('email').classList.remove('is-invalid');
    document.getElementById('password').classList.remove('is-invalid');
    errorDisplay.classList.add('d-none');
    
    // Show loading state
    loginBtn.disabled = true;
    spinner.classList.remove('d-none');
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        // Check if user is admin (you can add custom claims in Firebase Auth)
        const token = await userCredential.user.getIdTokenResult();
        if (!token.claims.admin) {
            throw new Error('You do not have admin privileges');
        }
        
        window.location.href = "index.html";
    } catch (error) {
        console.error("Login error:", error);
        
        // Handle specific errors
        let errorMessage = "Login failed. Please try again.";
        if (error.code === 'auth/wrong-password') {
            document.getElementById('password').classList.add('is-invalid');
            document.getElementById('passwordError').textContent = "Incorrect password";
        } else if (error.code === 'auth/user-not-found') {
            document.getElementById('email').classList.add('is-invalid');
            document.getElementById('emailError').textContent = "User not found";
        } else {
            errorMessage = error.message;
        }
        
        errorDisplay.textContent = errorMessage;
        errorDisplay.classList.remove('d-none');
    } finally {
        loginBtn.disabled = false;
        spinner.classList.add('d-none');
    }
});