const express = require('express');
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { getTeamScope } = require('../utils/helpers');

const router = express.Router();
router.use(requireAuth);

// NOTE ON PROFITABILITY FORMULA (documented assumption, adjust as needed):
//   revenue      = SUM(billable hours * project.rate)
//   employee cost per hour = employee.gross_salary / 160  (approx. working hours per month)
//   cost         = SUM(billable hours * employee cost per hour)
//   profit       = revenue - cost
//   margin %     = profit / revenue * 100  (0 when revenue is 0)

// Resolves the effective employee-id filter for a report request, enforcing
// that non-admins (managers) can only ever query their own team's data.
async function resolveScope(req, employeeIdParam) {
  const teamIds = await getTeamScope(query, req.user);
  if (teamIds === null) {
    // Admin: no restriction, but may still filter to one specific employee.
    return { restrictedIds: employeeIdParam && employeeIdParam !== 'all' ? [Number(employeeIdParam)] : null, forbidden: false };
  }
  if (employeeIdParam && employeeIdParam !== 'all') {
    if (!teamIds.includes(Number(employeeIdParam))) return { restrictedIds: null, forbidden: true };
    return { restrictedIds: [Number(employeeIdParam)], forbidden: false };
  }
  return { restrictedIds: teamIds.length ? teamIds : [-1], forbidden: false };
}

