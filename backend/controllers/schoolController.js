const School = require('../models/School');
const User   = require('../models/User');
const fs     = require('fs');
const path   = require('path');
const multer = require('multer');

// ── Multer setup (store in uploads/) ─────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random()*1e6)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg','image/jpg','image/png','image/gif','image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files allowed'), false);
};

exports.upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// ── GET /api/school ──────────────────────────────────────────────────────────
// Returns ONLY the school linked to the caller. Never leaks another tenant.
exports.getSchool = async (req, res) => {
  try {
    if (!req.user.school) return res.json({ success: true, data: null });
    const school = await School.findById(req.user.school);
    res.json({ success: true, data: school });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── POST /api/school ─────────────────────────────────────────────────────────
// A school admin may create their profile only if none is linked yet. New
// tenants are otherwise provisioned exclusively by the SuperAdmin panel.
exports.createSchool = async (req, res) => {
  try {
    if (req.user.school)
      return res.status(400).json({ success:false, message:'A school is already linked to this account.' });
    const school = await School.create(req.body);
    await User.findByIdAndUpdate(req.user._id, { school: school._id });
    res.status(201).json({ success:true, data:school });
  } catch(e) { res.status(400).json({ success:false, message:e.message }); }
};

// ── PUT /api/school ──────────────────────────────────────────────────────────
// A tenant may only update its OWN school. Plan/license/limits are managed by
// the SuperAdmin and cannot be changed here.
exports.updateSchool = async (req, res) => {
  try {
    const id = req.user.school;
    if (!id) return res.status(404).json({ success:false, message:'No school linked to this account.' });
    const { _id, plan, maxStudents, maxTeachers, licenseExpiry, licenseKey, isActive, slug, ...updates } = req.body;
    const school = await School.findByIdAndUpdate(id, updates, { new:true, runValidators:true });
    res.json({ success:true, data:school });
  } catch(e) { res.status(400).json({ success:false, message:e.message }); }
};

// ── POST /api/school/upload-logo ─────────────────────────────────────────────
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success:false, message:'No file uploaded.' });
    if (!req.user.school) return res.status(403).json({ success:false, message:'No school linked to this account.' });
    const url = `/uploads/${req.file.filename}`;
    await School.findByIdAndUpdate(req.user.school, { logo: url });
    res.json({ success:true, url });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── POST /api/school/upload-stamp ────────────────────────────────────────────
exports.uploadStamp = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success:false, message:'No file uploaded.' });
    if (!req.user.school) return res.status(403).json({ success:false, message:'No school linked to this account.' });
    const url = `/uploads/${req.file.filename}`;
    await School.findByIdAndUpdate(req.user.school, { stamp: url });
    res.json({ success:true, url });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── POST /api/school/upload-student-photo ────────────────────────────────────
exports.uploadStudentPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success:false, message:'No file uploaded.' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ success:true, url });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// NOTE: Listing every school and provisioning new tenants are SuperAdmin-only
// capabilities and live exclusively in superAdminController (GET/POST
// /api/superadmin/schools). They were intentionally removed from this
// tenant-facing controller to eliminate the cross-tenant overlap.
