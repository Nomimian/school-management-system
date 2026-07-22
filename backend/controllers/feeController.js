const mongoose = require('mongoose');
const Fee = require('../models/Fee');
const Student = require('../models/Student');

exports.getFees = async (req, res) => {
  try {
    const { status, month, year, search } = req.query;
    const filter = { school: req.user.school };
    if (status) filter.status = status;
    if (month)  filter.month = month;
    if (year)   filter.year = Number(year);

    let fees = await Fee.find(filter)
      .populate('student', 'name class rollNumber studentId')
      .populate('recordedBy', 'name')
      .sort({ createdAt: -1 });

    if (search) {
      fees = fees.filter(f =>
        f.student?.name?.toLowerCase().includes(search.toLowerCase()) ||
        f.student?.class?.toLowerCase().includes(search.toLowerCase())
      );
    }
    res.json({ success: true, count: fees.length, data: fees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getFee = async (req, res) => {
  try {
    const fee = await Fee.findOne({ _id: req.params.id, school: req.user.school }).populate('student', 'name class rollNumber');
    if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found.' });
    res.json({ success: true, data: fee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createFee = async (req, res) => {
  try {
    const fee = await Fee.create({ ...req.body, school: req.user.school, recordedBy: req.user._id });
    // Update student fee status
    await Student.findOneAndUpdate({ _id: req.body.student, school: req.user.school }, { feeStatus: fee.status });
    const populated = await fee.populate('student', 'name class rollNumber studentId');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateFee = async (req, res) => {
  try {
    const { school, ...updates } = req.body;
    const fee = await Fee.findOneAndUpdate({ _id: req.params.id, school: req.user.school }, { ...updates, recordedBy: req.user._id }, { new: true, runValidators: true })
      .populate('student', 'name class rollNumber studentId');
    if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found.' });
    // Sync student fee status
    await Student.findOneAndUpdate({ _id: fee.student._id, school: req.user.school }, { feeStatus: fee.status });
    res.json({ success: true, data: fee });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.markPaid = async (req, res) => {
  try {
    const { method = 'Cash' } = req.body;
    const fee = await Fee.findOne({ _id: req.params.id, school: req.user.school });
    if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found.' });
    fee.paid = fee.amount;
    fee.status = 'Paid';
    fee.method = method;
    fee.paidDate = new Date();
    await fee.save();
    await Student.findOneAndUpdate({ _id: fee.student, school: req.user.school }, { feeStatus: 'Paid' });
    const populated = await fee.populate('student', 'name class rollNumber studentId');
    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteFee = async (req, res) => {
  try {
    await Fee.findOneAndDelete({ _id: req.params.id, school: req.user.school });
    res.json({ success: true, message: 'Fee record deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getFeeStats = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const school = new mongoose.Types.ObjectId(req.user.school);
    const [summary, monthly] = await Promise.all([
      Fee.aggregate([
        { $match: { school, year: Number(year) } },
        { $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalPaid: { $sum: '$paid' },
        }},
      ]),
      Fee.aggregate([
        { $match: { school, year: Number(year) } },
        { $group: {
          _id: '$month',
          collected: { $sum: '$paid' },
          expected: { $sum: '$amount' },
        }},
        { $sort: { _id: 1 } },
      ]),
    ]);
    res.json({ success: true, data: { summary, monthly } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
