const XLSX = require('xlsx');
const Student = require('../models/Student');

// ─── column mapping ──────────────────────────────────────────────────────────
// Accepts the school's ExportExcel headers plus common aliases (case/space-insensitive).
const ALIASES = {
  studentId:  ['registrationnum', 'regno', 'registrationno', 'registration', 'studentid', 'id', 'rollno', 'rollnumber'],
  name:       ['studentname', 'name', 'fullname'],
  class:      ['class', 'grade', 'classname'],
  section:    ['section'],
  gender:     ['gender', 'sex'],
  dateOfBirth:['studentdob', 'dob', 'dateofbirth', 'birthdate'],
  religion:   ['religion'],
  bloodGroup: ['bloodgroup'],
  guardianName:  ['fathername', 'guardianname', 'father', 'guardian', 'parentname'],
  guardianPhone: ['fathernum', 'guardianphone', 'fatherphone', 'contact', 'phone'],
  studentPhone:  ['studentnum', 'studentphone', 'mobile', 'smsnumber'],
  address:    ['homeaddress', 'address'],
  discount:   ['feediscount', 'discount', 'concession'],
};

const RANDOM_NAMES = ['Ali Raza','Ahmed Khan','Fatima Noor','Ayesha Bibi','Hassan Iqbal','Sana Malik','Bilal Ahmed','Zainab Tariq','Usman Farooq','Hira Nawaz'];
const CLASS_POOL   = ['1ST','2ND','3RD','4TH','5TH','6TH','7TH','8TH','9TH','10TH'];
const norm = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = (v) => { if (v === null || v === undefined) return undefined; const s = String(v).trim(); return s === '' || s.toUpperCase() === 'N/A' ? undefined : s; };

function normGender(v) { const s = clean(v); if (!s) return undefined; const u = s.toUpperCase(); if (u.startsWith('M')) return 'Male'; if (u.startsWith('F')) return 'Female'; return undefined; }
function parseDOB(v) {
  const s = clean(v); if (!s) return undefined;
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (m) { let [, d, mo, y] = m; y = y.length === 2 ? `20${y}` : y; const dt = new Date(Number(y), Number(mo) - 1, Number(d)); return isNaN(dt) ? undefined : dt; }
  const dt = new Date(s); return isNaN(dt) ? undefined : dt;
}

// Build a header→canonical resolver for one sheet's rows.
function makeResolver(sampleRow) {
  const headerByNorm = {};
  Object.keys(sampleRow || {}).forEach(h => { headerByNorm[norm(h)] = h; });
  const find = (canonical) => {
    for (const alias of ALIASES[canonical]) if (headerByNorm[alias] !== undefined) return headerByNorm[alias];
    return null;
  };
  const resolved = {};
  Object.keys(ALIASES).forEach(k => { resolved[k] = find(k); });
  return (row, canonical) => { const h = resolved[canonical]; return h ? row[h] : undefined; };
}

// Map one raw row → a Student-shaped object, filling required-missing with random.
function mapRow(row, get, i) {
  let randomFilled = 0;
  let name = clean(get(row, 'name'));       if (!name) { name = RANDOM_NAMES[i % RANDOM_NAMES.length]; randomFilled++; }
  let cls  = clean(get(row, 'class'));       if (!cls)  { cls  = CLASS_POOL[i % CLASS_POOL.length];    randomFilled++; }
  let gender = normGender(get(row, 'gender')); if (!gender) { gender = i % 2 === 0 ? 'Male' : 'Female'; randomFilled++; }

  const religionRaw = clean(get(row, 'religion'));
  const religion = religionRaw ? (religionRaw.toUpperCase() === 'MUSLIM' ? 'Islam' : religionRaw.charAt(0).toUpperCase() + religionRaw.slice(1).toLowerCase()) : undefined;
  const discount = Number(get(row, 'discount')) || 0;

  return {
    studentId: clean(get(row, 'studentId')),
    name, class: cls, section: clean(get(row, 'section')), gender,
    dateOfBirth: parseDOB(get(row, 'dateOfBirth')),
    religion, bloodGroup: clean(get(row, 'bloodGroup')),
    guardian: { name: clean(get(row, 'guardianName')), relationship: 'Father', phone: clean(get(row, 'guardianPhone')) || clean(get(row, 'studentPhone')) },
    address: clean(get(row, 'address')),
    phone: clean(get(row, 'studentPhone')),
    feeProfile: discount > 0 ? [{ name: 'Tuition Fee', amount: 0, discount }] : [],
    _randomFilled: randomFilled,
  };
}

function parseBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  if (!rows.length) return { rows: [], sheet: wb.SheetNames[0] };
  const get = makeResolver(rows[0]);
  return { rows: rows.map((r, i) => mapRow(r, get, i)), sheet: wb.SheetNames[0] };
}

// @POST /api/students/import/preview  (multipart: file)
exports.importPreview = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const { rows, sheet } = parseBuffer(req.file.buffer);
    if (!rows.length) return res.status(400).json({ success: false, message: 'The sheet is empty or unreadable.' });
    if (rows.length > 3000) return res.status(400).json({ success: false, message: 'Please import at most 3000 rows at a time.' });

    const ids = rows.map(r => r.studentId).filter(Boolean);
    const existing = ids.length
      ? await Student.find({ school: req.user.school, studentId: { $in: ids } }).select('studentId').lean()
      : [];
    const existingSet = new Set(existing.map(e => e.studentId));

    const willUpdate = rows.filter(r => r.studentId && existingSet.has(r.studentId)).length;
    const randomFills = rows.reduce((s, r) => s + (r._randomFilled || 0), 0);

    res.json({
      success: true,
      data: {
        sheet,
        rows,                                   // sent back on confirm (no re-upload)
        summary: { total: rows.length, willCreate: rows.length - willUpdate, willUpdate, randomFills },
      },
    });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

// @POST /api/students/import  (body: { rows: [...] })
exports.importStudents = async (req, res) => {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    if (!rows.length) return res.status(400).json({ success: false, message: 'No rows to import.' });
    if (rows.length > 3000) return res.status(400).json({ success: false, message: 'Please import at most 3000 rows at a time.' });

    const school = req.user.school;
    const ids = rows.map(r => r.studentId).filter(Boolean);
    const existing = ids.length
      ? await Student.find({ school, studentId: { $in: ids } }).select('studentId').lean()
      : [];
    const existingSet = new Set(existing.map(e => e.studentId));
    let seq = await Student.countDocuments({ school });

    const creates = [], updateOps = [];
    const seen = new Set();
    for (const r of rows) {
      const { _randomFilled, ...doc } = r;
      if (!doc.name || !doc.class || !doc.gender) continue;   // guard (preview fills these)
      if (doc.studentId && existingSet.has(doc.studentId)) {
        updateOps.push({ updateOne: { filter: { school, studentId: doc.studentId }, update: { $set: { ...doc, school } } } });
      } else {
        let sid = doc.studentId;
        if (!sid || seen.has(sid)) sid = `S${String(++seq).padStart(4, '0')}`;
        seen.add(sid);
        creates.push({ ...doc, studentId: sid, school });
      }
    }

    let created = 0, updated = 0;
    if (creates.length) {
      try { created = (await Student.insertMany(creates, { ordered: false })).length; }
      catch (e) { created = e.insertedDocs?.length || 0; }
    }
    if (updateOps.length) { const r = await Student.bulkWrite(updateOps); updated = (r.modifiedCount || 0) + (r.matchedCount || 0); }

    res.json({
      success: true,
      message: `Imported ${created} new student(s)` + (updated ? ` and updated ${updated}` : ''),
      data: { created, updated, total: rows.length, skipped: rows.length - created - updated },
    });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};
