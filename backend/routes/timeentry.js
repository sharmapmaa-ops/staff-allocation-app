const express = require('express');
const { query, pool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

async function employeeInWorkspace(employeeId, workspaceId) {
  const res = await query('SELECT 1 FROM employees WHERE id=$1 AND workspace_id=$2', [employeeId, workspaceId]);
  return res.rows.length > 0;
}

// GET /api/time-entries?employeeId=&weekStart=YYYY-MM-DD&weekEnd=YYYY-MM-DD
router.get('/', async (req, res) => {
  const { employeeId, weekStart, weekEnd } = req.query;
  if (!employeeId || !weekStart || !weekEnd) {
    return res.status(400).json({ error: 'employeeId, weekStart and weekEnd are required.' });
  }
  if (!(await employeeInWorkspace(employeeId, req.user.workspaceId))) {
    return res.status(403).json({ error: 'That employee is not part of your workspace.' });
  }
  try {
    const result = await query(
      `SELECT te.*, p.project_name FROM time_entries te
       JOIN projects p ON p.id = te.project_id
       WHERE te.employee_id=$1 AND te.work_date BETWEEN $2 AND $3
       ORDER BY p.project_name, te.work_date`,
      [employeeId, weekStart, weekEnd]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load time entries.' });
  }
});

// POST /api/time-entries/bulk  { employeeId, weekStart, weekEnd, rows: [{ projectId, comments, hoursByDate: {date: hours} }] }
router.post('/bulk', async (req, res) => {
  const { employeeId, weekStart, weekEnd, rows } = req.body;
  if (!employeeId || !weekStart || !weekEnd || !Array.isArray(rows)) {
    return res.status(400).json({ error: 'employeeId, weekStart, weekEnd and rows[] are required.' });
  }
  if (!(await employeeInWorkspace(employeeId, req.user.workspaceId))) {
    return res.status(403).json({ error: 'That employee is not part of your workspace.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM time_entries WHERE employee_id=$1 AND work_date BETWEEN $2 AND $3`,
      [employeeId, weekStart, weekEnd]
    );
    for (const row of rows) {
      for (const [date, hours] of Object.entries(row.hoursByDate || {})) {
        if (!hours || Number(hours) <= 0) continue;
        await client.query(
          `INSERT INTO time_entries (employee_id, project_id, work_date, hours, billable, comments)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [employeeId, row.projectId, date, hours, row.billable !== false, row.comments || '']
        );
      }
    }
    await client.query('COMMIT');
    res.json({ message: 'Timesheet saved successfully.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Could not save timesheet.' });
  } finally {
    client.release();
  }
});

module.exports = router;
