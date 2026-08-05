const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const School = require('../models/School');
const engine = require('../services/notificationEngine');

// @GET /api/attendance?class=Grade 8-A&date=2025-05-30
exports.getAttendance = async (req, res) => {
  try {
    const { class: cls, date, studentId, month, year } = req.query;
    const filter = { school: req.user.school };
    if (cls)  filter.class = cls;
    if (date) filter.date = new Date(date);
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end   = new Date(year, month, 0);
      filter.date = { $gte: start, $lte: end };
    }

    const attendance = await Attendance.find(filter)
      .populate('student', 'name rollNumber studentId class')
      .sort({ date: -1 });

    res.json({ success: true, count: attendance.length, data: attendance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/attendance/bulk  — mark entire class at once
exports.markBulk = async (req, res) => {
  try {
    const { records, date, class: cls, method: bodyMethod } = req.body;
    // records = [{ student: id, status: 'Present', method?, checkInTime?, deviceId? }, ...]
    // `method` may be set per-record (biometric devices) or once for the whole
    // batch (manual marking). Anything unknown falls back to a safe 'Manual'.
    const ALLOWED_METHODS = ['Manual', 'Biometric', 'Import', 'Self'];
    const normMethod = (m) => (ALLOWED_METHODS.includes(m) ? m : null);
    const batchMethod = normMethod(bodyMethod) || 'Manual';
    if (!Array.isArray(records) || records.length === 0)
      return res.status(400).json({ success: false, message: 'records must be a non-empty array.' });
    if (!date)
      return res.status(400).json({ success: false, message: 'A date is required.' });

    // Reject any student id that isn't in this school (no cross-tenant writes).
    const ids = [...new Set(records.map(r => String(r.student)))];
    const validCount = await Student.countDocuments({ _id: { $in: ids }, school: req.user.school });
    if (validCount !== ids.length)
      return res.status(400).json({ success: false, message: 'One or more students do not belong to your school.' });

    // Snapshot prior statuses so we only alert on a *transition* to Absent
    // (re-saving the same day won't re-spam guardians).
    const prev = await Attendance.find({ school: req.user.school, date: new Date(date), student: { $in: ids } })
      .select('student status').lean();
    const prevStatus = new Map(prev.map(a => [String(a.student), a.status]));

    const ops = records.map(r => {
      const set = {
        student: r.student, date: new Date(date), class: cls, status: r.status,
        method: normMethod(r.method) || batchMethod,
        markedBy: req.user._id, school: req.user.school,
      };
      // Only persist biometric-specific fields when actually supplied.
      if (r.checkInTime) set.checkInTime = new Date(r.checkInTime);
      if (r.deviceId)    set.deviceId    = r.deviceId;
      return {
        updateOne: {
          filter: { student: r.student, date: new Date(date), school: req.user.school },
          update: { $set: set },
          upsert: true,
        },
      };
    });
    await Attendance.bulkWrite(ops);
    res.json({ success: true, message: `Attendance marked for ${records.length} students.` });

    // ── Fire absence alerts to guardians (after responding — never blocks) ────
    const newlyAbsentIds = records
      .filter(r => r.status === 'Absent' && prevStatus.get(String(r.student)) !== 'Absent')
      .map(r => r.student);
    if (newlyAbsentIds.length) {
      (async () => {
        try {
          const [school, students] = await Promise.all([
            School.findById(req.user.school).select('name notifications').lean(),
            Student.find({ _id: { $in: newlyAbsentIds }, school: req.user.school }).select('name class guardian phone email').lean(),
          ]);
          if (school) await engine.sendAbsenceAlerts(school, students, date);
        } catch (e) { console.warn('absence alert dispatch failed:', e.message); }
      })();
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/attendance/summary?class=Grade 8-A&date=2025-05-30
exports.getDailySummary = async (req, res) => {
  try {
    const { class: cls, date } = req.query;
    const filter = { school: new mongoose.Types.ObjectId(req.user.school) };
    if (cls)  filter.class = cls;
    if (date) filter.date = new Date(date);

    const summary = await Attendance.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const total = await Student.countDocuments({ school: req.user.school, class: cls, isActive: true });
    res.json({ success: true, data: { summary, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/attendance/trend
exports.getTrend = async (req, res) => {
  try {
    const trend = await Attendance.aggregate([
      { $match: { school: new mongoose.Types.ObjectId(req.user.school) } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%U', date: '$date' } },
        present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
        absent:  { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
        total:   { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
      { $limit: 8 },
    ]);
    res.json({ success: true, data: trend });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
