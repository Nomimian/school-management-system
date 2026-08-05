// ─────────────────────────────────────────────────────────────────────────────
// OUTBOUND MESSAGING — send Email and/or WhatsApp (with attachments) to selected
// recipients of the caller's own school. Staff-only (parents can't broadcast).
// Also drops an in-app notification so recipients see it in their bell.
//
// Isolation: recipients are resolved from Users of req.user.school ONLY.
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const User = require('../models/User');
const MessageLog = require('../models/MessageLog');
const mailer = require('../services/mailer');
const whatsapp = require('../services/whatsapp');
const sms = require('../services/sms');
const log = require('../services/messageLog');
const { notify } = require('./notificationController');

const uploadDir = path.join(__dirname, '..', 'uploads');
const basename = (url) => path.basename(String(url || '').split('?')[0]);

// GET /api/outbound/status — which channels are live vs simulated (for the UI)
exports.status = (req, res) => {
  res.json({ success: true, data: { email: mailer.isConfigured(), whatsapp: whatsapp.isConfigured(), sms: sms.isConfigured() } });
};

// GET /api/outbound/log — recent delivery-log entries for the caller's school.
// Optional filters: ?channel=email|whatsapp|sms  ?status=sent|simulated|failed|skipped  ?event=outbound|absence|fee-reminder
exports.logList = async (req, res) => {
  try {
    const { channel, status, event } = req.query;
    const filter = { school: req.user.school };
    if (channel) filter.channel = channel;
    if (status)  filter.status  = status;
    if (event)   filter.event   = event;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const items = await MessageLog.find(filter)
      .populate('student', 'name class')
      .populate('user', 'name role')
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({ success: true, count: items.length, data: items });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/outbound/send
// body: { recipients:[userId], channels:['email','whatsapp'], subject, body, attachments:[{url,name,type}] }
exports.send = async (req, res) => {
  try {
    const { recipients = [], channels = [], subject = '', body = '', attachments = [] } = req.body;
    const wantEmail = channels.includes('email');
    const wantWhats = channels.includes('whatsapp');
    const wantSms   = channels.includes('sms');
    if (!recipients.length) return res.status(400).json({ success: false, message: 'Select at least one recipient.' });
    if (!wantEmail && !wantWhats && !wantSms) return res.status(400).json({ success: false, message: 'Choose at least one channel.' });
    if (!String(body).trim() && !attachments.length) return res.status(400).json({ success: false, message: 'Write a message or attach a file.' });

    // Resolve recipients strictly within the caller's school.
    const users = await User.find({ _id: { $in: recipients }, school: req.user.school }).select('name email phone role');

    // Public base for WhatsApp media links (must be reachable in production).
    const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    const waAttachments = attachments.map((a) => ({ ...a, url: a.url?.startsWith('http') ? a.url : base + a.url }));
    const mailAttachments = attachments.map((a) => ({ filename: a.name, path: path.join(uploadDir, basename(a.url)) }));
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1e293b;line-height:1.6;">${String(body).replace(/\n/g, '<br/>')}</div>`;

    const results = [];
    for (const u of users) {
      const r = { id: u._id, name: u.name };
      // Common delivery-log metadata for this recipient.
      const meta = { school: req.user.school, event: 'outbound', name: u.name, user: u._id, subject: subject || 'Message from your school', body };
      if (wantEmail) {
        if (!u.email) { r.email = 'no-email'; await log.skip({ ...meta, channel: 'email' }, 'no email on file'); }
        else {
          r.email = (await log.deliver({ ...meta, channel: 'email', to: u.email },
            () => mailer.sendMail({ to: u.email, subject: subject || 'Message from your school', html, text: body, attachments: mailAttachments, fromName: req.user.name }))).status;
        }
      }
      if (wantWhats) {
        if (!u.phone) { r.whatsapp = 'no-phone'; await log.skip({ ...meta, channel: 'whatsapp' }, 'no phone on file'); }
        else {
          r.whatsapp = (await log.deliver({ ...meta, channel: 'whatsapp', to: u.phone },
            () => whatsapp.sendWhatsApp({ to: u.phone, body: [subject, body].filter(Boolean).join('\n\n'), attachments: waAttachments }))).status;
        }
      }
      if (wantSms) {
        if (!u.phone) { r.sms = 'no-phone'; await log.skip({ ...meta, channel: 'sms' }, 'no phone on file'); }
        else {
          r.sms = (await log.deliver({ ...meta, channel: 'sms', to: u.phone },
            () => sms.sendSMS({ to: u.phone, body: [subject, body].filter(Boolean).join(' — ') }))).status;
        }
      }
      results.push(r);
    }

    // In-app notification for every recipient.
    await notify({
      school: req.user.school, users: users.map((u) => u._id), type: 'message',
      title: subject || `Message from ${req.user.name}`,
      body: String(body).slice(0, 120),
      link: '', exclude: req.user._id,
    });

    res.json({ success: true, data: results });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
