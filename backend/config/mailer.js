const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || '';
const isSmtpConfigured = Boolean(SMTP_HOST);

let transporter = null;
if (isSmtpConfigured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

/**
 * Generates a verification code.
 * While SMTP is not configured, this ALWAYS returns the fixed fallback
 * code "123456" so the team can test the full flow before real SMTP
 * credentials are added in the Render environment.
 */
function generateCode() {
  if (!isSmtpConfigured) return '123456';
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Sends a verification email. If SMTP is not configured, this simply
 * logs the code to the server console (useful for local/dev/testing on
 * Render before SMTP env vars are added) and resolves successfully.
 */
async function sendVerificationEmail(toEmail, code, purpose) {
  const subject = purpose === 'register'
    ? 'Verify your Staff Allocation workspace'
    : 'Your Staff Allocation sign-in verification code';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;">
      <h2 style="color:#1d4ed8;">Staff Allocation Management System</h2>
      <p>Your verification code is:</p>
      <p style="font-size:28px;font-weight:800;letter-spacing:6px;color:#111827;">${code}</p>
      <p style="color:#6b7280;font-size:13px;">This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>
    </div>`;

  if (!isSmtpConfigured) {
    console.log(`[mailer] SMTP not configured. Verification code for ${toEmail}: ${code}`);
    return { simulated: true };
  }

  return transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@example.com',
    to: toEmail,
    subject,
    html,
  });
}

module.exports = { generateCode, sendVerificationEmail, isSmtpConfigured };
