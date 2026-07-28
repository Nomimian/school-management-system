const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  school:        { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  studentId:     { type: String },
  name:          { type: String, required: true, trim: true },
  class:         { type: String, required: true },
  section:       { type: String },
  rollNumber:    { type: String },
  gender:        { type: String, enum: ['Male', 'Female'], required: true },
  dateOfBirth:   { type: Date },
  religion:      { type: String, default: 'Islam' },
  bloodGroup:    { type: String },
  // Dynamic enrollment classifications (Group/House/Shift …) defined per school
  // in Settings → Groups & Categories. Each entry is { name, value }.
  enrollment:    [{ name: { type: String }, value: { type: String } }],
  guardian: {
    name:         { type: String },
    relationship: { type: String, default: 'Father' },
    phone:        { type: String },
    email:        { type: String },
    occupation:   { type: String },
  },
  address:       { type: String },
  email:         { type: String },
  phone:         { type: String },
  admissionDate: { type: Date, default: Date.now },
  // Per-student fee agreement, set at admission / on the student form. Each entry
  // mirrors a FeeHead by `name`; `amount` overrides the head's base (blank = use
  // base) and `discount` is this student's concession on that head. The monthly
  // challan generator reads this to compute each student's net bill.
  feeProfile:    [{
    name:     { type: String },
    amount:   { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
  }],
  feeAmount:     { type: Number, default: 0 },   // cached net MONTHLY fee (Σ monthly heads − discounts)
  feeStatus:     { type: String, enum: ['Paid', 'Pending', 'Overdue', 'Partial'], default: 'Pending' },
  isActive:      { type: Boolean, default: true },
  photo:         { type: String },
}, { timestamps: true });

// Per-school unique identifiers (two schools may reuse the same studentId/rollNumber)
studentSchema.index({ school: 1, studentId: 1 }, { unique: true, partialFilterExpression: { studentId: { $type: 'string' } } });

// Auto-generate studentId (scoped per school)
studentSchema.pre('save', async function (next) {
  if (!this.studentId) {
    const count = await mongoose.model('Student').countDocuments({ school: this.school });
    this.studentId = `S${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Student', studentSchema);
