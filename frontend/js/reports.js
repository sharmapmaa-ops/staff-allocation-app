(async () => {
  const shell = await initShell('reports');
  if (!shell) return;
  setPageTitle('Reports', 'Monthwise and employee-wise summaries, plus project and employee profitability.');

  const REPORTS = [
    { key: 'monthwise-project-summary', label: 'Monthwise Project Summary', icon: 'clock' },
    { key: 'employeewise-project-summary', label: 'Employee-wise Project Summary', icon: 'users' },
    { key: 'projectwise-profitability', label: 'Project-wise Profitability', icon: 'briefcase' },
    { key: 'employeewise-profitability', label: 'Employee-wise Profitability', icon: 'reports' },
  ];
  let active = REPORTS[0].key;

  // ---- Month + Employee filters (default: current month, All / My Team) ----
  const now = new Date();
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ value: localMonthValue(d), label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) });
  }
  let selectedMonth = months[0].value;
  let selectedEmployee = 'all';
  let employees = [];
  let scopeLabel = 'All';
  try {
    const res = await Api.get('/dashboard/employee-options');
    employees = res.data;
    scopeLabel = res.scopeLabel;
  } catch (err) { /* filters still render, just without employee options */ }

  function renderFilters(){
    document.getElementById('report-filters').innerHTML = `
      <select id="report-emp-select">
        <option value="all">${scopeLabel === 'My Team' ? 'My Team (All)' : 'All'}</option>
        ${employees.map(e => `<option value="${e.id}" ${selectedEmployee === String(e.id) ? 'selected' : ''}>${e.full_name} (${e.employee_code})</option>`).join('')}
      </select>
      <select id="report-month-select">
        ${months.map(m => `<option value="${m.value}" ${selectedMonth === m.value ? 'selected' : ''}>${m.label}</option>`).join('')}
      </select>`;
    document.getElementById('report-emp-select').addEventListener('change', (e) => { selectedEmployee = e.target.value; renderBody(); });
    document.getElementById('report-month-select').addEventListener('change', (e) => { selectedMonth = e.target.value; renderBody(); });
  }

  function renderTabs(){
    document.getElementById('report-tabs').innerHTML = REPORTS.map(r => `<button class="report-tab ${active === r.key ? 'active' : ''}" data-key="${r.key}">${I(r.icon)} ${r.label}</button>`).join('');
    document.querySelectorAll('.report-tab').forEach(btn => btn.addEventListener('click', () => { active = btn.dataset.key; renderBody(); }));
  }

  function money(n){ return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function hrs(n){ return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  async function renderBody(){
    renderTabs();
    renderFilters();
    const body = document.getElementById('report-body');
    body.innerHTML = `<div class="panel no-tabs"><div class="skeleton-row"></div><div class="skeleton-row"></div><div class="skeleton-row"></div></div>`;

    const params = new URLSearchParams({ month: selectedMonth, employeeId: selectedEmployee });
    let data = [];
    try { data = (await Api.get(`/reports/${active}?${params.toString()}`)).data; }
    catch (err) { toast(err.message, 'error'); body.innerHTML = `<div class="panel no-tabs">${err.message}</div>`; return; }

    if (active === 'monthwise-project-summary') return renderMonthwise(data);
    if (active === 'employeewise-project-summary') return renderEmployeewiseSummary(data);
    if (active === 'projectwise-profitability') return renderProjectProfitability(data);
    if (active === 'employeewise-profitability') return renderEmployeeProfitability(data);
  }

  function renderMonthwise(data){
    const totalHours = data.reduce((s, r) => s + Number(r.total_hours), 0);
    const totalBillable = data.reduce((s, r) => s + Number(r.billable_hours), 0);
    document.getElementById('report-body').innerHTML = `
      <div class="summary-tiles">
        <div class="summary-tile"><div class="label">Rows</div><div class="value">${data.length}</div></div>
        <div class="summary-tile"><div class="label">Total Hours</div><div class="value">${hrs(totalHours)}</div></div>
        <div class="summary-tile"><div class="label">Billable Hours</div><div class="value">${hrs(totalBillable)}</div></div>
        <div class="summary-tile"><div class="label">Billable Share</div><div class="value">${totalHours ? Math.round(totalBillable / totalHours * 100) : 0}%</div></div>
      </div>
      <div class="panel no-tabs">
        <div class="table-scroll h-sm"><table class="data-table">
          <thead><tr><th>Month</th><th>Project Code</th><th>Project Name</th><th>Category</th><th>Client Name</th><th>Billable Hours</th><th>Non-Billable Hours</th><th>Total Hours</th></tr></thead>
          <tbody>${data.map(r => `<tr><td>${r.month}</td><td>${r.project_code}</td><td>${r.project_name}</td><td>${r.category || '—'}</td><td>${r.client_name || '—'}</td><td>${hrs(r.billable_hours)}</td><td>${hrs(r.non_billable_hours)}</td><td><b>${hrs(r.total_hours)}</b></td></tr>`).join('') || emptyRow(8)}</tbody>
        </table></div>
      </div>`;
  }

  function renderEmployeewiseSummary(data){
    const totalHours = data.reduce((s, r) => s + Number(r.total_hours), 0);
    const uniqEmp = new Set(data.map(r => r.employee_code)).size;
    document.getElementById('report-body').innerHTML = `
      <div class="summary-tiles">
        <div class="summary-tile"><div class="label">Employees</div><div class="value">${uniqEmp}</div></div>
        <div class="summary-tile"><div class="label">Rows</div><div class="value">${data.length}</div></div>
        <div class="summary-tile"><div class="label">Total Hours</div><div class="value">${hrs(totalHours)}</div></div>
        <div class="summary-tile"><div class="label">Avg Hours / Employee</div><div class="value">${uniqEmp ? hrs(totalHours / uniqEmp) : '0.00'}</div></div>
      </div>
      <div class="panel no-tabs">
        <div class="table-scroll h-sm"><table class="data-table">
          <thead><tr><th>Employee Code</th><th>Employee Name</th><th>Project Code</th><th>Project Name</th><th>Category</th><th>Client Name</th><th>Billable Hours</th><th>Non-Billable Hours</th><th>Total Hours</th></tr></thead>
          <tbody>${data.map(r => `<tr><td>${r.employee_code}</td><td>${r.full_name}</td><td>${r.project_code}</td><td>${r.project_name}</td><td>${r.category || '—'}</td><td>${r.client_name || '—'}</td><td>${hrs(r.billable_hours)}</td><td>${hrs(r.non_billable_hours)}</td><td><b>${hrs(r.total_hours)}</b></td></tr>`).join('') || emptyRow(9)}</tbody>
        </table></div>
      </div>`;
  }

  function renderProjectProfitability(data){
    const totalRevenue = data.reduce((s, r) => s + Number(r.revenue), 0);
    const totalCost = data.reduce((s, r) => s + Number(r.cost), 0);
    const totalProfit = totalRevenue - totalCost;
    document.getElementById('report-body').innerHTML = `
      <div class="summary-tiles">
        <div class="summary-tile"><div class="label">Projects</div><div class="value">${data.length}</div></div>
        <div class="summary-tile"><div class="label">Total Revenue</div><div class="value">${money(totalRevenue)}</div></div>
        <div class="summary-tile"><div class="label">Total Cost</div><div class="value">${money(totalCost)}</div></div>
        <div class="summary-tile"><div class="label">Total Profit</div><div class="value ${totalProfit >= 0 ? 'profit-pos' : 'profit-neg'}">${money(totalProfit)}</div></div>
      </div>
      <div class="info-banner">${I('info')}<span>Profitability = billable hours × project rate (revenue) minus billable hours × employee cost per hour (gross salary ÷ 160). This is a simplified estimate — adjust the formula in <code>backend/routes/reports.js</code> to match your real costing model.</span></div>
      <div class="panel no-tabs">
        <div class="table-scroll h-sm"><table class="data-table">
          <thead><tr><th>Project Code</th><th>Project Name</th><th>Category</th><th>Client Name</th><th>Billable Hours</th><th>Rate</th><th>Revenue</th><th>Cost</th><th>Profit</th><th>Margin %</th></tr></thead>
          <tbody>${data.map(r => `<tr><td>${r.project_code}</td><td>${r.project_name}</td><td>${r.category || '—'}</td><td>${r.client_name || '—'}</td><td>${hrs(r.billable_hours)}</td><td>${money(r.rate)}</td><td>${money(r.revenue)}</td><td>${money(r.cost)}</td><td style="color:${r.profit >= 0 ? '#16a34a' : '#dc2626'}; font-weight:700;">${money(r.profit)}</td><td>${r.marginPct}%</td></tr>`).join('') || emptyRow(10)}</tbody>
        </table></div>
      </div>`;
  }

  function renderEmployeeProfitability(data){
    const totalRevenue = data.reduce((s, r) => s + Number(r.revenue), 0);
    const totalCost = data.reduce((s, r) => s + Number(r.cost), 0);
    const totalProfit = totalRevenue - totalCost;
    document.getElementById('report-body').innerHTML = `
      <div class="summary-tiles">
        <div class="summary-tile"><div class="label">Employees</div><div class="value">${data.length}</div></div>
        <div class="summary-tile"><div class="label">Total Revenue</div><div class="value">${money(totalRevenue)}</div></div>
        <div class="summary-tile"><div class="label">Total Cost</div><div class="value">${money(totalCost)}</div></div>
        <div class="summary-tile"><div class="label">Total Profit</div><div class="value ${totalProfit >= 0 ? 'profit-pos' : 'profit-neg'}">${money(totalProfit)}</div></div>
      </div>
      <div class="info-banner">${I('info')}<span>Cost per employee is estimated as gross salary ÷ 160 working hours/month. Adjust in <code>backend/routes/reports.js</code> for your real cost basis.</span></div>
      <div class="panel no-tabs">
        <div class="table-scroll h-sm"><table class="data-table">
          <thead><tr><th>Employee Code</th><th>Employee Name</th><th>Billable Hours</th><th>Revenue</th><th>Cost</th><th>Profit</th><th>Margin %</th></tr></thead>
          <tbody>${data.map(r => `<tr><td>${r.employee_code}</td><td>${r.full_name}</td><td>${hrs(r.billable_hours)}</td><td>${money(r.revenue)}</td><td>${money(r.cost)}</td><td style="color:${r.profit >= 0 ? '#16a34a' : '#dc2626'}; font-weight:700;">${money(r.profit)}</td><td>${r.marginPct}%</td></tr>`).join('') || emptyRow(7)}</tbody>
        </table></div>
      </div>`;
  }

  function emptyRow(cols){ return `<tr><td colspan="${cols}" style="text-align:center;color:#9ca3af;padding:28px;">No data available for this month/employee. Try a different month, or run Settings → Migration / add time entries first.</td></tr>`; }

  await renderBody();
})();
