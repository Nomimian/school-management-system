// ─────────────────────────────────────────────────────────────────────────────
// SMS SERVICE — OPTIONAL, opt-in adapter for Twilio (REST, no SDK dependency).
// Disabled by default; when the env vars below are absent every send is
// SIMULATED (logged) so the app works for free in dev/testing — same pattern as
// the WhatsApp adapter.
//
//   TWILIO_ACCOUNT_SID — your Account SID
//   TWILIO_AUTH_TOKEN  — your Auth Token
//   TWILIO_FROM        — the Twilio sender number (e.g. +1234567890) OR a
//                        Messaging Service SID (starts with "MG")
//
// Works with any Twilio-compatible gateway; a local PSP can be swapped in behind
// this same interface without touching callers.
// ─────────────────────────────────────────────────────────────────────────────
const isConfigured = () =>
  !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);

// Keep a leading + if present (E.164), else digits only.
const normalizeNumber = (n) => {
  const s = String(n || '').trim();
  const plus = s.startsWith('+');
  const digits = s.replace(/[^\d]/g, '');
  return digits ? (plus ? `+${digits}` : digits) : '';
};

async function sendSMS({ to, body }) {
  const num = normalizeNumber(to);
  if (!num) throw new Error('Missing recipient phone number.');
  if (!isConfigured()) {
    console.log('[sms:simulated]', { to: num, body: String(body || '').slice(0, 80) });
    return { simulated: true };
  }
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const from = process.env.TWILIO_FROM;
  const params = new URLSearchParams({ To: num, Body: String(body || '') });
  // A Messaging Service SID (MG…) uses MessagingServiceSid; a number uses From.
  if (from.startsWith('MG')) params.set('MessagingServiceSid', from);
  else params.set('From', from);

  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'SMS send failed');
  return { sid: data.sid };
}

module.exports = { sendSMS, isConfigured, normalizeNumber };
