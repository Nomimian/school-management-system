const mongoose = require('mongoose');

/**
 * EnrollmentGroup — a school-defined classification a student is enrolled into,
 * shown as a dropdown on the Add-Student / New-Application forms.
 *
 * It's intentionally generic so a school can model ANY academic/administrative
 * grouping dynamically, e.g.
 *   • name: "Group"  options: ["Pre-Medical","Pre-Engineering","ICS","I.Com","Arts"]
 *   • name: "House"  options: ["Red","Blue","Green","Yellow"]
 *   • name: "Shift"  options: ["Morning","Evening"]
 *
 * `appliesToClasses` optionally limits a category to certain classes (empty = all)
 * — e.g. "Group" only appears for intermediate classes.
 */
const enrollmentGroupSchema = new mongoose.Schema({
  school:           { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name:             { type: String, required: true, trim: true },
  options:          [{ type: String, trim: true }],
  appliesToClasses: [{ type: String }],     // empty ⇒ applies to every class
  required:         { type: Boolean, default: false },
  isActive:         { type: Boolean, default: true },
  order:            { type: Number, default: 0 },
}, { timestamps: true });

// Category names are unique per school
enrollmentGroupSchema.index({ school: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('EnrollmentGroup', enrollmentGroupSchema);
