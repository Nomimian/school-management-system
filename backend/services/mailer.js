const nodemailer = require('nodemailer');

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL SERVICE — Nodemailer, configured from env. Two easy free options:
//   • Gmail:  EMAIL_USER + EMAIL_PASS (a Gmail "App Password", not your login)
//   • Any SMTP (Brevo/Resend/etc.): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
// If nothing is configured, sends are SIMULATED (logged) so dev never breaks.
// ─────────────────────────────────────────────────────────────────────────────
let cached; // undefined = not built yet, false = not configured, object = transport

function transport() {
  if (cached !== undefined) return cached;
  const { EMAIL_USER, EMAIL_PASS, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (EMAIL_USER && EMAIL_PASS) {
    cached = nodemailer.createTransport({ service: 'gmail', auth: { user: EMAIL_USER, pass: EMAIL_PASS } });
  } else if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    const port = Number(SMTP_PORT) || 587;
    cached = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  } else {
    cached = false;
  }
  return cached;
}

const isConfigured = () => transport() !== false;

// attachments: [{ filename, path }]  (path = absolute file path on disk)
async function sendMail({ to, subject, html, text, attachments = [], fromName }) {
  const t = transport();
  const fromAddr = process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER || 'no-reply@school.local';
  if (!t) {
    console.log('[email:simulated]', { to, subject, attachments: attachments.length });
    return { simulated: true };
  }
  const info = await t.sendMail({
    from: fromName ? `"${fromName}" <${fromAddr}>` : fromAddr,
    to, subject, text, html, attachments,
  });
  return { messageId: info.messageId };
}

module.exports = { sendMail, isConfigured };
