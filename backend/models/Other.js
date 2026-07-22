const mongoose = require('mongoose');

// ── Notice ────────────────────────────────────────────────────────────────────
const noticeSchema = new mongoose.Schema({
  school:   { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  title:    { type: String, required: true },
  content:  { type: String, required: true },
  audience: { type: String, enum: ['All', 'Students', 'Parents', 'Teachers'], default: 'All' },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  author:   { type: String, default: 'Admin' },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ── Class ─────────────────────────────────────────────────────────────────────
const classSchema = new mongoose.Schema({
  school:       { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name:         { type: String, required: true },
  section:      { type: String },
  room:         { type: String },
  classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  capacity:     { type: Number, default: 40 },
}, { timestamps: true });

// Class names are unique per school
classSchema.index({ school: 1, name: 1 }, { unique: true });

// ── Staff (HR) ────────────────────────────────────────────────────────────────
const staffSchema = new mongoose.Schema({
  school:     { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  staffId:    { type: String },
  name:       { type: String, required: true },
  role:       { type: String, required: true },
  department: { type: String },
  email:      { type: String },
  phone:      { type: String },
  salary:     { type: Number, default: 0 },
  joinDate:   { type: Date, default: Date.now },
  status:     { type: String, enum: ['Active', 'Inactive', 'On Leave'], default: 'Active' },
  gender:     { type: String, enum: ['Male', 'Female'] },
}, { timestamps: true });

staffSchema.index({ school: 1, staffId: 1 }, { unique: true, partialFilterExpression: { staffId: { $type: 'string' } } });

staffSchema.pre('save', async function (next) {
  if (!this.staffId) {
    const count = await mongoose.model('Staff').countDocuments({ school: this.school });
    this.staffId = `HR${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

// ── Book (Library) ────────────────────────────────────────────────────────────
const bookSchema = new mongoose.Schema({
  school:    { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  bookId:    { type: String },
  title:     { type: String, required: true },
  author:    { type: String },
  category:  { type: String },
  isbn:      { type: String },
  copies:    { type: Number, default: 1 },
  available: { type: Number, default: 1 },
}, { timestamps: true });

bookSchema.index({ school: 1, bookId: 1 }, { unique: true, partialFilterExpression: { bookId: { $type: 'string' } } });

bookSchema.pre('save', async function (next) {
  if (!this.bookId) {
    const count = await mongoose.model('Book').countDocuments({ school: this.school });
    this.bookId = `B${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

// ── Event (Calendar) ─────────────────────────────────────────────────────────
const eventSchema = new mongoose.Schema({
  school:    { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  title:     { type: String, required: true },
  date:      { type: Date, required: true },
  time:      { type: String },
  type:      { type: String, enum: ['Meeting', 'Exam', 'Event', 'Finance', 'Holiday'], default: 'Event' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = {
  Notice:    mongoose.model('Notice', noticeSchema),
  Class:     mongoose.model('Class', classSchema),
  Staff:     mongoose.model('Staff', staffSchema),
  Book:      mongoose.model('Book', bookSchema),
  Event:     mongoose.model('Event', eventSchema),
};
