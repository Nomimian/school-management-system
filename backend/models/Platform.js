const mongoose = require('mongoose');

// ─── Platform-wide settings (single document) ─────────────────────────────────
const platformSettingsSchema = new mongoose.Schema({
  key:          { type: String, default: 'global', unique: true },  // singleton guard
  platformName: { type: String, default: 'EduManage Pro' },
  supportEmail: { type: String, default: 'support@edumanage.pro' },
  defaultPlan:  { type: String, enum: ['trial','basic','pro','enterprise'], default: 'trial' },
  trialDays:    { type: Number, default: 30 },
  autoExpire:   { type: Boolean, default: true },
  newSignups:   { type: Boolean, default: true },   // allow provisioning new schools
  maintenanceMode: { type: Boolean, default: false }, // block all non-superadmin logins
}, { timestamps: true });

// Fetch-or-create the singleton settings document.
platformSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ key: 'global' });
  if (!doc) doc = await this.create({ key: 'global' });
  return doc;
};

// ─── Persistent superadmin audit log ──────────────────────────────────────────
const auditLogSchema = new mongoose.Schema({
  action:     { type: String, required: true },
  details:    { type: String },
  adminEmail: { type: String, default: 'superadmin' },
  timestamp:  { type: Date, default: Date.now, index: true },
});

// ─── Platform announcements (broadcast to school admins) ───────────────────────
const announcementSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  body:     { type: String, required: true },
  audience: { type: String, default: 'All' },
  type:     { type: String, default: 'Info' },
  priority: { type: String, default: 'Normal' },
  sentBy:   { type: String, default: 'SuperAdmin' },
  sentAt:   { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = {
  PlatformSettings: mongoose.model('PlatformSettings', platformSettingsSchema),
  AuditLog:         mongoose.model('AuditLog', auditLogSchema),
  Announcement:     mongoose.model('PlatformAnnouncement', announcementSchema),
};
