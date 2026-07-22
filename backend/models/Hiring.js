const mongoose = require('mongoose');

// Teacher job application / hiring pipeline (school-scoped)
const hiringSchema = new mongoose.Schema({
  school:         { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  fullName:       { type: String, required: true, trim: true },
  fatherName:     { type: String },
  dateOfBirth:    { type: String },
  gender:         { type: String, enum: ['Male', 'Female'], default: 'Male' },
  cnic:           { type: String },
  religion:       { type: String, default: 'Islam' },
  maritalStatus:  { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed'], default: 'Single' },
  phone:          { type: String },
  email:          { type: String },
  address:        { type: String },
  applyingFor:    { type: String },   // subject / position
  qualification:  { type: String },
  university:     { type: String },
  passingYear:    { type: String },
  experience:     { type: String },
  previousSchool: { type: String },
  previousSalary: { type: String },
  expectedSalary: { type: String },
  skills:         { type: String },
  references:     { type: String },
  status:         { type: String, enum: ['Applied', 'Shortlisted', 'Interview Scheduled', 'Interviewed', 'Hired', 'Rejected'], default: 'Applied' },
  interviewDate:  { type: String },
  remarks:        { type: String },
  photo:          { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Hiring', hiringSchema);
