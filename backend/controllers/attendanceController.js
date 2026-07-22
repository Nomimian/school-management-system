const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');

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
    const { records, date, class: cls } = req.body;
    // records = [{ student: id, status: 'Present' }, ...]
    const ops = records.map(r => ({
      updateOne: {
        filter: { student: r.student, date: new Date(date), school: req.user.school },
        update: { $set: { student: r.student, date: new Date(date), class: cls, status: r.status, markedBy: req.user._id, school: req.user.school } },
        upsert: true,
      },
    }));
    await Attendance.bulkWrite(ops);
    res.json({ success: true, message: `Attendance marked for ${records.length} students.` });
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
