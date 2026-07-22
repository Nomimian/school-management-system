const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  school:   { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  student:  { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  class:    { type: String, required: true },
  date:     { type: Date, required: true },
  status:   { type: String, enum: ['Present', 'Absent', 'Late', 'Leave'], default: 'Present' },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks:  { type: String },
}, { timestamps: true });

// Unique attendance per student per day (student is already school-scoped)
attendanceSchema.index({ school: 1, student: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
