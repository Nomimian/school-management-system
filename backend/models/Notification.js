const mongoose = require('mongoose');

// Per-user notification. Always scoped to (school, user); a user only ever
// reads their own. `link` is an in-app path the client can navigate to.
const notificationSchema = new mongoose.Schema({
  school:  { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true, index: true },
  type:    { type: String, default: 'info' },   // info | success | warning | message
  title:   { type: String, required: true },
  body:    { type: String, default: '' },
  link:    { type: String, default: '' },
  read:    { type: Boolean, default: false, index: true },
}, { timestamps: true });

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
