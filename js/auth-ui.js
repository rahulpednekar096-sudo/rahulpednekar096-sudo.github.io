/**
 * auth-ui.js
 * Global script to manage authentication UI elements across all pages
 * 
 * Automatically updates header login button based on auth state
 */

document.addEventListener('DOMContentLoaded', function() {
  // Wait for login module to load
  setTimeout(initAuthUI, 1000);
});

function initAuthUI() {
  // Find login button
  const loginBtn = document.querySelector('.login-btn');
  if (!loginBtn) return;

  // Check current auth state
  const userId = localStorage.getItem('userId');
  const userEmail = localStorage.getItem('userEmail');

  if (userId && userEmail) {
    // User is logged in
    loginBtn.href = '/profile.html';
    loginBtn.textContent = '👤 Profile';
    loginBtn.className = 'login-btn authenticated';
  } else {
    // User is not logged in
    loginBtn.href = '/auth/login.html';
    loginBtn.textContent = '🔑 Login';
    loginBtn.className = 'login-btn';
  }

  // Listen for auth changes
  if (window.rdroidAuth) {
    // Check periodically in case user logs in/out in another tab
    setInterval(() => {
      const currentUserId = localStorage.getItem('userId');
      if (currentUserId && userEmail) {
        if (loginBtn.textContent !== '👤 Profile') {
          loginBtn.href = '/profile.html';
          loginBtn.textContent = '👤 Profile';
          loginBtn.className = 'login-btn authenticated';
        }
      } else {
        if (loginBtn.textContent !== '🔑 Login') {
          loginBtn.href = '/auth/login.html';
          loginBtn.textContent = '🔑 Login';
          loginBtn.className = 'login-btn';
        }
      }
    }, 1000);
  }
}

// Add CSS for authenticated state
const style = document.createElement('style');
style.textContent = `
  .login-btn.authenticated {
    background: linear-gradient(145deg, var(--brand), var(--brand2));
    color: #000;
  }
`;
document.head.appendChild(style);
