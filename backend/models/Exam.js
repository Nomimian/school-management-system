const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// EXAM GROUP — the top-level container/type for a batch of exams.
// e.g. "Monthly Test – January", "First Term", "Annual 2025-26". Its `type`
// (Monthly / Daily / Yearly …) is a configurable dropdown (OptionSet: examTypes).
// ─────────────────────────────────────────────────────────────────────────────
const examGroupSchema = new mongoose.Schema({
  school:      { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name:        { type: String, required: true, trim: true },
  type:        { type: String, trim: true },        // dynamic (Monthly/Daily/Yearly/Term…)
  session:     { type: String, trim: true },        // e.g. "2025-2026"
  description: { type: String, trim: true },
  startDate:   { type: Date },
  endDate:     { type: Date },
  order:       { type: Number, default: 0 },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ─────────────────────────────────────────────────────────────────────────────
// EXAM — a single assessment (the "list": T1, T2 …) inside a group, scoped to a
// class. Multi-subject: each entry in `subjects` carries its own scale + date.
// Legacy single-subject fields (subject/totalMarks/passMark) are kept so old
// exams and the flat results flow keep working.
// ─────────────────────────────────────────────────────────────────────────────
const examSubjectSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  totalMarks: { type: Number, default: 100 },
  passMark:   { type: Number, default: 40 },
  examDate:   { type: Date },
}, { _id: false });

const examSchema = new mongoose.Schema({
  school:     { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  examGroup:  { type: mongoose.Schema.Types.ObjectId, ref: 'ExamGroup', index: true },
  name:       { type: String, required: true },
  class:      { type: String, required: true },
  session:    { type: String, trim: true },
  subject:    { type: String },                     // legacy single-subject
  subjects:   { type: [examSubjectSchema], default: [] },
  startDate:  { type: Date, required: true },
  endDate:    { type: Date },
  totalMarks: { type: Number, default: 100 },       // legacy / fallback scale
  passMark:   { type: Number, default: 40 },
  // Free string (not an enum) so the status list stays configurable like other
  // dynamic dropdowns (OptionSet: examStatuses).
  status:     { type: String, default: 'Upcoming' },
  resultPublished: { type: Boolean, default: false },
  description:{ type: String },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ─────────────────────────────────────────────────────────────────────────────
// RESULT — one student's marks for one subject of one exam. `subject` is null on
// legacy flat results (one row per student per exam). Grade/gpa are computed by
// the controller against the school's Grade Scale; the pre-save hook only fills
// them in as a fallback when the controller didn't (e.g. the legacy create path).
// ─────────────────────────────────────────────────────────────────────────────
const resultSchema = new mongoose.Schema({
  school:     { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  exam:       { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
  examGroup:  { type: mongoose.Schema.Types.ObjectId, ref: 'ExamGroup', index: true },
  student:    { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  class:      { type: String },
  subject:    { type: String, default: null },
  marks:      { type: Number, required: true },
  totalMarks: { type: Number, default: 100 },
  passMark:   { type: Number, default: 40 },
  grade:      { type: String },
  gpa:        { type: Number },
  remarks:    { type: String },
  isPassed:   { type: Boolean, default: false },
  isAbsent:   { type: Boolean, default: false },
}, { timestamps: true });

// One result per student per subject per exam.
resultSchema.index({ school: 1, exam: 1, student: 1, subject: 1 }, { unique: true });

// Fallback grading only — see note above. Uses the built-in bands.
resultSchema.pre('save', function (next) {
  if (this.isAbsent) { this.grade = this.grade || 'AB'; this.isPassed = false; return next(); }
  if (!this.grade) {
    const total = this.totalMarks || 100;
    const pct = total > 0 ? (this.marks / total) * 100 : 0;
    if (pct >= 90)      this.grade = 'A+';
    else if (pct >= 80) this.grade = 'A';
    else if (pct >= 70) this.grade = 'B+';
    else if (pct >= 60) this.grade = 'B';
    else if (pct >= 50) this.grade = 'C';
    else if (pct >= 40) this.grade = 'D';
    else                this.grade = 'F';
  }
  this.isPassed = this.marks >= (this.passMark || 40);
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// EXAM ATTENDANCE — presence per student per paper (subject) of an exam.
// `status` is a string (not an enum) so it can be driven by a configurable list.
// ─────────────────────────────────────────────────────────────────────────────
const examAttendanceSchema = new mongoose.Schema({
  school:   { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  exam:     { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
  student:  { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  class:    { type: String },
  subject:  { type: String, default: null },
  date:     { type: Date },
  status:   { type: String, default: 'Present' },
  remarks:  { type: String },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

examAttendanceSchema.index({ school: 1, exam: 1, student: 1, subject: 1 }, { unique: true });

module.exports = {
  Exam:           mongoose.model('Exam', examSchema),
  Result:         mongoose.model('Result', resultSchema),
  ExamGroup:      mongoose.model('ExamGroup', examGroupSchema),
  ExamAttendance: mongoose.model('ExamAttendance', examAttendanceSchema),
};
