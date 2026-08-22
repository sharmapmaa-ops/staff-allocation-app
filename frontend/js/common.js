/* ============================================================================
   ICONS (inline SVG, feather-style) - shared across all pages
   ============================================================================ */
const ICONS = {
  home:'<svg class="icon" viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M9.5 20v-6h5v6"/></svg>',
  clock:'<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
  briefcase:'<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/></svg>',
  users:'<svg class="icon" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><circle cx="17.5" cy="9" r="2.6"/><path d="M15.5 14.5c2.6.3 5 1.8 5 5.5"/></svg>',
  bar:'<svg class="icon" viewBox="0 0 24 24"><path d="M4 20V10"/><path d="M11 20V4"/><path d="M18 20v-7"/></svg>',
  settings:'<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.9 2.9l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V19.6a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.9-2.9l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3.6a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.9-2.9l.06.06a1.7 1.7 0 0 0 1.87.34H9.6a1.7 1.7 0 0 0 1-1.55V3.6a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.9 2.9l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09c.24.7.82 1.24 1.55 1.4H20.4a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z"/></svg>',
  user:'<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>',
  bell:'<svg class="icon" viewBox="0 0 24 24"><path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z"/><path d="M9.5 17a2.5 2.5 0 0 0 5 0"/></svg>',
  chevDown:'<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  plus:'<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  edit:'<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash:'<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
  search:'<svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  filter:'<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M4 5h16l-6 8v6l-4 2v-8Z"/></svg>',
  list:'<svg class="icon" viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  addUser:'<svg class="icon" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5"/><path d="M18 8v6M21 11h-6"/></svg>',
  arrowLeft:'<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>',
  arrowRight:'<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  mail:'<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  lock:'<svg class="icon" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  eye:'<svg class="icon" viewBox="0 0 24 24"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff:'<svg class="icon" viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M10.6 5.1A11 11 0 0 1 12 5c7 0 10.5 7 10.5 7a13.6 13.6 0 0 1-3 4"/><path d="M6.5 6.5C3.6 8.3 1.5 12 1.5 12s3.5 7 10.5 7c1.6 0 3-.3 4.2-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
  building:'<svg class="icon" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1"/></svg>',
  check:'<svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>',
  send:'<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="m22 2-9.6 20-3-8-8-3Z"/><path d="M22 2 11 13"/></svg>',
  login:'<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>',
  logout:'<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
  camera:'<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4Z"/><circle cx="12" cy="13.5" r="3.5"/></svg>',
  info:'<svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  save:'<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M7 3v6h9V3M7 21v-8h10v8"/></svg>',
  x:'<svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  database:'<svg class="icon icon-sm" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>',
  refresh:'<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 4v5h-5"/></svg>',
  reports:'<svg class="icon" viewBox="0 0 24 24"><path d="M4 20V10"/><path d="M11 20V4"/><path d="M18 20v-7"/></svg>',
};
function I(name){ return ICONS[name] || ''; }
function peopleIconSVG(size, white){
  const c = white ? '#ffffff' : '#1d4ed8';
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><circle cx="38" cy="26" r="16" fill="${c}"/><circle cx="64" cy="30" r="12" fill="${c}" opacity="0.55"/><path d="M14 88c0-22 12-34 30-34 15 0 25 9 28 24 4-10 12-16 22-16 14 0 22 10 22 26H14Z" fill="${c}"/></svg>`;
}
function illustrationSVG(){
  return `<svg width="220" height="150" viewBox="0 0 220 150"><rect x="20" y="20" width="120" height="80" rx="6" fill="#dbe6ff" stroke="#1d4ed8" stroke-width="2"/><rect x="32" y="34" width="60" height="6" rx="3" fill="#93b4f7"/><rect x="32" y="48" width="40" height="6" rx="3" fill="#93b4f7"/><rect x="32" y="62" width="80" height="18" rx="3" fill="#1d4ed8" opacity="0.7"/><circle cx="165" cy="55" r="26" fill="#eef4ff" stroke="#1d4ed8" stroke-width="2"/><path d="M165 40v15l10 8" stroke="#1d4ed8" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="150" y="100" width="55" height="42" rx="6" fill="#fff" stroke="#1d4ed8" stroke-width="2"/><line x1="150" y1="115" x2="205" y2="115" stroke="#1d4ed8" stroke-width="2"/><circle cx="30" cy="120" r="14" fill="#c8d8ff"/></svg>`;
}
function envelopeSVG(){
  return `<svg width="120" height="90" viewBox="0 0 120 90"><ellipse cx="60" cy="80" rx="55" ry="8" fill="#eef2fb"/><rect x="10" y="15" width="100" height="60" rx="6" fill="#dbe6ff" stroke="#1d4ed8" stroke-width="2"/><path d="M10 20 60 55 110 20" fill="none" stroke="#1d4ed8" stroke-width="2"/><circle cx="60" cy="30" r="12" fill="#fff" stroke="#1d4ed8" stroke-width="2"/><circle cx="60" cy="26" r="4" fill="#1d4ed8"/><path d="M54 34c0-4 3-6 6-6s6 2 6 6" fill="#1d4ed8"/><circle cx="98" cy="70" r="16" fill="#1d4ed8"/><path d="m91 70 4 4 9-9" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function shieldSVG(){
  return `<svg width="90" height="90" viewBox="0 0 90 90"><path d="M45 6 78 18v24c0 24-15 36-33 42C27 78 12 66 12 42V18Z" fill="#dbe6ff" stroke="#1d4ed8" stroke-width="2.5"/><path d="M32 44l9 9 17-19" fill="none" stroke="#1d4ed8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/* ============================================================================
   AUTH GUARD / SESSION
   ============================================================================ */
const Session = {
  token(){ return localStorage.getItem('sa_token'); },
  user(){ try { return JSON.parse(localStorage.getItem('sa_user') || 'null'); } catch(e){ return null; } },
  setSession(token, user){
    localStorage.setItem('sa_token', token);
    localStorage.setItem('sa_user', JSON.stringify(user));
  },
  clear(){
    localStorage.removeItem('sa_token');
    localStorage.removeItem('sa_user');
  },
  isAdmin(){ const u = this.user(); return u && u.role === 'Admin'; },
};
function requireAuth(){
  if (!Session.token()) { location.href = 'login.html'; return false; }
  return true;
}
function logout(){
  Session.clear();
  location.href = 'login.html';
}

/* ============================================================================
   TOAST
   ============================================================================ */
function toast(msg, type){
  let root = document.getElementById('toast-root');
  if (!root) { root = document.createElement('div'); root.id = 'toast-root'; document.body.appendChild(root); }
  const el = document.createElement('div');
  el.className = 'toast ' + (type || 'success');
  el.innerHTML = (type === 'error' ? I('x') : I('check')) + `<span>${msg}</span>`;
  root.appendChild(el);
  setTimeout(() => { el.classList.add('toast-out'); setTimeout(() => el.remove(), 350); }, 3200);
}

/* ============================================================================
   MODAL
   ============================================================================ */
function openModal(title, fields, data, onSave){
  let root = document.getElementById('modal-root');
  if (!root) { root = document.createElement('div'); root.id = 'modal-root'; document.body.appendChild(root); }
  let inner = '';
  fields.forEach(f => {
    const val = data && data[f.key] !== undefined && data[f.key] !== null ? data[f.key] : (f.default !== undefined ? f.default : '');
    inner += `<div class="field" style="margin-bottom:14px;"><label>${f.label}</label>`;
    if (f.type === 'select') {
      inner += `<select id="mf-${f.key}">`;
      f.options.forEach(o => {
        const ov = typeof o === 'object' ? o.value : o;
        const ol = typeof o === 'object' ? o.label : o;
        inner += `<option value="${ov}" ${String(ov) === String(val) ? 'selected' : ''}>${ol}</option>`;
      });
      inner += `</select>`;
    } else if (f.type === 'textarea') {
      inner += `<textarea id="mf-${f.key}" rows="3">${val}</textarea>`;
    } else if (f.type === 'checkbox') {
      inner += `<input type="checkbox" id="mf-${f.key}" ${val ? 'checked' : ''} style="width:18px;height:18px;">`;
    } else {
      inner += `<input type="${f.type || 'text'}" id="mf-${f.key}" value="${val}">`;
    }
    inner += `</div>`;
  });
  root.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal-box">
        <button class="modal-close btn-icon" id="modal-close-btn">${I('x')}</button>
        <h3>${title}</h3>
        <div>${inner}</div>
        <div class="form-actions">
          <button class="btn btn-outline" id="modal-cancel-btn">Cancel</button>
          <button class="btn btn-primary" id="modal-save-btn">${I('save')} Save</button>
        </div>
      </div>
    </div>`;
  const close = () => { root.innerHTML = ''; };
  document.getElementById('modal-close-btn').onclick = close;
  document.getElementById('modal-cancel-btn').onclick = close;
  document.getElementById('modal-overlay').addEventListener('click', (e) => { if (e.target.id === 'modal-overlay') close(); });
  document.getElementById('modal-save-btn').onclick = async () => {
    const result = {};
    fields.forEach(f => {
      const el = document.getElementById('mf-' + f.key);
      result[f.key] = f.type === 'checkbox' ? el.checked : el.value;
    });
    await onSave(result, close);
  };
}
function confirmAction(msg){ return window.confirm(msg); }

/* ============================================================================
   PHONE / COUNTRY CODE HELPER (shared by Employees, Profile forms)
   ============================================================================ */
const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+1', flag: '🇨🇦', name: 'Canada' },
];
/** Splits a stored "+91 987 654 3210" style string into { code, number }. */
function splitPhone(full){
  if (!full) return { code: '+91', number: '' };
  const match = String(full).trim().match(/^(\+\d{1,4})\s*(.*)$/);
  if (match) return { code: match[1], number: match[2] };
  return { code: '+91', number: full };
}
/** Renders a country-code select + phone number input as one flex group. */
function phoneInputHtml(idPrefix, fullValue){
  const { code, number } = splitPhone(fullValue);
  return `<div class="phone-group">
    <select id="${idPrefix}-code">${COUNTRY_CODES.map(c => `<option value="${c.code}" ${c.code === code ? 'selected' : ''}>${c.flag} ${c.code}</option>`).join('')}</select>
    <input id="${idPrefix}-number" type="text" placeholder="Enter contact number" value="${number}">
  </div>`;
}
function readPhoneInput(idPrefix){
  const codeEl = document.getElementById(`${idPrefix}-code`);
  const numEl = document.getElementById(`${idPrefix}-number`);
  if (!codeEl || !numEl) return '';
  return numEl.value ? `${codeEl.value} ${numEl.value}`.trim() : '';
}

