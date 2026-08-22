const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { generateCode, sendVerificationEmail, isSmtpConfigured } = require('../config/mailer');
const { signTempToken, signSessionToken, verifyToken, nextCode } = require('../utils/helpers');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const CODE_TTL_MINUTES = 10;

async function issueCode(userId, purpose) {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
  await query(
    `INSERT INTO verification_codes (user_id, code, purpose, expires_at) VALUES ($1,$2,$3,$4)`,
    [userId, code, purpose, expiresAt]
  );
  return code;
}

async function getMemberships(userId) {
  const res = await query(
    `SELECT wm.workspace_id, wm.role, w.name AS workspace_name
     FROM workspace_memberships wm JOIN workspaces w ON w.id = wm.workspace_id
     WHERE wm.user_id = $1 ORDER BY w.name ASC`,
    [userId]
  );
  return res.rows;
}

/** Issues the final session JWT for a user inside one specific workspace. */
async function issueSessionForWorkspace(userId, workspaceId, role) {
  const empRes = await query('SELECT id FROM employees WHERE user_id=$1 AND workspace_id=$2', [userId, workspaceId]);
  const userRes = await query('SELECT full_name, email, employee_code FROM users WHERE id=$1', [userId]);
  const user = userRes.rows[0];
  const token = signSessionToken({
    type: 'session', userId, role, workspaceId,
    employeeId: empRes.rows[0]?.id || null,
  });
  const wsRes = await query('SELECT name FROM workspaces WHERE id=$1', [workspaceId]);
  return {
    token,
    user: {
      id: userId, name: user.full_name, email: user.email, role,
      employeeCode: user.employee_code, employeeId: empRes.rows[0]?.id || null,
      workspaceId, workspaceName: wsRes.rows[0]?.name || '',
    },
  };
}

// ---------------------------------------------------------------
// GET /api/auth/check-workspace-name?name=... (public, used live while typing)
// ---------------------------------------------------------------
router.get('/check-workspace-name', async (req, res) => {
  const name = (req.query.name || '').trim();
  if (!name) return res.json({ available: null });
  try {
    const existing = await query('SELECT 1 FROM workspaces WHERE lower(name) = lower($1)', [name]);
    res.json({ available: existing.rows.length === 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not check workspace name.' });
  }
});

// ---------------------------------------------------------------
// POST /api/auth/register  (Create Workspace)
// The person who creates a workspace is always its Admin. If the email
// already has a login (e.g. they're adding a second company under the
// same account), the password must match that existing login - we then
// just add a new workspace + Admin membership under the same account
// rather than creating a second, disconnected login.
// ---------------------------------------------------------------
router.post('/register', async (req, res) => {
  const { workspaceName, email, password } = req.body;
  if (!workspaceName || !email || !password) {
    return res.status(400).json({ error: 'Workspace name, email and password are required.' });
  }
  try {
    const existingWs = await query('SELECT id FROM workspaces WHERE lower(name) = lower($1)', [workspaceName]);
    if (existingWs.rows.length) {
      return res.status(409).json({ error: 'A workspace with this name already exists. Please choose a different name.' });
    }

    const existingUser = await query('SELECT id, password_hash FROM users WHERE email=$1', [email]);
    let userId;
    if (existingUser.rows.length) {
      const match = await bcrypt.compare(password, existingUser.rows[0].password_hash);
      if (!match) {
        return res.status(409).json({ error: 'This email already has an account with a different password. Sign in with that password to add a new workspace.' });
      }
      userId = existingUser.rows[0].id;
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      const lastEmp = await query(`SELECT employee_code FROM users ORDER BY id DESC LIMIT 1`);
      const employeeCode = nextCode('EMP', lastEmp.rows[0]?.employee_code, 3);
      const userRes = await query(
        `INSERT INTO users (employee_code, full_name, email, password_hash, is_verified) VALUES ($1,$2,$3,$4,FALSE) RETURNING id`,
        [employeeCode, workspaceName + ' Admin', email, passwordHash]
      );
      userId = userRes.rows[0].id;
    }

    const wsRes = await query('INSERT INTO workspaces (name) VALUES ($1) RETURNING id', [workspaceName]);
    const workspaceId = wsRes.rows[0].id;
    await query(
      `INSERT INTO workspace_memberships (user_id, workspace_id, role) VALUES ($1,$2,'Admin')`,
      [userId, workspaceId]
    );

    const code = await issueCode(userId, 'register');
    await sendVerificationEmail(email, code, 'register');

    const tempToken = signTempToken({ type: 'temp', userId, purpose: 'register' });
    res.json({
      tempToken,
      smtpConfigured: isSmtpConfigured,
      message: isSmtpConfigured
        ? 'A verification code has been emailed to you.'
        : 'SMTP is not configured yet - use verification code 123456 to continue.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create workspace. Please try again.' });
  }
});

// ---------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  try {
    const result = await query('SELECT * FROM users WHERE email=$1', [email]);
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid email or password.' });
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

    const code = await issueCode(user.id, 'login');
    await sendVerificationEmail(user.email, code, 'login');

    const tempToken = signTempToken({ type: 'temp', userId: user.id, purpose: 'login' });
    res.json({
      tempToken,
      smtpConfigured: isSmtpConfigured,
      message: isSmtpConfigured
        ? 'A verification code has been emailed to you.'
        : 'SMTP is not configured yet - use verification code 123456 to continue.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not sign in. Please try again.' });
  }
});

