(async () => {
  const shell = await initShell('employees');
  if (!shell) return;
  setPageTitle('Employees', 'Manage employee information and details.');

  let tab = 'list';
  let editingId = null;
  let page = 1, perPage = 10, total = 0;
  let search = '', payrollFilter = '', locationFilter = '', statusFilter = '';
  let employees = [];
  let lookups = { departments: [], designations: [], locations: [], managers: [], currencies: [] };

  async function loadLookups(){
    const [dept, desig, loc, curr] = await Promise.all([Api.get('/settings/departments'), Api.get('/settings/designations'), Api.get('/settings/locations'), Api.get('/settings/currencies')]);
    lookups.departments = dept.data; lookups.designations = desig.data; lookups.locations = loc.data; lookups.currencies = curr.data;
  }

  async function loadEmployees(){
    const params = new URLSearchParams({ search, payroll: payrollFilter, location: locationFilter, status: statusFilter, page, perPage });
    const res = await Api.get('/employees?' + params.toString());
    employees = res.data; total = res.total;
    lookups.managers = employees;
  }

  function renderTabs(){
    document.getElementById('emp-tabstrip').innerHTML = `
      <button class="${tab === 'list' ? 'active' : ''}" id="tab-list">${I('users')} Employee List</button>
      <button class="${tab === 'add' ? 'active' : ''}" id="tab-add">${I('addUser')} Add New Employee</button>`;
    document.getElementById('tab-list').addEventListener('click', () => { tab = 'list'; editingId = null; renderAll(); });
    document.getElementById('tab-add').addEventListener('click', () => {
      tab = 'add'; editingId = null; renderAll();
    });
  }

  function renderAll(){
    renderTabs();
    document.getElementById('emp-panel').innerHTML = tab === 'list' ? renderListHtml() : renderFormHtml();
    if (tab === 'list') attachListEvents(); else attachFormEvents();
  }

  function statusPill(s){ return `<span class="pill ${s === 'Active' ? 'active' : s === 'Inactive' ? 'inactive' : 'onleave'}">${s}</span>`; }

  function renderListHtml(){
    const rows = employees.map(e => `
      <tr>
        <td>${e.employee_code}</td><td>${e.full_name}</td><td>${e.department || '—'}</td><td>${e.designation || '—'}</td>
        <td>${e.country}</td><td>${fmtDate(e.dob)}</td><td>${e.gender || '—'}</td><td>${e.contact_number || '—'}</td>
        <td>${fmtDate(e.joining_date)}</td><td>${e.exit_date ? fmtDate(e.exit_date) : '-'}</td>
        <td>${e.payroll_type || '—'}</td><td>${e.location || '—'}</td>
        <td>₹ ${Number(e.gross_salary || 0).toLocaleString('en-IN')}.00</td>
        <td>${statusPill(e.status)}</td>
        <td><span class="pill ${e.access_type === 'Admin' ? 'active' : 'inactive'}">${e.access_type}</span></td>
        <td class="row-actions">
          <button class="btn-icon edit" data-edit="${e.id}" ${shell.isAdmin ? '' : 'disabled'}>${I('edit')}</button>
          <button class="btn-icon delete" data-delete="${e.id}" ${shell.isAdmin ? '' : 'disabled'}>${I('trash')}</button>
        </td>
      </tr>`).join('');
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const uniq = arr => [...new Set(arr.filter(Boolean))];
    return `
      <div class="toolbar">
        <div class="search-box">${I('search')}<input id="emp-search" placeholder="Search by Employee ID, Name..." value="${search}"></div>
        <select id="filter-payroll"><option value="">All Payroll Types</option>${uniq(employees.map(e => e.payroll_type)).map(v => `<option ${payrollFilter === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <select id="filter-location"><option value="">All Locations</option>${uniq(lookups.locations.map(l => l.name)).map(v => `<option ${locationFilter === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <select id="filter-status"><option value="">All Statuses</option><option ${statusFilter === 'Active' ? 'selected' : ''}>Active</option><option ${statusFilter === 'Inactive' ? 'selected' : ''}>Inactive</option><option ${statusFilter === 'On Leave' ? 'selected' : ''}>On Leave</option></select>
        <button class="filters-btn" id="clear-filters">${I('filter')} Clear Filters</button>
      </div>
      <div class="table-scroll"><table class="data-table">
        <thead><tr>
          <th>Employee ID</th><th>Employee Full Name</th><th>Department</th><th>Designation</th><th>Country</th><th>Date of Birth</th>
          <th>Gender</th><th>Contact Number</th><th>Joining Date</th><th>Exit Date</th><th>Payroll Type</th><th>Location</th>
          <th>Gross Salary</th><th>Status</th><th>Access Type</th><th>Actions</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="16" style="text-align:center;color:#9ca3af;padding:30px;">No employees match your filters.</td></tr>`}</tbody>
      </table></div>
      <div class="table-footer">
        <div class="count">Showing ${total ? ((page - 1) * perPage + 1) : 0} to ${Math.min(page * perPage, total)} of ${total} employees</div>
        <div class="pagination">
          <button id="pg-prev" ${page === 1 ? 'disabled' : ''}>${I('arrowLeft')}</button>
          ${Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 6).map(n => `<button class="pg-num ${page === n ? 'active' : ''}" data-page="${n}">${n}</button>`).join('')}
          <button id="pg-next" ${page === totalPages ? 'disabled' : ''}>${I('arrowRight')}</button>
        </div>
      </div>`;
  }

  function renderFormHtml(){
    const e = editingId ? employees.find(x => x.id === editingId) : {};
    const managerOptions = lookups.managers.filter(m => m.id !== editingId);
    return `
      <h3 class="section-title" style="color:var(--text-dark);">Personal Information</h3>
      <div class="form-grid">
        <div class="field"><label>Employee ID</label><input id="ef-id" placeholder="Auto-generated if left blank" value="${e.employee_code || ''}" ${editingId ? 'disabled' : ''}></div>
        <div class="field"><label>Full Name <span class="req">*</span></label><input id="ef-name" value="${e.full_name || ''}"></div>
        <div class="field"><label>Email Address</label><input id="ef-email" value="${e.email || ''}"></div>
        <div class="field"><label>Contact Number <span class="req">*</span></label>${phoneInputHtml('ef-contact', e.contact_number)}</div>
        <div class="field"><label>Date of Birth</label><input id="ef-dob" type="date" value="${e.dob ? e.dob.slice(0, 10) : ''}"></div>
        <div class="field"><label>Gender</label><select id="ef-gender"><option value="">Select gender</option><option ${e.gender === 'Male' ? 'selected' : ''}>Male</option><option ${e.gender === 'Female' ? 'selected' : ''}>Female</option><option ${e.gender === 'Other' ? 'selected' : ''}>Other</option></select></div>
      </div>
      <h3 class="section-title" style="color:var(--text-dark); margin-top:22px;">Work Information</h3>
      <div class="form-grid">
        <div class="field"><label>Payroll Type <span class="req">*</span></label><select id="ef-payroll"><option ${e.payroll_type === 'Full Time' ? 'selected' : ''}>Full Time</option><option ${e.payroll_type === 'Part Time' ? 'selected' : ''}>Part Time</option><option ${e.payroll_type === 'Contractor' ? 'selected' : ''}>Contractor</option></select></div>
        <div class="field"><label>Department</label><select id="ef-dept"><option value="">Select department</option>${lookups.departments.map(d => `<option ${e.department === d.name ? 'selected' : ''}>${d.name}</option>`).join('')}</select></div>
        <div class="field"><label>Designation</label><select id="ef-desig"><option value="">Select designation</option>${lookups.designations.map(d => `<option ${e.designation === d.name ? 'selected' : ''}>${d.name}</option>`).join('')}</select></div>
        <div class="field"><label>Location</label><select id="ef-location"><option value="">Select location</option>${lookups.locations.map(l => `<option ${e.location === l.name ? 'selected' : ''}>${l.name}</option>`).join('')}</select></div>
        <div class="field"><label>Reporting Manager</label><select id="ef-manager"><option value="">Select reporting manager</option>${managerOptions.map(m => `<option value="${m.id}" ${e.reporting_manager_id === m.id ? 'selected' : ''}>${m.full_name} (${m.employee_code})</option>`).join('')}</select></div>
        <div class="field"><label>Access Type <span class="req">*</span></label><select id="ef-accesstype"><option value="User" ${e.access_type !== 'Admin' ? 'selected' : ''}>User</option><option value="Admin" ${e.access_type === 'Admin' ? 'selected' : ''}>Admin</option></select></div>
      </div>
      <h3 class="section-title" style="color:var(--text-dark); margin-top:22px;">Employment Details</h3>
      <div class="form-grid">
        <div class="field"><label>Gross Salary <span class="req">*</span></label><div class="phone-group"><select id="ef-currency" style="width:90px;">${(lookups.currencies || []).map(c => `<option value="${c.code}" ${e.salary_currency === c.code ? 'selected' : ''}>${c.symbol} ${c.code}</option>`).join('')}</select><input id="ef-salary" type="number" value="${e.gross_salary || ''}"></div></div>
        <div class="field"><label>Status <span class="req">*</span></label><select id="ef-status"><option ${e.status === 'Active' ? 'selected' : ''}>Active</option><option ${e.status === 'Inactive' ? 'selected' : ''}>Inactive</option><option ${e.status === 'On Leave' ? 'selected' : ''}>On Leave</option></select></div>
        <div class="field"><label>Joining Date <span class="req">*</span></label><input id="ef-joining" type="date" value="${e.joining_date ? e.joining_date.slice(0, 10) : ''}"></div>
        <div class="field"><label>Exit Date</label><input id="ef-exit" type="date" value="${e.exit_date ? e.exit_date.slice(0, 10) : ''}"></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" id="ef-cancel">Cancel</button>
        <button class="btn btn-primary" id="ef-save">${I('save')} Save Employee</button>
      </div>`;
  }

  function attachListEvents(){
    document.getElementById('emp-search').addEventListener('input', debounce(async (e) => { search = e.target.value; page = 1; await loadEmployees(); renderAll(); }, 300));
    document.getElementById('filter-payroll').addEventListener('change', async (e) => { payrollFilter = e.target.value; page = 1; await loadEmployees(); renderAll(); });
    document.getElementById('filter-location').addEventListener('change', async (e) => { locationFilter = e.target.value; page = 1; await loadEmployees(); renderAll(); });
    document.getElementById('filter-status').addEventListener('change', async (e) => { statusFilter = e.target.value; page = 1; await loadEmployees(); renderAll(); });
    document.getElementById('clear-filters').addEventListener('click', async () => { search = ''; payrollFilter = ''; locationFilter = ''; statusFilter = ''; page = 1; await loadEmployees(); renderAll(); });
    document.getElementById('pg-prev')?.addEventListener('click', async () => { page--; await loadEmployees(); renderAll(); });
    document.getElementById('pg-next')?.addEventListener('click', async () => { page++; await loadEmployees(); renderAll(); });
    document.querySelectorAll('.pg-num').forEach(btn => btn.addEventListener('click', async () => { page = Number(btn.dataset.page); await loadEmployees(); renderAll(); }));
    document.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => { editingId = Number(btn.dataset.edit); tab = 'add'; renderAll(); }));
    document.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirmAction('Delete this employee? This action cannot be undone.')) return;
      try { await Api.del('/employees/' + btn.dataset.delete); toast('Employee deleted.', 'success'); await loadEmployees(); renderAll(); }
      catch (err) { toast(err.message, 'error'); }
    }));
  }

  function attachFormEvents(){
    document.getElementById('ef-cancel').addEventListener('click', () => { tab = 'list'; renderAll(); });
    document.getElementById('ef-save').addEventListener('click', async () => {
      const get = id => document.getElementById(id).value;
      const payload = {
        employeeCode: get('ef-id') || undefined, name: get('ef-name'), email: get('ef-email'), contact: readPhoneInput('ef-contact'),
        dob: get('ef-dob') || null, gender: get('ef-gender'), payroll: get('ef-payroll'), dept: get('ef-dept'),
        desig: get('ef-desig'), location: get('ef-location'), accessType: get('ef-accesstype'),
        reportingManagerId: get('ef-manager') || null, salaryCurrency: get('ef-currency'),
        salary: Number(get('ef-salary')) || 0, status: get('ef-status'), joining: get('ef-joining') || null, exit: get('ef-exit') || null,
      };
      if (!payload.name || !payload.contact) { toast('Please fill all required fields.', 'error'); return; }
      const btn = document.getElementById('ef-save'); const original = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving...';
      try {
        if (editingId) await Api.put('/employees/' + editingId, payload);
        else await Api.post('/employees', payload);
        toast('Employee saved successfully.', 'success');
        tab = 'list'; editingId = null;
        await loadEmployees(); renderAll();
      } catch (err) {
        toast(err.message, 'error');
        btn.disabled = false; btn.innerHTML = original;
      }
    });
  }

  await loadLookups();
  await loadEmployees();
  renderAll();
})();
