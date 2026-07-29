const mongoose = require('mongoose');

// ── ADMISSION ─────────────────────────────────────────────────────────────────
const admissionSchema = new mongoose.Schema({
  school:         { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  admissionNo:    { type: String },
  applicantName:  { type: String, required: true },
  applyingClass:  { type: String, required: true },
  dateOfBirth:    { type: Date },
  gender:         { type: String, enum: ['Male','Female'] },
  religion:       { type: String, default: 'Islam' },
  bloodGroup:     { type: String },
  previousSchool: { type: String },
  previousClass:  { type: String },
  // Dynamic enrollment classifications (Group/House/Shift …) — carried onto the
  // Student when enrolled. Each entry is { name, value }.
  enrollment:     [{ name: { type: String }, value: { type: String } }],
  guardian: {
    name:         String, relationship: String,
    phone:        String, cnic: String,
    occupation:   String, email: String,
  },
  address:        { type: String },
  testDate:       { type: Date },
  testMarks:      { type: Number },
  interviewDate:  { type: Date },
  status:         { type: String, enum: ['Applied','Test Scheduled','Interviewed','Approved','Rejected','Enrolled'], default: 'Applied' },
  remarks:        { type: String },
  registrationFee:{ type: Number, default: 0 },
  feePaid:        { type: Boolean, default: false },
  // Fee agreement captured at application time (Type · Fee · Discount). Carried
  // onto the Student record when the applicant is enrolled. `feeAmount` is the
  // net monthly total (Σ monthly heads − discounts).
  feeProfile:     [{
    name:     { type: String },
    amount:   { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
  }],
  feeAmount:      { type: Number, default: 0 },
  photo:          { type: String },
  documents:      [{ name: String, url: String }],
  enrolledStudent:{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }, // set once enrolled
}, { timestamps: true });

admissionSchema.index({ school: 1, admissionNo: 1 }, { unique: true, partialFilterExpression: { admissionNo: { $type: 'string' } } });

admissionSchema.pre('save', async function(next) {
  if (!this.admissionNo) {
    const count = await mongoose.model('Admission').countDocuments({ school: this.school });
    this.admissionNo = `ADM-${new Date().getFullYear()}-${String(count+1).padStart(4,'0')}`;
  }
  next();
});

// ── TRANSPORT ─────────────────────────────────────────────────────────────────
const routeSchema = new mongoose.Schema({
  school:       { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  routeName:    { type: String, required: true },
  routeNo:      { type: String },
  driver: {
    name:  String, phone: String, cnic: String, licenseNo: String,
  },
  vehicle: {
    type:     { type: String },   // wrapped so Mongoose treats `vehicle` as a subdocument, not a String path
    regNo:    String,
    capacity: Number,
    model:    String,
  },
  stops:        [{ stopName: String, time: String, fare: Number }],
  morningTime:  { type: String },
  eveningTime:  { type: String },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

const studentTransportSchema = new mongoose.Schema({
  school:     { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  student:    { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  route:      { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  stopName:   { type: String },
  monthlyFare:{ type: Number, default: 0 },
  pickupTime: { type: String },
  dropTime:   { type: String },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

// ── HOMEWORK / ASSIGNMENT ─────────────────────────────────────────────────────
const homeworkSchema = new mongoose.Schema({
  school:      { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  title:       { type: String, required: true },
  description: { type: String },
  class:       { type: String, required: true },
  subject:     { type: String, required: true },
  teacher:     { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  assignedDate:{ type: Date, default: Date.now },
  dueDate:     { type: Date, required: true },
  totalMarks:  { type: Number, default: 0 },
  attachments: [{ name: String, url: String }],
  status:      { type: String, enum: ['Active','Expired','Graded'], default: 'Active' },
  // Turned-in work, one entry per student (submitted via the parent portal).
  submissions: [{
    student:     { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    note:        { type: String },
    attachments: [{ name: String, url: String, type: String }],
    submittedAt: { type: Date, default: Date.now },
    grade:       { type: String },
    feedback:    { type: String },
  }],
}, { timestamps: true });

// ── MESSAGE / COMMUNICATION ───────────────────────────────────────────────────
const messageSchema = new mongoose.Schema({
  school:     { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  title:      { type: String, required: true },
  body:       { type: String, required: true },
  type:       { type: String, enum: ['SMS','WhatsApp','Email','In-App'], default: 'In-App' },
  audience:   { type: String, enum: ['All','Students','Parents','Teachers','Staff','Class'], default: 'All' },
  targetClass:{ type: String },
  sentBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sentAt:     { type: Date, default: Date.now },
  status:     { type: String, enum: ['Sent','Pending','Failed'], default: 'Sent' },
  recipients: { type: Number, default: 0 },
}, { timestamps: true });

// ── INCOME / EXPENSE (Accounts) ───────────────────────────────────────────────
const accountSchema = new mongoose.Schema({
  school:      { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  type:        { type: String, enum: ['Income','Expense'], required: true },
  category:    { type: String, required: true }, // Fee, Salary, Utility, Rent, etc.
  amount:      { type: Number, required: true },
  description: { type: String },
  date:        { type: Date, default: Date.now },
  reference:   { type: String },
  recordedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ── STUDENT PROMOTION ─────────────────────────────────────────────────────────
const promotionSchema = new mongoose.Schema({
  school:        { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  academicYear:  { type: String, required: true },
  student:       { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  fromClass:     { type: String, required: true },
  toClass:       { type: String },   // only set for 'Promoted'; detained/left have none
  status:        { type: String, enum: ['Promoted','Detained','Left'], default: 'Promoted' },
  promotedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks:       { type: String },
}, { timestamps: true });

// ── CERTIFICATE ───────────────────────────────────────────────────────────────
const certificateSchema = new mongoose.Schema({
  school:    { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  student:   { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  type:      { type: String, enum: ['Character','Leaving','Bonafide','Transfer','Merit'], required: true },
  issueDate: { type: Date, default: Date.now },
  issuedBy:  { type: String },
  content:   { type: String },
  serialNo:  { type: String },
}, { timestamps: true });

certificateSchema.index({ school: 1, serialNo: 1 }, { unique: true, partialFilterExpression: { serialNo: { $type: 'string' } } });

certificateSchema.pre('save', async function(next) {
  if (!this.serialNo) {
    const count = await mongoose.model('Certificate').countDocuments({ school: this.school });
    this.serialNo = `CERT-${new Date().getFullYear()}-${String(count+1).padStart(4,'0')}`;
  }
  next();
});

// ── SUBJECT ───────────────────────────────────────────────────────────────────
const subjectSchema = new mongoose.Schema({
  school:     { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name:       { type: String, required: true },
  code:       { type: String },
  class:      { type: String, required: true },
  // Optional stream/group tag. Empty ⇒ every student in the class takes it.
  // When set (e.g. "Pre-Medical"), it applies only to students whose enrollment
  // includes that value — so ICS vs Pre-Engineering in the same class differ.
  group:      { type: String, trim: true, default: '' },
  teacher:    { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  isOptional: { type: Boolean, default: false },
  totalMarks: { type: Number, default: 100 },
  passMark:   { type: Number, default: 40 },
  order:      { type: Number, default: 0 },
}, { timestamps: true });

// ── GRADE SCALE ───────────────────────────────────────────────────────────────
const gradeScaleSchema = new mongoose.Schema({
  school:  { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name:    { type: String, required: true, default: 'Standard' },
  scales:  [{
    grade:    String,
    minMarks: Number,
    maxMarks: Number,
    gpa:      Number,
    remarks:  String,
  }],
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

// ── FEE STRUCTURE ─────────────────────────────────────────────────────────────
const feeStructureSchema = new mongoose.Schema({
  school:     { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  class:      { type: String, required: true },
  session:    { type: String },
  components: [{
    name:     String, // Tuition, Transport, Lab, Library etc
    amount:   Number,
    isMonthly:{ type: Boolean, default: true },
  }],
  totalMonthly: { type: Number, default: 0 },
  dueDay:     { type: Number, default: 10 },
  lateFine:   { type: Number, default: 0 },
}, { timestamps: true });

// ── TIMETABLE ─────────────────────────────────────────────────────────────────
const timetableSchema = new mongoose.Schema({
  school:  { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  class:   { type: String, required: true },
  day:     { type: String, required: true },
  periods: [{
    periodNo:  Number,
    startTime: String,
    endTime:   String,
    subject:   String,
    teacher:   { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    room:      String,
    isBreak:   { type: Boolean, default: false },
  }],
}, { timestamps: true });

// ── STUDENT HEALTH ─────────────────────────────────────────────────────────────
const healthSchema = new mongoose.Schema({
  school:        { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  student:       { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  height:        Number,
  weight:        Number,
  bloodGroup:    String,
  allergies:     [String],
  disabilities:  [String],
  medicalHistory:{ type: String },
  lastCheckup:   { type: Date },
  doctor:        { type: String },
  emergencyContact:{ name: String, phone: String, relation: String },
}, { timestamps: true });

module.exports = {
  Admission:      mongoose.model('Admission', admissionSchema),
  Route:          mongoose.model('Route', routeSchema),
  StudentTransport: mongoose.model('StudentTransport', studentTransportSchema),
  Homework:       mongoose.model('Homework', homeworkSchema),
  Message:        mongoose.model('Message', messageSchema),
  Account:        mongoose.model('Account', accountSchema),
  Promotion:      mongoose.model('Promotion', promotionSchema),
  Certificate:    mongoose.model('Certificate', certificateSchema),
  Subject:        mongoose.model('Subject', subjectSchema),
  GradeScale:     mongoose.model('GradeScale', gradeScaleSchema),
  FeeStructure:   mongoose.model('FeeStructure', feeStructureSchema),
  Timetable:      mongoose.model('Timetable', timetableSchema),
  StudentHealth:  mongoose.model('StudentHealth', healthSchema),
};
