const Notification = require('../models/Notification');

// ─────────────────────────────────────────────────────────────────────────────
// Reusable emitter — call from anywhere (chat, notices, results, attendance…) to
// drop a notification for one or more users. Never throws into the caller: a
// notification failure must not break the underlying action.
//   notify({ school, users:[ids], type, title, body, link, exclude })
// `exclude` (a userId) skips a recipient — typically the actor themselves.
// ─────────────────────────────────────────────────────────────────────────────
async function notify({ school, users = [], type = 'info', title, body = '', link = '', exclude = null }) {
  try {
    const ids = [...new Set(users.map(String))].filter((id) => id && String(id) !== String(exclude));
    if (!ids.length || !school || !title) return;
    await Notification.insertMany(ids.map((user) => ({ school, user, type, title, body, link })));
  } catch (e) {
    console.warn('notify() failed:', e.message);
  }
}

// GET /api/notifications — the caller's own notifications (newest first)
exports.list = async (req, res) => {
  try {
    const items = await Notification.find({ school: req.user.school, user: req.user._id })
      .sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: items });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// GET /api/notifications/unread-count
exports.unreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ school: req.user.school, user: req.user._id, read: false });
    res.json({ success: true, count });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// PATCH /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, school: req.user.school, user: req.user._id },
      { read: true },
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// PATCH /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { school: req.user.school, user: req.user._id, read: false },
      { read: true },
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports.notify = notify;
