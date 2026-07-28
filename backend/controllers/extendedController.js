const mongoose = require('mongoose');
const {
  Admission, Route, StudentTransport, Homework, Message,
  Account, Promotion, Certificate, Subject, GradeScale,
  FeeStructure, Timetable, StudentHealth,
} = require('../models/Extended');
const Student = require('../models/Student');
const { Exam, Result } = require('../models/Exam');
const Fee = require('../models/Fee');

// ── ADMISSIONS ────────────────────────────────────────────────────────────────
exports.getAdmissions = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = { school: req.user.school };
    if (status) filter.status = status;
    if (search) filter.$or = [
      { applicantName: { $regex: search, $options: 'i' } },
      { admissionNo:   { $regex: search, $options: 'i' } },
    ];
    const data = await Admission.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.createAdmission = async (req, res) => {
  try {
    const admission = await Admission.create({ ...req.body, school: req.user.school });
    res.status(201).json({ success: true, data: admission });
  } catch(e) { res.status(400).json({ success: false, message: e.message }); }
};

exports.updateAdmission = async (req, res) => {
  try {
    const { school, ...updates } = req.body;
    const admission = await Admission.findOneAndUpdate(
      { _id: req.params.id, school: req.user.school },
      updates,
      { new: true },
    );
    // Enrolling an applicant adds them to the Students roster (idempotent).
    let createdStudent = null;
    if (req.body.status === 'Enrolled' && admission && !admission.enrolledStudent) {
      createdStudent = await Student.create({
        name: admission.applicantName,
        class: admission.applyingClass,
        gender: admission.gender,
        dateOfBirth: admission.dateOfBirth,
        religion: admission.religion,
        bloodGroup: admission.bloodGroup,
        guardian: admission.guardian,
        address: admission.address,
        photo: admission.photo,          // carry the uploaded applicant photo onto the roster
        phone: admission.guardian?.phone,
        admissionDate: new Date(),
        enrollment: admission.enrollment || [],   // carry Group/House/etc. onto the roster
        feeProfile: admission.feeProfile || [],   // carry the agreed fee/discounts onto the roster
        feeAmount: admission.feeAmount || 0,
        feeStatus: 'Pending',
        school: req.user.school,
      });
      admission.enrolledStudent = createdStudent._id;
      await admission.save();
    }
    res.json({ success: true, data: admission, enrolledStudent: createdStudent });
  } catch(e) { res.status(400).json({ success: false, message: e.message }); }
};

