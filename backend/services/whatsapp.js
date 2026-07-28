// ─────────────────────────────────────────────────────────────────────────────
// WHATSAPP SERVICE — OPTIONAL, opt-in adapter for the official Meta WhatsApp
// Cloud API. Disabled by default; when the env vars below are absent every send
// is SIMULATED (logged) so the app works for free in dev/testing.
//
//   WHATSAPP_TOKEN     — permanent access token from Meta
//   WHATSAPP_PHONE_ID  — the WhatsApp Business phone-number id
//
// Notes:
//   • Media (documents/images) are sent BY LINK, so the file URL must be
//     publicly reachable (set PUBLIC_URL in production). On localhost Meta
//     can't fetch it, which is exactly why it stays simulated in dev.
//   • Business-initiated messages outside a 24h customer-service window need a
//     pre-approved template; free-form text works within an open window.
// ─────────────────────────────────────────────────────────────────────────────
const API_VERSION = 'v20.0';

const isConfigured = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);

// WhatsApp Cloud API wants digits only in international format (no "+"), e.g.
// 923001234567. Normalise any local/loose format, defaulting the country code
// (Pakistan 92; override with SMS_COUNTRY_CODE):
//   "0334-4968938" → "923344968938" · "+92300…" → "92300…" · "0092…" → "92…"
const DEFAULT_CC = String(process.env.SMS_COUNTRY_CODE || '92').replace(/\D/g, '');
const normalizeNumber = (n) => {
  const raw = String(n || '').trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (raw.startsWith('+'))           return digits;                       // +92… → 92…
  if (digits.startsWith('00'))       return digits.slice(2);              // 0092… → 92…
  if (digits.startsWith('0'))        return DEFAULT_CC + digits.slice(1); // local 03xx → 923xx
  if (digits.startsWith(DEFAULT_CC)) return digits;                       // 92… → 92…
  return DEFAULT_CC + digits;                                             // bare 3xx → 923xx
};

async function post(payload) {
  const url = `https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_ID}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'WhatsApp send failed');
  return { id: data.messages?.[0]?.id };
}

// Send a PRE-APPROVED TEMPLATE message (required for business-initiated messages
// outside the 24h customer-service window — e.g. proactive fee/absence reminders).
// The template must already be created & approved in WhatsApp Manager; `params`
// fill its {{1}}, {{2}}, … body placeholders in order.
async function sendTemplate({ to, name, language, params = [] }) {
  const num = normalizeNumber(to);
  if (!num) throw new Error('Missing recipient phone number.');
  const lang = language || process.env.WHATSAPP_TEMPLATE_LANG || 'en';
  if (!isConfigured()) {
    console.log('[whatsapp:simulated:template]', { to: num, name, lang, params });
    return { simulated: true };
  }
  const components = params.length
    ? [{ type: 'body', parameters: params.map((p) => ({ type: 'text', text: String(p) })) }]
    : [];
  return post({ to: num, type: 'template', template: { name, language: { code: lang }, components } });
}

// Send a text message, plus one media message per attachment.
async function sendWhatsApp({ to, body, attachments = [] }) {
  const num = normalizeNumber(to);
  if (!num) throw new Error('Missing recipient phone number.');
  if (!isConfigured()) {
    console.log('[whatsapp:simulated]', { to: num, body, attachments: attachments.length });
    return { simulated: true };
  }
  const results = [];
  if (body) results.push(await post({ to: num, type: 'text', text: { body } }));
  for (const a of attachments) {
    const kind = String(a.type || '').startsWith('image/') ? 'image' : 'document';
    const media = kind === 'image'
      ? { link: a.url, caption: a.name }
      : { link: a.url, filename: a.name };
    results.push(await post({ to: num, type: kind, [kind]: media }));
  }
  return { sent: results.length };
}

module.exports = { sendWhatsApp, sendTemplate, isConfigured, normalizeNumber };
