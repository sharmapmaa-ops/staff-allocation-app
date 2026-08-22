const express = require('express');
const fs = require('fs');
const path = require('path');
const { pool, query } = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { seed } = require('../db/seed');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// POST /api/migration/run - creates all tables (if missing) and loads reference/dummy data
router.post('/run', async (req, res) => {
  const client = await pool.connect();
  const log = [];
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
    await client.query(schemaSql);
    log.push({ step: 'Schema', status: 'ok', detail: 'All tables verified / created' });

    const seedLog = await seed(client, req.user.workspaceId);
    log.push(...seedLog);

    for (const entry of log) {
      await query(
        `INSERT INTO migration_log (step, status, detail, workspace_id) VALUES ($1,$2,$3,$4)`,
        [entry.step, entry.status, entry.detail, req.user.workspaceId]
      );
    }

    res.json({ message: 'Migration completed successfully.', log });
  } catch (err) {
    console.error(err);
    log.push({ step: 'Migration', status: 'error', detail: err.message });
    res.status(500).json({ error: 'Migration failed. See log for details.', log });
  } finally {
    client.release();
  }
});

// GET /api/migration/history
router.get('/history', async (req, res) => {
  try {
    const result = await query(`SELECT * FROM migration_log WHERE workspace_id=$1 ORDER BY run_at DESC LIMIT 100`, [req.user.workspaceId]);
    res.json({ data: result.rows });
  } catch (err) {
    // Table may not exist yet if migration has never run
    res.json({ data: [] });
  }
});

module.exports = router;
