(() => {
  if (Session.token()) { location.href = 'home.html'; return; }

  document.getElementById('ws-icon').innerHTML = peopleIconSVG(90);
  document.getElementById('ws-illustration').innerHTML = illustrationSVG();
  document.getElementById('ic-building-wrap').innerHTML = I('building') + document.getElementById('ic-building-wrap').innerHTML;
  document.getElementById('ic-mail-wrap').innerHTML = I('mail') + document.getElementById('ic-mail-wrap').innerHTML;
  document.getElementById('ic-lock-wrap1').innerHTML = I('lock') + document.getElementById('ic-lock-wrap1').innerHTML;
  document.getElementById('ic-lock-wrap2').innerHTML = I('lock') + document.getElementById('ic-lock-wrap2').innerHTML;
  document.getElementById('eye-btn1').innerHTML = I('eye');
  document.getElementById('eye-btn2').innerHTML = I('eye');
  document.getElementById('back-ic').innerHTML = I('arrowLeft');

  document.getElementById('eye-btn1').addEventListener('click', () => togglePw('ws-password', document.getElementById('eye-btn1')));
  document.getElementById('eye-btn2').addEventListener('click', () => togglePw('ws-password2', document.getElementById('eye-btn2')));

  function showError(msg){
    document.getElementById('error-slot').innerHTML = msg ? `<div class="error-banner">${I('x')}<span>${msg}</span></div>` : '';
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
    const pw = document.getElementById('ws-password').value;
    const bars = ['sb1','sb2','sb3','sb4'].map(id => document.getElementById(id));
    const score = pw ? scorePassword(pw) : 0;
    const colors = ['#dc2626', '#f59e0b', '#f59e0b', '#16a34a'];
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    bars.forEach((b, i) => { b.style.background = i < score ? colors[Math.max(score - 1, 0)] : '#e5e7eb'; });
    document.getElementById('strength-label').textContent = pw ? labels[Math.max(score - 1, 0)] : '';
    document.getElementById('strength-label').style.color = pw ? colors[Math.max(score - 1, 0)] : '';
  }
  function renderMatch(){
    const p1 = document.getElementById('ws-password').value;
    const p2 = document.getElementById('ws-password2').value;
    const el = document.getElementById('match-note');
    if (!p2) { el.className = 'field-note'; el.innerHTML = ''; return; }
    if (p1 === p2) { el.className = 'field-note ok'; el.innerHTML = I('check') + ' Passwords match'; }
    else { el.className = 'field-note err'; el.innerHTML = I('x') + ' Passwords do not match'; }
  }
  document.getElementById('ws-password').addEventListener('input', () => { renderStrength(); renderMatch(); });
  document.getElementById('ws-password2').addEventListener('input', renderMatch);

  document.getElementById('create-btn').addEventListener('click', async () => {
    const workspaceName = document.getElementById('ws-name').value.trim();
    const email = document.getElementById('ws-email').value.trim();
    const p1 = document.getElementById('ws-password').value;
    const p2 = document.getElementById('ws-password2').value;
    showError('');
    if (!workspaceName || !email || !p1) { showError('Please fill in all fields.'); return; }
    if (p1 !== p2) { showError('Passwords do not match.'); return; }
    if (scorePassword(p1) < 3) { showError('Please choose a stronger password.'); return; }

    const btn = document.getElementById('create-btn');
    const label = document.getElementById('create-label');
    btn.disabled = true; label.innerHTML = '<span class="spinner"></span> Creating workspace...';
    try {
      const res = await Api.post('/auth/register', { workspaceName, email, password: p1 });
      sessionStorage.setItem('sa_temp_token', res.tempToken);
      sessionStorage.setItem('sa_verify_flow', 'register');
      sessionStorage.setItem('sa_verify_notice', res.message);
      location.href = 'verify.html';
    } catch (err) {
      showError(err.message);
      btn.disabled = false; label.textContent = 'Create Workspace';
    }
  });
})();
