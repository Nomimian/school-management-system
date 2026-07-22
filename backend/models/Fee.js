const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  school:      { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  student:     { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  month:       { type: String, required: true },
  year:        { type: Number, required: true },
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
