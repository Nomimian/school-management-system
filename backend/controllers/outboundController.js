// ─────────────────────────────────────────────────────────────────────────────
// OUTBOUND MESSAGING — send Email and/or WhatsApp (with attachments) to selected
// recipients of the caller's own school. Staff-only (parents can't broadcast).
// Also drops an in-app notification so recipients see it in their bell.
//
// Isolation: recipients are resolved from Users of req.user.school ONLY.
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const User = require('../models/User');
const mailer = require('../services/mailer');
const whatsapp = require('../services/whatsapp');
const { notify } = require('./notificationController');

const uploadDir = path.join(__dirname, '..', 'uploads');
const basename = (url) => path.basename(String(url || '').split('?')[0]);

// GET /api/outbound/status — which channels are live vs simulated (for the UI)
exports.status = (req, res) => {
  res.json({ success: true, data: { email: mailer.isConfigured(), whatsapp: whatsapp.isConfigured() } });
};

// POST /api/outbound/send
// body: { recipients:[userId], channels:['email','whatsapp'], subject, body, attachments:[{url,name,type}] }
exports.send = async (req, res) => {
  try {
    const { recipients = [], channels = [], subject = '', body = '', attachments = [] } = req.body;
    const wantEmail = channels.includes('email');
    const wantWhats = channels.includes('whatsapp');
    if (!recipients.length) return res.status(400).json({ success: false, message: 'Select at least one recipient.' });
    if (!wantEmail && !wantWhats) return res.status(400).json({ success: false, message: 'Choose at least one channel.' });
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
      if (wantEmail) {
        if (!u.email) r.email = 'no-email';
        else {
          try {
            const out = await mailer.sendMail({ to: u.email, subject: subject || 'Message from your school', html, text: body, attachments: mailAttachments, fromName: req.user.name });
            r.email = out.simulated ? 'simulated' : 'sent';
          } catch (e) { r.email = 'failed'; }
        }
      }
      if (wantWhats) {
        if (!u.phone) r.whatsapp = 'no-phone';
        else {
          try {
            const out = await whatsapp.sendWhatsApp({ to: u.phone, body: [subject, body].filter(Boolean).join('\n\n'), attachments: waAttachments });
            r.whatsapp = out.simulated ? 'simulated' : 'sent';
          } catch (e) { r.whatsapp = 'failed'; }
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
