const mongoose = require('mongoose');
const { Notice, Class, Staff, Book, Event } = require('../models/Other');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Fee = require('../models/Fee');
const User = require('../models/User');
const { notify } = require('./notificationController');
const Attendance = require('../models/Attendance');

// ── NOTICES ───────────────────────────────────────────────────────────────────
exports.getNotices = async (req, res) => {
  try {
    const notices = await Notice.find({ school: req.user.school }).sort({ createdAt: -1 });
    res.json({ success: true, data: notices });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createNotice = async (req, res) => {
  try {
    const notice = await Notice.create({ ...req.body, postedBy: req.user._id, school: req.user.school });

    // Fan out a notification to the notice's audience (best-effort).
    const audience = notice.audience || 'All';
    const roleFilter =
      audience === 'Teachers' ? { role: 'teacher' } :
      audience === 'Parents'  ? { role: 'parent' } :
      audience === 'Students' ? { role: 'parent' } :   // students reached via their guardians
      { role: { $ne: 'superadmin' } };                 // 'All'
    const recipients = await User.find({ school: req.user.school, isActive: true, ...roleFilter }).select('_id role');
    const parentIds = recipients.filter(u => u.role === 'parent').map(u => u._id);
    const staffIds  = recipients.filter(u => u.role !== 'parent').map(u => u._id);
    const base = { school: req.user.school, type: notice.priority === 'High' ? 'warning' : 'info', title: `Notice: ${notice.title}`, body: notice.content?.slice(0, 120) || '', exclude: req.user._id };
    await notify({ ...base, users: staffIds,  link: '/notices' });
    await notify({ ...base, users: parentIds, link: '/parent' });

    res.status(201).json({ success: true, data: notice });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};
exports.updateNotice = async (req, res) => {
  try {
    const { school, ...updates } = req.body;
    const notice = await Notice.findOneAndUpdate({ _id: req.params.id, school: req.user.school }, updates, { new: true });
    if (!notice) return res.status(404).json({ success: false, message: 'Notice not found.' });
    res.json({ success: true, data: notice });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};
exports.deleteNotice = async (req, res) => {
  try {
    await Notice.findOneAndDelete({ _id: req.params.id, school: req.user.school });
    res.json({ success: true, message: 'Notice deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── CLASSES ───────────────────────────────────────────────────────────────────
exports.getClasses = async (req, res) => {
  try {
    const classes = await Class.find({ school: req.user.school }).populate('classTeacher', 'name').sort({ name: 1 });
    // Attach student count
    const withCount = await Promise.all(classes.map(async (cls) => {
      const count = await Student.countDocuments({ class: cls.name, isActive: true, school: req.user.school });
      return { ...cls.toObject(), studentCount: count };
    }));
    res.json({ success: true, data: withCount });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createClass = async (req, res) => {
  try {
    const cls = await Class.create({ ...req.body, school: req.user.school });
    res.status(201).json({ success: true, data: cls });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};
exports.updateClass = async (req, res) => {
  try {
    const { school, ...updates } = req.body;
    const cls = await Class.findOneAndUpdate({ _id: req.params.id, school: req.user.school }, updates, { new: true, runValidators: true });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });
    res.json({ success: true, data: cls });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};
exports.deleteClass = async (req, res) => {
  try {
    await Class.findOneAndDelete({ _id: req.params.id, school: req.user.school });
    res.json({ success: true, message: 'Class deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── STAFF / HR ─────────────────────────────────────────────────────────────────
exports.getStaff = async (req, res) => {
  try {
    const staff = await Staff.find({ school: req.user.school }).sort({ createdAt: -1 });
    res.json({ success: true, data: staff });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createStaff = async (req, res) => {
  try {
    const staff = await Staff.create({ ...req.body, school: req.user.school });
    res.status(201).json({ success: true, data: staff });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};
exports.updateStaff = async (req, res) => {
  try {
    // Never allow the tenant key to be reassigned via the request body
    const { school, ...updates } = req.body;
    const staff = await Staff.findOneAndUpdate({ _id: req.params.id, school: req.user.school }, updates, { new: true });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found.' });
    res.json({ success: true, data: staff });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};
exports.deleteStaff = async (req, res) => {
  try {
    await Staff.findOneAndDelete({ _id: req.params.id, school: req.user.school });
    res.json({ success: true, message: 'Staff deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── LIBRARY ───────────────────────────────────────────────────────────────────
exports.getBooks = async (req, res) => {
  try {
    const { search, category } = req.query;
    const filter = { school: req.user.school };
    if (category) filter.category = category;
    if (search)   filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { author: { $regex: search, $options: 'i' } },
    ];
    const books = await Book.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: books });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createBook = async (req, res) => {
  try {
    const book = await Book.create({ ...req.body, school: req.user.school });
    res.status(201).json({ success: true, data: book });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};
exports.issueBook = async (req, res) => {
  try {
    const book = await Book.findOne({ _id: req.params.id, school: req.user.school });
    if (!book || book.available < 1) return res.status(400).json({ success: false, message: 'No copies available.' });
    book.available -= 1;
    await book.save();
    res.json({ success: true, data: book });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.returnBook = async (req, res) => {
  try {
    const book = await Book.findOne({ _id: req.params.id, school: req.user.school });
    if (!book) return res.status(404).json({ success: false, message: 'Book not found.' });
    if (book.available < book.copies) book.available += 1;
    await book.save();
    res.json({ success: true, data: book });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateBook = async (req, res) => {
  try {
    const { school, ...updates } = req.body;
    const book = await Book.findOneAndUpdate({ _id: req.params.id, school: req.user.school }, updates, { new: true, runValidators: true });
    if (!book) return res.status(404).json({ success: false, message: 'Book not found.' });
    res.json({ success: true, data: book });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};
exports.deleteBook = async (req, res) => {
  try {
    await Book.findOneAndDelete({ _id: req.params.id, school: req.user.school });
    res.json({ success: true, message: 'Book deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── EVENTS ────────────────────────────────────────────────────────────────────
exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find({ school: req.user.school }).sort({ date: 1 });
    res.json({ success: true, data: events });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createEvent = async (req, res) => {
  try {
    const event = await Event.create({ ...req.body, createdBy: req.user._id, school: req.user.school });
    res.status(201).json({ success: true, data: event });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};
exports.updateEvent = async (req, res) => {
  try {
    const { school, ...updates } = req.body;
    const event = await Event.findOneAndUpdate({ _id: req.params.id, school: req.user.school }, updates, { new: true });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    res.json({ success: true, data: event });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};
exports.deleteEvent = async (req, res) => {
  try {
    await Event.findOneAndDelete({ _id: req.params.id, school: req.user.school });
    res.json({ success: true, message: 'Event deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── DASHBOARD STATS ───────────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const school = new mongoose.Types.ObjectId(req.user.school);

    const [
      totalStudents, totalTeachers, totalStaff,
      feeStats, todayAttendance,
      recentStudents, recentNotices, upcomingEvents,
    ] = await Promise.all([
      Student.countDocuments({ isActive: true, school: req.user.school }),
      Teacher.countDocuments({ status: 'Active', school: req.user.school }),
      Staff.countDocuments({ status: 'Active', school: req.user.school }),
      Fee.aggregate([
        { $match: { school } },
        { $group: {
          _id: null,
          totalExpected: { $sum: '$amount' },
          totalCollected: { $sum: '$paid' },
          totalBalance: { $sum: '$balance' },
        }},
      ]),
      Attendance.aggregate([
        { $match: { school, date: { $gte: today } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Student.find({ isActive: true, school: req.user.school }).sort({ createdAt: -1 }).limit(5).select('name class studentId feeStatus rollNumber'),
      Notice.find({ school: req.user.school }).sort({ createdAt: -1 }).limit(5),
      Event.find({ date: { $gte: new Date() }, school: req.user.school }).sort({ date: 1 }).limit(6),
    ]);

    res.json({
      success: true,
      data: {
        counts: { students: totalStudents, teachers: totalTeachers, staff: totalStaff },
        feeStats: feeStats[0] || { totalExpected: 0, totalCollected: 0, totalBalance: 0 },
        todayAttendance,
        recentStudents,
        recentNotices,
        upcomingEvents,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
