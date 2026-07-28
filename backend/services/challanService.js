const mongoose = require('mongoose');
const Fee      = require('../models/Fee');
const Student  = require('../models/Student');
const FeeHead  = require('../models/FeeHead');

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/**
 * Resolve the challan line-items for ONE student given the heads being billed
 * this run. For each head we prefer the student's own profile amount/discount
 * (a scholarship or concession) and fall back to the head's base amount.
 *
 * @param {object} student            lean Student doc (needs .feeProfile)
 * @param {Array}  heads              [{ name, amount }] — the heads to bill this run
 * @returns {{ items: Array, amount: number }}
 */
function resolveItemsForStudent(student, heads) {
  const profile = Array.isArray(student.feeProfile) ? student.feeProfile : [];
  const byName = new Map(profile.map(p => [String(p.name).toLowerCase(), p]));
  const items = heads.map(h => {
    const p = byName.get(String(h.name).toLowerCase());
    // profile.amount of 0/blank means "use the base"; a positive value overrides.
    const gross = (p && Number(p.amount) > 0) ? Number(p.amount) : Number(h.amount) || 0;
    const discount = Math.min(gross, (p && Number(p.discount) > 0) ? Number(p.discount) : 0);
    return { name: h.name, amount: gross, discount };
  });
  const amount = items.reduce((s, it) => s + (it.amount - it.discount), 0);
  return { items, amount };
}

/**
 * Cached net MONTHLY fee for a student (Σ active monthly heads − their discounts).
 * Used to keep Student.feeAmount fresh for quick display/reports.
 */
async function computeMonthlyFee(schoolId, student) {
  const heads = await FeeHead.find({ school: schoolId, isActive: true, frequency: 'Monthly' }).lean();
  return resolveItemsForStudent(student, heads.map(h => ({ name: h.name, amount: h.amount }))).amount;
}

/**
 * Generate (or top-up) challans for a set of students for one month.
 * Idempotent: a student who already has a challan for that month is SKIPPED
 * (never overwrites a recorded payment). Safe to run repeatedly.
 *
 * @param {object}   opts
 * @param {ObjectId} opts.school
 * @param {string}   opts.month        e.g. 'August'
 * @param {number}   opts.year
 * @param {Array}    opts.heads        [{ name, amount }] heads to bill this run
 * @param {Array}    opts.students     lean Student docs to bill
 * @param {number}   opts.dueDay       day of month the challan is due
 * @param {ObjectId} [opts.createdBy]
 * @returns {{ created:number, skipped:number, totalBilled:number, challans:Array }}
 */
async function generateForStudents({ school, month, year, heads, students, dueDay = 10, createdBy = null }) {
  const monthIdx = MONTHS.indexOf(month);
  if (monthIdx < 0) throw new Error(`Invalid month "${month}".`);
  const dueDate = new Date(year, monthIdx, dueDay);

  // Which of these students already have a challan for this month/year?
  const ids = students.map(s => s._id);
  const existing = await Fee.find({ school, year, month, student: { $in: ids } }).select('student').lean();
  const has = new Set(existing.map(e => String(e.student)));

  const docs = [];
  let totalBilled = 0;
  for (const s of students) {
    if (has.has(String(s._id))) continue;                 // idempotent skip
    const { items, amount } = resolveItemsForStudent(s, heads);
    if (amount <= 0 && items.every(it => it.amount === 0)) continue; // nothing to bill
    totalBilled += amount;
    docs.push({
      school, student: s._id, month, year,
      items, amount, paid: 0, balance: amount,
      status: 'Pending', dueDate, recordedBy: createdBy,
    });
  }

  let created = [];
  if (docs.length) {
    // ordered:false + tolerate dup-key: if two runs race, the unique index rejects
    // the duplicate rather than aborting the whole batch.
    try {
      created = await Fee.insertMany(docs, { ordered: false });
    } catch (e) {
      if (e.code === 11000 && Array.isArray(e.insertedDocs)) created = e.insertedDocs;
      else throw e;
    }
  }

  // Reflect the new dues on each student's status (only those we just billed).
  if (created.length) {
    await Student.updateMany(
      { _id: { $in: created.map(c => c.student) }, school },
      { $set: { feeStatus: 'Pending' } },
    );
  }

  return {
    created: created.length,
    skipped: students.length - created.length,
    totalBilled,
    challans: created,
  };
}

/**
 * Resolve the target student list for a scope, then generate.
 * scope: 'school' | 'class' | 'students'
 */
async function generateChallans({ school, month, year, scope = 'school', className, studentIds, heads, dueDay, createdBy }) {
  const filter = { school, isActive: true };
  if (scope === 'class')    filter.class = className;
  if (scope === 'students') filter._id = { $in: (studentIds || []).map(id => new mongoose.Types.ObjectId(id)) };

  const students = await Student.find(filter).lean();
  if (!students.length) return { created: 0, skipped: 0, totalBilled: 0, challans: [], students: 0 };

  const result = await generateForStudents({ school, month, year, heads, students, dueDay, createdBy });
  return { ...result, students: students.length };
}

/**
 * Build the default "Monthly heads" list for a school (base amounts). This is the
 * automatic monthly bill (what the 1st-of-month automation uses, and what the
 * generator pre-selects).
 */
async function monthlyHeads(school) {
  const heads = await FeeHead.find({ school, isActive: true, frequency: 'Monthly' }).sort({ order: 1 }).lean();
  return heads.map(h => ({ name: h.name, amount: h.amount }));
}

/**
 * Auto-generate the CURRENT month's challans for one school (used by the
 * scheduler). No-op unless the school opted in. Idempotent.
 */
async function ensureCurrentMonth(school, now = new Date()) {
  if (!school.autoGenerateChallans) return { skipped: true };
  const month = MONTHS[now.getMonth()];
  const year  = now.getFullYear();
  const heads = await monthlyHeads(school._id);
  if (!heads.length) return { created: 0, skipped: 0, totalBilled: 0 };
  return generateChallans({
    school: school._id, month, year, scope: 'school',
    heads, dueDay: school.feeDay || 10, createdBy: null,
  });
}

module.exports = {
  MONTHS,
  resolveItemsForStudent,
  computeMonthlyFee,
  generateForStudents,
  generateChallans,
  monthlyHeads,
  ensureCurrentMonth,
};