exports.deleteAdmission = async (req, res) => {
  try {
    await Admission.findOneAndDelete({ _id: req.params.id, school: req.user.school });
    res.json({ success: true, message: 'Admission deleted.' });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── TRANSPORT ─────────────────────────────────────────────────────────────────
exports.getRoutes = async (req, res) => {
  try {
    const routes = await Route.find({ school: req.user.school, isActive: true }).sort({ routeName: 1 });
    res.json({ success: true, data: routes });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};
exports.createRoute = async (req, res) => {
  try { const r = await Route.create({ ...req.body, school: req.user.school }); res.status(201).json({ success:true, data:r }); }
  catch(e) { res.status(400).json({ success:false, message:e.message }); }
};
exports.updateRoute = async (req, res) => {
  try { const { school, ...updates } = req.body; const r = await Route.findOneAndUpdate({ _id: req.params.id, school: req.user.school }, updates, {new:true}); res.json({success:true,data:r}); }
  catch(e) { res.status(400).json({ success:false, message:e.message }); }
};
exports.deleteRoute = async (req, res) => {
  try { await Route.findOneAndDelete({ _id: req.params.id, school: req.user.school }); res.json({success:true,message:'Route deleted.'}); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
exports.getStudentTransports = async (req, res) => {
  try {
    const filter = { school: req.user.school };
    if (req.query.route) filter.route = req.query.route;
    const data = await StudentTransport.find(filter)
      .populate('student','name class rollNumber').populate('route','routeName routeNo');
    res.json({ success:true, data });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
exports.assignTransport = async (req, res) => {
  try {
    const { school, ...updates } = req.body;
    const t = await StudentTransport.findOneAndUpdate(
      {student:req.body.student, school: req.user.school},
      { ...updates, school: req.user.school },
      {upsert:true, new:true}
    );
    res.json({success:true,data:t});
  } catch(e) { res.status(400).json({ success:false, message:e.message }); }
};

// ── HOMEWORK ──────────────────────────────────────────────────────────────────
exports.getHomework = async (req, res) => {
  try {
    const filter = { school: req.user.school };
    if (req.query.class)   filter.class   = req.query.class;
    if (req.query.subject) filter.subject = req.query.subject;
    const data = await Homework.find(filter).populate('teacher','name').sort({createdAt:-1});
    res.json({ success:true, data });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
exports.createHomework = async (req, res) => {
  try { const h = await Homework.create({ ...req.body, school: req.user.school }); res.status(201).json({ success:true, data:h }); }
  catch(e) { res.status(400).json({ success:false, message:e.message }); }
};
exports.updateHomework = async (req, res) => {
  try { const { school, ...updates } = req.body; const h = await Homework.findOneAndUpdate({ _id: req.params.id, school: req.user.school }, updates, {new:true}); res.json({success:true,data:h}); }
  catch(e) { res.status(400).json({ success:false, message:e.message }); }
};
exports.deleteHomework = async (req, res) => {
  try { await Homework.findOneAndDelete({ _id: req.params.id, school: req.user.school }); res.json({success:true,message:'Deleted.'}); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── MESSAGES ──────────────────────────────────────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const data = await Message.find({ school: req.user.school }).populate('sentBy','name').sort({sentAt:-1}).limit(100);
    res.json({ success:true, data });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
exports.sendMessage = async (req, res) => {
  try {
    // count recipients
    let count = 0;
    if (req.body.audience === 'Students' || req.body.audience === 'All') count += await Student.countDocuments({school: req.user.school, isActive:true});
    const msg = await Message.create({ ...req.body, school: req.user.school, sentBy: req.user._id, recipients: count });
    res.status(201).json({ success:true, data: msg });
  } catch(e) { res.status(400).json({ success:false, message:e.message }); }
};
exports.deleteMessage = async (req, res) => {
  try { await Message.findOneAndDelete({ _id: req.params.id, school: req.user.school }); res.json({success:true,message:'Deleted.'}); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── ACCOUNTS ──────────────────────────────────────────────────────────────────
exports.getAccounts = async (req, res) => {
  try {
    const filter = { school: req.user.school };
    if (req.query.type)     filter.type     = req.query.type;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.month) {
      const [y,m] = req.query.month.split('-');
      filter.date = { $gte: new Date(y,m-1,1), $lte: new Date(y,m,0) };
    }
    const data = await Account.find(filter).sort({date:-1});
    res.json({ success:true, data });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
exports.createAccount = async (req, res) => {
  try { const a = await Account.create({...req.body, school: req.user.school, recordedBy:req.user._id}); res.status(201).json({success:true,data:a}); }
  catch(e) { res.status(400).json({ success:false, message:e.message }); }
};
exports.updateAccount = async (req, res) => {
  try {
    const { school, ...updates } = req.body;
    const a = await Account.findOneAndUpdate({ _id: req.params.id, school: req.user.school }, updates, { new: true, runValidators: true });
    if (!a) return res.status(404).json({ success:false, message:'Record not found.' });
    res.json({ success:true, data:a });
  } catch(e) { res.status(400).json({ success:false, message:e.message }); }
};
exports.deleteAccount = async (req, res) => {
  try { await Account.findOneAndDelete({ _id: req.params.id, school: req.user.school }); res.json({success:true,message:'Deleted.'}); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
exports.getAccountStats = async (req, res) => {
  try {
    const school = new mongoose.Types.ObjectId(req.user.school);
    const [income, expense] = await Promise.all([
      Account.aggregate([{$match:{school, type:'Income'}},{$group:{_id:'$category',total:{$sum:'$amount'}}}]),
      Account.aggregate([{$match:{school, type:'Expense'}},{$group:{_id:'$category',total:{$sum:'$amount'}}}]),
    ]);
    const totalIncome  = income.reduce((s,x)=>s+x.total,0);
    const totalExpense = expense.reduce((s,x)=>s+x.total,0);
    res.json({ success:true, data:{ income, expense, totalIncome, totalExpense, balance: totalIncome - totalExpense } });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── SUBJECTS ──────────────────────────────────────────────────────────────────
exports.getSubjects = async (req, res) => {
  try {
    const filter = { school: req.user.school };
    if (req.query.class) filter.class = req.query.class;
    const data = await Subject.find(filter).populate('teacher','name');
    res.json({ success:true, data });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
exports.createSubject = async (req, res) => {
  try { const s = await Subject.create({ ...req.body, school: req.user.school }); res.status(201).json({success:true,data:s}); }
  catch(e) { res.status(400).json({ success:false, message:e.message }); }
};
exports.deleteSubject = async (req, res) => {
  try { await Subject.findOneAndDelete({ _id: req.params.id, school: req.user.school }); res.json({success:true,message:'Deleted.'}); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── GRADE SCALE ───────────────────────────────────────────────────────────────
exports.getGradeScales = async (req, res) => {
  try { const data = await GradeScale.find({ school: req.user.school }); res.json({success:true,data}); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
exports.createGradeScale = async (req, res) => {
  try { const g = await GradeScale.create({ ...req.body, school: req.user.school }); res.status(201).json({success:true,data:g}); }
  catch(e) { res.status(400).json({ success:false, message:e.message }); }
};

// ── FEE STRUCTURE ─────────────────────────────────────────────────────────────
exports.getFeeStructures = async (req, res) => {
  try {
    const filter = { school: req.user.school };
    if (req.query.class) filter.class = req.query.class;
    const data = await FeeStructure.find(filter).sort({class:1});
    res.json({ success:true, data });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
exports.saveFeeStructure = async (req, res) => {
  try {
    const { school, ...updates } = req.body;
    const fs = await FeeStructure.findOneAndUpdate(
      { class: req.body.class, session: req.body.session, school: req.user.school },
      { ...updates, school: req.user.school }, { upsert:true, new:true }
    );
    res.json({ success:true, data:fs });
  } catch(e) { res.status(400).json({ success:false, message:e.message }); }
};

// ── TIMETABLE ─────────────────────────────────────────────────────────────────
exports.getTimetable = async (req, res) => {
  try {
    const filter = { school: req.user.school };
    if (req.query.class) filter.class = req.query.class;
    const data = await Timetable.find(filter).populate('periods.teacher','name');
    res.json({ success:true, data });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
exports.saveTimetable = async (req, res) => {
  try {
    const { school, ...updates } = req.body;
    const t = await Timetable.findOneAndUpdate(
      { class: req.body.class, day: req.body.day, school: req.user.school },
      { ...updates, school: req.user.school }, { upsert:true, new:true }
    );
    res.json({ success:true, data:t });
  } catch(e) { res.status(400).json({ success:false, message:e.message }); }
};

// ── PROMOTIONS ────────────────────────────────────────────────────────────────
exports.promoteStudents = async (req, res) => {
  try {
    const { promotions, academicYear } = req.body;
    if (!Array.isArray(promotions) || promotions.length === 0)
      return res.status(400).json({ success:false, message:'promotions must be a non-empty array.' });
    const ops = [];
    for (const p of promotions) {
      ops.push(Promotion.create({ ...p, academicYear, promotedBy: req.user._id, school: req.user.school }));
      if (p.status === 'Promoted') {
        ops.push(Student.findOneAndUpdate({ _id: p.student, school: req.user.school }, { class: p.toClass }));
      }
    }
    await Promise.all(ops);
    res.json({ success:true, message: `${promotions.length} students processed.` });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
exports.getPromotions = async (req, res) => {
  try {
    const filter = { school: req.user.school };
    if (req.query.year) filter.academicYear = req.query.year;
    const data = await Promotion.find(filter)
      .populate('student','name class studentId').sort({createdAt:-1});
    res.json({ success:true, data });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── CERTIFICATES ──────────────────────────────────────────────────────────────
exports.getCertificates = async (req, res) => {
  try {
    const filter = { school: req.user.school };
    if (req.query.student) filter.student = req.query.student;
    if (req.query.type)    filter.type    = req.query.type;
    const data = await Certificate.find(filter).populate('student','name class studentId rollNumber').sort({createdAt:-1});
    res.json({ success:true, data });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
exports.createCertificate = async (req, res) => {
  try { const c = await Certificate.create({ ...req.body, school: req.user.school }); await c.populate('student','name class studentId rollNumber'); res.status(201).json({success:true,data:c}); }
  catch(e) { res.status(400).json({ success:false, message:e.message }); }
};
exports.deleteCertificate = async (req, res) => {
  try { await Certificate.findOneAndDelete({ _id: req.params.id, school: req.user.school }); res.json({ success:true, message:'Certificate deleted.' }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── REPORT CARD (most important!) ─────────────────────────────────────────────
exports.generateReportCard = async (req, res) => {
  try {
    const { studentId, examIds } = req.query;
    const student = await Student.findOne({ _id: studentId, school: req.user.school });
    if (!student) return res.status(404).json({ success:false, message:'Student not found.' });

    const examsToFetch = examIds ? examIds.split(',') : [];

    // Get all results for this student
    const resultsQuery = examsToFetch.length
      ? { student: studentId, school: req.user.school, exam: { $in: examsToFetch } }
      : { student: studentId, school: req.user.school };

    const results = await Result.find(resultsQuery)
      .populate('exam', 'name class totalMarks passMark subject startDate');

    // Group by exam
    const byExam = {};
    for (const r of results) {
      const examName = r.exam?.name || 'Unknown';
      if (!byExam[examName]) {
        byExam[examName] = { exam: r.exam, results: [] };
      }
      byExam[examName].results.push(r);
    }

    // Aggregate totals
    const totalObtained  = results.reduce((s,r) => s + r.marks, 0);
    const totalMax       = results.reduce((s,r) => s + (r.exam?.totalMarks || 100), 0);
    const percentage     = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0;
    const passed         = results.every(r => r.isPassed);

    // Determine final grade
    const getGrade = (pct) => {
      if (pct >= 90) return { grade:'A+', gpa:4.0, remarks:'Outstanding' };
      if (pct >= 80) return { grade:'A',  gpa:3.7, remarks:'Excellent' };
      if (pct >= 70) return { grade:'B+', gpa:3.3, remarks:'Very Good' };
      if (pct >= 60) return { grade:'B',  gpa:3.0, remarks:'Good' };
      if (pct >= 50) return { grade:'C',  gpa:2.5, remarks:'Satisfactory' };
      if (pct >= 40) return { grade:'D',  gpa:2.0, remarks:'Needs Improvement' };
      return           { grade:'F',  gpa:0.0, remarks:'Fail' };
    };

    // With no results, a "0% / F / rank 0" card is misleading — report no-data.
    const finalGrade = results.length
      ? getGrade(Number(percentage))
      : { grade: '—', gpa: null, remarks: 'No results recorded' };

    // Class rank (among students with results in same class)
    const classResults = results.length ? await Result.aggregate([
      { $match: { school: new mongoose.Types.ObjectId(req.user.school), exam: { $in: results.map(r=>r.exam?._id).filter(Boolean) } } },
      { $group: { _id:'$student', total:{ $sum:'$marks' } } },
      { $sort:  { total: -1 } },
    ]) : [];
    const rankIdx = classResults.findIndex(r => r._id?.toString() === studentId);
    const rank = rankIdx >= 0 ? rankIdx + 1 : null;

    const reportCard = {
      student: {
        ...student.toObject(),
        photo: student.photo,
      },
      examResults: Object.values(byExam),
      summary: {
        totalObtained,
        totalMax,
        percentage: Number(percentage),
        ...finalGrade,
        passed: results.length ? passed : false,
        hasResults: results.length > 0,
        rank,
        totalStudents: classResults.length,
        resultDate: new Date(),
      },
    };

    res.json({ success:true, data: reportCard });
  } catch(e) {
    console.error(e);
    res.status(500).json({ success:false, message:e.message });
  }
};

// ── HEALTH RECORDS ────────────────────────────────────────────────────────────
exports.getStudentHealth = async (req, res) => {
  try {
    const data = await StudentHealth.findOne({student: req.params.studentId, school: req.user.school}).populate('student','name class');
    res.json({ success:true, data });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
exports.saveStudentHealth = async (req, res) => {
  try {
    const { school, ...updates } = req.body;
    const h = await StudentHealth.findOneAndUpdate(
      {student:req.params.studentId, school: req.user.school},
      { ...updates, school: req.user.school }, {upsert:true, new:true}
    );
    res.json({ success:true, data:h });
  } catch(e) { res.status(400).json({ success:false, message:e.message }); }
};
