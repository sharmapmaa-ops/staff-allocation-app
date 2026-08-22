(async () => {
  const shell = await initShell('time-entry');
  if (!shell) return;
  setPageTitle('Time Entry', '');

  document.getElementById('prev-week-btn').innerHTML = I('arrowLeft') + ' Previous Week';
  document.getElementById('next-week-btn').innerHTML = 'Next Week ' + I('arrowRight');
  document.getElementById('add-row-btn').innerHTML = I('plus') + ' Add Row';
  document.getElementById('delete-rows-btn').innerHTML = I('trash') + ' Delete Row(s)';
  document.getElementById('save-btn').innerHTML = I('save') + ' Save Timesheet';
  document.getElementById('te-note').innerHTML = I('info') + '<span><b>Note:</b> Please review all time entries before saving. Nothing is saved until you click "Save Timesheet".</span>';

  const employeeId = shell.user.employeeId;
  if (!employeeId) {
    document.getElementById('content').innerHTML = `<div class="empty-state">${I('clock')}<div>Your account is not linked to an employee record yet, so a personal timesheet isn't available.<br>Please ask your administrator to link your login to an employee profile.</div></div>`;
    return;
  }

  let projects = [];
  try { projects = (await Api.get('/projects')).data; } catch (err) { toast(err.message, 'error'); }

  let weekOffset = 0; // 0 = current week
  let rows = []; // { projectId, comments, hoursByDate: {date: hours} }

  function getWeekRange(offset){
    const now = new Date();
    const day = now.getDay(); // 0=Sun..6=Sat
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now); monday.setDate(now.getDate() + diffToMonday + offset * 7);
    const days = [];
    for (let i = 0; i < 7; i++) { const d = new Date(monday); d.setDate(monday.getDate() + i); days.push(d); }
    return days;
  }
  function isoDate(d){ return d.toISOString().slice(0, 10); }
  function dayLabel(d){ return d.toLocaleDateString('en-US', { weekday: 'short' }) + '\n' + d.getDate() + ' ' + d.toLocaleDateString('en-US', { month: 'short' }); }

  async function loadWeek(){
    const days = getWeekRange(weekOffset);
    const weekStart = isoDate(days[0]), weekEnd = isoDate(days[6]);
    document.getElementById('week-range').textContent =
      `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    let entries = [];
    try {
      const res = await Api.get(`/time-entries?employeeId=${employeeId}&weekStart=${weekStart}&weekEnd=${weekEnd}`);
      entries = res.data;
    } catch (err) { toast(err.message, 'error'); }

    const byProject = {};
    entries.forEach(e => {
      if (!byProject[e.project_id]) byProject[e.project_id] = { projectId: e.project_id, comments: e.comments || '', hoursByDate: {} };
      byProject[e.project_id].hoursByDate[e.work_date.slice(0, 10)] = Number(e.hours);
      if (e.comments) byProject[e.project_id].comments = e.comments;
    });
    rows = Object.values(byProject);
    if (rows.length === 0) rows = [{ projectId: projects[0]?.id, comments: '', hoursByDate: {} }];

    renderTable(days);
  }

  function renderTable(days){
    document.getElementById('te-head-row').innerHTML = `
      <th style="width:36px;"><input type="checkbox" id="te-check-all"></th>
      <th>Project <span style="color:#dc2626;">*</span></th>
      <th>Comments</th>
      ${days.map(d => { const [dn, dd] = dayLabel(d).split('\n'); return `<th>${dn}<br><span style="font-weight:400;color:#6b7280;">${dd}</span></th>`; }).join('')}
      <th>Total Hours</th>`;

    document.getElementById('te-tbody').innerHTML = rows.map((row, ri) => `
      <tr data-row="${ri}">
        <td><input type="checkbox" class="te-row-check" data-row="${ri}"></td>
        <td><select class="proj-select" data-row="${ri}">
          ${projects.map(p => `<option value="${p.id}" ${p.id === row.projectId ? 'selected' : ''}>${p.project_name}</option>`).join('')}
        </select></td>
        <td><input class="comment-input" data-row="${ri}" value="${row.comments || ''}"></td>
        ${days.map(d => {
          const key = isoDate(d);
          const val = row.hoursByDate[key];
          const weekendClass = (d.getDay() === 0 || d.getDay() === 6) ? 'weekend' : '';
          return `<td class="${weekendClass}"><input class="time-input" data-row="${ri}" data-date="${key}" value="${val ? hoursToHM(val) : '--:--'}"></td>`;
        }).join('')}
        <td class="row-total" id="row-total-${ri}" style="font-weight:700;">${hoursToHM(rowTotal(row))}</td>
      </tr>`).join('');

    document.getElementById('te-foot-row').innerHTML = `
      <td></td><td>Total</td><td></td>
      ${days.map(d => `<td id="col-total-${isoDate(d)}">${hoursToHM(colTotal(isoDate(d)))}</td>`).join('')}
      <td id="grand-total">${hoursToHM(grandTotal())}</td>`;

    attachRowEvents(days);
  }

  function rowTotal(row){ return Object.values(row.hoursByDate).reduce((a, b) => a + (b || 0), 0); }
  function colTotal(dateKey){ return rows.reduce((s, r) => s + (r.hoursByDate[dateKey] || 0), 0); }
  function grandTotal(){ return rows.reduce((s, r) => s + rowTotal(r), 0); }

  function parseHM(str){
    str = str.trim();
    if (!str || str === '--:--') return 0;
    if (str.includes(':')) { const [h, m] = str.split(':').map(Number); return (h || 0) + ((m || 0) / 60); }
    const n = parseFloat(str); return isNaN(n) ? 0 : n;
  }

  function attachRowEvents(days){
    document.querySelectorAll('.proj-select').forEach(sel => {
      sel.addEventListener('change', () => { rows[sel.dataset.row].projectId = Number(sel.value); });
    });
    document.querySelectorAll('.comment-input').forEach(inp => {
      inp.addEventListener('input', () => { rows[inp.dataset.row].comments = inp.value; });
    });
    document.querySelectorAll('.time-input').forEach(inp => {
      inp.addEventListener('focus', () => { if (inp.value === '--:--') inp.value = ''; });
      inp.addEventListener('blur', () => {
        const val = parseHM(inp.value);
        const ri = inp.dataset.row, date = inp.dataset.date;
        if (val > 0) rows[ri].hoursByDate[date] = val; else delete rows[ri].hoursByDate[date];
        inp.value = val ? hoursToHM(val) : '--:--';
        document.getElementById(`row-total-${ri}`).textContent = hoursToHM(rowTotal(rows[ri]));
        days.forEach(d => { const key = isoDate(d); const el = document.getElementById(`col-total-${key}`); if (el) el.textContent = hoursToHM(colTotal(key)); });
        document.getElementById('grand-total').textContent = hoursToHM(grandTotal());
      });
    });
    document.getElementById('te-check-all').addEventListener('click', (e) => {
      document.querySelectorAll('.te-row-check').forEach(c => c.checked = e.target.checked);
    });
  }

  document.getElementById('prev-week-btn').addEventListener('click', () => { weekOffset--; loadWeek(); });
  document.getElementById('next-week-btn').addEventListener('click', () => { weekOffset++; loadWeek(); });

  document.getElementById('add-row-btn').addEventListener('click', () => {
    rows.push({ projectId: projects[0]?.id, comments: '', hoursByDate: {} });
    loadWeek.days ? renderTable(loadWeek.days) : renderTable(getWeekRange(weekOffset));
  });

  document.getElementById('delete-rows-btn').addEventListener('click', () => {
    const checked = [...document.querySelectorAll('.te-row-check:checked')].map(c => Number(c.dataset.row));
    if (!checked.length) { toast('Please select at least one row to delete.', 'error'); return; }
    if (!confirmAction(`Delete ${checked.length} selected row(s)?`)) return;
    rows = rows.filter((_, i) => !checked.includes(i));
    renderTable(getWeekRange(weekOffset));
    toast('Row(s) removed. Click Save Timesheet to persist changes.', 'success');
  });

  document.getElementById('save-btn').addEventListener('click', async () => {
    const days = getWeekRange(weekOffset);
    const weekStart = isoDate(days[0]), weekEnd = isoDate(days[6]);
    const btn = document.getElementById('save-btn');
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving...';
    try {
      await Api.post('/time-entries/bulk', {
        employeeId, weekStart, weekEnd,
        rows: rows.filter(r => r.projectId).map(r => ({ projectId: r.projectId, comments: r.comments, billable: true, hoursByDate: r.hoursByDate })),
      });
      toast('Timesheet saved successfully.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false; btn.innerHTML = original;
    }
  });

  await loadWeek();
})();

function hoursToHM(hoursFloat){
  const h = Math.floor(hoursFloat), m = Math.round((hoursFloat - h) * 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
