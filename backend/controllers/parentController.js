// ─────────────────────────────────────────────────────────────────────────────
// PARENT ACCOUNTS & PARENT PORTAL
//
// Two audiences share this file:
//   1. OPERATORS (admin/principal/frontdesk) manage parent login accounts and
//      link each to one or more students — all scoped to their own school.
//   2. PARENTS use the read-only portal endpoints, which are scoped TWICE:
//         • school       (req.user.school)      — tenant isolation
//         • ownership     (req.user.children)    — a parent only ever sees the
//                                                  students explicitly linked to
//                                                  their account, never any other
//                                                  child in the same school.
//   Both filters are applied on every query below; neither can be bypassed by
//   a crafted request because children/school come from the auth token only.
// ─────────────────────────────────────────────────────────────────────────────
const User       = require('../models/User');
const Student    = require('../models/Student');
const Attendance = require('../models/Attendance');
const Fee        = require('../models/Fee');
const { Result }   = require('../models/Exam');
const { Notice, Event } = require('../models/Other');
const { Homework, Timetable, Certificate, StudentTransport, StudentHealth } = require('../models/Extended');

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || ''));

const publicParent = (u) => ({
  id: u._id, _id: u._id, name: u.name, email: u.email, phone: u.phone,
  isActive: u.isActive, lastLogin: u.lastLogin, createdAt: u.createdAt,
  children: u.children || [],
});

// Return the subset of `ids` that are real students IN THIS SCHOOL. Guarantees
// a parent can never be linked to a student from another tenant.
async function validChildIds(school, ids = []) {
  const clean = [...new Set((ids || []).map(String))];
  if (!clean.length) return [];
  const found = await Student.find({ _id: { $in: clean }, school }).select('_id');
  return found.map((s) => s._id);
}

// ─── OPERATOR SIDE — /api/parents ────────────────────────────────────────────

