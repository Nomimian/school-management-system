const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role:     { type: String, enum: ['admin', 'principal', 'teacher', 'accountant', 'frontdesk', 'parent', 'superadmin'], default: 'admin' },
  school:   { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  phone:    { type: String, trim: true },
  // Parent accounts (role: 'parent') are linked to one or more students. These
  // are the ONLY students such a user may ever see — enforced on every parent
  // portal query in addition to the school scope.
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  isActive: { type: Boolean, default: true },
  // Audit: which user (admin/principal) created this staff account.
  createdBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastLogin:{ type: Date },
  // Password reset (a SHA-256 hash of the emailed token + its expiry).
  resetPasswordToken:  { type: String, select: false },
  resetPasswordExpire: { type: Date,   select: false },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);
