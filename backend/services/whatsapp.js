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

// digits-only, international format (e.g. 923001234567)
const normalizeNumber = (n) => String(n || '').replace(/[^\d]/g, '');

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

module.exports = { sendWhatsApp, isConfigured, normalizeNumber };
