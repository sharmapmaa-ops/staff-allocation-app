const express = require('express');
const { query } = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { nextCode, getTeamScope } = require('../utils/helpers');

const router = express.Router();
router.use(requireAuth);

// GET /api/employees?search=&payroll=&location=&status=&page=&perPage=&scope=team
router.get('/', async (req, res) => {
  const { search = '', payroll = '', location = '', status = '', page = 1, perPage = 10, scope = '' } = req.query;
  const conditions = [];
  const params = [];
  let i = 1;
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

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

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
    const lastRes = await query('SELECT employee_code FROM employees ORDER BY id DESC LIMIT 1');
    const code = b.employeeCode || nextCode('EMP', lastRes.rows[0]?.employee_code, 3);
    const result = await query(
      `INSERT INTO employees (employee_code, full_name, department, designation, country, dob, gender, contact_number, email, joining_date, exit_date, payroll_type, location, gross_salary, salary_currency, status, access_type, reporting_manager_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [code, b.name, b.dept, b.desig, b.country || 'India', b.dob || null, b.gender || null, b.contact, b.email || null,
       b.joining || null, b.exit || null, b.payroll, b.location, b.salary || 0, b.salaryCurrency || 'INR', b.status || 'Active',
       b.accessType || 'User', b.reportingManagerId || null]
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
       gross_salary=$13, salary_currency=$14, status=$15, access_type=$16, reporting_manager_id=$17 WHERE id=$18 RETURNING *`,
      [b.name, b.dept, b.desig, b.country || 'India', b.dob || null, b.gender || null, b.contact, b.email || null,
       b.joining || null, b.exit || null, b.payroll, b.location, b.salary || 0, b.salaryCurrency || 'INR', b.status,
       b.accessType || 'User', b.reportingManagerId || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Employee not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update employee.' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM employees WHERE id=$1', [req.params.id]);
    res.json({ message: 'Employee deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete employee.' });
  }
});

module.exports = router;
