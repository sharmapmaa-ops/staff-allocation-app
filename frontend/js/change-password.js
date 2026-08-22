(async () => {
  const shell = await initShell('profile');
  if (!shell) return;
  setPageTitle('Change Password', '');

  document.getElementById('current-pw-wrap').innerHTML = I('lock') + document.getElementById('current-pw-wrap').innerHTML;
  document.getElementById('eye-current').innerHTML = I('eye');
  document.getElementById('eye-new').innerHTML = I('eye');
  document.getElementById('eye-confirm').innerHTML = I('eye');
  document.getElementById('eye-current').addEventListener('click', () => togglePw('cp-current', document.getElementById('eye-current')));
  document.getElementById('eye-new').addEventListener('click', () => togglePw('cp-new', document.getElementById('eye-new')));
  document.getElementById('eye-confirm').addEventListener('click', () => togglePw('cp-confirm', document.getElementById('eye-confirm')));

  function showError(slot, msg){
    document.getElementById(slot).innerHTML = msg ? `<div class="error-banner">${I('x')}<span>${msg}</span></div>` : '';
  }

  function scorePassword(pw){
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw) && /[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }
  function renderStrength(){
    const pw = document.getElementById('cp-new').value;
    const bars = ['sb1', 'sb2', 'sb3', 'sb4'].map(id => document.getElementById(id));
    const score = pw ? scorePassword(pw) : 0;
    const colors = ['#dc2626', '#f59e0b', '#f59e0b', '#16a34a'];
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    bars.forEach((b, i) => { b.style.background = i < score ? colors[Math.max(score - 1, 0)] : '#e5e7eb'; });
    document.getElementById('strength-label').textContent = pw ? labels[Math.max(score - 1, 0)] : '';
    document.getElementById('strength-label').style.color = pw ? colors[Math.max(score - 1, 0)] : '';
  }
  function renderMatch(){
    const p1 = document.getElementById('cp-new').value;
    const p2 = document.getElementById('cp-confirm').value;
    const el = document.getElementById('match-note');
    if (!p2) { el.className = 'field-note'; el.innerHTML = ''; return; }
    if (p1 === p2) { el.className = 'field-note ok'; el.innerHTML = I('check') + ' Passwords match'; }
    else { el.className = 'field-note err'; el.innerHTML = I('x') + ' Passwords do not match'; }
  }
  document.getElementById('cp-new').addEventListener('input', () => { renderStrength(); renderMatch(); });
  document.getElementById('cp-confirm').addEventListener('input', renderMatch);

  let newPasswordValue = '';

  document.getElementById('send-code-btn').addEventListener('click', async () => {
    const current = document.getElementById('cp-current').value;
    const next = document.getElementById('cp-new').value;
    const confirm = document.getElementById('cp-confirm').value;
    showError('error-slot-1', '');
    if (!current || !next || !confirm) { showError('error-slot-1', 'Please fill in all fields.'); return; }
    if (next !== confirm) { showError('error-slot-1', 'New password and confirm password do not match.'); return; }
    if (scorePassword(next) < 3) { showError('error-slot-1', 'Please choose a stronger password.'); return; }

    const btn = document.getElementById('send-code-btn'); const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Sending...';
    try {
      const res = await Api.post('/auth/change-password/request', { currentPassword: current });
      newPasswordValue = next;
      document.getElementById('otp-notice').innerHTML = I('info') + `<span>${res.message}</span>`;
      document.getElementById('step-password').classList.add('hidden');
      document.getElementById('step-otp').classList.remove('hidden');
      const boxes = [...document.querySelectorAll('.otp-box')];
      boxes[0].focus();
    } catch (err) {
      showError('error-slot-1', err.message);
    } finally {
      btn.disabled = false; btn.innerHTML = original;
    }
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    document.getElementById('step-otp').classList.add('hidden');
    document.getElementById('step-password').classList.remove('hidden');
    showError('error-slot-2', '');
  });

  const boxes = [...document.querySelectorAll('.otp-box')];
  boxes.forEach((box, idx) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/[^0-9]/g, '');
      if (box.value && idx < boxes.length - 1) boxes[idx + 1].focus();
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) boxes[idx - 1].focus();
      if (e.key === 'Enter') document.getElementById('confirm-code-btn').click();
    });
    box.addEventListener('paste', (e) => {
      const text = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
      if (text.length) {
        e.preventDefault();
        text.split('').slice(0, 6).forEach((ch, i) => { if (boxes[i]) boxes[i].value = ch; });
        boxes[Math.min(text.length, 6) - 1]?.focus();
      }
    });
  });

  document.getElementById('confirm-code-btn').addEventListener('click', async () => {
    const code = boxes.map(b => b.value).join('');
    showError('error-slot-2', '');
    if (code.length !== 6) { showError('error-slot-2', 'Please enter the complete 6-digit code.'); return; }

    const btn = document.getElementById('confirm-code-btn'); const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Confirming...';
    try {
      await Api.post('/auth/change-password/confirm', { code, newPassword: newPasswordValue });
      toast('Password changed successfully. Please sign in again with your new password.', 'success');
      setTimeout(logout, 1200);
    } catch (err) {
      showError('error-slot-2', err.message);
      btn.disabled = false; btn.innerHTML = original;
      boxes.forEach(b => b.value = '');
      boxes[0].focus();
    }
  });

  let cooldown = 0;
  function tickResend(){
    const link = document.getElementById('resend-link');
    if (cooldown > 0) {
      link.textContent = `Resend code (${cooldown}s)`;
      link.classList.add('disabled');
      cooldown--;
      setTimeout(tickResend, 1000);
    } else {
      link.textContent = 'Resend code';
      link.classList.remove('disabled');
    }
  }
  document.getElementById('resend-link').addEventListener('click', async () => {
    if (cooldown > 0) return;
    try {
      const current = document.getElementById('cp-current').value;
      const res = await Api.post('/auth/change-password/request', { currentPassword: current });
      toast(res.message, 'success');
      cooldown = 30;
      tickResend();
    } catch (err) {
      showError('error-slot-2', err.message);
    }
  });
})();
