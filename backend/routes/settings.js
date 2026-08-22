const express = require('express');
const { query } = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Whitelisted tables and their editable columns (excludes id/code uniqueness handled by DB constraint)
const TABLES = {
  currencies: { fields: ['code', 'name', 'symbol', 'rate', 'is_base', 'status'], numeric: ['rate'], bool: ['is_base'] },
  locations: { fields: ['code', 'name', 'country', 'time_zone', 'description', 'status'] },
  'project-categories': { table: 'project_categories', fields: ['code', 'name', 'description', 'status'] },
  'project-types': { table: 'project_types', fields: ['code', 'name', 'description', 'status'] },
  'billing-basis': { table: 'billing_basis', fields: ['code', 'name', 'description', 'status'] },
  'billing-frequencies': { table: 'billing_frequencies', fields: ['code', 'name', 'description', 'next_invoice_rule', 'status'] },
  departments: { fields: ['code', 'name', 'description', 'status'] },
  designations: { fields: ['code', 'name', 'description', 'status'] },
};

function resolveTable(key) {
  const def = TABLES[key];
  if (!def) return null;
  return { ...def, table: def.table || key };
}

router.get('/:key', async (req, res) => {
  const def = resolveTable(req.params.key);
  if (!def) return res.status(404).json({ error: 'Unknown settings table.' });
  try {
    const result = await query(`SELECT * FROM ${def.table} WHERE workspace_id=$1 ORDER BY id ASC`, [req.user.workspaceId]);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load data.' });
  }
});

router.post('/:key', requireAdmin, async (req, res) => {
  const def = resolveTable(req.params.key);
  if (!def) return res.status(404).json({ error: 'Unknown settings table.' });
  try {
    const values = def.fields.map((f) => {
      let v = req.body[f];
      if (def.bool?.includes(f)) v = v === true || v === 'true';
      if (def.numeric?.includes(f)) v = Number(v) || 0;
      return v ?? null;
    });
    const fieldsWithWs = [...def.fields, 'workspace_id'];
    const valuesWithWs = [...values, req.user.workspaceId];
    const placeholders = fieldsWithWs.map((_, idx) => `$${idx + 1}`).join(',');
    const result = await query(
      `INSERT INTO ${def.table} (${fieldsWithWs.join(',')}) VALUES (${placeholders}) RETURNING *`,
      valuesWithWs
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save entry. The code may already be in use.' });
  }
});

router.put('/:key/:id', requireAdmin, async (req, res) => {
  const def = resolveTable(req.params.key);
  if (!def) return res.status(404).json({ error: 'Unknown settings table.' });
  try {
    const values = def.fields.map((f) => {
      let v = req.body[f];
      if (def.bool?.includes(f)) v = v === true || v === 'true';
      if (def.numeric?.includes(f)) v = Number(v) || 0;
      return v ?? null;
    });
    const setClause = def.fields.map((f, idx) => `${f}=$${idx + 1}`).join(',');
    const result = await query(
      `UPDATE ${def.table} SET ${setClause} WHERE id=$${def.fields.length + 1} AND workspace_id=$${def.fields.length + 2} RETURNING *`,
      [...values, req.params.id, req.user.workspaceId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Entry not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update entry.' });
  }
});

router.delete('/:key/:id', requireAdmin, async (req, res) => {
  const def = resolveTable(req.params.key);
  if (!def) return res.status(404).json({ error: 'Unknown settings table.' });
  try {
    await query(`DELETE FROM ${def.table} WHERE id=$1 AND workspace_id=$2`, [req.params.id, req.user.workspaceId]);
    res.json({ message: 'Entry deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete entry.' });
  }
});

module.exports = router;
