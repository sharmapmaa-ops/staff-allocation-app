const express = require('express');
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30`,
      [req.user.userId]
    );
    const unreadRes = await query(
      `SELECT COUNT(*)::int AS c FROM notifications WHERE user_id=$1 AND is_read=FALSE`,
      [req.user.userId]
    );
    res.json({ data: result.rows, unread: unreadRes.rows[0].c });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load notifications.' });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2', [req.params.id, req.user.userId]);
    res.json({ message: 'Marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not update notification.' });
  }
});

router.patch('/read-all', async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1', [req.user.userId]);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not update notifications.' });
  }
});

module.exports = router;
