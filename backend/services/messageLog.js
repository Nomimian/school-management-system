// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE-LOG RECORDER
//
// `deliver(meta, sendFn)` runs an external send and records the outcome in the
// MessageLog. It NEVER throws — neither a send failure nor a logging failure may
// break the caller (attendance marking, challan generation, outbound broadcast).
// It returns a normalised status string: 'sent' | 'simulated' | 'failed'.
//
// `skip(meta, reason)` records a channel that couldn't be attempted because the
// recipient had no address for it (e.g. no phone / no email) — so gaps in
// contact data are visible instead of silently ignored.
// ─────────────────────────────────────────────────────────────────────────────
const MessageLog = require('../models/MessageLog');

function trim(v, n) { return v == null ? undefined : String(v).slice(0, n); }

async function write(fields) {
  try { await MessageLog.create(fields); }
  catch (e) { console.warn('messageLog write failed:', e.message); }
}

async function deliver(meta, sendFn) {
  let status = 'sent', providerId = null, error = null;
  try {
    const out = await sendFn();
    if (out?.simulated) status = 'simulated';
    else providerId = out?.messageId || out?.id || out?.sid || null;
  } catch (e) {
    status = 'failed';
    error = trim(e?.message || 'send failed', 300);
  }
  await write({
    school: meta.school, channel: meta.channel, event: meta.event || 'outbound',
    to: meta.to, name: meta.name, student: meta.student, user: meta.user,
    subject: trim(meta.subject, 200), bodyPreview: trim(meta.body, 300),
    status, providerId, error,
  });
  return { status, providerId, error };
}

async function skip(meta, reason) {
  await write({
    school: meta.school, channel: meta.channel, event: meta.event || 'outbound',
    name: meta.name, student: meta.student, user: meta.user,
    subject: trim(meta.subject, 200), status: 'skipped', error: trim(reason, 300),
  });
}

module.exports = { deliver, skip };
