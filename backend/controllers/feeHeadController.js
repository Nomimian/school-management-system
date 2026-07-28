const FeeHead = require('../models/FeeHead');

/**
 * Ensure a school always has at least a sensible starter set of fee heads so the
 * config page and challan generator are never empty on a brand-new tenant.
 * Seeds Tuition Fee = 14000 (Monthly) plus two zero-amount examples the operator
 * can edit or delete. Idempotent — only runs when the school has NO heads yet.
 */
async function ensureDefaultHeads(schoolId) {
  const count = await FeeHead.countDocuments({ school: schoolId });
  if (count > 0) return;
  await FeeHead.insertMany([
    { school: schoolId, name: 'Tuition Fee',   amount: 14000, frequency: 'Monthly',  order: 0 },
    { school: schoolId, name: 'Exam / Test Fee', amount: 0,   frequency: 'Optional', order: 1 },
    { school: schoolId, name: 'Admission Fee',   amount: 0,   frequency: 'One-Time', order: 2 },
  ]);
}

// @GET /api/fee-heads
exports.getFeeHeads = async (req, res) => {
  try {
    await ensureDefaultHeads(req.user.school);
    const data = await FeeHead.find({ school: req.user.school }).sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// @POST /api/fee-heads
exports.createFeeHead = async (req, res) => {
  try {
    const { name, amount = 0, frequency = 'Monthly', isActive = true, order = 0 } = req.body;
    if (!name || !String(name).trim())
      return res.status(400).json({ success: false, message: 'A fee head name is required.' });
    const head = await FeeHead.create({
      school: req.user.school, name: String(name).trim(), amount, frequency, isActive, order,
    });
    res.status(201).json({ success: true, data: head });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: 'A fee head with that name already exists.' });
    res.status(400).json({ success: false, message: e.message });
  }
};

// @PUT /api/fee-heads/:id
exports.updateFeeHead = async (req, res) => {
  try {
    const { school, _id, ...updates } = req.body;
    const head = await FeeHead.findOneAndUpdate(
      { _id: req.params.id, school: req.user.school },
      updates, { new: true, runValidators: true },
    );
    if (!head) return res.status(404).json({ success: false, message: 'Fee head not found.' });
    res.json({ success: true, data: head });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: 'A fee head with that name already exists.' });
    res.status(400).json({ success: false, message: e.message });
  }
};

// @DELETE /api/fee-heads/:id
exports.deleteFeeHead = async (req, res) => {
  try {
    const head = await FeeHead.findOneAndDelete({ _id: req.params.id, school: req.user.school });
    if (!head) return res.status(404).json({ success: false, message: 'Fee head not found.' });
    res.json({ success: true, message: 'Fee head deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.ensureDefaultHeads = ensureDefaultHeads;
