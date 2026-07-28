/**
 * One-off setup for the fee-configuration feature on Al-Majid Academy:
 *   1. Ensure fee heads exist (Tuition 14000 Monthly, Exam/Test Optional, Admission One-Time)
 *   2. Turn ON monthly-challan automation for the school
 *   3. Backfill imported students' Tuition discount from the Excel FeeDiscount column
 *   4. Non-destructive smoke test of challan generation (creates one, then removes it)
 *
 *   node config/seedFeeSetup.js
 */
require('dotenv').config();
const path     = require('path');
const mongoose = require('mongoose');
const XLSX     = require('xlsx');
const School   = require('../models/School');
const Student  = require('../models/Student');
const FeeHead  = require('../models/FeeHead');
const Fee      = require('../models/Fee');
const challan  = require('../services/challanService');

const EXCEL_PATH = path.resolve(__dirname, '../../../ExportExcel.xlsx');
const TUITION_BASE = 14000;

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`✅ MongoDB connected: ${mongoose.connection.host} / ${mongoose.connection.name}`);

  const school = await School.findOne({ slug: 'al-majid-academy' });
  if (!school) { console.error('❌ Al-Majid Academy not found. Run seedStudents.js first.'); process.exit(1); }

  // 1) Fee heads (idempotent upsert by name) --------------------------------
  const heads = [
    { name: 'Tuition Fee',      amount: TUITION_BASE, frequency: 'Monthly',  order: 0 },
    { name: 'Exam / Test Fee',  amount: 0,            frequency: 'Optional', order: 1 },
    { name: 'Admission Fee',    amount: 0,            frequency: 'One-Time', order: 2 },
  ];
  for (const h of heads) {
    await FeeHead.updateOne(
      { school: school._id, name: h.name },
      { $setOnInsert: { school: school._id, ...h } },
      { upsert: true },
    );
  }
  console.log(`🧾 Fee heads ready (Tuition = Rs ${TUITION_BASE}/mo, Exam/Test, Admission)`);

  // 2) Enable automation ----------------------------------------------------
  await School.updateOne({ _id: school._id }, { $set: { autoGenerateChallans: true, feeDay: school.feeDay || 10 } });
  console.log('⚙️  Monthly-challan automation: ON');

  // 3) Backfill discounts from Excel ---------------------------------------
  let discounted = 0;
  try {
    const wb = XLSX.readFile(EXCEL_PATH);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });
    const discByReg = new Map();
    rows.forEach(r => {
      const reg = r.RegistrationNum != null ? String(r.RegistrationNum).trim() : null;
      const disc = Number(r.FeeDiscount) || 0;
      if (reg && disc > 0) discByReg.set(reg, disc);
    });

    const students = await Student.find({ school: school._id }).select('studentId rollNumber feeProfile').lean();
    const ops = [];
    for (const s of students) {
      const reg = s.studentId || s.rollNumber;
      const disc = discByReg.get(String(reg));
      if (!disc) continue;
      // amount:0 → "use the head's base" so future base changes still flow through;
      // only the per-student discount is pinned here.
      ops.push({
        updateOne: {
          filter: { _id: s._id },
          update: { $set: {
            feeProfile: [{ name: 'Tuition Fee', amount: 0, discount: disc }],
            feeAmount: Math.max(0, TUITION_BASE - disc),
          } },
        },
      });
    }
    if (ops.length) { await Student.bulkWrite(ops); discounted = ops.length; }
  } catch (e) {
    console.warn(`⚠️  Discount backfill skipped: ${e.message}`);
  }
  console.log(`💸 Applied Tuition discounts to ${discounted} student(s) from the Excel FeeDiscount column`);

  // 4) Smoke test (create one challan, verify, delete) ----------------------
  const sample = await Student.findOne({ school: school._id }).lean();
  if (sample) {
    const monthlyHeads = await challan.monthlyHeads(school._id);
    const { items, amount } = challan.resolveItemsForStudent(sample, monthlyHeads);
    console.log(`\n🔎 Smoke test — ${sample.name} (${sample.class}):`);
    console.log('   monthly heads:', monthlyHeads.map(h => `${h.name}=${h.amount}`).join(', '));
    console.log('   resolved items:', JSON.stringify(items), '→ net Rs', amount);

    const res = await challan.generateChallans({
      school: school._id, month: 'January', year: 1900, scope: 'students',
      studentIds: [String(sample._id)], heads: monthlyHeads, dueDay: 10,
    });
    console.log(`   generateChallans → created ${res.created}, skipped ${res.skipped}, billed Rs ${res.totalBilled}`);
    const del = await Fee.deleteMany({ school: school._id, month: 'January', year: 1900 });
    console.log(`   cleaned up ${del.deletedCount} test challan(s)`);
  }

  console.log('\n✅ Fee configuration ready.');
  process.exit(0);
}

run().catch(err => { console.error('❌ Setup error:', err); process.exit(1); });
