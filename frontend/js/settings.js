(async () => {
  const shell = await initShell('settings');
  if (!shell) return;
  if (!shell.isAdmin) {
    toast('Only Administrators can access Settings.', 'error');
    setTimeout(() => location.href = 'home.html', 800);
    return;
  }
  setPageTitle('Settings', '');

  const TABS = [
    { key: 'currencies', label: 'Currencies', icon: 'database' },
    { key: 'project-categories', label: 'Project Categories', icon: 'briefcase' },
    { key: 'locations', label: 'Locations', icon: 'building' },
    { key: 'project-types', label: 'Project Types', icon: 'list' },
    { key: 'billing-basis', label: 'Billing Basis', icon: 'save' },
    { key: 'billing-frequencies', label: 'Billing Frequencies', icon: 'clock' },
    { key: 'departments', label: 'Departments', icon: 'users' },
    { key: 'designations', label: 'Designations', icon: 'user' },
    { key: 'migration', label: 'Migration', icon: 'database' },
  ];

  const TABLE_CONFIG = {
    'currencies': {
      title: 'Currency', description: 'Manage currencies and their current exchange rates.',
      columns: ['Currency Code', 'Currency Name', 'Symbol', 'Rate (To Base Currency)', 'Base Currency', 'Last Updated', 'Status'],
      row: r => [r.code, r.name, r.symbol, Number(r.rate).toFixed(4), `<span class="pill ${r.is_base ? 'active' : 'inactive'}">${r.is_base ? 'Yes' : 'No'}</span>`, fmtDate(r.last_updated), pill(r.status)],
      fields: [
        { key: 'code', label: 'Currency Code' }, { key: 'name', label: 'Currency Name' }, { key: 'symbol', label: 'Symbol' },
        { key: 'rate', label: 'Rate (To Base Currency)', type: 'number' },
        { key: 'is_base', label: 'Base Currency', type: 'select', options: [{ value: true, label: 'Yes' }, { value: false, label: 'No' }] },
        { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
      ],
    },
    'project-categories': generic('Category', 'Manage project categories used to classify projects.'),
    'locations': {
      title: 'Location', description: 'Manage locations where projects are executed.',
      columns: ['Location Code', 'Location Name', 'Country', 'Time Zone', 'Description', 'Status'],
      row: r => [r.code, r.name, r.country, r.time_zone, r.description, pill(r.status)],
      fields: [
        { key: 'code', label: 'Location Code' }, { key: 'name', label: 'Location Name' }, { key: 'country', label: 'Country' },
        { key: 'time_zone', label: 'Time Zone' }, { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
      ],
    },
    'project-types': generic('Project Type', 'Manage project types used to define the nature of projects.'),
    'billing-basis': generic('Billing Basis', 'Manage billing bases used to calculate and bill for project work.'),
    'billing-frequencies': {
      title: 'Billing Frequency', description: 'Manage billing frequencies used to schedule and generate invoices.',
      columns: ['Frequency Code', 'Frequency Name', 'Description', 'Next Invoice Date Rule', 'Status'],
      row: r => [r.code, r.name, r.description, r.next_invoice_rule, pill(r.status)],
      fields: [
        { key: 'code', label: 'Frequency Code' }, { key: 'name', label: 'Frequency Name' }, { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'next_invoice_rule', label: 'Next Invoice Date Rule' }, { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
      ],
    },
    'departments': generic('Department', 'Manage departments used to organize employees across the company.'),
    'designations': generic('Designation', 'Manage designations used to define roles and responsibilities within the organization.'),
  };
  function generic(title, description){
    return {
      title, description,
      columns: ['Code', 'Name', 'Description', 'Status'],
      row: r => [r.code, r.name, r.description, pill(r.status)],
      fields: [
        { key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
      ],
    };
  }
  function pill(s){ return `<span class="pill ${s === 'Active' ? 'active' : 'inactive'}">${s}</span>`; }

  let activeTab = TABS[0].key;

  function renderTabs(){
    document.getElementById('settings-pilltabs').innerHTML = TABS.map(t => `<button class="pill-tab ${activeTab === t.key ? 'active' : ''}" data-tab="${t.key}">${I(t.icon)} ${t.label}</button>`).join('');
    document.querySelectorAll('.pill-tab').forEach(btn => btn.addEventListener('click', () => { activeTab = btn.dataset.tab; renderPanel(); }));
  }

  async function renderPanel(){
    renderTabs();
    const panel = document.getElementById('settings-panel');
    if (activeTab === 'migration') { renderMigrationPanel(); return; }

    const cfg = TABLE_CONFIG[activeTab];
    panel.innerHTML = `<div class="panel no-tabs"><h3 class="section-title" style="color:var(--text-dark); display:flex; gap:9px; align-items:center;">${I(TABS.find(t => t.key === activeTab).icon)} ${TABS.find(t => t.key === activeTab).label}</h3><div class="skeleton-row"></div><div class="skeleton-row"></div><div class="skeleton-row"></div></div>`;

    let data = [];
    try { data = (await Api.get('/settings/' + activeTab)).data; } catch (err) { toast(err.message, 'error'); }

    const rowsHtml = data.map((r, idx) => `
      <tr>${cfg.row(r).map(c => `<td>${c}</td>`).join('')}
        <td class="row-actions">
          <button class="btn-icon edit" data-edit="${r.id}">${I('edit')}</button>
          <button class="btn-icon delete" data-delete="${r.id}">${I('trash')}</button>
        </td>
      </tr>`).join('');

    panel.innerHTML = `
      <div class="panel no-tabs">
        <h3 class="section-title" style="color:var(--text-dark); display:flex; gap:9px; align-items:center;">${I(TABS.find(t => t.key === activeTab).icon)} ${TABS.find(t => t.key === activeTab).label}</h3>
        <p style="margin:0 0 18px; color:var(--text-gray);">${cfg.description}</p>
        <div style="display:flex; justify-content:flex-end; margin-bottom:14px;">
          <button class="btn btn-primary" id="add-entry-btn">${I('plus')} Add New ${cfg.title}</button>
        </div>
        <div class="search-box" style="margin-bottom:14px; max-width:320px;">${I('search')}<input id="settings-search" placeholder="Search ${cfg.title.toLowerCase()}s..."></div>
        <div class="table-scroll"><table class="data-table" id="settings-table">
          <thead><tr>${cfg.columns.map(c => `<th>${c}</th>`).join('')}<th>Actions</th></tr></thead>
          <tbody>${rowsHtml || `<tr><td colspan="${cfg.columns.length + 1}" style="text-align:center;color:#9ca3af;padding:24px;">No entries yet.</td></tr>`}</tbody>
        </table></div>
        <div class="table-footer"><div class="count">Showing 1 to ${data.length} of ${data.length} entries</div></div>
      </div>`;

    document.getElementById('settings-search').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#settings-table tbody tr').forEach(tr => { tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none'; });
    });
    document.getElementById('add-entry-btn').addEventListener('click', () => {
      openModal(`Add New ${cfg.title}`, cfg.fields, {}, async (values, close) => {
        try { await Api.post('/settings/' + activeTab, values); toast(`${cfg.title} added.`, 'success'); close(); renderPanel(); }
        catch (err) { toast(err.message, 'error'); }
      });
    });
    data.forEach(r => {
      const editBtn = panel.querySelector(`[data-edit="${r.id}"]`);
      const delBtn = panel.querySelector(`[data-delete="${r.id}"]`);
      editBtn?.addEventListener('click', () => {
        openModal(`Edit ${cfg.title}`, cfg.fields, r, async (values, close) => {
          try { await Api.put(`/settings/${activeTab}/${r.id}`, values); toast('Updated successfully.', 'success'); close(); renderPanel(); }
          catch (err) { toast(err.message, 'error'); }
        });
      });
      delBtn?.addEventListener('click', async () => {
        if (!confirmAction('Delete this entry? This action cannot be undone.')) return;
        try { await Api.del(`/settings/${activeTab}/${r.id}`); toast('Entry deleted.', 'success'); renderPanel(); }
        catch (err) { toast(err.message, 'error'); }
      });
    });
  }

  async function renderMigrationPanel(){
    const panel = document.getElementById('settings-panel');
    let history = [];
    try { history = (await Api.get('/migration/history')).data; } catch (err) { /* first run, table may not exist */ }

    panel.innerHTML = `
      <div class="panel no-tabs">
        <div class="migration-hero">
          <div>${I('database')}</div>
          <div>
            <h4>Database Migration</h4>
            <p>Creates any missing tables and loads reference data (currencies, locations, departments, designations, billing rules) plus demo employees, projects and sample time entries — safe to run more than once.</p>
          </div>
        </div>
        <button class="btn btn-primary" id="run-migration-btn">${I('refresh')} Run Migration</button>
        <div class="migration-log hidden" id="migration-log"></div>
        ${history.length ? `
          <h3 class="section-title" style="color:var(--text-dark); margin-top:26px;">Last Run History</h3>
          <div class="migration-log">${history.slice(0, 20).map(h => `
            <div class="migration-log-row"><span class="dot ${h.status}"></span><span class="step">${h.step}</span><span class="detail">${h.detail || ''}</span></div>
          `).join('')}</div>` : ''}
      </div>`;

    document.getElementById('run-migration-btn').addEventListener('click', async () => {
      const btn = document.getElementById('run-migration-btn');
      const original = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Running migration...';
      const logEl = document.getElementById('migration-log');
      logEl.classList.remove('hidden');
      logEl.innerHTML = `<div class="migration-log-row"><span class="dot ok"></span><span class="step">Connecting to database...</span></div>`;
      try {
        const res = await Api.post('/migration/run');
        logEl.innerHTML = '';
        res.log.forEach((entry, i) => {
          setTimeout(() => {
            const row = document.createElement('div');
            row.className = 'migration-log-row';
            row.innerHTML = `<span class="dot ${entry.status}"></span><span class="step">${entry.step}</span><span class="detail">${entry.detail || ''}</span>`;
            logEl.appendChild(row);
            logEl.scrollTop = logEl.scrollHeight;
          }, i * 25);
        });
        setTimeout(() => toast(res.message, 'success'), res.log.length * 25 + 100);
      } catch (err) {
        logEl.innerHTML += `<div class="migration-log-row"><span class="dot error"></span><span class="step">Migration failed</span><span class="detail">${err.message}</span></div>`;
        toast(err.message, 'error');
      } finally {
        btn.disabled = false; btn.innerHTML = original;
      }
    });
  }

  await renderPanel();
})();
