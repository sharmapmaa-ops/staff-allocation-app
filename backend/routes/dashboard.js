const express = require('express');
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { getTeamScope } = require('../utils/helpers');

const router = express.Router();
router.use(requireAuth);

// GET /api/dashboard/employee-options
// Returns the employees a logged-in user is allowed to pick in dropdowns:
// Admins get everyone; non-admins (managers) get themself + direct reports.
router.get('/employee-options', async (req, res) => {
  try {
    const teamIds = await getTeamScope(query, req.user);
    let rows;
    if (teamIds === null) {
      const r = await query('SELECT id, employee_code, full_name FROM employees ORDER BY full_name ASC');
      rows = r.rows;
    } else if (teamIds.length === 0) {
      rows = [];
    } else {
      const r = await query('SELECT id, employee_code, full_name FROM employees WHERE id = ANY($1::int[]) ORDER BY full_name ASC', [teamIds]);
      rows = r.rows;
    }
    res.json({ data: rows, scopeLabel: teamIds === null ? 'All' : 'My Team' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load employee options.' });
  }
});

// GET /api/dashboard/summary?employeeId=all|<id>&month=YYYY-MM
router.get('/summary', async (req, res) => {
  const { month } = req.query;
  let { employeeId = 'all' } = req.query;
  const monthStart = month ? `${month}-01` : new Date().toISOString().slice(0, 7) + '-01';

  try {
    const teamIds = await getTeamScope(query, req.user);

    // Non-admins can only ever see their own team's data - "all" for them
    // means "my whole team combined", and any specific id they ask for
    // must be inside that team (otherwise they get an empty result).
    let restrictToIds = null;
    if (teamIds !== null) {
      if (employeeId === 'all') {
        restrictToIds = teamIds;
      } else if (!teamIds.includes(Number(employeeId))) {
        return res.status(403).json({ error: "You can only view your own team's data." });
      }
    }

    let empFilter = '';
    const params = [monthStart];
    let paramIndex = 2;
    if (employeeId !== 'all') {
      empFilter = `AND te.employee_id = $${paramIndex}`;
      params.push(employeeId);
      paramIndex++;
    } else if (restrictToIds !== null) {
      empFilter = `AND te.employee_id = ANY($${paramIndex}::int[])`;
      params.push(restrictToIds.length ? restrictToIds : [-1]);
      paramIndex++;
    }

    const totalsRes = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN te.billable THEN te.hours ELSE 0 END),0) AS billable,
        COALESCE(SUM(CASE WHEN NOT te.billable THEN te.hours ELSE 0 END),0) AS non_billable
      FROM time_entries te
      WHERE date_trunc('month', te.work_date) = date_trunc('month', $1::date) ${empFilter}
    `, params);
    const billable = Number(totalsRes.rows[0].billable) || 0;
    const nonBillable = Number(totalsRes.rows[0].non_billable) || 0;
    const total = billable + nonBillable;

    const dailyRes = await query(`
      SELECT te.work_date::date AS d,
             COALESCE(SUM(CASE WHEN te.billable THEN te.hours ELSE 0 END),0) AS billable,
             COALESCE(SUM(CASE WHEN NOT te.billable THEN te.hours ELSE 0 END),0) AS non_billable
      FROM time_entries te
      WHERE date_trunc('month', te.work_date) = date_trunc('month', $1::date) ${empFilter}
      GROUP BY d ORDER BY d
    `, params);

    const topProjRes = await query(`
      SELECT p.project_name AS name, SUM(CASE WHEN te.billable THEN te.hours ELSE 0 END) AS hours
      FROM time_entries te JOIN projects p ON p.id = te.project_id
      WHERE date_trunc('month', te.work_date) = date_trunc('month', $1::date) ${empFilter} AND te.billable = TRUE
      GROUP BY p.project_name ORDER BY hours DESC LIMIT 5
    `, params);

    const topActivityRes = await query(`
      SELECT p.project_name AS name, SUM(CASE WHEN NOT te.billable THEN te.hours ELSE 0 END) AS hours
      FROM time_entries te JOIN projects p ON p.id = te.project_id
      WHERE date_trunc('month', te.work_date) = date_trunc('month', $1::date) ${empFilter} AND te.billable = FALSE
      GROUP BY p.project_name ORDER BY hours DESC LIMIT 5
    `, params);

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
      let movementWhere = '';
      const movementParams = [monthStart];
      if (restrictToIds !== null) {
        movementWhere = 'AND id = ANY($2::int[])';
        movementParams.push(restrictToIds.length ? restrictToIds : [-1]);
      }
      const movementRes = await query(`
        SELECT
          (SELECT COUNT(*) FROM employees WHERE date_trunc('month', joining_date) = date_trunc('month', $1::date) ${movementWhere}) AS new_joinees,
          (SELECT COUNT(*) FROM employees WHERE exit_date IS NOT NULL AND date_trunc('month', exit_date) = date_trunc('month', $1::date) ${movementWhere}) AS exited
      `, movementParams);
      payload.employeeMovement = {
        newJoinees: Number(movementRes.rows[0].new_joinees) || 0,
        exited: Number(movementRes.rows[0].exited) || 0,
      };
    } else {
      const empRes = await query(`SELECT joining_date FROM employees WHERE id=$1`, [employeeId]);
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