exports.listParents = async (req, res) => {
  try {
    const parents = await User.find({ school: req.user.school, role: 'parent' })
      .select('-password')
      .populate('children', 'name class section rollNumber studentId photo')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: parents.map(publicParent) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.createParent = async (req, res) => {
  try {
    const { name, email, password, phone, children } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    if (!isValidEmail(email))
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    if (String(password).length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

    const normEmail = String(email).toLowerCase().trim();
    if (await User.findOne({ email: normEmail }))
      return res.status(409).json({ success: false, message: 'That email is already in use.' });

    const linked = await validChildIds(req.user.school, children);

    const parent = await User.create({
      name: String(name).trim(),
      email: normEmail,
      password,
      role: 'parent',
      phone,
      school: req.user.school,   // forced — never from body
      children: linked,
      createdBy: req.user._id,
    });
    const populated = await parent.populate('children', 'name class section rollNumber studentId photo');
    res.status(201).json({ success: true, data: publicParent(populated) });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

async function findOwnSchoolParent(req) {
  return User.findOne({ _id: req.params.id, school: req.user.school, role: 'parent' });
}

exports.updateParent = async (req, res) => {
  try {
    const parent = await findOwnSchoolParent(req);
    if (!parent) return res.status(404).json({ success: false, message: 'Parent not found.' });
    const { name, phone, isActive, children } = req.body;
    if (name !== undefined)     parent.name = String(name).trim();
    if (phone !== undefined)    parent.phone = phone;
    if (isActive !== undefined) parent.isActive = isActive;
    if (children !== undefined) parent.children = await validChildIds(req.user.school, children);
    await parent.save();
    const populated = await parent.populate('children', 'name class section rollNumber studentId photo');
    res.json({ success: true, data: publicParent(populated) });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

exports.resetParentPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    const parent = await findOwnSchoolParent(req);
    if (!parent) return res.status(404).json({ success: false, message: 'Parent not found.' });
    parent.password = newPassword;
    await parent.save();
    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

exports.deleteParent = async (req, res) => {
  try {
    const parent = await findOwnSchoolParent(req);
    if (!parent) return res.status(404).json({ success: false, message: 'Parent not found.' });
    await parent.deleteOne();
    res.json({ success: true, message: 'Parent account removed.' });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

// ─── PARENT SIDE — /api/portal (role: parent) ────────────────────────────────

// Resolve a child id that MUST belong to this parent AND this school, else null.
async function ownChild(req, studentId) {
  const owns = (req.user.children || []).some((c) => String(c) === String(studentId));
  if (!owns) return null;
  return Student.findOne({ _id: studentId, school: req.user.school });
}

// GET /api/portal/overview — all children (with light summary) + notices
exports.portalOverview = async (req, res) => {
  try {
    const childIds = req.user.children || [];
    const children = await Student.find({ _id: { $in: childIds }, school: req.user.school })
      .select('name class section rollNumber studentId photo gender feeStatus');

    // Light per-child stats: attendance % (last 30 records) and fee balance.
    const summaries = await Promise.all(children.map(async (c) => {
      const [recent, feeAgg] = await Promise.all([
        Attendance.find({ student: c._id, school: req.user.school }).sort({ date: -1 }).limit(30).select('status'),
        Fee.aggregate([
          { $match: { student: c._id, school: c.school } },
          { $group: { _id: null, amount: { $sum: '$amount' }, paid: { $sum: '$paid' } } },
        ]),
      ]);
      const present = recent.filter((r) => r.status === 'Present').length;
      const attendancePct = recent.length ? Math.round((present / recent.length) * 100) : null;
      const bal = feeAgg[0] ? (feeAgg[0].amount - feeAgg[0].paid) : 0;
      return { student: c, attendancePct, feeBalance: bal };
    }));

    const [notices, events] = await Promise.all([
      Notice.find({ school: req.user.school, audience: { $in: ['All', 'Parents'] } }).sort({ createdAt: -1 }).limit(10),
      Event.find({ school: req.user.school, date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }).sort({ date: 1 }).limit(8),
    ]);

    res.json({ success: true, data: { children: summaries, notices, events } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// GET /api/portal/child/:id — full detail for one of the parent's own children
exports.portalChild = async (req, res) => {
  try {
    const child = await ownChild(req, req.params.id);
    if (!child) return res.status(404).json({ success: false, message: 'Child not found.' });

    const [attendance, fees, results, homeworkRaw, timetable, certificates, transport, health] = await Promise.all([
      Attendance.find({ student: child._id, school: req.user.school }).sort({ date: -1 }).limit(120),
      Fee.find({ student: child._id, school: req.user.school }).sort({ year: -1, createdAt: -1 }),
      Result.find({ student: child._id, school: req.user.school })
        .populate('exam', 'name subject class totalMarks passMark startDate').sort({ createdAt: -1 }),
      // Homework is class-wide; only expose THIS child's own submission.
      Homework.find({ school: req.user.school, class: child.class }).sort({ dueDate: -1 }).limit(40).lean(),
      Timetable.find({ school: req.user.school, class: child.class }).populate('periods.teacher', 'name').lean(),
      Certificate.find({ school: req.user.school, student: child._id }).sort({ issueDate: -1 }).lean(),
      StudentTransport.findOne({ school: req.user.school, student: child._id, isActive: true }).populate('route', 'routeName routeNo').lean(),
      StudentHealth.findOne({ school: req.user.school, student: child._id }).lean(),
    ]);

    // Strip other students' submissions; attach only this child's.
    const cid = String(child._id);
    const homework = homeworkRaw.map(h => {
      const mine = (h.submissions || []).find(s => String(s.student) === cid) || null;
      const { submissions, ...rest } = h;
      return { ...rest, mySubmission: mine };
    });

    const present = attendance.filter((a) => a.status === 'Present').length;
    const attendancePct = attendance.length ? Math.round((present / attendance.length) * 100) : null;
    const feeTotal = fees.reduce((s, f) => s + (f.amount || 0), 0);
    const feePaid  = fees.reduce((s, f) => s + (f.paid || 0), 0);

    res.json({
      success: true,
      data: {
        student: child,
        attendance, fees, results, homework, timetable, certificates, transport, health,
        summary: { attendancePct, feeTotal, feePaid, feeBalance: feeTotal - feePaid },
      },
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/portal/child/:id/homework/:hwId/submit  — parent turns in work
exports.submitHomework = async (req, res) => {
  try {
    const child = await ownChild(req, req.params.id);
    if (!child) return res.status(404).json({ success: false, message: 'Child not found.' });

    const hw = await Homework.findOne({ _id: req.params.hwId, school: req.user.school, class: child.class });
    if (!hw) return res.status(404).json({ success: false, message: 'Homework not found for this class.' });

    const { note = '', attachments = [] } = req.body;
    if (!String(note).trim() && !attachments.length)
      return res.status(400).json({ success: false, message: 'Add a note or attach your work.' });

    const cid = String(child._id);
    const entry = {
      student: child._id, note: String(note),
      attachments: (attachments || []).map(a => ({ name: a.name, url: a.url, type: a.type })),
      submittedAt: new Date(),
    };
    const idx = (hw.submissions || []).findIndex(s => String(s.student) === cid);
    if (idx >= 0) hw.submissions[idx] = { ...hw.submissions[idx].toObject?.() || hw.submissions[idx], ...entry };
    else hw.submissions.push(entry);
    await hw.save();

    res.json({ success: true, message: 'Homework submitted.', data: entry });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};
