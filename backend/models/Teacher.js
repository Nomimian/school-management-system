const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  school:        { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  teacherId:     { type: String },
  name:          { type: String, required: true, trim: true },
  email:         { type: String, required: true },
  phone:         { type: String },
  subject:       { type: String, required: true },
  qualification: { type: String },
  experience:    { type: String },
  gender:        { type: String, enum: ['Male', 'Female'] },
  dateOfBirth:   { type: Date },
  joinDate:      { type: Date, default: Date.now },
  salary:        { type: Number, default: 0 },
  address:       { type: String },
  classes:       [{ type: String }],
  status:        { type: String, enum: ['Active', 'On Leave', 'Inactive'], default: 'Active' },
  photo:         { type: String },
}, { timestamps: true });

teacherSchema.index({ school: 1, teacherId: 1 }, { unique: true, partialFilterExpression: { teacherId: { $type: 'string' } } });

teacherSchema.pre('save', async function (next) {
  if (!this.teacherId) {
    const count = await mongoose.model('Teacher').countDocuments({ school: this.school });
    this.teacherId = `T${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Teacher', teacherSchema);
