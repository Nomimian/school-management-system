const EnrollmentGroup = require('../models/EnrollmentGroup');

/**
 * Give a brand-new school one editable starter category so the config page and
 * the student/admission forms aren't empty. Idempotent — only when none exist.
 */
async function ensureDefault(schoolId) {
  const count = await EnrollmentGroup.countDocuments({ school: schoolId });
  if (count > 0) return;
  await EnrollmentGroup.create({
    school: schoolId,
    name: 'Group',
    options: ['Pre-Medical', 'Pre-Engineering', 'ICS', 'I.Com', 'Arts', 'General'],
    appliesToClasses: [],   // shown for all classes until the operator narrows it
    required: false,
    order: 0,
  });
}

const clean = (arr) => [...new Set((arr || []).map(s => String(s).trim()).filter(Boolean))];

// @GET /api/enrollment-groups
exports.getEnrollmentGroups = async (req, res) => {
  try {
    await ensureDefault(req.user.school);
    const data = await EnrollmentGroup.find({ school: req.user.school }).sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// @POST /api/enrollment-groups
exports.createEnrollmentGroup = async (req, res) => {
  try {
    const { name, options = [], appliesToClasses = [], required = false, isActive = true, order = 0 } = req.body;
    if (!name || !String(name).trim())
      return res.status(400).json({ success: false, message: 'A category name is required.' });
    const grp = await EnrollmentGroup.create({
      school: req.user.school, name: String(name).trim(),
      options: clean(options), appliesToClasses: clean(appliesToClasses),
      required, isActive, order,
    });
    res.status(201).json({ success: true, data: grp });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: 'A category with that name already exists.' });
    res.status(400).json({ success: false, message: e.message });
  }
};

// @PUT /api/enrollment-groups/:id
exports.updateEnrollmentGroup = async (req, res) => {
  try {
    const { school, _id, ...updates } = req.body;
    if (updates.options)          updates.options = clean(updates.options);
    if (updates.appliesToClasses) updates.appliesToClasses = clean(updates.appliesToClasses);
    const grp = await EnrollmentGroup.findOneAndUpdate(
      { _id: req.params.id, school: req.user.school },
      updates, { new: true, runValidators: true },
    );
    if (!grp) return res.status(404).json({ success: false, message: 'Category not found.' });
    res.json({ success: true, data: grp });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: 'A category with that name already exists.' });
    res.status(400).json({ success: false, message: e.message });
  }
};

// @DELETE /api/enrollment-groups/:id
exports.deleteEnrollmentGroup = async (req, res) => {
  try {
    const grp = await EnrollmentGroup.findOneAndDelete({ _id: req.params.id, school: req.user.school });
    if (!grp) return res.status(404).json({ success: false, message: 'Category not found.' });
    res.json({ success: true, message: 'Category deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
