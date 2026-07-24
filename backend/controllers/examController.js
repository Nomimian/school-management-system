const mongoose = require('mongoose');
const { Exam, Result } = require('../models/Exam');
const User = require('../models/User');
const { notify } = require('./notificationController');

// @GET /api/reports/subject-performance — avg % score per subject (this school)
exports.getSubjectPerformance = async (req, res) => {
  try {
    const school = new mongoose.Types.ObjectId(req.user.school);
    const data = await Result.aggregate([
      { $match: { school } },
      { $lookup: { from: 'exams', localField: 'exam', foreignField: '_id', as: 'exam' } },
      { $unwind: '$exam' },
      { $group: {
          _id: '$exam.subject',
          avgPct: { $avg: { $multiply: [{ $divide: ['$marks', { $ifNull: ['$exam.totalMarks', 100] }] }, 100] } },
          count: { $sum: 1 },
        } },
      { $match: { _id: { $ne: null } } },
      { $sort: { avgPct: -1 } },
    ]);
    res.json({ success: true, data: data.map(d => ({ subject: d._id, avg: Math.round(d.avgPct), count: d.count })) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getExams = async (req, res) => {
  try {
    const exams = await Exam.find({ school: req.user.school }).sort({ createdAt: -1 });
    res.json({ success: true, data: exams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createExam = async (req, res) => {
  try {
    const exam = await Exam.create({ ...req.body, school: req.user.school, createdBy: req.user._id });
    res.status(201).json({ success: true, data: exam });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateExam = async (req, res) => {
  try {
    const { school, ...updates } = req.body;
    const exam = await Exam.findOneAndUpdate({ _id: req.params.id, school: req.user.school }, updates, { new: true });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });
    res.json({ success: true, data: exam });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteExam = async (req, res) => {
  try {
    await Exam.findOneAndDelete({ _id: req.params.id, school: req.user.school });
    await Result.deleteMany({ exam: req.params.id, school: req.user.school });
    res.json({ success: true, message: 'Exam deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getResults = async (req, res) => {
  try {
    const { examId } = req.params;
    const results = await Result.find({ exam: examId, school: req.user.school })
      .populate('student', 'name class rollNumber studentId')
      .sort({ marks: -1 });
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addResult = async (req, res) => {
  try {
    // Verify the exam belongs to the requesting user's school
    const exam = await Exam.findOne({ _id: req.params.examId, school: req.user.school });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });
    const { school, ...body } = req.body;
    const result = await Result.create({
      ...body, exam: req.params.examId, school: req.user.school,
      totalMarks: exam.totalMarks, passMark: exam.passMark,   // grade against the exam's real scale
    });
    await result.populate('student', 'name class rollNumber');

    // Notify the child's linked parent(s) that a result was published.
    if (result.student?._id) {
      const parents = await User.find({ school: req.user.school, role: 'parent', children: result.student._id }).select('_id');
      await notify({
        school: req.user.school, users: parents.map(p => p._id), type: 'success',
        title: `New result for ${result.student.name}`,
        body: `${exam.name}: ${result.marks}/${exam.totalMarks} (${result.grade || '—'})`,
        link: '/parent',
      });
    }

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
