const express = require('express');
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { getTeamScope } = require('../utils/helpers');

const router = express.Router();
router.use(requireAuth);

// GET /api/dashboard/employee-options
// Returns the employees a logged-in user is allowed to pick in dropdowns:
// Admins get everyone in THIS workspace; non-admins (managers) get
// themself + direct reports, also scoped to this workspace.
router.get('/employee-options', async (req, res) => {
  try {
    const teamIds = await getTeamScope(query, req.user);
    let rows;
    if (teamIds === null) {
      const r = await query('SELECT id, employee_code, full_name FROM employees WHERE workspace_id=$1 ORDER BY full_name ASC', [req.user.workspaceId]);
      rows = r.rows;
    } else if (teamIds.length === 0) {
      rows = [];
    } else {
      const r = await query('SELECT id, employee_code, full_name FROM employees WHERE workspace_id=$1 AND id = ANY($2::int[]) ORDER BY full_name ASC', [req.user.workspaceId, teamIds]);
      rows = r.rows;
    }
    res.json({ data: rows, scopeLabel: teamIds === null ? 'All' : 'My Team' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load employee options.' });
  }
});

// GET /api/dashboard/summary?employeeId=all|<id>&month=YYYY-MM
// Every query here joins employees on workspace_id so that, regardless of
// role, data from other companies (workspaces) using this same system can
// never appear - "all" always means "all within my own workspace".
router.get('/summary', async (req, res) => {
  const { month } = req.query;
  let { employeeId = 'all' } = req.query;
  const monthStart = month ? `${month}-01` : new Date().toISOString().slice(0, 7) + '-01';
  const workspaceId = req.user.workspaceId;

  try {
    const teamIds = await getTeamScope(query, req.user);

    let restrictToIds = null;
    if (teamIds !== null) {
      if (employeeId === 'all') {
        restrictToIds = teamIds;
      } else if (!teamIds.includes(Number(employeeId))) {
        return res.status(403).json({ error: "You can only view your own team's data." });
      }
    }

    let empFilter = '';
    const params = [monthStart, workspaceId];
    let paramIndex = 3;
    if (employeeId !== 'all') {
      empFilter = `AND te.employee_id = $${paramIndex}`;
      params.push(employeeId);
      paramIndex++;
    } else if (restrictToIds !== null) {
      empFilter = `AND te.employee_id = ANY($${paramIndex}::int[])`;
      params.push(restrictToIds.length ? restrictToIds : [-1]);
      paramIndex++;
    }

    // Run these 4 independent queries in parallel instead of one-by-one -
    // each network round-trip to the database adds latency, so this alone
    // can cut this endpoint's response time by roughly 3-4x.
    const [totalsRes, dailyRes, topProjRes, topActivityRes] = await Promise.all([
      query(`
        SELECT
          COALESCE(SUM(CASE WHEN te.billable THEN te.hours ELSE 0 END),0) AS billable,
          COALESCE(SUM(CASE WHEN NOT te.billable THEN te.hours ELSE 0 END),0) AS non_billable
        FROM time_entries te
        JOIN employees emp ON emp.id = te.employee_id AND emp.workspace_id = $2
        WHERE date_trunc('month', te.work_date) = date_trunc('month', $1::date) ${empFilter}
      `, params),
      query(`
        SELECT te.work_date::date AS d,
               COALESCE(SUM(CASE WHEN te.billable THEN te.hours ELSE 0 END),0) AS billable,
               COALESCE(SUM(CASE WHEN NOT te.billable THEN te.hours ELSE 0 END),0) AS non_billable
        FROM time_entries te
        JOIN employees emp ON emp.id = te.employee_id AND emp.workspace_id = $2
        WHERE date_trunc('month', te.work_date) = date_trunc('month', $1::date) ${empFilter}
        GROUP BY d ORDER BY d
      `, params),
      query(`
        SELECT p.project_name AS name, SUM(CASE WHEN te.billable THEN te.hours ELSE 0 END) AS hours
        FROM time_entries te
        JOIN projects p ON p.id = te.project_id AND p.workspace_id = $2
        JOIN employees emp ON emp.id = te.employee_id AND emp.workspace_id = $2
        WHERE date_trunc('month', te.work_date) = date_trunc('month', $1::date) ${empFilter} AND te.billable = TRUE
        GROUP BY p.project_name ORDER BY hours DESC LIMIT 5
      `, params),
      query(`
        SELECT p.project_name AS name, SUM(CASE WHEN NOT te.billable THEN te.hours ELSE 0 END) AS hours
        FROM time_entries te
        JOIN projects p ON p.id = te.project_id AND p.workspace_id = $2
        JOIN employees emp ON emp.id = te.employee_id AND emp.workspace_id = $2
        WHERE date_trunc('month', te.work_date) = date_trunc('month', $1::date) ${empFilter} AND te.billable = FALSE
        GROUP BY p.project_name ORDER BY hours DESC LIMIT 5
      `, params),
    ]);
    const billable = Number(totalsRes.rows[0].billable) || 0;
    const nonBillable = Number(totalsRes.rows[0].non_billable) || 0;
    const total = billable + nonBillable;

    const daysInMonth = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0).getDate();

    const payload = {
      totalHours: total,
      billableHours: billable,
      nonBillableHours: nonBillable,
      billablePct: total > 0 ? Math.round((billable / total) * 1000) / 10 : 0,
      nonBillablePct: total > 0 ? Math.round((nonBillable / total) * 1000) / 10 : 0,
      daysInMonth,
      daily: dailyRes.rows,
      topProjects: topProjRes.rows,
      topActivities: topActivityRes.rows,
    };

    if (employeeId === 'all') {
      const movementConditions = [`workspace_id = $2`];
      const movementParams = [monthStart, workspaceId];
      if (restrictToIds !== null) {
        movementConditions.push(`id = ANY($3::int[])`);
        movementParams.push(restrictToIds.length ? restrictToIds : [-1]);
      }
      const movementWhere = movementConditions.join(' AND ');
      const movementRes = await query(`
        SELECT
          (SELECT COUNT(*) FROM employees WHERE date_trunc('month', joining_date) = date_trunc('month', $1::date) AND ${movementWhere}) AS new_joinees,
          (SELECT COUNT(*) FROM employees WHERE exit_date IS NOT NULL AND date_trunc('month', exit_date) = date_trunc('month', $1::date) AND ${movementWhere}) AS exited
      `, movementParams);
      payload.employeeMovement = {
        newJoinees: Number(movementRes.rows[0].new_joinees) || 0,
        exited: Number(movementRes.rows[0].exited) || 0,
      };
    } else {
      const empRes = await query(`SELECT joining_date FROM employees WHERE id=$1 AND workspace_id=$2`, [employeeId, workspaceId]);
      if (empRes.rows.length && empRes.rows[0].joining_date) {
        const join = new Date(empRes.rows[0].joining_date);
        const now = new Date();
        let years = now.getFullYear() - join.getFullYear();
        let months = now.getMonth() - join.getMonth();
        let days = now.getDate() - join.getDate();
        if (days < 0) { months -= 1; days += 30; }
        if (months < 0) { years -= 1; months += 12; }
        payload.ageOfService = { years, months, days, joinDate: empRes.rows[0].joining_date };
      }
    }

    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load dashboard summary.' });
  }
});

module.exports = router;