// ---------------------------------------------------------------
// POST /api/auth/verify  { tempToken, code }
// If the account belongs to exactly one workspace, signs them straight
// in. If it belongs to more than one, returns a short-lived selectToken
// plus the list of workspaces instead, so the frontend can show a picker.
// ---------------------------------------------------------------
router.post('/verify', async (req, res) => {
  const { tempToken, code } = req.body;
  if (!tempToken || !code) return res.status(400).json({ error: 'Verification code is required.' });
  let payload;
  try {
    payload = verifyToken(tempToken);
    if (payload.type !== 'temp') throw new Error('bad token');
  } catch (err) {
    return res.status(401).json({ error: 'Your verification session expired. Please start over.' });
  }
  try {
    const codeRes = await query(
      `SELECT * FROM verification_codes WHERE user_id=$1 AND purpose=$2 AND used=FALSE ORDER BY id DESC LIMIT 1`,
      [payload.userId, payload.purpose]
    );
    if (!codeRes.rows.length) return res.status(400).json({ error: 'No pending verification found. Please request a new code.' });
    const record = codeRes.rows[0];
    if (new Date(record.expires_at) < new Date()) return res.status(400).json({ error: 'This code has expired. Please request a new one.' });
    if (record.code !== String(code).trim()) return res.status(400).json({ error: 'Incorrect verification code.' });

    await query('UPDATE verification_codes SET used=TRUE WHERE id=$1', [record.id]);
    await query('UPDATE users SET is_verified=TRUE WHERE id=$1', [payload.userId]);

    const memberships = await getMemberships(payload.userId);

    if (memberships.length === 0) {
      return res.status(403).json({ error: "Your account isn't a member of any workspace yet. Ask an administrator to add you, or create your own workspace." });
    }

    // Always show the workspace picker after a successful code check - even
    // when the account only has one workspace - so the flow (and the UI) is
    // consistent no matter how many workspaces someone has access to.
    const selectToken = signTempToken({ type: 'select', userId: payload.userId });
    res.json({
      needsWorkspaceSelection: true,
      selectToken,
      workspaces: memberships.map(m => ({ workspaceId: m.workspace_id, name: m.workspace_name, role: m.role })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// ---------------------------------------------------------------
// POST /api/auth/select-workspace  { selectToken, workspaceId }
// ---------------------------------------------------------------
router.post('/select-workspace', async (req, res) => {
  const { selectToken, workspaceId } = req.body;
  if (!selectToken || !workspaceId) return res.status(400).json({ error: 'Workspace selection is required.' });
  let payload;
  try {
    payload = verifyToken(selectToken);
    if (payload.type !== 'select') throw new Error('bad token');
  } catch (err) {
    return res.status(401).json({ error: 'Your session expired. Please sign in again.' });
  }
  try {
    const memRes = await query(
      'SELECT role FROM workspace_memberships WHERE user_id=$1 AND workspace_id=$2',
      [payload.userId, workspaceId]
    );
    if (!memRes.rows.length) return res.status(403).json({ error: "You don't have access to that workspace." });
    const result = await issueSessionForWorkspace(payload.userId, Number(workspaceId), memRes.rows[0].role);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not switch workspace. Please try again.' });
  }
});

// ---------------------------------------------------------------
// POST /api/auth/resend-code  { tempToken }
// ---------------------------------------------------------------
router.post('/resend-code', async (req, res) => {
  const { tempToken } = req.body;
  try {
    const payload = verifyToken(tempToken);
    if (payload.type !== 'temp') throw new Error('bad token');
    const userRes = await query('SELECT email FROM users WHERE id=$1', [payload.userId]);
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found.' });
    const code = await issueCode(payload.userId, payload.purpose);
    await sendVerificationEmail(userRes.rows[0].email, code, payload.purpose);
    res.json({
      message: isSmtpConfigured ? 'A new code has been emailed to you.' : 'SMTP not configured - code is still 123456.',
    });
  } catch (err) {
    res.status(401).json({ error: 'Your verification session expired. Please start over.' });
  }
});

// ---------------------------------------------------------------
// POST /api/auth/contact-admin
// ---------------------------------------------------------------
router.post('/contact-admin', async (req, res) => {
  const { email, companyName, message } = req.body;
  if (!email || !companyName || !message) return res.status(400).json({ error: 'All fields are required.' });
  try {
    await query(
      `INSERT INTO access_requests (email, company_name, message) VALUES ($1,$2,$3)`,
      [email, companyName, message]
    );
    const admins = await query(`SELECT user_id FROM workspace_memberships WHERE role='Admin'`);
    for (const a of admins.rows) {
      await query(
        `INSERT INTO notifications (user_id, title, message) VALUES ($1,$2,$3)`,
        [a.user_id, 'New Access Request', `${email} (${companyName}) requested access: "${message}"`]
      );
    }
    res.json({ message: 'Your administrator has been notified. You will receive access soon.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not send your request. Please try again.' });
  }
});

// ---------------------------------------------------------------
// GET /api/auth/my-workspaces - list of workspaces the CURRENT logged-in
// account belongs to, for the always-visible workspace switcher.
// ---------------------------------------------------------------
router.get('/my-workspaces', requireAuth, async (req, res) => {
  try {
    const memberships = await getMemberships(req.user.userId);
    res.json({
      workspaces: memberships.map(m => ({ workspaceId: m.workspace_id, name: m.workspace_name, role: m.role })),
      currentWorkspaceId: req.user.workspaceId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load your workspaces.' });
  }
});

// ---------------------------------------------------------------
// POST /api/auth/switch-workspace  { workspaceId } - switch to a different
// workspace you already have access to, without signing out or redoing
// the OTP step.
// ---------------------------------------------------------------
router.post('/switch-workspace', requireAuth, async (req, res) => {
  const { workspaceId } = req.body;
  if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required.' });
  try {
    const memRes = await query(
      'SELECT role FROM workspace_memberships WHERE user_id=$1 AND workspace_id=$2',
      [req.user.userId, workspaceId]
    );
    if (!memRes.rows.length) return res.status(403).json({ error: "You don't have access to that workspace." });
    const result = await issueSessionForWorkspace(req.user.userId, Number(workspaceId), memRes.rows[0].role);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not switch workspace. Please try again.' });
  }
});

// ---------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userRes = await query(
      `SELECT u.id, u.full_name, u.email, u.employee_code, e.id AS employee_row_id,
       e.contact_number, e.designation, e.department, e.dob, e.gender, e.joining_date, e.exit_date,
       e.payroll_type, e.location, e.gross_salary, e.salary_currency, e.status, e.reporting_manager_id,
       m.full_name AS reporting_manager_name
       FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.workspace_id = $2
       LEFT JOIN employees m ON m.id = e.reporting_manager_id
       WHERE u.id=$1`,
      [req.user.userId, req.user.workspaceId]
    );
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found.' });
    const u = userRes.rows[0];
    const wsRes = await query('SELECT name FROM workspaces WHERE id=$1', [req.user.workspaceId]);
    res.json({
      id: u.id,
      name: u.full_name,
      email: u.email,
      role: req.user.role,
      workspaceId: req.user.workspaceId,
      workspaceName: wsRes.rows[0]?.name || '',
      employeeCode: u.employee_code,
      employeeId: u.employee_row_id,
      contact: u.contact_number,
      designation: u.designation,
      department: u.department,
      dob: u.dob,
      gender: u.gender,
      joining: u.joining_date,
      exit: u.exit_date,
      payroll: u.payroll_type,
      location: u.location,
      salary: u.gross_salary,
      salaryCurrency: u.salary_currency,
      status: u.status,
      reportingManagerId: u.reporting_manager_id,
      reportingManagerName: u.reporting_manager_name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load your profile.' });
  }
});

// ---------------------------------------------------------------
// PUT /api/auth/me  - update own profile (and linked employee record, if any)
// Password changes now go through /change-password/request + /confirm
// (with an OTP step), so this no longer accepts newPassword directly.
// ---------------------------------------------------------------
router.put('/me', requireAuth, async (req, res) => {
  const b = req.body;
  try {
    if (b.name) await query('UPDATE users SET full_name=$1 WHERE id=$2', [b.name, req.user.userId]);

    if (req.user.employeeId) {
      await query(
        `UPDATE employees SET contact_number=$1, designation=$2, department=$3, dob=$4, gender=$5,
         joining_date=$6, exit_date=$7, payroll_type=$8, location=$9, gross_salary=$10, salary_currency=$11,
         status=$12, reporting_manager_id=$13
         WHERE id=$14 AND workspace_id=$15`,
        [b.contact, b.designation, b.department, b.dob || null, b.gender, b.joining || null, b.exit || null,
         b.payroll, b.location, Number(b.salary) || 0, b.salaryCurrency || 'INR', b.status, b.reportingManagerId || null,
         req.user.employeeId, req.user.workspaceId]
      );
    }
    res.json({ message: 'Profile updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update profile.' });
  }
});

// ---------------------------------------------------------------
// Change Password (own account) - two-step with an OTP code, same
// fallback-to-123456 behaviour as login/register when SMTP isn't set up.
// ---------------------------------------------------------------
router.post('/change-password/request', requireAuth, async (req, res) => {
  const { currentPassword } = req.body;
  if (!currentPassword) return res.status(400).json({ error: 'Please enter your current password.' });
  try {
    const userRes = await query('SELECT password_hash, email FROM users WHERE id=$1', [req.user.userId]);
    const match = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
    if (!match) return res.status(400).json({ error: 'Current password is incorrect.' });

    const code = await issueCode(req.user.userId, 'change-password');
    await sendVerificationEmail(userRes.rows[0].email, code, 'change-password');
    res.json({
      message: isSmtpConfigured
        ? 'A verification code has been emailed to you.'
        : 'SMTP is not configured yet - use verification code 123456 to continue.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not start password change. Please try again.' });
  }
});

router.post('/change-password/confirm', requireAuth, async (req, res) => {
  const { code, newPassword } = req.body;
  if (!code || !newPassword) return res.status(400).json({ error: 'Verification code and new password are required.' });
  try {
    const codeRes = await query(
      `SELECT * FROM verification_codes WHERE user_id=$1 AND purpose='change-password' AND used=FALSE ORDER BY id DESC LIMIT 1`,
      [req.user.userId]
    );
    if (!codeRes.rows.length) return res.status(400).json({ error: 'No pending verification found. Please request a new code.' });
    const record = codeRes.rows[0];
    if (new Date(record.expires_at) < new Date()) return res.status(400).json({ error: 'This code has expired. Please request a new one.' });
    if (record.code !== String(code).trim()) return res.status(400).json({ error: 'Incorrect verification code.' });

    await query('UPDATE verification_codes SET used=TRUE WHERE id=$1', [record.id]);
    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash=$1 WHERE id=$2', [newHash, req.user.userId]);
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not change your password. Please try again.' });
  }
});

// ---------------------------------------------------------------
// DELETE /api/auth/me - delete own account
// ---------------------------------------------------------------
router.delete('/me', requireAuth, async (req, res) => {
  try {
    await query('DELETE FROM users WHERE id=$1', [req.user.userId]);
    res.json({ message: 'Account deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete account.' });
  }
});

module.exports = router;
