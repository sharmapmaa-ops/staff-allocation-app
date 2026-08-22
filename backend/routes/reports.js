const express = require('express');
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// NOTE ON PROFITABILITY FORMULA (documented assumption, adjust as needed):
//   revenue      = SUM(billable hours * project.rate)
//   employee cost per hour = employee.gross_salary / 160  (approx. working hours per month)
//   cost         = SUM(billable hours * employee cost per hour)
//   profit       = revenue - cost
//   margin %     = profit / revenue * 100  (0 when revenue is 0)

// GET /api/reports/monthwise-project-summary
router.get('/monthwise-project-summary', async (req, res) => {
  try {
    const result = await query(`
      SELECT to_char(date_trunc('month', te.work_date), 'YYYY-MM') AS month,
             p.project_code, p.project_name,
             SUM(CASE WHEN te.billable THEN te.hours ELSE 0 END) AS billable_hours,
             SUM(CASE WHEN NOT te.billable THEN te.hours ELSE 0 END) AS non_billable_hours,
             SUM(te.hours) AS total_hours
      FROM time_entries te
      JOIN projects p ON p.id = te.project_id
      GROUP BY month, p.project_code, p.project_name
      ORDER BY month DESC, p.project_name ASC
    `);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not generate monthwise project summary.' });
  }
});

// GET /api/reports/employeewise-project-summary
router.get('/employeewise-project-summary', async (req, res) => {
  try {
    const result = await query(`
      SELECT e.employee_code, e.full_name, p.project_code, p.project_name,
             SUM(CASE WHEN te.billable THEN te.hours ELSE 0 END) AS billable_hours,
             SUM(CASE WHEN NOT te.billable THEN te.hours ELSE 0 END) AS non_billable_hours,
             SUM(te.hours) AS total_hours
      FROM time_entries te
      JOIN employees e ON e.id = te.employee_id
      JOIN projects p ON p.id = te.project_id
      GROUP BY e.employee_code, e.full_name, p.project_code, p.project_name
      ORDER BY e.full_name ASC, p.project_name ASC
    `);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not generate employee-wise project summary.' });
  }
});

// GET /api/reports/projectwise-profitability
router.get('/projectwise-profitability', async (req, res) => {
  try {
    const result = await query(`
      SELECT p.project_code, p.project_name, p.currency, p.rate,
             COALESCE(SUM(CASE WHEN te.billable THEN te.hours ELSE 0 END), 0) AS billable_hours,
             COALESCE(SUM(CASE WHEN te.billable THEN te.hours ELSE 0 END) * p.rate, 0) AS revenue,
             COALESCE(SUM(CASE WHEN te.billable THEN te.hours * (e.gross_salary / 160.0) ELSE 0 END), 0) AS cost
      FROM projects p
      LEFT JOIN time_entries te ON te.project_id = p.id
      LEFT JOIN employees e ON e.id = te.employee_id
      GROUP BY p.id, p.project_code, p.project_name, p.currency, p.rate
      ORDER BY p.project_name ASC
    `);
    const data = result.rows.map((r) => {
      const revenue = Number(r.revenue) || 0;
      const cost = Number(r.cost) || 0;
      const profit = revenue - cost;
      return {
        ...r,
        revenue,
        cost,
        profit,
        marginPct: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0,
      };
    });
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not generate project-wise profitability.' });
  }
});

// GET /api/reports/employeewise-profitability
router.get('/employeewise-profitability', async (req, res) => {
  try {
    const result = await query(`
      SELECT e.employee_code, e.full_name, e.gross_salary,
             COALESCE(SUM(CASE WHEN te.billable THEN te.hours ELSE 0 END), 0) AS billable_hours,
             COALESCE(SUM(CASE WHEN te.billable THEN te.hours * p.rate ELSE 0 END), 0) AS revenue,
             COALESCE(SUM(CASE WHEN te.billable THEN te.hours * (e.gross_salary / 160.0) ELSE 0 END), 0) AS cost
      FROM employees e
      LEFT JOIN time_entries te ON te.employee_id = e.id
      LEFT JOIN projects p ON p.id = te.project_id
      GROUP BY e.id, e.employee_code, e.full_name, e.gross_salary
      ORDER BY e.full_name ASC
    `);
    const data = result.rows.map((r) => {
      const revenue = Number(r.revenue) || 0;
      const cost = Number(r.cost) || 0;
      const profit = revenue - cost;
      return {
        ...r,
        revenue,
        cost,
        profit,
        marginPct: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0,
      };
    });
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not generate employee-wise profitability.' });
  }
});

module.exports = router;
