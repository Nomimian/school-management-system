const Hiring = require('../models/Hiring');

// @GET /api/hiring
exports.getApplications = async (req, res) => {
  try {
    const filter = { school: req.user.school };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) filter.$or = [
      { fullName:    { $regex: req.query.search, $options: 'i' } },
      { applyingFor: { $regex: req.query.search, $options: 'i' } },
    ];
    const data = await Hiring.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// @POST /api/hiring
exports.createApplication = async (req, res) => {
  try {
    const app = await Hiring.create({ ...req.body, school: req.user.school });
    res.status(201).json({ success: true, data: app });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

// @PUT /api/hiring/:id
exports.updateApplication = async (req, res) => {
  try {
    const { school, ...updates } = req.body;
    const app = await Hiring.findOneAndUpdate(
      { _id: req.params.id, school: req.user.school },
      updates, { new: true, runValidators: true },
    );
    if (!app) return res.status(404).json({ success: false, message: 'Application not found.' });
    res.json({ success: true, data: app });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

// @DELETE /api/hiring/:id
exports.deleteApplication = async (req, res) => {
  try {
    const app = await Hiring.findOneAndDelete({ _id: req.params.id, school: req.user.school });
    if (!app) return res.status(404).json({ success: false, message: 'Application not found.' });
    res.json({ success: true, message: 'Application deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
