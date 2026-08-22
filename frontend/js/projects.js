(async () => {
  const shell = await initShell('projects');
  if (!shell) return;
  setPageTitle('Projects', '');

  let projects = [];
  let lookups = { categories: [], types: [], billBasis: [], billFreq: [], currencies: [], employees: [] };

  async function loadLookups(){
    const [cat, types, basis, freq, curr, emp] = await Promise.all([
      Api.get('/settings/project-categories'), Api.get('/settings/project-types'),
      Api.get('/settings/billing-basis'), Api.get('/settings/billing-frequencies'),
      Api.get('/settings/currencies'), Api.get('/employees?perPage=200'),
    ]);
    lookups.categories = cat.data; lookups.types = types.data; lookups.billBasis = basis.data;
    lookups.billFreq = freq.data; lookups.currencies = curr.data; lookups.employees = emp.data;
  }

  async function loadProjects(search = ''){
    const res = await Api.get('/projects?search=' + encodeURIComponent(search));
    projects = res.data;
  }

  function pill(status){ return `<span class="pill ${status === 'Active' ? 'active' : 'inactive'}">${status}</span>`; }

  function renderAll(){
    document.getElementById('project-panel').innerHTML = renderListHtml();
    attachListEvents();
  }

  function renderListHtml(){
    const rows = projects.map(p => `
      <tr class="clickable-row" data-id="${p.id}">
        <td>${p.project_code}</td><td>${p.project_name}</td><td>${p.client_name || '—'}</td><td>${p.category || '—'}</td>
        <td>${pill(p.status)}</td><td>${p.project_type || '—'}</td><td>${p.billing_frequency || '—'}</td>
        <td>${p.sow_available ? `<span class="badge-check yes">${I('check')}</span>` : `<span class="badge-check no">${I('x')}</span>`}</td>
        <td>${p.billable !== false ? `<span class="badge-check yes">${I('check')}</span>` : `<span class="badge-check no">${I('x')}</span>`}</td>
        <td>${p.project_manager || '—'}</td><td>${p.billing_basis || '—'}</td><td>${p.hours_capping || 0}</td>
        <td>${p.gp_margin || 0}%</td><td>${Number(p.rate || 0).toFixed(2)}</td><td>${p.currency}</td>
        <td>${p.description || '—'}</td><td>${p.comments || '—'}</td><td>${p.additional_notes || '—'}</td>
        <td>${fmtDate(p.start_date)}</td><td>${fmtDate(p.end_date)}</td>
      </tr>`).join('');
    return `
      <div class="panel no-tabs">
        <div class="toolbar">
          <div class="search-box">${I('search')}<input id="project-search" placeholder="Search projects..."></div>
          <button class="btn btn-primary" id="add-project-btn">${I('plus')} Add Project</button>
        </div>
        <div class="table-scroll"><table class="data-table">
          <thead><tr>
            <th>Project ID</th><th>Project Name</th><th>Client Name</th><th>Category</th><th>Status</th><th>Project Type</th>
            <th>Billing Frequency</th><th>SOW Available</th><th>Billable</th><th>Project Manager</th><th>Billing Basis</th><th>Hours Capping</th>
            <th>GP Margin (%)</th><th>Rate</th><th>Currency</th><th>Description</th><th>Comments</th><th>Additional Notes</th><th>Start Date</th><th>End Date</th>
          </tr></thead>
          <tbody>${rows || `<tr><td colspan="20" style="text-align:center;color:#9ca3af;padding:30px;">No projects found.</td></tr>`}</tbody>
        </table></div>
        <div class="table-footer"><div class="count">Showing 1 to ${projects.length} of ${projects.length} projects</div></div>
      </div>`;
  }

  function formFieldsHtml(p){
    const clients = [...new Set(projects.map(pr => pr.client_name).filter(Boolean))];
    return `
      <h3 class="section-title" style="color:var(--text-dark);">Project Information</h3>
      <div class="form-grid">
        <div class="field"><label>Client Name <span class="req">*</span></label><input id="pf-client" list="client-list" value="${p.client_name || ''}" placeholder="Enter or pick a client"><datalist id="client-list">${clients.map(c => `<option value="${c}">`).join('')}</datalist></div>
        <div class="field"><label>Project Name <span class="req">*</span></label><input id="pf-name" placeholder="Enter Project Name" value="${p.project_name || ''}"></div>
        <div class="field"><label>Project ID</label><input id="pf-id" placeholder="Auto-generated if left blank" value="${p.project_code || ''}" ${p.id ? 'disabled' : ''}></div>
        <div class="field"><label>Category <span class="req">*</span></label><select id="pf-category">${lookups.categories.map(c => `<option ${p.category === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>

        <div class="field"><label>Status <span class="req">*</span></label><select id="pf-status"><option ${p.status === 'Active' ? 'selected' : ''}>Active</option><option ${p.status === 'Inactive' ? 'selected' : ''}>Inactive</option><option ${p.status === 'On Hold' ? 'selected' : ''}>On Hold</option></select></div>
        <div class="field"><label>Project Type <span class="req">*</span></label><select id="pf-type">${lookups.types.map(t => `<option ${p.project_type === t.name ? 'selected' : ''}>${t.name}</option>`).join('')}</select></div>
        <div class="field span2"><label>Description</label><textarea id="pf-desc" rows="1">${p.description || ''}</textarea></div>

        <div class="field span2"><label>Comments</label><textarea id="pf-comments" rows="1">${p.comments || ''}</textarea></div>
        <div class="field"><label>Start Date <span class="req">*</span></label><input id="pf-start" type="date" value="${p.start_date ? p.start_date.slice(0, 10) : ''}"></div>
        <div class="field"><label>End Date</label><input id="pf-end" type="date" value="${p.end_date ? p.end_date.slice(0, 10) : ''}"></div>
        <div class="field"><label>Billing Frequency <span class="req">*</span></label><select id="pf-billfreq">${lookups.billFreq.map(b => `<option ${p.billing_frequency === b.name ? 'selected' : ''}>${b.name}</option>`).join('')}</select></div>
        <div class="field"><label>SOW Available? <span class="req">*</span></label><select id="pf-sow"><option value="Yes" ${p.sow_available ? 'selected' : ''}>Yes</option><option value="No" ${!p.sow_available ? 'selected' : ''}>No</option></select></div>

        <div class="field"><label>Project Manager <span class="req">*</span></label><select id="pf-manager">${lookups.employees.map(e => `<option ${p.project_manager === e.full_name ? 'selected' : ''}>${e.full_name}</option>`).join('')}</select></div>
        <div class="field"><label>Billing Basis <span class="req">*</span></label><select id="pf-billbasis">${lookups.billBasis.map(b => `<option ${p.billing_basis === b.name ? 'selected' : ''}>${b.name}</option>`).join('')}</select></div>
        <div class="field"><label>Hours Capping</label><input id="pf-capping" type="number" value="${p.hours_capping || ''}" placeholder="0 = no capping"></div>
        <div class="field"><label>GP Margin (%)</label><div class="amount-wrap"><input id="pf-gp" type="number" value="${p.gp_margin || ''}"><span class="suffix">%</span></div></div>

        <div class="field"><label>Rate <span class="req">*</span></label><input id="pf-rate" type="number" value="${p.rate || ''}"></div>
        <div class="field"><label>Currency <span class="req">*</span></label><select id="pf-currency">${lookups.currencies.map(c => `<option ${p.currency === c.code ? 'selected' : ''}>${c.code}</option>`).join('')}</select></div>
        <div class="field"><label>Billable?</label><div class="check-row" style="display:flex;align-items:center;gap:8px;height:40px;"><input type="checkbox" id="pf-billable" ${p.billable !== false ? 'checked' : ''} style="width:18px;height:18px;"><span>Billable project</span></div></div>

        <div class="field span4"><label>Additional Notes</label><textarea id="pf-notes" rows="2">${p.additional_notes || ''}</textarea></div>
      </div>`;
  }

  function openProjectModal(project){
    const p = project || {};
    const isEdit = Boolean(p.id);
    const readOnly = !shell.isAdmin;
    const root = document.getElementById('modal-root') || (() => { const d = document.createElement('div'); d.id = 'modal-root'; document.body.appendChild(d); return d; })();
    root.innerHTML = `
      <div class="modal-overlay" id="project-modal-overlay">
        <div class="modal-box" style="width:900px;">
          <button class="modal-close btn-icon" id="project-modal-close">${I('x')}</button>
          <h3>${isEdit ? p.project_name : 'Add Project'}</h3>
          <div id="project-form-fields">${formFieldsHtml(p)}</div>
          <div class="form-actions">
            ${isEdit && shell.isAdmin ? `<button class="btn btn-danger-outline" id="project-delete-btn" style="margin-right:auto;">${I('trash')} Delete</button>` : ''}
            <button class="btn btn-outline" id="project-cancel-btn">${readOnly ? 'Close' : 'Cancel'}</button>
            ${!readOnly ? `<button class="btn btn-primary" id="project-save-btn">${I('save')} Save Project</button>` : ''}
          </div>
        </div>
      </div>`;
    if (readOnly) {
      root.querySelectorAll('#project-form-fields input, #project-form-fields select, #project-form-fields textarea').forEach(el => { el.disabled = true; });
    }
    const close = () => { root.innerHTML = ''; };
    document.getElementById('project-modal-close').onclick = close;
    document.getElementById('project-cancel-btn').onclick = close;
    document.getElementById('project-modal-overlay').addEventListener('click', (e) => { if (e.target.id === 'project-modal-overlay') close(); });

    document.getElementById('project-delete-btn')?.addEventListener('click', async () => {
      if (!confirmAction('Delete this project? This action cannot be undone.')) return;
      try {
        await Api.del('/projects/' + p.id);
        toast('Project deleted.', 'success');
        close();
        await loadProjects(document.getElementById('project-search')?.value || '');
        renderAll();
      } catch (err) { toast(err.message, 'error'); }
    });

    document.getElementById('project-save-btn')?.addEventListener('click', async () => {
      const get = id => document.getElementById(id).value;
      const payload = {
        id: get('pf-id') || undefined, name: get('pf-name'), client: get('pf-client'), category: get('pf-category'),
        status: get('pf-status'), type: get('pf-type'), billFreq: get('pf-billfreq'), sow: get('pf-sow') === 'Yes',
        billable: document.getElementById('pf-billable').checked,
        manager: get('pf-manager'), billBasis: get('pf-billbasis'), capping: Number(get('pf-capping')) || 0,
        gp: Number(get('pf-gp')) || 0, rate: Number(get('pf-rate')) || 0, currency: get('pf-currency'),
        desc: get('pf-desc'), comments: get('pf-comments'), notes: get('pf-notes'),
        start: get('pf-start') || null, end: get('pf-end') || null,
      };
      if (!payload.name || !payload.client) { toast('Please fill all required fields.', 'error'); return; }
      const btn = document.getElementById('project-save-btn'); const original = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving...';
      try {
        if (isEdit) await Api.put('/projects/' + p.id, payload);
        else await Api.post('/projects', payload);
        toast('Project saved successfully.', 'success');
        close();
        await loadProjects(document.getElementById('project-search')?.value || '');
        renderAll();
      } catch (err) {
        toast(err.message, 'error');
        btn.disabled = false; btn.innerHTML = original;
      }
    });
  }

  function attachListEvents(){
    document.getElementById('project-search').addEventListener('input', debounce(async (e) => {
      await loadProjects(e.target.value);
      document.getElementById('project-panel').innerHTML = renderListHtml();
      attachListEvents();
    }, 300));
    document.getElementById('add-project-btn').addEventListener('click', () => openProjectModal(null));
    document.querySelectorAll('tr.clickable-row').forEach(tr => {
      tr.addEventListener('click', () => {
        const project = projects.find(p => String(p.id) === tr.dataset.id);
        if (project) openProjectModal(project);
      });
    });
  }

  await loadLookups();
  await loadProjects();
  renderAll();
})();
