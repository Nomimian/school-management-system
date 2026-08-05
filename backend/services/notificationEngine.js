// ─────────────────────────────────────────────────────────────────────────────
// AUTOMATED NOTIFICATIONS ENGINE
//
// Turns school events into multi-channel messages to a student's guardians:
//   • in-app  → parent User accounts linked to the student (always, it's cheap)
//   • WhatsApp→ guardian phone   (best-effort; simulated if WhatsApp unconfigured)
//   • email   → guardian email   (best-effort; simulated if email unconfigured)
//
// Everything is best-effort and never throws into the caller — a failed message
// must never break attendance marking or challan generation.
//
// Respects the per-school toggles on School.notifications:
//   attendanceSMS → absence alerts · feeReminder → fee-due reminders
// ─────────────────────────────────────────────────────────────────────────────
const User    = require('../models/User');
const Fee     = require('../models/Fee');
const Student = require('../models/Student');
const { notify } = require('../controllers/notificationController');
const mailer  = require('./mailer');
const whatsapp = require('./whatsapp');
const sms     = require('./sms');

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Deliver one message to a student's guardians across every available channel.
// `wa` optionally carries a pre-approved WhatsApp template: { template, params }.
async function notifyGuardians(school, student, { title, body, link = '', channels = {}, wa = null }) {
  try {
    // 1) in-app → linked parent accounts
    const parents = await User.find({ school: school._id, role: 'parent', children: student._id }).select('_id').lean();
    if (parents.length) {
      await notify({ school: school._id, users: parents.map(p => p._id), type: 'warning', title, body, link });
    }

    // 2) WhatsApp → guardian phone (best-effort). Proactive (business-initiated)
    // messages require an approved template; use one when configured, else fall
    // back to free-form text (delivers only inside a 24h window / simulated).
    if (channels.whatsapp !== false) {
      const phone = student.guardian?.phone || student.phone;
      if (phone) {
        if (wa?.template && whatsapp.isConfigured()) {
          whatsapp.sendTemplate({ to: phone, name: wa.template, params: wa.params || [] }).catch(() => {});
        } else {
          whatsapp.sendWhatsApp({ to: phone, body: `${title}\n\n${body}` }).catch(() => {});
        }
      }
    }

    // 2b) SMS → guardian phone (best-effort)
    if (channels.sms !== false) {
      const phone = student.guardian?.phone || student.phone;
      if (phone) sms.sendSMS({ to: phone, body: `${title} — ${body}` }).catch(() => {});
    }

    // 3) email → guardian email (best-effort)
    if (channels.email !== false) {
      const email = student.guardian?.email || student.email;
      if (email) {
        mailer.sendMail({
          to: email, fromName: school.name,
          subject: title,
          text: body,
          html: `<div style="font-family:Segoe UI,Arial,sans-serif"><h3 style="margin:0 0 8px">${title}</h3><p style="color:#334155;white-space:pre-line">${body}</p><p style="color:#94a3b8;font-size:12px">— ${school.name}</p></div>`,
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.warn('notifyGuardians failed:', e.message);
  }
}

// ── Absence alert — call when a student is newly marked Absent ────────────────
// WhatsApp template WHATSAPP_TEMPLATE_ABSENCE placeholders (in order):
//   {{1}} student name · {{2}} class · {{3}} date
async function sendAbsenceAlert(school, student, date) {
  if (school?.notifications?.attendanceSMS === false) return;   // toggle off
  const d = new Date(date).toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  await notifyGuardians(school, student, {
    title: `Absence Alert — ${student.name}`,
    body: `${student.name} (${student.class || ''}) was marked ABSENT on ${d}. If this is unexpected, please contact the school office.`,
    link: '/parent',
    wa: { template: process.env.WHATSAPP_TEMPLATE_ABSENCE, params: [student.name, student.class || '—', d] },
  });
}

// Bulk helper: alert all newly-absent students at once (used by attendance).
async function sendAbsenceAlerts(school, students, date) {
  for (const s of students) await sendAbsenceAlert(school, s, date);
}

// ── Fee-due reminders — run periodically by the scheduler ────────────────────
// Reminds guardians of unpaid/partial challans that are due soon or overdue,
// at most once every REMIND_EVERY_HOURS. Also flips past-due Pending → Overdue.
const REMIND_EVERY_HOURS = 72;
const DUE_SOON_DAYS = 3;

async function runFeeReminders(school, now = new Date()) {
  if (school?.notifications?.feeReminder === false) return { sent: 0, skipped: true };  // default on
  const dueSoon = new Date(now.getTime() + DUE_SOON_DAYS * 864e5);
  const staleBefore = new Date(now.getTime() - REMIND_EVERY_HOURS * 36e5);

  // Unpaid challans that are due within the window (or overdue) and not reminded recently.
  const fees = await Fee.find({
    school: school._id,
    status: { $in: ['Pending', 'Partial', 'Overdue'] },
    dueDate: { $lte: dueSoon },
    $or: [{ lastReminder: { $exists: false } }, { lastReminder: null }, { lastReminder: { $lte: staleBefore } }],
  }).populate('student', 'name class guardian phone email').limit(1000);

  let sent = 0;
  for (const fee of fees) {
    const student = fee.student;
    if (!student) continue;
    const balance = Math.max(0, (fee.amount || 0) - (fee.paid || 0));
    if (balance <= 0) continue;
    const overdue = fee.dueDate && new Date(fee.dueDate) < now;

    // Flip Pending → Overdue once past the due date.
    if (overdue && fee.status === 'Pending') {
      fee.status = 'Overdue';
      Student.updateOne({ _id: student._id, school: school._id }, { feeStatus: 'Overdue' }).catch(() => {});
    }

    const dueStr = fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-PK') : '—';
    // WhatsApp template WHATSAPP_TEMPLATE_FEE_REMINDER placeholders (in order):
    //   {{1}} student name · {{2}} month year · {{3}} balance (Rs) · {{4}} due date / "overdue"
    await notifyGuardians(school, student, {
      title: `${overdue ? 'Overdue Fee' : 'Fee Reminder'} — ${fee.month} ${fee.year}`,
      body: `Dear Parent, the fee for ${student.name} (${student.class || ''}) for ${fee.month} ${fee.year} ` +
            `${overdue ? 'is OVERDUE' : `is due by ${dueStr}`}. Outstanding balance: Rs ${balance.toLocaleString()}. ` +
            `Kindly clear it at your earliest convenience.`,
      link: '/parent',
      wa: {
        template: process.env.WHATSAPP_TEMPLATE_FEE_REMINDER,
        params: [student.name, `${fee.month} ${fee.year}`, `Rs ${balance.toLocaleString()}`, overdue ? 'overdue' : dueStr],
      },
    });
    fee.lastReminder = now;
    await fee.save();
    sent++;
  }
  return { sent };
}

module.exports = { notifyGuardians, sendAbsenceAlert, sendAbsenceAlerts, runFeeReminders };
