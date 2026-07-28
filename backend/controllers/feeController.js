const mongoose = require('mongoose');
const Fee = require('../models/Fee');
const Student = require('../models/Student');
const FeeHead = require('../models/FeeHead');
const School = require('../models/School');
const challan = require('../services/challanService');

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
    // The referenced student must belong to THIS school — never trust the id.
    const student = await Student.findOne({ _id: req.body.student, school: req.user.school }).select('_id');
    if (!student) return res.status(400).json({ success: false, message: 'Student not found in your school.' });

    let fee, created = true;
    try {
      fee = await Fee.create({ ...req.body, school: req.user.school, recordedBy: req.user._id });
    } catch (e) {
      // A challan already exists for this student+month (unique index). Instead of
      // creating a duplicate, record this payment against the existing challan.
      if (e.code !== 11000) throw e;
      created = false;
      fee = await Fee.findOne({ school: req.user.school, student: req.body.student, month: req.body.month, year: req.body.year });
      if (!fee) throw e;
      const paidNow = Number(req.body.paid) || 0;
      fee.paid    = Math.min(fee.amount, (fee.paid || 0) + paidNow);   // add to whatever was paid
      fee.status  = fee.paid >= fee.amount ? 'Paid' : (fee.paid > 0 ? 'Partial' : 'Pending');
      if (req.body.method)   fee.method   = req.body.method;
      if (req.body.paidDate) fee.paidDate = new Date(req.body.paidDate);
      if (req.body.remarks)  fee.remarks  = req.body.remarks;
      fee.recordedBy = req.user._id;
      await fee.save();
    }

    // Keep the student's fee status in sync.
    await Student.findOneAndUpdate({ _id: req.body.student, school: req.user.school }, { feeStatus: fee.status });
    const populated = await fee.populate([
      { path: 'student', select: 'name class rollNumber studentId' },
      { path: 'recordedBy', select: 'name' },
    ]);
    res.status(created ? 201 : 200).json({
      success: true,
      data: populated,
      message: created ? undefined : `A challan for ${fee.month} ${fee.year} already existed — your payment was recorded against it.`,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateFee = async (req, res) => {
  try {
    const { school, ...updates } = req.body;
    const fee = await Fee.findOneAndUpdate({ _id: req.params.id, school: req.user.school }, { ...updates, recordedBy: req.user._id }, { new: true, runValidators: true })
      .populate('student', 'name class rollNumber studentId')
      .populate('recordedBy', 'name');
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
    const { method = 'Cash', amount, paidDate } = req.body;
    const fee = await Fee.findOne({ _id: req.params.id, school: req.user.school });
    if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found.' });

    // How much is being collected now. Blank ⇒ clear the whole outstanding balance
    // (the common "paid in full" case). A smaller value records a partial payment.
    const outstanding = Math.max(0, (fee.amount || 0) - (fee.paid || 0));
    const payNow = (amount === undefined || amount === null || amount === '')
      ? outstanding
      : Math.max(0, Number(amount) || 0);

    fee.paid = Math.min(fee.amount, (fee.paid || 0) + payNow);
    fee.status = fee.paid >= fee.amount ? 'Paid' : (fee.paid > 0 ? 'Partial' : 'Pending');
    fee.method = method;
    fee.paidDate = paidDate ? new Date(paidDate) : new Date();
    fee.recordedBy = req.user._id;   // the logged-in user who received the payment
    await fee.save();                // pre-save assigns a receipt number once fully Paid
    await Student.findOneAndUpdate({ _id: fee.student, school: req.user.school }, { feeStatus: fee.status });
    const populated = await fee.populate([
      { path: 'student', select: 'name class rollNumber studentId' },
      { path: 'recordedBy', select: 'name' },
    ]);
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

// @GET /api/fees/generate/preview?month=August&year=2026
// Feeds the Challan Generator: the fee heads to bill, class breakdown with
// student counts, and how many challans already exist for that month.
exports.previewGenerate = async (req, res) => {
  try {
    const month = req.query.month || challan.MONTHS[new Date().getMonth()];
    const year  = Number(req.query.year) || new Date().getFullYear();
    const school = req.user.school;

    const [heads, students, existing, schoolDoc] = await Promise.all([
      FeeHead.find({ school, isActive: true }).sort({ order: 1, createdAt: 1 }).lean(),
      Student.find({ school, isActive: true }).select('class').lean(),
      Fee.find({ school, month, year }).select('student').lean(),
      School.findById(school).select('feeDay').lean(),
    ]);

    // Class breakdown (count of active students per class)
    const classMap = {};
    students.forEach(s => { const c = s.class || '—'; classMap[c] = (classMap[c] || 0) + 1; });
    const classes = Object.keys(classMap).sort().map(name => ({ name, students: classMap[name] }));

    res.json({
      success: true,
      data: {
        month, year,
        totalStudents: students.length,
        alreadyGenerated: existing.length,
        monthlyHeads:  heads.filter(h => h.frequency === 'Monthly').map(h => ({ name: h.name, amount: h.amount })),
        optionalHeads: heads.filter(h => h.frequency === 'Optional').map(h => ({ name: h.name, amount: h.amount })),
        classes,
        dueDay: schoolDoc?.feeDay || 10,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/fees/generate
// body: { month, year, scope:'school'|'class'|'students', class?, studentIds?,
//         heads:[{name,amount}], dueDay? }
exports.generateChallans = async (req, res) => {
  try {
    const { month, year, scope = 'school', class: className, studentIds, heads, dueDay = 10 } = req.body;
    if (!month || !year)
      return res.status(400).json({ success: false, message: 'Month and year are required.' });
    if (!Array.isArray(heads) || heads.length === 0)
      return res.status(400).json({ success: false, message: 'Select at least one fee head to bill.' });
    if (scope === 'class' && !className)
      return res.status(400).json({ success: false, message: 'A class is required for class-wide generation.' });
    if (scope === 'students' && (!Array.isArray(studentIds) || !studentIds.length))
      return res.status(400).json({ success: false, message: 'Select at least one student.' });

    // Sanitise heads → {name, amount>=0}
    const cleanHeads = heads
      .filter(h => h && h.name)
      .map(h => ({ name: String(h.name).trim(), amount: Math.max(0, Number(h.amount) || 0) }));

    const result = await challan.generateChallans({
      school: req.user.school, month, year, scope,
      className, studentIds, heads: cleanHeads,
      dueDay: Number(dueDay) || 10, createdBy: req.user._id,
    });

    res.json({
      success: true,
      message: `Generated ${result.created} challan(s) for ${month} ${year}` +
               (result.skipped ? ` · ${result.skipped} already existed and were skipped` : ''),
      data: result,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
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
