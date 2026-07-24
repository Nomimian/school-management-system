// Returns metadata for a freshly uploaded file. The file itself is served
// statically from /uploads (see server.js). Used by chat + outbound messaging.
exports.uploadAttachment = (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
  res.json({
    success: true,
    data: {
      url: `/uploads/${req.file.filename}`,
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
    },
  });
};
