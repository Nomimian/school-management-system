const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATION — a private thread between 2+ users of the SAME school.
// May optionally be "about" a specific student (teacher ↔ parent threads).
// Isolation: school is required + indexed; every query scopes to school AND to
// the caller being in `participants`. Participants are validated to be same-
// school users at creation time (see chatController).
// ─────────────────────────────────────────────────────────────────────────────
const conversationSchema = new mongoose.Schema({
  school:        { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  participants:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  subject:       { type: String, trim: true },
  aboutStudent:  { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastMessage:   { type: String, default: '' },
  lastSender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastMessageAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

conversationSchema.index({ school: 1, participants: 1, lastMessageAt: -1 });

const attachmentSchema = new mongoose.Schema({
  url:  { type: String, required: true },
  name: { type: String },
  type: { type: String },
  size: { type: Number },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  school:       { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  sender:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body:         { type: String, trim: true, default: '' },   // may be empty when attachments are present
  attachments:  { type: [attachmentSchema], default: [] },
  readBy:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = {
  Conversation: mongoose.model('Conversation', conversationSchema),
  ChatMessage:  mongoose.model('ChatMessage', messageSchema),
};
