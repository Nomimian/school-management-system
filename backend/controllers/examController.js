const mongoose = require('mongoose');
const { Exam, Result, ExamGroup, ExamAttendance } = require('../models/Exam');
const { Subject } = require('../models/Extended');
const User = require('../models/User');
const Student = require('../models/Student');
const { notify } = require('./notificationController');
const { resolveGrade, getDefaultScale } = require('../utils/grading');

// Roster for a class (school-scoped), ordered by roll number then name.
// `section` narrows to one section; enrollment is included so a subject's stream
// tag can be matched to each student.
async function classRoster(schoolId, className, { section } = {}) {
  const q = { school: schoolId, class: className };
  if (section) q.section = section;
  return Student.find(q)
    .select('name class section rollNumber studentId photo enrollment')
    .sort({ rollNumber: 1, name: 1 });
}

// The subjects configured for a class (Settings → Subjects), ordered.
async function classSubjects(schoolId, className) {
  return Subject.find({ school: schoolId, class: className }).sort({ order: 1, name: 1 }).lean();
}

// Marks metadata + stream for a subject, from the class config (fallback 100/40).
function subjectMetaFrom(subjects, name) {
  const s = (subjects || []).find(x => x.name === name);
  return { totalMarks: s?.totalMarks || 100, passMark: s?.passMark || 40, group: s?.group || '' };
}

// Does a subject's stream tag apply to this student? Empty ⇒ everyone. The tag
// may list several streams (comma-separated, e.g. a shared subject like Physics
// taken by Pre-Medical, Pre-Engineering and ICS); it applies when ANY of them
// matches one of the student's enrollment values.
function studentInStream(student, group) {
  const wanted = String(group || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!wanted.length) return true;
  const have = (student.enrollment || []).map(e => String(e.value || '').trim().toLowerCase());
  return wanted.some(w => have.includes(w));
}

