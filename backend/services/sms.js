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

// Normalise any local/loose format to E.164, defaulting the country code
// (Pakistan +92 by default; override with SMS_COUNTRY_CODE). Examples:
//   "0334-4968938"  → "+923344968938"
//   "03344968938"   → "+923344968938"
//   "3344968938"    → "+923344968938"
//   "0092334..."    → "+92334..."
//   "+92334..."     → "+92334..." (kept as-is)
const DEFAULT_CC = String(process.env.SMS_COUNTRY_CODE || '92').replace(/\D/g, '');
const normalizeNumber = (n) => {
  const raw = String(n || '').trim();
  if (!raw) return '';
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (hasPlus)                     return `+${digits}`;                 // already international
  if (digits.startsWith('00'))     return `+${digits.slice(2)}`;        // 00 92 … → +92 …
  if (digits.startsWith('0'))      return `+${DEFAULT_CC}${digits.slice(1)}`; // local 03xx → +92 3xx
  if (digits.startsWith(DEFAULT_CC)) return `+${digits}`;              // 92xxxxxxxxxx → +92 …
  return `+${DEFAULT_CC}${digits}`;                                     // bare 3xx → +92 3xx
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
