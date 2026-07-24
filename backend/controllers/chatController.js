// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED MESSAGING — private threaded conversations across ALL portals
// (staff ↔ staff, staff ↔ parent). Works for staff and parents alike.
//
// Isolation & authorization on every path:
//   • school scope: conversation.school === req.user.school (from token).
//   • membership:   the caller MUST be in conversation.participants to read or
//                   post. Non-members get 404 (indistinguishable from missing).
//   • same-school participants: on create, all participant ids are validated to
//     be active users of the caller's own school; foreign/other-school ids are
//     rejected. Parents may only be paired with staff (not other parents).
// ─────────────────────────────────────────────────────────────────────────────
const mongoose = require('mongoose');
const { Conversation, ChatMessage } = require('../models/Chat');
const User = require('../models/User');
const { notify } = require('./notificationController');

const isParent = (u) => u.role === 'parent';

const userCard = (u) => (u ? { _id: u._id, name: u.name, role: u.role } : null);

// GET /api/chat/recipients — who the caller may start a conversation with.
exports.getRecipients = async (req, res) => {
  try {
    const meParent = isParent(req.user);
    // Parents may contact staff only; staff may contact all staff + parents.
    const roleFilter = meParent ? { role: { $nin: ['parent', 'superadmin'] } } : { role: { $ne: 'superadmin' } };
    const users = await User.find({ school: req.user.school, isActive: true, _id: { $ne: req.user._id }, ...roleFilter })
      .select('name role').sort({ name: 1 });
    res.json({ success: true, data: users.map(userCard) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// GET /api/chat/conversations — my threads with unread counts
exports.listConversations = async (req, res) => {
  try {
    const me = req.user._id;
    const convos = await Conversation.find({ school: req.user.school, participants: me })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'name role')
      .populate('aboutStudent', 'name class section')
      .lean();

    const ids = convos.map((c) => c._id);
    // One aggregate for all unread counts (messages not sent by me, not read by me).
    const unread = await ChatMessage.aggregate([
      { $match: { conversation: { $in: ids }, school: new mongoose.Types.ObjectId(req.user.school),
                  sender: { $ne: new mongoose.Types.ObjectId(me) }, readBy: { $ne: new mongoose.Types.ObjectId(me) } } },
      { $group: { _id: '$conversation', count: { $sum: 1 } } },
    ]);
    const unreadMap = Object.fromEntries(unread.map((u) => [String(u._id), u.count]));

    const data = convos.map((c) => ({
      ...c,
      others: c.participants.filter((p) => String(p._id) !== String(me)),
      unread: unreadMap[String(c._id)] || 0,
    }));
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// GET /api/chat/unread-count — total unread across my threads (for the badge)
exports.unreadTotal = async (req, res) => {
  try {
    const me = new mongoose.Types.ObjectId(req.user._id);
    const myConvos = await Conversation.find({ school: req.user.school, participants: me }).select('_id').lean();
    const count = await ChatMessage.countDocuments({
      conversation: { $in: myConvos.map((c) => c._id) },
      school: req.user.school, sender: { $ne: me }, readBy: { $ne: me },
    });
    res.json({ success: true, count });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/chat/conversations  { participants:[ids], subject?, aboutStudent?, body? }
exports.createConversation = async (req, res) => {
  try {
    const { participants = [], subject = '', aboutStudent = null, body = '', attachments = [] } = req.body;
    const wanted = [...new Set(participants.map(String))].filter((id) => id && id !== String(req.user._id));
    if (!wanted.length) return res.status(400).json({ success: false, message: 'Choose at least one recipient.' });

    // Validate every recipient is an active user of MY school.
    const valid = await User.find({ _id: { $in: wanted }, school: req.user.school, isActive: true }).select('role');
    if (valid.length !== wanted.length)
      return res.status(400).json({ success: false, message: 'One or more recipients are invalid.' });

    // A parent may only message staff (never another parent).
    if (isParent(req.user) && valid.some((u) => u.role === 'parent'))
      return res.status(403).json({ success: false, message: 'Parents can only message school staff.' });

    const members = [req.user._id, ...valid.map((u) => u._id)];
    const convo = await Conversation.create({
      school: req.user.school,
      participants: members,
      subject: String(subject).trim(),
      aboutStudent: aboutStudent || undefined,
      createdBy: req.user._id,
    });

    if (String(body).trim() || attachments.length) await postMessage(req, convo, String(body).trim(), attachments);

    const populated = await Conversation.findById(convo._id)
      .populate('participants', 'name role').populate('aboutStudent', 'name class section');
    res.status(201).json({ success: true, data: populated });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

// Fetch a conversation the caller is a member of, else null.
async function myConversation(req, id) {
  return Conversation.findOne({ _id: id, school: req.user.school, participants: req.user._id });
}

// GET /api/chat/conversations/:id — thread + messages (marks them read for me)
exports.getConversation = async (req, res) => {
  try {
    const convo = await myConversation(req, req.params.id);
    if (!convo) return res.status(404).json({ success: false, message: 'Conversation not found.' });

    const messages = await ChatMessage.find({ conversation: convo._id, school: req.user.school })
      .sort({ createdAt: 1 }).populate('sender', 'name role');

    // Mark everything not sent by me as read by me.
    await ChatMessage.updateMany(
      { conversation: convo._id, school: req.user.school, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } },
    );

    const populated = await convo.populate([
      { path: 'participants', select: 'name role' },
      { path: 'aboutStudent', select: 'name class section' },
    ]);
    res.json({ success: true, data: { conversation: populated, messages } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/chat/conversations/:id/messages  { body }
exports.sendMessage = async (req, res) => {
  try {
    const { body, attachments = [] } = req.body;
    if (!String(body || '').trim() && !attachments.length)
      return res.status(400).json({ success: false, message: 'Message cannot be empty.' });
    const convo = await myConversation(req, req.params.id);
    if (!convo) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    const msg = await postMessage(req, convo, String(body || '').trim(), attachments);
    const populated = await msg.populate('sender', 'name role');
    res.status(201).json({ success: true, data: populated });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

// Shared: create a message, bump the conversation, notify the other members.
async function postMessage(req, convo, body, attachments = []) {
  const clean = (attachments || [])
    .filter((a) => a && a.url)
    .map((a) => ({ url: a.url, name: a.name, type: a.type, size: a.size }));
  const msg = await ChatMessage.create({
    school: req.user.school, conversation: convo._id, sender: req.user._id,
    body, attachments: clean, readBy: [req.user._id],
  });
  convo.lastMessage = body ? body.slice(0, 140) : (clean.length ? `📎 ${clean.length} attachment${clean.length > 1 ? 's' : ''}` : '');
  convo.lastSender = req.user._id;
  convo.lastMessageAt = new Date();
  await convo.save();

  const recipientIds = convo.participants.map(String).filter((id) => id !== String(req.user._id));
  // Route each recipient's notification to THEIR OWN portal's inbox.
  const recips = await User.find({ _id: { $in: recipientIds }, school: req.user.school }).select('role');
  const parentIds = recips.filter((u) => u.role === 'parent').map((u) => u._id);
  const staffIds  = recips.filter((u) => u.role !== 'parent').map((u) => u._id);
  const base = { school: req.user.school, type: 'message', title: `New message from ${req.user.name}`, body: body.slice(0, 120), exclude: req.user._id };
  await notify({ ...base, users: staffIds,  link: '/messaging' });
  await notify({ ...base, users: parentIds, link: '/parent/messages' });
  return msg;
}
