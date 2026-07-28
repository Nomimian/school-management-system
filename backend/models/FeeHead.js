const mongoose = require('mongoose');

/**
 * FeeHead — the master list of fee *types* a school charges (Tuition, Exam/Test,
 * AC, Admission, Transport …). This is the single source of truth that powers:
 *   • the admission / student fee table (Type · Fee · Discount · Total)
 *   • the monthly challan generator (which "Monthly" heads to bill each month)
 *
 * Amounts here are the school-wide BASE price (same for every class). Per-student
 * concessions live as a `discount` on the student's fee profile, not here.
 *
 * frequency:
 *   Monthly  → billed on every monthly challan automatically (e.g. Tuition, AC)
 *   One-Time → charged once, at admission (e.g. Admission/Registration fee)
 *   Optional → not billed automatically; the operator opts it into a specific
 *              month from the challan generator (e.g. an Exam/Test fee that only
 *              applies in the month a test is held)
 */
const feeHeadSchema = new mongoose.Schema({
  school:    { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name:      { type: String, required: true, trim: true },
  amount:    { type: Number, default: 0 },
  frequency: { type: String, enum: ['Monthly', 'One-Time', 'Optional'], default: 'Monthly' },
  isActive:  { type: Boolean, default: true },
  order:     { type: Number, default: 0 },
}, { timestamps: true });

// Head names are unique per school (case-insensitive would be nicer, but the app
// already title-cases input; keep it simple + exact here).
feeHeadSchema.index({ school: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('FeeHead', feeHeadSchema);
