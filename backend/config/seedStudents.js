/**
 * Import students from ExportExcel.xlsx into the database.
 *
 *   node config/seedStudents.js
 *
 * Non-destructive to other tenants: it finds-or-creates ONE school
 * ("Al-Majid Academy" + admin login) and (re)imports the Excel students
 * into it. Missing REQUIRED fields (name, class, gender) are filled with
 * random values; everything else is stored as-is (blank when absent).
 */
require('dotenv').config();
const path     = require('path');
const mongoose = require('mongoose');
const XLSX     = require('xlsx');
const User     = require('../models/User');
const School   = require('../models/School');
const Student  = require('../models/Student');

const EXCEL_PATH = path.resolve(__dirname, '../../../ExportExcel.xlsx');

// ── helpers ──────────────────────────────────────────────────────────────────
const RANDOM_NAMES = [
  'Ali Raza', 'Ahmed Khan', 'Fatima Noor', 'Ayesha Bibi', 'Hassan Iqbal',
  'Sana Malik', 'Bilal Ahmed', 'Zainab Tariq', 'Usman Farooq', 'Hira Nawaz',
];
const CLASS_POOL = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH', '9TH', '10TH'];

const pick = (arr, i) => arr[i % arr.length];
const clean = (v) => {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s === '' || s.toUpperCase() === 'N/A' ? undefined : s;
};

// Normalise "MALE"/"female"/"M" → enum value; anything else → undefined
function normGender(v) {
  const s = clean(v);
  if (!s) return undefined;
  const u = s.toUpperCase();
  if (u.startsWith('M')) return 'Male';
  if (u.startsWith('F')) return 'Female';
  return undefined;
}

// Parse "DD-MM-YYYY" (also tolerates "DD/MM/YYYY") → Date, else undefined
function parseDOB(v) {
  const s = clean(v);
  if (!s) return undefined;
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    y = y.length === 2 ? `20${y}` : y;
    const dt = new Date(Number(y), Number(mo) - 1, Number(d));
    return isNaN(dt) ? undefined : dt;
  }
  const dt = new Date(s);
  return isNaN(dt) ? undefined : dt;
}

// ── main ──────────────────────────────────────────────────────────────────────
async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`✅ MongoDB connected: ${mongoose.connection.host} / ${mongoose.connection.name}`);

  // 1) Read the Excel file --------------------------------------------------
  const wb   = XLSX.readFile(EXCEL_PATH);
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  console.log(`📄 Read ${rows.length} rows from ${path.basename(EXCEL_PATH)} (sheet: ${wb.SheetNames[0]})`);

  // 2) Find-or-create the school + admin login ------------------------------
  let school = await School.findOne({ slug: 'al-majid-academy' });
  if (!school) {
    school = await School.create({
      name: 'Al-Majid Academy', shortName: 'AMA',
      board: 'Punjab Board of Secondary Education', academicYear: '2024-2025',
      stampText: 'AL-MAJID ACADEMY', tagline: 'Knowledge · Character · Excellence',
      plan: 'pro', maxStudents: 1000, maxTeachers: 80, isActive: true,
      primaryColor: '#1d4ed8', feeDay: 10, lateFine: 200,
    });
    console.log(`🏫 Created school: ${school.name}`);
  } else {
    console.log(`🏫 Using existing school: ${school.name}`);
  }

  let admin = await User.findOne({ email: 'admin@school.edu' });
  if (!admin) {
    admin = await User.create({
      name: 'Administrator', email: 'admin@school.edu', password: 'admin123',
      role: 'principal', school: school._id,
    });
    console.log('👤 Created admin login: admin@school.edu / admin123');
  } else {
    console.log('👤 Admin login already exists: admin@school.edu');
  }

  // 3) Clear any previously-imported students for THIS school (idempotent) ---
  const del = await Student.deleteMany({ school: school._id });
  if (del.deletedCount) console.log(`🗑️  Removed ${del.deletedCount} previously-imported students`);

  // 4) Map rows → Student docs (fill required-missing with random) ----------
  let randCount = 0;
  const docs = rows.map((r, i) => {
    let name = clean(r.StudentName);
    if (!name) { name = pick(RANDOM_NAMES, i); randCount++; }

    let cls = clean(r.Class);
    if (!cls) { cls = pick(CLASS_POOL, i); randCount++; }

    let gender = normGender(r.Gender);
    if (!gender) { gender = i % 2 === 0 ? 'Male' : 'Female'; randCount++; }

    const religionRaw = clean(r.Religion);
    const religion = religionRaw
      ? (religionRaw.toUpperCase() === 'MUSLIM' ? 'Islam'
         : religionRaw.charAt(0).toUpperCase() + religionRaw.slice(1).toLowerCase())
      : undefined;

    const guardianPhone = clean(r.FatherNum) || clean(r.SMSNumber);

    return {
      school:      school._id,
      studentId:   clean(r.RegistrationNum) || `AMA-${String(i + 1).padStart(4, '0')}`,
      name,
      class:       cls,
      section:     clean(r.Section),
      rollNumber:  clean(r.RegistrationNum),
      gender,
      dateOfBirth: parseDOB(r.StudentDOB),
      religion,
      bloodGroup:  clean(r.BloodGroup),
      guardian: {
        name:         clean(r.FatherName),
        relationship: 'Father',
        phone:        guardianPhone,
      },
      address:  clean(r.HomeAddress),
      phone:    clean(r.StudentNum) || clean(r.SMSNumber),
      feeAmount: 0,
      feeStatus: 'Pending',
      isActive: true,
    };
  });

  // De-dupe studentId within this batch (per-school unique index)
  const seen = new Set();
  docs.forEach((d, i) => {
    if (seen.has(d.studentId)) d.studentId = `${d.studentId}-${i + 1}`;
    seen.add(d.studentId);
  });

  // 5) Insert --------------------------------------------------------------
  const inserted = await Student.insertMany(docs, { ordered: false });
  console.log(`\n✅ Imported ${inserted.length}/${rows.length} students into "${school.name}"`);
  console.log(`   (${randCount} required field(s) were filled with random values across all rows)`);
  console.log('\n🔑 Login:  admin@school.edu / admin123');
  console.log('================================\n');
  process.exit(0);
}

run().catch((err) => { console.error('❌ Import error:', err); process.exit(1); });
