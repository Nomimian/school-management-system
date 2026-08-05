const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE LOG — provenance/audit for every EXTERNAL message the system sends
// (email / WhatsApp / SMS). In-app notifications are already their own record
// (the Notification collection), so they are NOT duplicated here.
//
// One row per (recipient, channel) attempt, with the outcome:
//   sent      — provider accepted it (providerId captured when available)
//   simulated — channel not configured; logged only, nothing actually sent
//   failed    — provider/network rejected it (error captured)
//   skipped   — recipient had no address for this channel (e.g. no phone)
//
// Answers "was the parent actually notified about the fee / absence?".
// ─────────────────────────────────────────────────────────────────────────────
const messageLogSchema = new mongoose.Schema({
  school:      { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  channel:     { type: String, enum: ['email', 'whatsapp', 'sms'], required: true },
  // What triggered it: outbound (manual staff broadcast) | absence | fee-reminder | notification
  event:       { type: String, default: 'outbound' },
  to:          { type: String },   // email address or phone number the send targeted
  name:        { type: String },   // recipient display name, when known
  student:     { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },  // guardian messages
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },     // staff sender / recipient user
  subject:     { type: String },
  bodyPreview: { type: String },
  status:      { type: String, enum: ['sent', 'simulated', 'failed', 'skipped'], required: true, index: true },
  providerId:  { type: String },   // messageId / WhatsApp id / Twilio sid
  error:       { type: String },   // failure reason, when status = failed/skipped
}, { timestamps: true });

messageLogSchema.index({ school: 1, createdAt: -1 });
// Auto-purge after 180 days so the audit trail can't grow unbounded.
messageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

module.exports = mongoose.model('MessageLog', messageLogSchema);
