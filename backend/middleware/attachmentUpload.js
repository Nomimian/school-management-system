const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Shared uploads dir (also served statically at /uploads by server.js).
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `att-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

// Images + common document types.
const ALLOWED = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain', 'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
]);

const fileFilter = (req, file, cb) =>
  ALLOWED.has(file.mimetype) ? cb(null, true) : cb(new Error('Unsupported file type.'));

module.exports = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB
