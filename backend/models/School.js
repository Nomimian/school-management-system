const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
  // Basic Info
  name:          { type: String, required: true, trim: true },
  shortName:     { type: String, trim: true },         // e.g. "PMS"
  slug:          { type: String, unique: true, lowercase: true }, // e.g. "pakistan-model-school"
  logo:          { type: String },                     // base64 or file path
  stamp:         { type: String },                     // uploaded stamp image path
  stampText:     { type: String },                     // text inside auto-generated stamp
  stampShape:    { type: String, enum: ['circle', 'square', 'rectangle'], default: 'circle' },

  // Contact
  address:       { type: String },
  city:          { type: String },
  phone:         { type: String },
  phone2:        { type: String },
  email:         { type: String },
  website:       { type: String },

  // Academic
  principal:     { type: String },
  vicePrincipal: { type: String },
  established:   { type: String },
  board:         { type: String, default: 'Punjab Board of Secondary Education' },
  affiliation:   { type: String },
  registrationNo:{ type: String },
  academicYear:  { type: String, default: '2024-2025' },
  currentTerm:   { type: String, default: 'Spring Term' },

  // Finance
  currency:      { type: String, default: 'PKR' },
  currencySymbol:{ type: String, default: 'Rs' },
  feeDay:        { type: Number, default: 10 },        // day of month fee is due
  lateFine:      { type: Number, default: 200 },
  // When true, the server auto-creates each active student's monthly challan at
  // the start of every month (idempotent; also self-heals if the server was
  // asleep on the 1st). Operators can still generate manually any time.
  autoGenerateChallans: { type: Boolean, default: true },

  // Branding / Theme
  primaryColor:  { type: String, default: '#1d4ed8' },
  accentColor:   { type: String, default: '#f97316' },
  fontSize:      { type: String, enum: ['small','medium','large'], default: 'medium' },
  tagline:       { type: String },

  // Notification preferences
  notifications: {
    feeReminder:   { type: Boolean, default: true },
    attendanceSMS: { type: Boolean, default: true },
    examSchedule:  { type: Boolean, default: true },
    noticePush:    { type: Boolean, default: false },
    monthlyReport: { type: Boolean, default: true },
    parentPortal:  { type: Boolean, default: true },
  },

  // License
  plan:          { type: String, enum: ['trial','basic','pro','enterprise'], default: 'trial' },
  licenseKey:    { type: String, unique: true, sparse: true },
  licenseExpiry: { type: Date },
  maxStudents:   { type: Number, default: 500 },
  maxTeachers:   { type: Number, default: 50 },
  isActive:      { type: Boolean, default: true },

  // Print settings
  printHeader:   { type: String },   // custom header text for prints
  printFooter:   { type: String },   // custom footer
  showStampOnFee:{ type: Boolean, default: true },
  showStampOnAdmission: { type: Boolean, default: true },
  showStampOnResult:    { type: Boolean, default: true },
  showStampOnCert:      { type: Boolean, default: true },
}, { timestamps: true });

// Auto-generate slug
schoolSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model('School', schoolSchema);
