(async () => {
  const shell = await initShell('home');
  if (!shell) return;
  setPageTitle('Home', `Welcome back, ${shell.user.name}!`);

  let employees = [];
  let scopeLabel = 'All';
  try {
    const res = await Api.get('/dashboard/employee-options');
    employees = res.data;
    scopeLabel = res.scopeLabel;
  } catch (err) { /* dropdown will just show the "all" option */ }

  const monthSelect = document.getElementById('home-month-select');
  const now = new Date();
  const months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ value: d.toISOString().slice(0, 7), label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) });
  }
  monthSelect.innerHTML = months.map(m => `<option value="${m.value}">${m.label}</option>`).join('');

  const empSelect = document.getElementById('home-emp-select');
  empSelect.innerHTML = `<option value="all">${scopeLabel === 'My Team' ? 'My Team (All)' : 'All'}</option>` +
    employees.map(e => `<option value="${e.id}">${e.full_name} (${e.employee_code})</option>`).join('');
  empSelect.addEventListener('change', renderDashboard);
  monthSelect.addEventListener('change', renderDashboard);

  function briefcaseIconWhite(){ return '<svg class="icon" viewBox="0 0 24 24" style="color:#fff;"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/></svg>'; }
  function calendarIconWhite(){ return '<svg class="icon" viewBox="0 0 24 24" style="color:#fff;"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>'; }

  async function renderDashboard(){
    const empVal = empSelect.value;
    const monthVal = monthSelect.value;
    const monthLabel = months.find(m => m.value === monthVal)?.label.split(' ')[0] || '';

    document.getElementById('stat-cards').innerHTML = `<div class="skeleton-row" style="grid-column:1/-1;height:80px;"></div>`;
    let data;
    try {
      data = await Api.get(`/dashboard/summary?employeeId=${empVal}&month=${monthVal}`);
    } catch (err) {
      toast(err.message, 'error');
      return;
    }

    document.getElementById('stat-cards').innerHTML = `
      <div class="stat-card"><div class="stat-icon blue">${I('clock')}</div><div class="stat-body"><div class="label">Total Hours</div><div class="value">${hoursToHM(data.totalHours)}</div><div class="sub">Total days in month<br>${data.daysInMonth}</div></div></div>
      <div class="stat-card"><div class="stat-icon green">${briefcaseIconWhite()}</div><div class="stat-body"><div class="label">Total Billable Hours</div><div class="value">${hoursToHM(data.billableHours)}</div><div class="sub">${data.billablePct}% of Total Hours</div></div></div>
      <div class="stat-card"><div class="stat-icon orange">${I('users')}</div><div class="stat-body"><div class="label">Total Non-Billable Hours</div><div class="value">${hoursToHM(data.nonBillableHours)}</div><div class="sub">${data.nonBillablePct}% of Total Hours</div></div></div>
      <div class="stat-card"><div class="stat-icon blue">${calendarIconWhite()}</div><div class="stat-body"><div class="label">Total Days<br>in Month</div><div class="value">${data.daysInMonth}</div><div class="sub">${monthLabel} 1 – ${monthLabel} ${data.daysInMonth}</div></div></div>
    `;

    document.getElementById('donut-slot').innerHTML = `
      <div class="donut-wrap">
        ${donutSVG(data.billablePct, hoursToHM(data.totalHours))}
        <div>
          <div class="legend-item"><span class="legend-dot" style="background:#2563eb;"></span><div><b>Billable Hours</b><span class="pct">${hoursToHM(data.billableHours)} (${data.billablePct}%)</span></div></div>
          <div class="legend-item"><span class="legend-dot" style="background:#f59e0b;"></span><div><b>Non-Billable Hours</b><span class="pct">${hoursToHM(data.nonBillableHours)} (${data.nonBillablePct}%)</span></div></div>
        </div>
      </div>`;
    document.getElementById('trend-slot').innerHTML = trendChartSVG(data.daily, data.daysInMonth, monthLabel);

    const maxBillable = Math.max(1, ...data.topProjects.map(r => Number(r.hours)));
    const maxNonBillable = Math.max(1, ...data.topActivities.map(r => Number(r.hours)));

    let bottomGrid;
    if (empVal === 'all') {
      bottomGrid = `
        <div class="dash-card">
          <h3>Top Billable Projects</h3>
          ${data.topProjects.length ? `<table class="mini-table"><thead><tr><th>Project Name</th><th style="text-align:right;">Billable Hours</th></tr></thead>
          <tbody>${data.topProjects.map(r => `<tr><td>${r.name}</td><td class="num"><span class="bar-track"><span class="bar-fill" style="width:${Math.round(Number(r.hours) / maxBillable * 100)}%"></span></span>${hoursToHM(Number(r.hours))}</td></tr>`).join('')}</tbody></table>`
          : emptyState('No billable hours recorded yet.')}
          <a class="view-link" href="projects.html">View all projects</a>
        </div>
        <div class="dash-card">
          <h3>Top Non-Billable Activities</h3>
          ${data.topActivities.length ? `<table class="mini-table"><thead><tr><th>Activity</th><th style="text-align:right;">Non-Billable Hours</th></tr></thead>
          <tbody>${data.topActivities.map(r => `<tr><td>${r.name}</td><td class="num"><span class="bar-track"><span class="bar-fill" style="width:${Math.round(Number(r.hours) / maxNonBillable * 100)}%; background:#f59e0b;"></span></span>${hoursToHM(Number(r.hours))}</td></tr>`).join('')}</tbody></table>`
          : emptyState('No non-billable activity recorded yet.')}
        </div>
        <div class="dash-card">
          <h3>Employee Movement (This Month)</h3>
          ${donutMiniSVG([{ label: 'New Joinees', value: data.employeeMovement.newJoinees, color: '#16a34a' }, { label: 'Exited Employees', value: data.employeeMovement.exited, color: '#dc2626' }], Math.max(1, data.employeeMovement.newJoinees + data.employeeMovement.exited))}
        </div>`;
    } else {
      const totalB = data.topProjects.reduce((s, r) => s + Number(r.hours), 0);
      const totalNB = data.topActivities.reduce((s, r) => s + Number(r.hours), 0);
      const age = data.ageOfService;
      bottomGrid = `
        <div class="dash-card">
          <h3>Billable Projects Summary</h3>
          ${data.topProjects.length ? `<table class="mini-table"><thead><tr><th>Project Name</th><th style="text-align:right;">Total Hours</th></tr></thead>
          <tbody>${data.topProjects.map(r => `<tr><td>${r.name}</td><td class="num">${hoursToHM(Number(r.hours))}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td>Total</td><td class="num" style="color:var(--blue);">${hoursToHM(totalB)}</td></tr></tfoot></table>` : emptyState('No billable projects yet.')}
        </div>
        <div class="dash-card">
          <h3>Non-Billable Projects Summary</h3>
          ${data.topActivities.length ? `<table class="mini-table"><thead><tr><th>Project Name</th><th style="text-align:right;">Total Hours</th></tr></thead>
          <tbody>${data.topActivities.map(r => `<tr><td>${r.name}</td><td class="num">${hoursToHM(Number(r.hours))}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td>Total</td><td class="num" style="color:var(--blue);">${hoursToHM(totalNB)}</td></tr></tfoot></table>` : emptyState('No non-billable hours yet.')}
        </div>
        <div class="dash-card age-card">
          <div class="age-circle">${I('user')}</div>
          <div class="age-val">${age ? `${age.years} Years ${age.months} Months ${age.days} Days` : '—'}</div>
          <div class="since">${age ? 'Since ' + fmtDate(age.joinDate) : ''}</div>
          <hr>
          <div class="join-label">Join Date</div>
          <div class="join-date">${age ? fmtDate(age.joinDate) : '—'}</div>
        </div>`;
    }
    document.getElementById('bottom-grid').innerHTML = bottomGrid;
  }

  function emptyState(msg){
    return `<div class="empty-state" style="padding:24px 10px;">${I('bar')}<div>${msg}</div></div>`;
  }

  await renderDashboard();
})();
