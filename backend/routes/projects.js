const express = require('express');
const { query } = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { nextCode } = require('../utils/helpers');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { search = '' } = req.query;
  try {
    const result = await query(
      `SELECT * FROM projects WHERE project_name ILIKE $1 OR client_name ILIKE $1 OR project_code ILIKE $1 ORDER BY id ASC`,
      [`%${search}%`]
    );
    res.json({ data: result.rows, total: result.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load projects.' });
  }
});

router.post('/', async (req, res) => {
  const b = req.body;
  try {
    const lastRes = await query('SELECT project_code FROM projects ORDER BY id DESC LIMIT 1');
    const code = b.id || nextCode('PRJ', lastRes.rows[0]?.project_code, 3);
    const result = await query(
      `INSERT INTO projects (project_code, project_name, client_name, category, status, project_type, billing_frequency,
        sow_available, project_manager, billing_basis, hours_capping, gp_margin, rate, currency, description, comments,
        additional_notes, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [code, b.name, b.client, b.category, b.status || 'Active', b.type, b.billFreq, b.sow || false, b.manager,
       b.billBasis, b.capping || 0, b.gp || 0, b.rate || 0, b.currency || 'USD', b.desc, b.comments, b.notes,
       b.start || null, b.end || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save project. Check that the project code is unique.' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const b = req.body;
  try {
    const result = await query(
      `UPDATE projects SET project_name=$1, client_name=$2, category=$3, status=$4, project_type=$5, billing_frequency=$6,
       sow_available=$7, project_manager=$8, billing_basis=$9, hours_capping=$10, gp_margin=$11, rate=$12, currency=$13,
       description=$14, comments=$15, additional_notes=$16, start_date=$17, end_date=$18 WHERE id=$19 RETURNING *`,
      [b.name, b.client, b.category, b.status, b.type, b.billFreq, b.sow || false, b.manager, b.billBasis,
       b.capping || 0, b.gp || 0, b.rate || 0, b.currency, b.desc, b.comments, b.notes, b.start || null, b.end || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Project not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update project.' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM projects WHERE id=$1', [req.params.id]);
    res.json({ message: 'Project deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete project.' });
  }
});

module.exports = router;
