(() => {
  // If already signed in, skip straight to the dashboard.
  if (Session.token()) { location.href = 'home.html'; return; }

  document.getElementById('brand-logo').innerHTML = peopleIconSVG(46) + '<div class="brand-text">Team<span>Management System</span></div>';
  document.getElementById('ic-users').innerHTML = I('users');
  document.getElementById('ic-clock').innerHTML = I('clock');
  document.getElementById('ic-bar').innerHTML = I('bar');
  document.getElementById('ic-mail-wrap').innerHTML = I('mail') + document.getElementById('ic-mail-wrap').innerHTML;
  document.getElementById('ic-lock-wrap').innerHTML = I('lock') + document.getElementById('ic-lock-wrap').innerHTML;
  document.getElementById('eye-btn').innerHTML = I('eye');
  document.getElementById('need-access-slot').innerHTML = `${I('user')}<div><span>Need access? <a href="contact-admin.html">Contact your administrator</a></span><p class="center-text small">We'll notify your administrator to approve your access.</p></div>`;

  document.getElementById('eye-btn').addEventListener('click', () => togglePw('login-password', document.getElementById('eye-btn')));
  document.getElementById('forgot-link').addEventListener('click', () => toast('If an account exists for this email, a reset link would be sent. (Not wired to SMTP yet.)', 'success'));

  function showError(msg){
    document.getElementById('error-slot').innerHTML = msg ? `<div class="error-banner">${I('x')}<span>${msg}</span></div>` : '';
  }

  document.getElementById('signin-btn').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    showError('');
    if (!email || !password) { showError('Please enter both email and password.'); return; }

    const btn = document.getElementById('signin-btn');
    const label = document.getElementById('signin-label');
    btn.disabled = true; label.innerHTML = '<span class="spinner"></span> Signing in...';
    try {
      const res = await Api.post('/auth/login', { email, password });
      sessionStorage.setItem('sa_temp_token', res.tempToken);
      sessionStorage.setItem('sa_verify_flow', 'login');
      sessionStorage.setItem('sa_verify_notice', res.message);
      location.href = 'verify.html';
    } catch (err) {
      showError(err.message);
      btn.disabled = false; label.textContent = 'Sign In';
    }
  });

  document.getElementById('login-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('signin-btn').click();
  });
})();
