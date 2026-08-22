const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { nextCode, getTeamScope } = require('../utils/helpers');

const router = express.Router();
router.use(requireAuth);

// GET /api/employees?search=&payroll=&location=&status=&page=&perPage=&scope=team
router.get('/', async (req, res) => {
  const { search = '', payroll = '', location = '', status = '', page = 1, perPage = 10, scope = '' } = req.query;
  const conditions = ['workspace_id = $1'];
  const params = [req.user.workspaceId];
  let i = 2;
  if (search) { conditions.push(`(full_name ILIKE $${i} OR employee_code ILIKE $${i})`); params.push(`%${search}%`); i++; }
  if (payroll) { conditions.push(`payroll_type = $${i}`); params.push(payroll); i++; }
  if (location) { conditions.push(`location = $${i}`); params.push(location); i++; }
  if (status) { conditions.push(`status = $${i}`); params.push(status); i++; }

  if (scope === 'team') {
    const teamIds = await getTeamScope(query, req.user);
    if (teamIds !== null) {
      conditions.push(`id = ANY($${i}::int[])`);
      params.push(teamIds.length ? teamIds : [-1]);
      i++;
    }
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  try {
    const countRes = await query(`SELECT COUNT(*)::int AS total FROM employees ${where}`, params);
    const total = countRes.rows[0].total;
    const limit = Number(perPage);
    const offset = (Number(page) - 1) * limit;
    const dataRes = await query(
      `SELECT * FROM employees ${where} ORDER BY id ASC LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset]
    );
    res.json({ data: dataRes.rows, total, page: Number(page), perPage: limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load employees.' });
  }
});

router.post('/', async (req, res) => {
  const b = req.body;
  try {
    const lastRes = await query('SELECT employee_code FROM employees WHERE workspace_id=$1 ORDER BY id DESC LIMIT 1', [req.user.workspaceId]);
    const code = b.employeeCode || nextCode('EMP', lastRes.rows[0]?.employee_code, 3);
    const result = await query(
      `INSERT INTO employees (employee_code, full_name, department, designation, country, dob, gender, contact_number, email, joining_date, exit_date, payroll_type, location, gross_salary, salary_currency, status, access_type, reporting_manager_id, workspace_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [code, b.name, b.dept, b.desig, b.country || 'India', b.dob || null, b.gender || null, b.contact, b.email || null,
       b.joining || null, b.exit || null, b.payroll, b.location, b.salary || 0, b.salaryCurrency || 'INR', b.status || 'Active',
       b.accessType || 'User', b.reportingManagerId || null, req.user.workspaceId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save employee. Check that the employee code is unique.' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const b = req.body;
  try {
    const result = await query(
      `UPDATE employees SET full_name=$1, department=$2, designation=$3, country=$4, dob=$5, gender=$6,
       contact_number=$7, email=$8, joining_date=$9, exit_date=$10, payroll_type=$11, location=$12,
       gross_salary=$13, salary_currency=$14, status=$15, access_type=$16, reporting_manager_id=$17
       WHERE id=$18 AND workspace_id=$19 RETURNING *`,
      [b.name, b.dept, b.desig, b.country || 'India', b.dob || null, b.gender || null, b.contact, b.email || null,
       b.joining || null, b.exit || null, b.payroll, b.location, b.salary || 0, b.salaryCurrency || 'INR', b.status,
       b.accessType || 'User', b.reportingManagerId || null, req.params.id, req.user.workspaceId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Employee not found.' });

    // Keep an already-linked login's workspace role in sync with Access Type.
    const emp = result.rows[0];
    if (emp.user_id) {
      await query(
        `INSERT INTO workspace_memberships (user_id, workspace_id, role) VALUES ($1,$2,$3)
         ON CONFLICT (user_id, workspace_id) DO UPDATE SET role = EXCLUDED.role`,
        [emp.user_id, req.user.workspaceId, emp.access_type || 'User']
      );
    }
    res.json(emp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update employee.' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM employees WHERE id=$1 AND workspace_id=$2', [req.params.id, req.user.workspaceId]);
    res.json({ message: 'Employee deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete employee.' });
  }
});

// ---------------------------------------------------------------
// POST /api/employees/:id/create-login  { email, password }
// Admin-only: gives an employee their own login for this workspace,
// with the workspace role taken from that employee's Access Type field.
// If the email already has a global login (e.g. they work at another
// company using this system too), this just adds a new membership +
// links this employee record to that existing login.
// ---------------------------------------------------------------
router.post('/:id/create-login', requireAdmin, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  try {
    const empRes = await query('SELECT * FROM employees WHERE id=$1 AND workspace_id=$2', [req.params.id, req.user.workspaceId]);
    if (!empRes.rows.length) return res.status(404).json({ error: 'Employee not found.' });
    const employee = empRes.rows[0];
    if (employee.user_id) return res.status(409).json({ error: 'This employee already has a login.' });

    const existingUser = await query('SELECT id, password_hash FROM users WHERE email=$1', [email]);
    let userId;
    if (existingUser.rows.length) {
      const match = await bcrypt.compare(password, existingUser.rows[0].password_hash);
      if (!match) return res.status(409).json({ error: 'This email already has a login with a different password.' });
      userId = existingUser.rows[0].id;
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      const userRes = await query(
        `INSERT INTO users (employee_code, full_name, email, password_hash, is_verified) VALUES ($1,$2,$3,$4,TRUE) RETURNING id`,
        [employee.employee_code, employee.full_name, email, passwordHash]
      );
      userId = userRes.rows[0].id;
    }

    await query(
      `INSERT INTO workspace_memberships (user_id, workspace_id, role) VALUES ($1,$2,$3)
       ON CONFLICT (user_id, workspace_id) DO UPDATE SET role = EXCLUDED.role`,
      [userId, req.user.workspaceId, employee.access_type || 'User']
    );
    await query('UPDATE employees SET user_id=$1, email=$2 WHERE id=$3', [userId, email, employee.id]);

    res.status(201).json({ message: 'Login created. They can now sign in with the email and password you set.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create login for this employee.' });
  }
});

module.exports = router;