// GET /api/reports/monthwise-project-summary?month=YYYY-MM&employeeId=all|<id>
router.get('/monthwise-project-summary', async (req, res) => {
  try {
    const { restrictedIds, forbidden } = await resolveScope(req, req.query.employeeId);
    if (forbidden) return res.status(403).json({ error: "You can only view your own team's data." });

    const conditions = [];
    const params = [];
    let i = 1;
    if (req.query.month) { conditions.push(`date_trunc('month', te.work_date) = date_trunc('month', $${i}::date)`); params.push(`${req.query.month}-01`); i++; }
    if (restrictedIds) { conditions.push(`te.employee_id = ANY($${i}::int[])`); params.push(restrictedIds); i++; }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(`
      SELECT to_char(date_trunc('month', te.work_date), 'YYYY-MM') AS month,
             p.project_code, p.project_name, p.category, p.client_name,
             SUM(CASE WHEN te.billable THEN te.hours ELSE 0 END) AS billable_hours,
             SUM(CASE WHEN NOT te.billable THEN te.hours ELSE 0 END) AS non_billable_hours,
             SUM(te.hours) AS total_hours
      FROM time_entries te
      JOIN projects p ON p.id = te.project_id
      ${where}
      GROUP BY month, p.project_code, p.project_name, p.category, p.client_name
      ORDER BY month DESC, p.project_name ASC
    `, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not generate monthwise project summary.' });
  }
});

// GET /api/reports/employeewise-project-summary?month=YYYY-MM&employeeId=all|<id>
router.get('/employeewise-project-summary', async (req, res) => {
  try {
    const { restrictedIds, forbidden } = await resolveScope(req, req.query.employeeId);
    if (forbidden) return res.status(403).json({ error: "You can only view your own team's data." });

    const conditions = [];
    const params = [];
    let i = 1;
    if (req.query.month) { conditions.push(`date_trunc('month', te.work_date) = date_trunc('month', $${i}::date)`); params.push(`${req.query.month}-01`); i++; }
    if (restrictedIds) { conditions.push(`te.employee_id = ANY($${i}::int[])`); params.push(restrictedIds); i++; }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(`
      SELECT e.employee_code, e.full_name, p.project_code, p.project_name, p.category, p.client_name,
             SUM(CASE WHEN te.billable THEN te.hours ELSE 0 END) AS billable_hours,
             SUM(CASE WHEN NOT te.billable THEN te.hours ELSE 0 END) AS non_billable_hours,
             SUM(te.hours) AS total_hours
      FROM time_entries te
      JOIN employees e ON e.id = te.employee_id
      JOIN projects p ON p.id = te.project_id
      ${where}
      GROUP BY e.employee_code, e.full_name, p.project_code, p.project_name, p.category, p.client_name
      ORDER BY e.full_name ASC, p.project_name ASC
    `, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not generate employee-wise project summary.' });
  }
});

// GET /api/reports/projectwise-profitability?month=YYYY-MM&employeeId=all|<id>
router.get('/projectwise-profitability', async (req, res) => {
  try {
    const { restrictedIds, forbidden } = await resolveScope(req, req.query.employeeId);
    if (forbidden) return res.status(403).json({ error: "You can only view your own team's data." });

    const teConditions = [];
    const params = [];
    let i = 1;
    if (req.query.month) { teConditions.push(`date_trunc('month', te.work_date) = date_trunc('month', $${i}::date)`); params.push(`${req.query.month}-01`); i++; }
    if (restrictedIds) { teConditions.push(`te.employee_id = ANY($${i}::int[])`); params.push(restrictedIds); i++; }
    const teWhere = teConditions.length ? `AND ${teConditions.join(' AND ')}` : '';

    const result = await query(`
      SELECT p.project_code, p.project_name, p.category, p.client_name, p.currency, p.rate,
             COALESCE(SUM(CASE WHEN te.billable ${teWhere} THEN te.hours ELSE 0 END), 0) AS billable_hours,
             COALESCE(SUM(CASE WHEN te.billable ${teWhere} THEN te.hours ELSE 0 END) * p.rate, 0) AS revenue,
             COALESCE(SUM(CASE WHEN te.billable ${teWhere} THEN te.hours * (e.gross_salary / 160.0) ELSE 0 END), 0) AS cost
      FROM projects p
      LEFT JOIN time_entries te ON te.project_id = p.id
      LEFT JOIN employees e ON e.id = te.employee_id
      GROUP BY p.id, p.project_code, p.project_name, p.category, p.client_name, p.currency, p.rate
      ORDER BY p.project_name ASC
    `, params);
    const data = result.rows.map((r) => {
      const revenue = Number(r.revenue) || 0;
      const cost = Number(r.cost) || 0;
      const profit = revenue - cost;
      return { ...r, revenue, cost, profit, marginPct: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0 };
    });
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not generate project-wise profitability.' });
  }
});

// GET /api/reports/employeewise-profitability?month=YYYY-MM&employeeId=all|<id>
router.get('/employeewise-profitability', async (req, res) => {
  try {
    const { restrictedIds, forbidden } = await resolveScope(req, req.query.employeeId);
    if (forbidden) return res.status(403).json({ error: "You can only view your own team's data." });

    const teConditions = [];
    const params = [];
    let i = 1;
    if (req.query.month) { teConditions.push(`date_trunc('month', te.work_date) = date_trunc('month', $${i}::date)`); params.push(`${req.query.month}-01`); i++; }
    const teWhere = teConditions.length ? `AND ${teConditions.join(' AND ')}` : '';

    let empWhere = '';
    if (restrictedIds) { empWhere = `WHERE e.id = ANY($${i}::int[])`; params.push(restrictedIds); i++; }

    const result = await query(`
      SELECT e.employee_code, e.full_name, e.gross_salary,
             COALESCE(SUM(CASE WHEN te.billable ${teWhere} THEN te.hours ELSE 0 END), 0) AS billable_hours,
             COALESCE(SUM(CASE WHEN te.billable ${teWhere} THEN te.hours * p.rate ELSE 0 END), 0) AS revenue,
             COALESCE(SUM(CASE WHEN te.billable ${teWhere} THEN te.hours * (e.gross_salary / 160.0) ELSE 0 END), 0) AS cost
      FROM employees e
      LEFT JOIN time_entries te ON te.employee_id = e.id
      LEFT JOIN projects p ON p.id = te.project_id
      ${empWhere}
      GROUP BY e.id, e.employee_code, e.full_name, e.gross_salary
      ORDER BY e.full_name ASC
    `, params);
    const data = result.rows.map((r) => {
      const revenue = Number(r.revenue) || 0;
      const cost = Number(r.cost) || 0;
      const profit = revenue - cost;
      return { ...r, revenue, cost, profit, marginPct: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0 };
    });
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not generate employee-wise profitability.' });
  }
});

module.exports = router;
