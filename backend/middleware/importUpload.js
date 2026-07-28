const multer = require('multer');

// In-memory upload for bulk-import spreadsheets (we parse the buffer, never
// persist the file). Accepts .xlsx / .xls / .csv up to 5MB.
const ALLOWED = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/csv',
  'text/plain',
]);

const fileFilter = (req, file, cb) => {
  const ok = ALLOWED.has(file.mimetype) || /\.(xlsx|xls|csv)$/i.test(file.originalname);
  cb(ok ? null : new Error('Please upload an .xlsx, .xls or .csv file.'), ok);
};

module.exports = multer({ storage: multer.memoryStorage(), fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
