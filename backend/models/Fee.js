const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  school:      { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  student:     { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  month:       { type: String, required: true },
  year:        { type: Number, required: true },
  // Per-head breakdown of this challan (Tuition, Exam, AC …). `amount` below is
  // the NET total (Σ gross − Σ discount) and stays the single figure the rest of
  // the app reads, so older single-amount fee records remain valid.
  items:       [{
    name:      { type: String },
    amount:    { type: Number, default: 0 },   // gross for this head
    discount:  { type: Number, default: 0 },   // per-student concession on this head
  }],
  amount:      { type: Number, required: true },
  paid:        { type: Number, default: 0 },
  balance:     { type: Number, default: 0 },
  status:      { type: String, enum: ['Paid', 'Pending', 'Overdue', 'Partial'], default: 'Pending' },
  dueDate:     { type: Date },
  paidDate:    { type: Date },
  method:      { type: String, enum: ['Cash', 'Bank Transfer', 'Online', 'Cheque', null] },
  receiptNo:   { type: String },
  remarks:     { type: String },
  recordedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Receipt numbers are unique per school
feeSchema.index({ school: 1, receiptNo: 1 }, { unique: true, partialFilterExpression: { receiptNo: { $type: 'string' } } });

// One challan per student per month — the hard guarantee against duplicate
// challans (concurrent generation, double-clicks, or the Record-Payment path).
feeSchema.index({ school: 1, student: 1, month: 1, year: 1 }, { unique: true });

// Auto-generate receipt number (scoped per school)
feeSchema.pre('save', async function (next) {
  if (this.isModified('status') && this.status === 'Paid' && !this.receiptNo) {
    const count = await mongoose.model('Fee').countDocuments({ school: this.school, status: 'Paid' });
    this.receiptNo = `RCP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    this.paidDate = new Date();
  }
  this.balance = this.amount - this.paid;
  next();
});

module.exports = mongoose.model('Fee', feeSchema);
