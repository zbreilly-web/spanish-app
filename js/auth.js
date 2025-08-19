// js/auth.js
window.initAuth = function () {
  // The auth UI is already in index.html; we just ensure state refresh
  const who = document.getElementById('whoami');
  if (window.auth?.currentUser) {
    who.textContent = `Signed in as ${auth.currentUser.email}`;
  } else {
    who.textContent = '';
  }
};
