(() => {
  const tempToken = sessionStorage.getItem('sa_temp_token');
  const flow = sessionStorage.getItem('sa_verify_flow');
  const notice = sessionStorage.getItem('sa_verify_notice');
  if (!tempToken) { location.href = 'login.html'; return; }

  document.getElementById('brand-sm').innerHTML = peopleIconSVG(46) + '<div class="brand-text" style="font-size:22px;">Team<span style="display:inline;"> Management System</span></div>';
  document.getElementById('shield-icon').innerHTML = shieldSVG();
  document.getElementById('verify-sub').textContent = flow === 'register'
    ? 'Enter the 6-digit code to activate your new workspace.'
    : 'Enter the 6-digit code to finish signing in.';

  if (notice) {
    const isFallback = notice.toLowerCase().includes('123456');
    document.getElementById('notice-slot').innerHTML = `<div class="${isFallback ? 'info-banner' : 'info-banner'}">${I('info')}<span>${notice}</span></div>`;
  }

  function showError(msg){
    document.getElementById('error-slot').innerHTML = msg ? `<div class="error-banner">${I('x')}<span>${msg}</span></div>` : '';
  }

  const boxes = [...document.querySelectorAll('.otp-box')];
  boxes[0].focus();
  boxes.forEach((box, idx) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/[^0-9]/g, '');
      if (box.value && idx < boxes.length - 1) boxes[idx + 1].focus();
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) boxes[idx - 1].focus();
      if (e.key === 'Enter') document.getElementById('verify-btn').click();
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

  document.getElementById('verify-btn').addEventListener('click', async () => {
    const code = boxes.map(b => b.value).join('');
    showError('');
    if (code.length !== 6) { showError('Please enter the complete 6-digit code.'); return; }

    const btn = document.getElementById('verify-btn');
    const label = document.getElementById('verify-label');
    btn.disabled = true; label.innerHTML = '<span class="spinner"></span> Verifying...';
    try {
      const res = await Api.post('/auth/verify', { tempToken, code });
      sessionStorage.removeItem('sa_temp_token');
      sessionStorage.removeItem('sa_verify_flow');
      sessionStorage.removeItem('sa_verify_notice');

      if (res.needsWorkspaceSelection) {
        showWorkspacePicker(res.selectToken, res.workspaces);
        return;
      }
      finishLogin(res);
    } catch (err) {
      showError(err.message);
      btn.disabled = false; label.textContent = 'Verify & Continue';
      boxes.forEach(b => b.value = '');
      boxes[0].focus();
    }
  });

  function finishLogin(res){
    Session.setSession(res.token, res.user);
    toast('Signed in successfully. Welcome, ' + res.user.name + '!', 'success');
    setTimeout(() => location.href = 'home.html', 500);
  }

  function showWorkspacePicker(selectToken, workspaces){
    document.getElementById('otp-card').classList.add('hidden');
    const wsCard = document.getElementById('workspace-card');
    wsCard.classList.remove('hidden');
    document.getElementById('workspace-icon').innerHTML = peopleIconSVG(46);
    document.getElementById('workspace-list').innerHTML = workspaces.map(w => `
      <div class="workspace-item" data-id="${w.workspaceId}">
        <div style="display:flex; align-items:center; gap:14px;">
          <div class="ws-icon">${I('building')}</div>
          <div><div class="ws-name">${w.name}</div><div class="ws-role">${w.role}</div></div>
        </div>
        ${I('arrowRight')}
      </div>`).join('');
    document.querySelectorAll('.workspace-item').forEach(item => {
      item.addEventListener('click', async () => {
        try {
          const res = await Api.post('/auth/select-workspace', { selectToken, workspaceId: item.dataset.id });
          finishLogin(res);
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    });
  }

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
      const res = await Api.post('/auth/resend-code', { tempToken });
      toast(res.message, 'success');
      cooldown = 30;
      tickResend();
    } catch (err) {
      showError(err.message);
    }
  });
})();
