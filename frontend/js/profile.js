(async () => {
  const shell = await initShell('profile');
  if (!shell) return;
  setPageTitle('Profile', 'View and update your personal information.');

  let lookups = { departments: [], designations: [], locations: [], managers: [], currencies: [] };
  let me = {};

  try {
    const [meRes, dept, desig, loc, emp, curr] = await Promise.all([
      Api.get('/auth/me'), Api.get('/settings/departments'), Api.get('/settings/designations'),
      Api.get('/settings/locations'), Api.get('/employees?perPage=200'), Api.get('/settings/currencies'),
    ]);
    me = meRes;
    lookups.departments = dept.data; lookups.designations = desig.data; lookups.locations = loc.data;
    lookups.managers = emp.data; lookups.currencies = curr.data;
  } catch (err) { toast(err.message, 'error'); }

  const hasEmployee = Boolean(me.employeeId);
  const managerOptions = (lookups.managers || []).filter(m => m.id !== me.employeeId);

  document.getElementById('content').innerHTML = `
    <div class="panel no-tabs">
      <h3 class="section-title" style="color:var(--text-dark);">Profile Information</h3>
      <div style="display:flex; gap:32px; margin-bottom:22px; flex-wrap:wrap;">
        <div>
          <img src="https://i.pravatar.cc/140?img=12" style="width:130px;height:130px;border-radius:50%;object-fit:cover;display:block;margin-bottom:14px;">
          <button class="btn btn-outline" id="change-photo-btn">${I('camera')} Change Photo</button>
        </div>
        <div style="flex:1; min-width:280px;">
          <div class="form-grid" style="grid-template-columns:repeat(3,1fr);">
            <div class="field"><label>Employee ID</label><input value="${me.employeeCode || ''}" disabled></div>
            <div class="field"><label>Workspace</label><input value="${me.workspaceName || ''}" disabled></div>
            <div class="field"><label>Full Name</label><input id="pr-name" value="${me.name || ''}"></div>
            <div class="field"><label>Email Address</label><input value="${me.email || ''}" disabled></div>
            <div class="field"><label>Contact Number</label>${phoneInputHtml('pr-contact', me.contact)}</div>
            <div class="field"><label>Designation</label><select id="pr-desig" ${hasEmployee ? '' : 'disabled'}>${lookups.designations.map(d => `<option ${me.designation === d.name ? 'selected' : ''}>${d.name}</option>`).join('')}</select></div>
            <div class="field"><label>Department</label><select id="pr-dept" ${hasEmployee ? '' : 'disabled'}>${lookups.departments.map(d => `<option ${me.department === d.name ? 'selected' : ''}>${d.name}</option>`).join('')}</select></div>
            <div class="field"><label>Date of Birth</label><input id="pr-dob" type="date" value="${me.dob ? me.dob.slice(0, 10) : ''}" ${hasEmployee ? '' : 'disabled'}></div>
            <div class="field"><label>Gender</label><select id="pr-gender" ${hasEmployee ? '' : 'disabled'}><option ${me.gender === 'Male' ? 'selected' : ''}>Male</option><option ${me.gender === 'Female' ? 'selected' : ''}>Female</option><option ${me.gender === 'Other' ? 'selected' : ''}>Other</option></select></div>
            <div class="field"><label>Date of Joining</label><input id="pr-joining" type="date" value="${me.joining ? me.joining.slice(0, 10) : ''}" ${hasEmployee ? '' : 'disabled'}></div>
            <div class="field"><label>Exit Date</label><input id="pr-exit" type="date" value="${me.exit ? me.exit.slice(0, 10) : ''}" ${hasEmployee ? '' : 'disabled'}></div>
            <div class="field"><label>Payroll Type</label><select id="pr-payroll" ${hasEmployee ? '' : 'disabled'}><option ${me.payroll === 'Full Time' ? 'selected' : ''}>Full Time</option><option ${me.payroll === 'Part Time' ? 'selected' : ''}>Part Time</option><option ${me.payroll === 'Contractor' ? 'selected' : ''}>Contractor</option></select></div>
            <div class="field"><label>Location</label><select id="pr-location" ${hasEmployee ? '' : 'disabled'}>${lookups.locations.map(l => `<option ${me.location === l.name ? 'selected' : ''}>${l.name}</option>`).join('')}</select></div>
            <div class="field"><label>Reporting Manager</label><select id="pr-manager" ${hasEmployee ? '' : 'disabled'}><option value="">Select reporting manager</option>${managerOptions.map(m => `<option value="${m.id}" ${me.reportingManagerId === m.id ? 'selected' : ''}>${m.full_name} (${m.employee_code})</option>`).join('')}</select></div>
          </div>
        </div>
      </div>
      ${!hasEmployee ? `<div class="info-banner">${I('info')}<span>Your login isn't linked to an employee record yet, so work-related fields are read-only. Ask an Administrator to link your account from the Employees page.</span></div>` : ''}

      <h3 class="section-title" style="color:var(--text-dark); margin-top:10px;">Work Information</h3>
      <div class="form-grid">
        <div class="field"><label>Gross Salary</label><div class="phone-group"><select id="pr-currency" style="width:90px;" ${hasEmployee ? '' : 'disabled'}>${(lookups.currencies || []).map(c => `<option value="${c.code}" ${me.salaryCurrency === c.code ? 'selected' : ''}>${c.symbol} ${c.code}</option>`).join('')}</select><input id="pr-salary" type="number" value="${me.salary || ''}" ${hasEmployee ? '' : 'disabled'}></div></div>
        <div class="field"><label>Status</label><select id="pr-status" ${hasEmployee ? '' : 'disabled'}><option ${me.status === 'Active' ? 'selected' : ''}>Active</option><option ${me.status === 'Inactive' ? 'selected' : ''}>Inactive</option><option ${me.status === 'On Leave' ? 'selected' : ''}>On Leave</option></select></div>
      </div>

      <div style="display:flex; gap:14px; margin-top:22px;">
        <button class="btn btn-primary" id="save-profile-btn">${I('save')} Save Changes</button>
        <button class="btn btn-danger-outline" id="delete-account-btn">${I('trash')} Delete Account</button>
      </div>
    </div>`;

  document.getElementById('change-photo-btn').addEventListener('click', () => toast('Photo upload isn\'t wired to storage yet in this build.', 'success'));

  document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const get = id => document.getElementById(id)?.value;
    const payload = {
      name: get('pr-name'), contact: readPhoneInput('pr-contact'), designation: get('pr-desig'), department: get('pr-dept'),
      dob: get('pr-dob') || null, gender: get('pr-gender'), joining: get('pr-joining') || null, exit: get('pr-exit') || null,
      payroll: get('pr-payroll'), location: get('pr-location'), reportingManagerId: get('pr-manager') || null,
      salaryCurrency: get('pr-currency'), salary: Number(get('pr-salary')) || 0, status: get('pr-status'),
    };

    const btn = document.getElementById('save-profile-btn'); const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving...';
    try {
      await Api.put('/auth/me', payload);
      const user = Session.user();
      user.name = payload.name;
      localStorage.setItem('sa_user', JSON.stringify(user));
      toast('Profile updated successfully.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false; btn.innerHTML = original;
    }
  });

  document.getElementById('delete-account-btn').addEventListener('click', async () => {
    if (!confirmAction('Are you sure you want to delete your account? This action cannot be undone.')) return;
    try {
      await Api.del('/auth/me');
      toast('Account deleted.', 'success');
      setTimeout(logout, 800);
    } catch (err) { toast(err.message, 'error'); }
  });
})();
