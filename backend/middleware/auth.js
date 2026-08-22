const { verifyToken } = require('../utils/helpers');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  try {
    const payload = verifyToken(token);
    if (payload.type !== 'session') return res.status(401).json({ error: 'Invalid session token.' });
    req.user = payload; // { userId, role, workspaceId, employeeId, type }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'This action requires Administrator access.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
