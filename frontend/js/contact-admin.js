(() => {
  document.getElementById('brand-sm').innerHTML = peopleIconSVG(46) + '<div class="brand-text" style="font-size:22px;">Staff Allocation<span style="display:inline;"> Management System</span></div>';
  document.getElementById('env-icon').innerHTML = envelopeSVG();
  document.getElementById('assist-ic').innerHTML = I('mail');
  document.getElementById('ic-mail-wrap').innerHTML = I('mail') + document.getElementById('ic-mail-wrap').innerHTML;
  document.getElementById('ic-building-wrap').innerHTML = I('building') + document.getElementById('ic-building-wrap').innerHTML;
  document.getElementById('back-ic').innerHTML = I('arrowLeft');
  document.getElementById('send-label').innerHTML = I('send') + ' Send Notification';

  function showError(msg){
    document.getElementById('error-slot').innerHTML = msg ? `<div class="error-banner">${I('x')}<span>${msg}</span></div>` : '';
  }

  document.getElementById('send-btn').addEventListener('click', async () => {
    const email = document.getElementById('ca-email').value.trim();
    const companyName = document.getElementById('ca-company').value.trim();
    const message = document.getElementById('ca-message').value.trim();
    showError('');
    if (!email || !companyName || !message) { showError('Please fill in all fields.'); return; }

    const btn = document.getElementById('send-btn');
    const label = document.getElementById('send-label');
    btn.disabled = true; label.innerHTML = '<span class="spinner"></span> Sending...';
    try {
      const res = await Api.post('/auth/contact-admin', { email, companyName, message });
      toast(res.message, 'success');
      setTimeout(() => location.href = 'login.html', 1200);
    } catch (err) {
      showError(err.message);
      btn.disabled = false; label.innerHTML = I('send') + ' Send Notification';
    }
  });
})();
