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

// ---------------------------------------------------------------
// POST /api/auth/register  (Create Workspace)
// ---------------------------------------------------------------
router.post('/register', async (req, res) => {
  const { workspaceName, email, password } = req.body;
  if (!workspaceName || !email || !password) {
    return res.status(400).json({ error: 'Workspace name, email and password are required.' });
  }
  try {
    const existing = await query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' });
    }
    const wsRes = await query('INSERT INTO workspaces (name) VALUES ($1) RETURNING id', [workspaceName]);
    const workspaceId = wsRes.rows[0].id;

    const passwordHash = await bcrypt.hash(password, 10);
    const lastEmp = await query(`SELECT employee_code FROM users ORDER BY id DESC LIMIT 1`);
    const employeeCode = nextCode('EMP', lastEmp.rows[0]?.employee_code, 3);

    const userRes = await query(
      `INSERT INTO users (workspace_id, employee_code, full_name, email, password_hash, role, is_verified)
       VALUES ($1,$2,$3,$4,$5,'Admin',FALSE) RETURNING id`,
      [workspaceId, employeeCode, workspaceName + ' Admin', email, passwordHash]
    );
    const userId = userRes.rows[0].id;

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

    const userRes = await query(
      `SELECT u.*, e.id AS employee_row_id FROM users u LEFT JOIN employees e ON e.user_id = u.id WHERE u.id=$1`,
      [payload.userId]
    );
    const user = userRes.rows[0];
    const sessionToken = signSessionToken({
      type: 'session',
      userId: user.id,
      role: user.role,
      workspaceId: user.workspace_id,
      employeeId: user.employee_row_id || null,
    });

    res.json({
      token: sessionToken,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        employeeCode: user.employee_code,
        employeeId: user.employee_row_id || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
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
    // Notify all admins in-app
    const admins = await query(`SELECT id FROM users WHERE role='Admin'`);
    for (const a of admins.rows) {
      await query(
        `INSERT INTO notifications (user_id, title, message) VALUES ($1,$2,$3)`,
        [a.id, 'New Access Request', `${email} (${companyName}) requested access: "${message}"`]
      );
    }
    res.json({ message: 'Your administrator has been notified. You will receive access soon.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not send your request. Please try again.' });
  }
});

// ---------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userRes = await query(
      `SELECT u.id, u.full_name, u.email, u.role, u.employee_code, e.id AS employee_row_id,
       e.contact_number, e.designation, e.department, e.dob, e.gender, e.joining_date, e.exit_date,
       e.payroll_type, e.location, e.gross_salary, e.status
       FROM users u LEFT JOIN employees e ON e.user_id = u.id WHERE u.id=$1`,
      [req.user.userId]
    );
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found.' });
    const u = userRes.rows[0];
    res.json({
      id: u.id,
      name: u.full_name,
      email: u.email,
      role: u.role,
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
      status: u.status,
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not load your profile.' });
  }
});

// ---------------------------------------------------------------
// PUT /api/auth/me  - update own profile (and linked employee record, if any)
// ---------------------------------------------------------------
router.put('/me', requireAuth, async (req, res) => {
  const b = req.body;
  try {
    if (b.newPassword) {
      if (!b.currentPassword) return res.status(400).json({ error: 'Please enter your current password.' });
      const userRes = await query('SELECT password_hash FROM users WHERE id=$1', [req.user.userId]);
      const match = await bcrypt.compare(b.currentPassword, userRes.rows[0].password_hash);
      if (!match) return res.status(400).json({ error: 'Current password is incorrect.' });
      const newHash = await bcrypt.hash(b.newPassword, 10);
      await query('UPDATE users SET password_hash=$1 WHERE id=$2', [newHash, req.user.userId]);
    }
    if (b.name) await query('UPDATE users SET full_name=$1 WHERE id=$2', [b.name, req.user.userId]);

    if (req.user.employeeId) {
      await query(
        `UPDATE employees SET contact_number=$1, designation=$2, department=$3, dob=$4, gender=$5,
         joining_date=$6, exit_date=$7, payroll_type=$8, location=$9, gross_salary=$10, status=$11
         WHERE id=$12`,
        [b.contact, b.designation, b.department, b.dob || null, b.gender, b.joining || null, b.exit || null,
         b.payroll, b.location, Number(b.salary) || 0, b.status, req.user.employeeId]
      );
    }
    res.json({ message: 'Profile updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update profile.' });
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
