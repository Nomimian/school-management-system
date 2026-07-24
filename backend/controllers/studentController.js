const mongoose = require('mongoose');
const Student = require('../models/Student');
const School = require('../models/School');

// @GET /api/students
exports.getStudents = async (req, res) => {
  try {
    const { class: cls, feeStatus, gender, search, page = 1, limit = 100 } = req.query;
    const filter = { school: req.user.school, isActive: true };
    if (cls)       filter.class = cls;
    if (feeStatus) filter.feeStatus = feeStatus;
    if (gender)    filter.gender = gender;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [students, total] = await Promise.all([
      Student.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Student.countDocuments(filter),
    ]);
    res.json({ success: true, total, count: students.length, data: students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/students/:id
exports.getStudent = async (req, res) => {
  try {
    const student = await Student.findOne({ _id: req.params.id, school: req.user.school });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/students
exports.createStudent = async (req, res) => {
  try {
    // Enforce the tenant's plan seat limit before creating.
    const school = await School.findById(req.user.school).select('maxStudents plan');
    if (school?.maxStudents) {
      const count = await Student.countDocuments({ school: req.user.school });
      if (count >= school.maxStudents)
        return res.status(403).json({ success: false, message: `You've reached your ${school.plan || ''} plan limit of ${school.maxStudents} students. Upgrade your plan to add more.` });
    }
    const student = await Student.create({ ...req.body, school: req.user.school });
    res.status(201).json({ success: true, data: student });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @PUT /api/students/:id
exports.updateStudent = async (req, res) => {
  try {
    // Never allow the tenant key to be reassigned via the request body
    const { school, ...updates } = req.body;
    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, school: req.user.school },
      updates,
      { new: true, runValidators: true },
    );
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @DELETE /api/students/:id
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, school: req.user.school },
      { isActive: false },
      { new: true },
    );
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json({ success: true, message: 'Student removed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/students/stats
exports.getStats = async (req, res) => {
  try {
    const school = new mongoose.Types.ObjectId(req.user.school);
    const base = { school, isActive: true };
    const [total, male, female, feeStats, classStats] = await Promise.all([
      Student.countDocuments(base),
      Student.countDocuments({ ...base, gender: 'Male' }),
      Student.countDocuments({ ...base, gender: 'Female' }),
      Student.aggregate([
        { $match: base },
        { $group: { _id: '$feeStatus', count: { $sum: 1 } } },
      ]),
      Student.aggregate([
        { $match: base },
        { $group: { _id: '$class', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);
    res.json({ success: true, data: { total, male, female, feeStats, classStats } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
