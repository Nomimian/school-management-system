const OptionSet = require('../models/OptionSet');

// The lists the app ships with. Seeded once per school; fully editable after.
const DEFAULTS = [
  { key: 'bloodGroups',      label: 'Blood Groups',           options: ['A+','A-','B+','B-','O+','O-','AB+','AB-'] },
  { key: 'relationships',    label: 'Guardian Relationships', options: ['Father','Mother','Guardian','Brother','Sister','Uncle','Other'] },
  { key: 'paymentMethods',   label: 'Payment Methods',        options: ['Cash','Bank Transfer','Online','Cheque'] },
  { key: 'departments',      label: 'Staff Departments',      options: ['Administration','Academics','Finance','IT','Library','Sports','Transport'] },
  { key: 'staffRoles',       label: 'Staff Roles',            options: ['Teacher','Accountant','Librarian','Clerk','Receptionist','Coordinator','Peon','Security'] },
  { key: 'bookCategories',   label: 'Book Categories',        options: ['Science','Mathematics','Language','Social Studies','Islamic Studies','Fiction','Reference'] },
  { key: 'eventTypes',       label: 'Event Types',            options: ['Meeting','Exam','Event','Finance','Holiday'] },
  { key: 'incomeCategories', label: 'Income Categories',      options: ['Student Fees','Registration Fee','Donation','Transport Fee','Library Fine','Other Income'] },
  { key: 'expenseCategories',label: 'Expense Categories',     options: ['Teacher Salary','Staff Salary','Utility Bills','Rent','Maintenance','Stationery','Equipment','Other Expense'] },
  { key: 'certificateTypes', label: 'Certificate Types',      options: ['Character','Leaving','Bonafide','Transfer','Merit'] },
  { key: 'examTypes',        label: 'Exam Group Types',       options: ['Daily','Weekly','Monthly','Term','Half-Yearly','Yearly','Annual'] },
  { key: 'examStatuses',     label: 'Exam Statuses',          options: ['Upcoming','Ongoing','Completed'] },
  { key: 'examAttendanceStatuses', label: 'Exam Attendance Statuses', options: ['Present','Absent','Late','Leave','Exempted'] },
];

// Seed the built-in lists AND backfill any that are missing. Backfilling matters
// because when new default lists ship (e.g. the exam dropdowns), existing schools
// already have some option sets — a plain "skip if any exist" check would never
// add the new ones, so they'd never appear in Settings. This only inserts keys
// the school doesn't have yet; it never touches customised existing lists.
async function ensureDefaults(schoolId) {
  const existing = await OptionSet.find({ school: schoolId }).select('key').lean();
  const have = new Set(existing.map(o => o.key));
  const missing = DEFAULTS.filter(d => !have.has(d.key));
  if (!missing.length) return;
  const base = existing.length;
  await OptionSet.insertMany(missing.map((d, i) => ({ ...d, school: schoolId, order: base + i })));
}

const clean = (arr) => [...new Set((arr || []).map(s => String(s).trim()).filter(Boolean))];
const slug  = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// @GET /api/option-sets
exports.getOptionSets = async (req, res) => {
  try {
    await ensureDefaults(req.user.school);
    const data = await OptionSet.find({ school: req.user.school }).sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// @POST /api/option-sets  (create a brand-new custom list)
exports.createOptionSet = async (req, res) => {
  try {
    const { label, options = [], key } = req.body;
    if (!label || !String(label).trim())
      return res.status(400).json({ success: false, message: 'A list name is required.' });
    const finalKey = slug(key) || slug(label);
    if (!finalKey) return res.status(400).json({ success: false, message: 'Invalid list name.' });
    const set = await OptionSet.create({
      school: req.user.school, key: finalKey, label: String(label).trim(), options: clean(options),
    });
    res.status(201).json({ success: true, data: set });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: 'A list with that key already exists.' });
    res.status(400).json({ success: false, message: e.message });
  }
};

// @PUT /api/option-sets/:id
exports.updateOptionSet = async (req, res) => {
  try {
    const { school, _id, key, ...updates } = req.body;   // key is immutable once created
    if (updates.options) updates.options = clean(updates.options);
    const set = await OptionSet.findOneAndUpdate(
      { _id: req.params.id, school: req.user.school },
      updates, { new: true, runValidators: true },
    );
    if (!set) return res.status(404).json({ success: false, message: 'List not found.' });
    res.json({ success: true, data: set });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

// @DELETE /api/option-sets/:id
exports.deleteOptionSet = async (req, res) => {
  try {
    const set = await OptionSet.findOneAndDelete({ _id: req.params.id, school: req.user.school });
    if (!set) return res.status(404).json({ success: false, message: 'List not found.' });
    res.json({ success: true, message: 'List deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
