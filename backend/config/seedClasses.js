/**
 * Seed the Class list for Al-Majid Academy.
 *
 *   node config/seedClasses.js
 *
 * Builds the class ladder in the SAME format the students are enrolled in
 * (e.g. "9TH", "PRE-1ST YEAR") and extends it up through "2ND YEAR". Sections
 * are derived from the students actually enrolled in each class.
 *
 * Idempotent & non-redundant: a class is only created if it does not already
 * exist (unique per school by name); existing classes are left untouched.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const School   = require('../models/School');
const Student  = require('../models/Student');
const { Class } = require('../models/Other');

// The intermediate ladder that a school "up to 2nd year" always offers, in the
// students' own naming format. Merged (de-duped) with whatever classes the
// enrolled students already sit in.
const LADDER = ['PRE-9TH', '9TH', '10TH', 'PRE-1ST YEAR', '1ST YEAR', '2ND YEAR'];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`✅ MongoDB connected: ${mongoose.connection.host} / ${mongoose.connection.name}`);

  const school = await School.findOne({ slug: 'al-majid-academy' });
  if (!school) { console.error('❌ School "al-majid-academy" not found — run seedStudents.js first.'); process.exit(1); }

  // 1) Distinct classes + their sections, taken from the enrolled students ----
  const agg = await Student.aggregate([
    { $match: { school: school._id } },
    { $group: { _id: '$class', sections: { $addToSet: '$section' }, count: { $sum: 1 } } },
  ]);
  const studentClasses = new Map(
    agg.map((a) => [a._id, {
      sections: a.sections.filter(Boolean).sort(),
      count: a.count,
    }])
  );

  // 2) Full target list = students' classes ∪ ladder (till 2nd year) ----------
  const targetNames = [...new Set([...studentClasses.keys(), ...LADDER])].filter(Boolean);

  // 3) Upsert — create only what's missing (never clobber existing rows) ------
  let created = 0, skipped = 0;
  for (const name of targetNames) {
    const existing = await Class.findOne({ school: school._id, name });
    if (existing) { skipped++; continue; }
    const info = studentClasses.get(name);
    await Class.create({
      school:   school._id,
      name,
      section:  info ? info.sections.join(', ') : '',   // e.g. "A, B" — reflects reality, no dup rows
      capacity: 40,
    });
    created++;
    const tag = info ? `${info.count} students, sections: ${info.sections.join('/') || '—'}` : 'no students yet';
    console.log(`   ➕ ${name}  (${tag})`);
  }

  console.log(`\n✅ Classes: ${created} created, ${skipped} already existed. Total target ladder: ${targetNames.length}.`);
  process.exit(0);
}

run().catch((err) => { console.error('❌ Class seed error:', err); process.exit(1); });