// @GET /api/reports/subject-performance — avg % score per subject (this school)
exports.getSubjectPerformance = async (req, res) => {
  try {
    const school = new mongoose.Types.ObjectId(req.user.school);
    const data = await Result.aggregate([
      { $match: { school } },
      { $lookup: { from: 'exams', localField: 'exam', foreignField: '_id', as: 'exam' } },
      { $unwind: '$exam' },
      { $group: {
          // Prefer the per-result subject; fall back to the exam's legacy subject.
          _id: { $ifNull: ['$subject', '$exam.subject'] },
          avgPct: { $avg: { $multiply: [{ $divide: ['$marks', { $ifNull: ['$totalMarks', 100] }] }, 100] } },
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

// ── EXAM GROUPS ───────────────────────────────────────────────────────────────
exports.getExamGroups = async (req, res) => {
  try {
    const groups = await ExamGroup.find({ school: req.user.school }).sort({ order: 1, createdAt: -1 }).lean();
    // Attach exam counts so the UI can show "4 exams" without N extra calls.
    const counts = await Exam.aggregate([
      { $match: { school: new mongoose.Types.ObjectId(req.user.school), examGroup: { $ne: null } } },
      { $group: { _id: '$examGroup', count: { $sum: 1 } } },
    ]);
    const map = Object.fromEntries(counts.map(c => [String(c._id), c.count]));
    res.json({ success: true, data: groups.map(g => ({ ...g, examCount: map[String(g._id)] || 0 })) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createExamGroup = async (req, res) => {
  try {
    const group = await ExamGroup.create({ ...req.body, school: req.user.school, createdBy: req.user._id });
    res.status(201).json({ success: true, data: group });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

exports.updateExamGroup = async (req, res) => {
  try {
    const { school, ...updates } = req.body;
    const group = await ExamGroup.findOneAndUpdate({ _id: req.params.id, school: req.user.school }, updates, { new: true });
    if (!group) return res.status(404).json({ success: false, message: 'Exam group not found.' });
    res.json({ success: true, data: group });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

exports.deleteExamGroup = async (req, res) => {
  try {
    const examsInGroup = await Exam.countDocuments({ examGroup: req.params.id, school: req.user.school });
    if (examsInGroup > 0)
      return res.status(400).json({ success: false, message: `This group still has ${examsInGroup} exam(s). Move or delete them first.` });
    await ExamGroup.findOneAndDelete({ _id: req.params.id, school: req.user.school });
    res.json({ success: true, message: 'Exam group deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── EXAMS ─────────────────────────────────────────────────────────────────────
exports.getExams = async (req, res) => {
  try {
    const filter = { school: req.user.school };
    if (req.query.group)  filter.examGroup = req.query.group;
    if (req.query.class)  filter.class = req.query.class;
    if (req.query.status) filter.status = req.query.status;
    const exams = await Exam.find(filter).populate('examGroup', 'name type session').sort({ createdAt: -1 });
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
    await ExamAttendance.deleteMany({ exam: req.params.id, school: req.user.school });
    res.json({ success: true, message: 'Exam deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PATCH /api/exams/:id/publish — toggle result visibility & notify parents once.
exports.publishExam = async (req, res) => {
  try {
    const publish = req.body.publish !== false;
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, school: req.user.school },
      { resultPublished: publish },
      { new: true },
    );
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

    if (publish) {
      // Notify parents of every child in this class who has a result recorded.
      const studentIds = await Result.distinct('student', { exam: exam._id, school: req.user.school });
      if (studentIds.length) {
        const parents = await User.find({ school: req.user.school, role: 'parent', children: { $in: studentIds } }).select('_id');
        await notify({
          school: req.user.school, users: parents.map(p => p._id), type: 'success',
          title: `Results published: ${exam.name}`,
          body: `${exam.name} results for ${exam.class} are now available.`,
          link: '/parent',
        });
      }
    }
    res.json({ success: true, data: exam });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// ── MARKS ENTRY ─────────────────────────────────────────────────────────────
// @GET /api/exams/:examId/marksheet?subject= — roster + any existing marks for
// the chosen subject, ready to render an editable grid.
exports.getMarksheet = async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.examId, school: req.user.school });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

    const subject = req.query.subject || null;
    const section = req.query.section || null;
    const subjects = await classSubjects(req.user.school, exam.class);
    const meta = subjectMetaFrom(subjects, subject);
    const [studentsRaw, results] = await Promise.all([
      classRoster(req.user.school, exam.class, { section }),
      Result.find({ exam: exam._id, school: req.user.school, subject }).lean(),
    ]);
    // Only students the subject's stream applies to (all, when untagged).
    const students = studentsRaw.filter(s => studentInStream(s, meta.group));
    const byStudent = Object.fromEntries(results.map(r => [String(r.student), r]));

    const rows = students.map(s => {
      const r = byStudent[String(s._id)];
      return {
        student: s._id, name: s.name, rollNumber: s.rollNumber, studentId: s.studentId, section: s.section,
        marks: r ? r.marks : '', isAbsent: r ? !!r.isAbsent : false,
        grade: r ? r.grade : null, isPassed: r ? r.isPassed : null, remarks: r ? r.remarks : '',
      };
    });
    res.json({ success: true, data: { exam, subject, group: meta.group, totalMarks: meta.totalMarks, passMark: meta.passMark, students: rows } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// @POST /api/exams/:examId/marks — bulk upsert marks for one subject.
// body: { subject, entries: [{ student, marks, isAbsent, remarks }] }
exports.saveMarks = async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.examId, school: req.user.school });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

    const subject = req.body.subject || null;
    const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
    if (!entries.length) return res.status(400).json({ success: false, message: 'No marks submitted.' });

    const subjects = await classSubjects(req.user.school, exam.class);
    const { totalMarks, passMark, group } = subjectMetaFrom(subjects, subject);
    const scale = await getDefaultScale(req.user.school);

    // Only touch students in this class who the subject's stream applies to.
    const roster = await classRoster(req.user.school, exam.class);
    const rosterIds = new Set(roster.filter(s => studentInStream(s, group)).map(s => String(s._id)));

    const ops = [];
    for (const e of entries) {
      if (!e.student || !rosterIds.has(String(e.student))) continue;
      const isAbsent = !!e.isAbsent;
      const marks = isAbsent ? 0 : Math.max(0, Math.min(totalMarks, Number(e.marks) || 0));
      // Skip empty, non-absent cells so a half-filled grid doesn't create 0-mark rows.
      if (!isAbsent && (e.marks === '' || e.marks === null || e.marks === undefined)) continue;

      const pct = totalMarks > 0 ? (marks / totalMarks) * 100 : 0;
      const g = isAbsent ? { grade: 'AB', gpa: null, remarks: '' } : resolveGrade(pct, scale);
      ops.push({
        updateOne: {
          filter: { school: req.user.school, exam: exam._id, student: e.student, subject },
          update: { $set: {
            school: req.user.school, exam: exam._id, examGroup: exam.examGroup || null,
            student: e.student, class: exam.class, subject,
            marks, totalMarks, passMark, isAbsent,
            grade: g.grade, gpa: g.gpa, isPassed: !isAbsent && marks >= passMark,
            remarks: e.remarks || '',
          } },
          upsert: true,
        },
      });
    }
    if (!ops.length) return res.status(400).json({ success: false, message: 'Nothing to save.' });
    await Result.bulkWrite(ops);

    const results = await Result.find({ exam: exam._id, school: req.user.school, subject })
      .populate('student', 'name rollNumber class').lean();
    res.json({ success: true, saved: ops.length, data: results });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// ── LEGACY / SIMPLE RESULTS (kept for back-compat + parent portal) ────────────
exports.getResults = async (req, res) => {
  try {
    const { examId } = req.params;
    const filter = { exam: examId, school: req.user.school };
    if (req.query.subject !== undefined) filter.subject = req.query.subject || null;
    const results = await Result.find(filter)
      .populate('student', 'name class rollNumber studentId')
      .sort({ marks: -1 });
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addResult = async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.examId, school: req.user.school });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });
    const inSchool = await Student.findOne({ _id: req.body.student, school: req.user.school }).select('_id');
    if (!inSchool) return res.status(400).json({ success: false, message: 'Student not found in your school.' });

    const subject = req.body.subject || null;
    const subjects = await classSubjects(req.user.school, exam.class);
    const { totalMarks, passMark } = subjectMetaFrom(subjects, subject);
    const scale = await getDefaultScale(req.user.school);
    const marks = Math.max(0, Number(req.body.marks) || 0);
    const pct = totalMarks > 0 ? (marks / totalMarks) * 100 : 0;
    const g = resolveGrade(pct, scale);

    const result = await Result.findOneAndUpdate(
      { school: req.user.school, exam: exam._id, student: req.body.student, subject },
      { $set: {
        school: req.user.school, exam: exam._id, examGroup: exam.examGroup || null,
        student: req.body.student, class: exam.class, subject,
        marks, totalMarks, passMark,
        grade: g.grade, gpa: g.gpa, isPassed: marks >= passMark, isAbsent: false,
        remarks: req.body.remarks || '',
      } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    await result.populate('student', 'name class rollNumber');

    if (result.student?._id) {
      const parents = await User.find({ school: req.user.school, role: 'parent', children: result.student._id }).select('_id');
      await notify({
        school: req.user.school, users: parents.map(p => p._id), type: 'success',
        title: `New result for ${result.student.name}`,
        body: `${exam.name}: ${result.marks}/${totalMarks} (${result.grade || '—'})`,
        link: '/parent',
      });
    }
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── EXAM ATTENDANCE ───────────────────────────────────────────────────────────
// @GET /api/exams/:examId/attendance?subject= — roster + any recorded status.
exports.getExamAttendance = async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.examId, school: req.user.school });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });
    const subject = req.query.subject || null;
    const section = req.query.section || null;
    const subjects = await classSubjects(req.user.school, exam.class);
    const { group } = subjectMetaFrom(subjects, subject);
    const [studentsRaw, records] = await Promise.all([
      classRoster(req.user.school, exam.class, { section }),
      ExamAttendance.find({ exam: exam._id, school: req.user.school, subject }).lean(),
    ]);
    const students = studentsRaw.filter(s => studentInStream(s, group));
    const byStudent = Object.fromEntries(records.map(r => [String(r.student), r]));
    const rows = students.map(s => {
      const r = byStudent[String(s._id)];
      return {
        student: s._id, name: s.name, rollNumber: s.rollNumber, studentId: s.studentId, section: s.section,
        status: r ? r.status : 'Present', remarks: r ? r.remarks : '',
      };
    });
    res.json({ success: true, data: { exam, subject, students: rows } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// @POST /api/exams/:examId/attendance — bulk upsert exam attendance.
// body: { subject, date, entries: [{ student, status, remarks }] }
exports.saveExamAttendance = async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.examId, school: req.user.school });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });
    const subject = req.body.subject || null;
    const date = req.body.date ? new Date(req.body.date) : new Date();
    const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
    if (!entries.length) return res.status(400).json({ success: false, message: 'No attendance submitted.' });

    const subjects = await classSubjects(req.user.school, exam.class);
    const { group } = subjectMetaFrom(subjects, subject);
    const roster = await classRoster(req.user.school, exam.class);
    const rosterIds = new Set(roster.filter(s => studentInStream(s, group)).map(s => String(s._id)));
    const ops = [];
    for (const e of entries) {
      if (!e.student || !rosterIds.has(String(e.student))) continue;
      ops.push({
        updateOne: {
          filter: { school: req.user.school, exam: exam._id, student: e.student, subject },
          update: { $set: {
            school: req.user.school, exam: exam._id, student: e.student, class: exam.class,
            subject, date, status: e.status || 'Present', remarks: e.remarks || '',
            markedBy: req.user._id,
          } },
          upsert: true,
        },
      });
    }
    if (!ops.length) return res.status(400).json({ success: false, message: 'Nothing to save.' });
    await ExamAttendance.bulkWrite(ops);
    res.json({ success: true, saved: ops.length });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// ── EXAM REPORT — class result sheet + analytics for one exam ─────────────────
exports.getExamReport = async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.examId, school: req.user.school }).lean();
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

    const scale = await getDefaultScale(req.user.school);
    const [subjectDocs, students, results, attendance] = await Promise.all([
      classSubjects(req.user.school, exam.class),
      classRoster(req.user.school, exam.class),
      Result.find({ exam: exam._id, school: req.user.school }).lean(),
      ExamAttendance.find({ exam: exam._id, school: req.user.school }).lean(),
    ]);
    // Subject columns come from the class config; fall back to whatever subjects
    // actually have recorded results (covers exams predating the config).
    const subjectNames = subjectDocs.length
      ? subjectDocs.map(s => s.name)
      : [...new Set(results.map(r => r.subject).filter(Boolean))];

    // Group results per student.
    const perStudent = new Map();
    for (const r of results) {
      const key = String(r.student);
      if (!perStudent.has(key)) perStudent.set(key, []);
      perStudent.get(key).push(r);
    }

    // Build a per-student summary row.
    let rows = students.map(s => {
      const rs = perStudent.get(String(s._id)) || [];
      const obtained = rs.reduce((sum, r) => sum + (r.isAbsent ? 0 : r.marks), 0);
      const max = rs.reduce((sum, r) => sum + (r.totalMarks || 0), 0);
      const pct = max > 0 ? (obtained / max) * 100 : 0;
      const anyFail = rs.some(r => r.isAbsent || !r.isPassed);
      const g = rs.length ? resolveGrade(pct, scale) : { grade: '—', gpa: null, remarks: 'No result' };
      const subjectMarks = {};
      for (const r of rs) subjectMarks[r.subject || 'Overall'] = { marks: r.marks, isAbsent: r.isAbsent, grade: r.grade, isPassed: r.isPassed, totalMarks: r.totalMarks };
      return {
        student: s._id, name: s.name, rollNumber: s.rollNumber, studentId: s.studentId, section: s.section,
        subjects: subjectMarks, obtained, max, percentage: Math.round(pct * 100) / 100,
        grade: g.grade, gpa: g.gpa, result: rs.length ? (anyFail ? 'Fail' : 'Pass') : '—', hasResult: rs.length > 0,
      };
    });

    // Rank students who actually have results (by obtained desc), keep the rest.
    const withResults = rows.filter(r => r.hasResult).sort((a, b) => b.obtained - a.obtained);
    withResults.forEach((r, i) => { r.rank = i + 1; });
    rows = [...withResults, ...rows.filter(r => !r.hasResult)];

    // Subject-wise analytics.
    const subjectStats = subjectNames.map(name => {
      const rs = results.filter(r => (r.subject || null) === name && !r.isAbsent);
      const count = rs.length;
      const avg = count ? rs.reduce((s, r) => s + r.marks, 0) / count : 0;
      const highest = count ? Math.max(...rs.map(r => r.marks)) : 0;
      const lowest = count ? Math.min(...rs.map(r => r.marks)) : 0;
      const passed = rs.filter(r => r.isPassed).length;
      return { subject: name, entries: count, avg: Math.round(avg * 100) / 100, highest, lowest,
        passRate: count ? Math.round((passed / count) * 100) : 0 };
    });

    const totalWithResults = withResults.length;
    const passedCount = withResults.filter(r => r.result === 'Pass').length;
    const classAvg = totalWithResults ? Math.round((withResults.reduce((s, r) => s + r.percentage, 0) / totalWithResults) * 100) / 100 : 0;

    res.json({ success: true, data: {
      exam,
      subjects: subjectNames,
      students: rows,
      subjectStats,
      summary: {
        totalStudents: students.length,
        withResults: totalWithResults,
        passed: passedCount,
        failed: totalWithResults - passedCount,
        passRate: totalWithResults ? Math.round((passedCount / totalWithResults) * 100) : 0,
        classAverage: classAvg,
        topper: withResults[0] || null,
        absentees: attendance.filter(a => /absent/i.test(a.status)).length,
      },
    } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── PREVIOUS / ARCHIVE — every group with its exams & result coverage ─────────
exports.getExamArchive = async (req, res) => {
  try {
    const school = new mongoose.Types.ObjectId(req.user.school);
    const groups = await ExamGroup.find({ school }).sort({ createdAt: -1 }).lean();
    const exams = await Exam.find({ school }).select('name class examGroup status resultPublished startDate subjects').lean();
    const resultCounts = await Result.aggregate([
      { $match: { school } },
      { $group: { _id: '$exam', n: { $sum: 1 } } },
    ]);
    const rc = Object.fromEntries(resultCounts.map(r => [String(r._id), r.n]));

    const examsByGroup = {};
    const ungrouped = [];
    for (const e of exams) {
      const row = { ...e, resultCount: rc[String(e._id)] || 0 };
      if (e.examGroup) (examsByGroup[String(e.examGroup)] ||= []).push(row);
      else ungrouped.push(row);
    }
    const data = groups.map(g => ({ ...g, exams: examsByGroup[String(g._id)] || [] }));
    if (ungrouped.length) data.push({ _id: null, name: 'Ungrouped Exams', type: '', exams: ungrouped });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
