const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  school:     { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name:       { type: String, required: true },
  class:      { type: String, required: true },
  subject:    { type: String },
  startDate:  { type: Date, required: true },
  endDate:    { type: Date },
  totalMarks: { type: Number, default: 100 },
  passMark:   { type: Number, default: 40 },
  status:     { type: String, enum: ['Upcoming', 'Ongoing', 'Completed'], default: 'Upcoming' },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const resultSchema = new mongoose.Schema({
  school:     { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  exam:       { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  student:    { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  marks:      { type: Number, required: true },
  grade:      { type: String },
  remarks:    { type: String },
  isPassed:   { type: Boolean, default: false },
}, { timestamps: true });

// Auto-calculate grade
resultSchema.pre('save', function (next) {
  const pct = (this.marks / 100) * 100;
  if (pct >= 90)      this.grade = 'A+';
  else if (pct >= 80) this.grade = 'A';
  else if (pct >= 70) this.grade = 'B+';
  else if (pct >= 60) this.grade = 'B';
  else if (pct >= 50) this.grade = 'C';
  else if (pct >= 40) this.grade = 'D';
  else                this.grade = 'F';
  this.isPassed = pct >= 40;
  next();
});

module.exports = {
  Exam: mongoose.model('Exam', examSchema),
  Result: mongoose.model('Result', resultSchema),
};
