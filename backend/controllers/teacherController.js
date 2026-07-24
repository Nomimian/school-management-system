const Teacher = require('../models/Teacher');
const School = require('../models/School');

exports.getTeachers = async (req, res) => {
  try {
    const { status, subject, search } = req.query;
    const filter = { school: req.user.school };
    if (status)  filter.status = status;
    if (subject) filter.subject = { $regex: subject, $options: 'i' };
    if (search)  filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { teacherId: { $regex: search, $options: 'i' } },
    ];
    const teachers = await Teacher.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: teachers.length, data: teachers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ _id: req.params.id, school: req.user.school });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });
    res.json({ success: true, data: teacher });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createTeacher = async (req, res) => {
  try {
    // Enforce the tenant's plan seat limit before creating.
    const school = await School.findById(req.user.school).select('maxTeachers plan');
    if (school?.maxTeachers) {
      const count = await Teacher.countDocuments({ school: req.user.school });
      if (count >= school.maxTeachers)
        return res.status(403).json({ success: false, message: `You've reached your ${school.plan || ''} plan limit of ${school.maxTeachers} teachers. Upgrade your plan to add more.` });
    }
    const teacher = await Teacher.create({ ...req.body, school: req.user.school });
    res.status(201).json({ success: true, data: teacher });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    // Never allow the tenant key to be reassigned via the request body
    const { school, ...updates } = req.body;
    const teacher = await Teacher.findOneAndUpdate(
      { _id: req.params.id, school: req.user.school },
      updates,
      { new: true, runValidators: true },
    );
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });
    res.json({ success: true, data: teacher });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    await Teacher.findOneAndDelete({ _id: req.params.id, school: req.user.school });
    res.json({ success: true, message: 'Teacher deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
