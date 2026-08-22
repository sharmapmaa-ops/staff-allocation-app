const jwt = require('jsonwebtoken');

function signSessionToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function signTempToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.TEMP_TOKEN_EXPIRES_IN || '10m',
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function nextCode(prefix, lastCode, width) {
  const num = lastCode ? parseInt(lastCode.replace(prefix, ''), 10) + 1 : 1;
  return prefix + String(num).padStart(width, '0');
}

/**
 * Returns the set of employee IDs a given logged-in user is allowed to see
 * data for: Admins get `null` (meaning "no restriction, see everyone").
 * Non-admins get an array containing themself plus anyone whose
 * reporting_manager_id points at their own employee record ("my team").
 * Requires a `query` function (from config/db) to avoid a circular import.
 */
async function getTeamScope(query, user) {
  if (user.role === 'Admin') return null;
  if (!user.employeeId) return [];
  const res = await query(
    'SELECT id FROM employees WHERE id = $1 OR reporting_manager_id = $1',
    [user.employeeId]
  );
  return res.rows.map((r) => r.id);
}

module.exports = { signSessionToken, signTempToken, verifyToken, nextCode, getTeamScope };