/* ============================================================================
   CHANGE PASSWORD MODAL (opened from the user dropdown on every page)
   ============================================================================ */
function openChangePasswordModal(){
  openModal('Change Password', [
    { key: 'currentPassword', label: 'Current Password', type: 'password' },
    { key: 'newPassword', label: 'New Password', type: 'password' },
    { key: 'confirmPassword', label: 'Confirm New Password', type: 'password' },
  ], {}, async (values, close) => {
    if (!values.currentPassword || !values.newPassword) { toast('Please fill in all fields.', 'error'); return; }
    if (values.newPassword !== values.confirmPassword) { toast('New password and confirm password do not match.', 'error'); return; }
    try {
      await Api.put('/auth/me', { currentPassword: values.currentPassword, newPassword: values.newPassword });
      toast('Password changed successfully.', 'success');
      close();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

/* ============================================================================
   APP SHELL (sidebar + topbar), injected into every protected page
   ============================================================================ */
const SETTINGS_SUBMENU = [
  { key: 'currencies', label: 'Currencies' },
  { key: 'project-categories', label: 'Project Categories' },
  { key: 'locations', label: 'Locations' },
  { key: 'project-types', label: 'Project Types' },
  { key: 'billing-basis', label: 'Billing Basis' },
  { key: 'billing-frequencies', label: 'Billing Frequencies' },
  { key: 'departments', label: 'Departments' },
  { key: 'designations', label: 'Designations' },
  { key: 'migration', label: 'Migration' },
];
const NAV_ITEMS = [
  { key: 'home', label: 'Home', icon: 'home', href: 'home.html' },
  { key: 'time-entry', label: 'Time Entry', icon: 'clock', href: 'time-entry.html' },
  { key: 'projects', label: 'Projects', icon: 'briefcase', href: 'projects.html' },
  { key: 'employees', label: 'Employees', icon: 'users', href: 'employees.html' },
  { key: 'reports', label: 'Reports', icon: 'bar', href: 'reports.html' },
  { key: 'settings', label: 'Settings', icon: 'settings', href: 'settings.html', adminOnly: true, submenu: SETTINGS_SUBMENU },
];

async function initShell(activePage){
  if (!requireAuth()) return null;

  const sidebarHtml = `
    <div class="sidebar">
      <div class="sidebar-brand">${peopleIconSVG(34, true)}<div class="sidebar-brand-text">Staff Allocation<br>Management</div></div>
      <div class="sidebar-nav" id="sidebar-nav"></div>
      <div class="sidebar-footer">© 2025 Staff Allocation<br>Management System<div class="ver">v1.0.0</div></div>
    </div>`;
  const topbarHtml = `
    <div class="topbar">
      <div class="page-title" id="page-title"><h1>&nbsp;</h1><p>&nbsp;</p></div>
      <div class="topbar-right">
        <div class="bell-wrap" id="bell-wrap">
          ${I('bell')}<span class="bell-badge hidden" id="bell-badge">0</span>
          <div class="dropdown-panel notif-panel hidden" id="dd-notif">
            <div class="n-head">Notifications</div>
            <div id="notif-list"><div class="notif-empty">No notifications yet.</div></div>
          </div>
        </div>
        <div class="user-chip" id="user-chip">
          <img src="https://i.pravatar.cc/80?img=12" alt="user">
          <div><div class="u-name" id="u-name">-</div><div class="u-id" id="u-id">-</div></div>
          ${I('chevDown')}
          <div class="dropdown-panel hidden" id="dd-user">
            <a href="profile.html">${I('user')} Profile</a>
            <a id="change-pw-link">${I('lock')} Change Password</a>
            <a id="logout-link">${I('logout')} Logout</a>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('sidebar-container').innerHTML = sidebarHtml;
  document.getElementById('topbar-container').innerHTML = topbarHtml;

  const user = Session.user();
  const isAdmin = user && user.role === 'Admin';

  const navHtml = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin).map(item => {
    const isActive = activePage === item.key;
    let html = `<a class="nav-item ${isActive ? 'active' : ''}" href="${item.href}">${I(item.icon)}<span>${item.label}</span></a>`;
    if (item.submenu && isActive) {
      const activeTab = new URLSearchParams(location.search).get('tab') || item.submenu[0].key;
      html += `<div class="nav-sub open">` + item.submenu.map((s) =>
        `<a class="nav-sub-item ${activeTab === s.key ? 'active' : ''}" href="${item.href}?tab=${s.key}">${s.label}</a>`
      ).join('') + `</div>`;
    }
    return html;
  }).join('');
  document.getElementById('sidebar-nav').innerHTML = navHtml;

  document.getElementById('u-name').textContent = user?.name || '';
  document.getElementById('u-id').textContent = user?.employeeCode || '';
  document.getElementById('logout-link').onclick = logout;
  document.getElementById('change-pw-link').onclick = () => {
    document.getElementById('dd-user').classList.add('hidden');
    openChangePasswordModal();
  };

  document.getElementById('bell-wrap').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('dd-notif').classList.toggle('hidden');
    document.getElementById('dd-user').classList.add('hidden');
  });
  document.getElementById('user-chip').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('dd-user').classList.toggle('hidden');
    document.getElementById('dd-notif').classList.add('hidden');
  });
  document.addEventListener('click', () => {
    document.getElementById('dd-notif')?.classList.add('hidden');
    document.getElementById('dd-user')?.classList.add('hidden');
  });

  loadNotifications();
  return { user, isAdmin };
}

function setPageTitle(title, subtitle){
  const el = document.getElementById('page-title');
  if (el) el.innerHTML = `<h1>${title}</h1><p>${subtitle || ''}</p>`;
  document.title = title + ' · Staff Allocation Management System';
}

async function loadNotifications(){
  try {
    const res = await Api.get('/notifications');
    const badge = document.getElementById('bell-badge');
    const list = document.getElementById('notif-list');
    if (!badge || !list) return;
    if (res.unread > 0) { badge.textContent = res.unread; badge.classList.remove('hidden'); }
    else { badge.classList.add('hidden'); }
    if (!res.data.length) { list.innerHTML = '<div class="notif-empty">No notifications yet.</div>'; return; }
    list.innerHTML = res.data.map(n => `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}">
        <b>${n.title}</b>${n.message || ''}
        <div class="notif-time">${timeAgo(n.created_at)}</div>
      </div>`).join('');
    list.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', async () => {
        await Api.patch(`/notifications/${item.dataset.id}/read`);
        item.classList.remove('unread');
        loadNotifications();
      });
    });
  } catch (err) { /* silent - notifications are best-effort */ }
}
function timeAgo(dateStr){
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
}

/* ============================================================================
   MISC HELPERS
   ============================================================================ */
function fmtDate(d){
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtMoney(n, currency){
  const num = Number(n) || 0;
  return (currency ? currency + ' ' : '₹ ') + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function debounce(fn, ms){
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms || 300); };
}
function togglePw(id, btn){
  const input = document.getElementById(id);
  const isPw = input.type === 'password';
  input.type = isPw ? 'text' : 'password';
  btn.innerHTML = isPw ? I('eyeOff') : I('eye');
}
