// ─────────────────────────────────────────────────────────────────────────────
// GRADING — single source of truth for turning a percentage into a grade.
//
// The whole exams module (marks entry, exam reports, report cards) grades
// against the school's configurable Grade Scale (Exams → Manage Grades /
// Settings). When a school hasn't defined one, we fall back to these built-in
// bands so grading never silently breaks.
// ─────────────────────────────────────────────────────────────────────────────

// Built-in fallback bands. `min` is an inclusive lower bound on the percentage.
const DEFAULT_BANDS = [
  { grade: 'A+', min: 90, gpa: 4.0, remarks: 'Outstanding' },
  { grade: 'A',  min: 80, gpa: 3.7, remarks: 'Excellent' },
  { grade: 'B+', min: 70, gpa: 3.3, remarks: 'Very Good' },
  { grade: 'B',  min: 60, gpa: 3.0, remarks: 'Good' },
  { grade: 'C',  min: 50, gpa: 2.5, remarks: 'Satisfactory' },
  { grade: 'D',  min: 40, gpa: 2.0, remarks: 'Needs Improvement' },
  { grade: 'F',  min: 0,  gpa: 0.0, remarks: 'Fail' },
];

// The default scale seeded for every school. `minMarks`/`maxMarks` are PERCENTAGES.
const DEFAULT_SCALE = DEFAULT_BANDS.map((b, i) => ({
  grade: b.grade,
  minMarks: b.min,
  maxMarks: i === 0 ? 100 : DEFAULT_BANDS[i - 1].min - 0.01,
  gpa: b.gpa,
  remarks: b.remarks,
}));

/**
 * Resolve a percentage (0–100) to { grade, gpa, remarks } using a GradeScale
 * document when supplied, otherwise the built-in bands.
 */
function resolveGrade(pct, scale) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));

  if (scale && Array.isArray(scale.scales) && scale.scales.length) {
    const bands = [...scale.scales].sort((a, b) => (b.minMarks || 0) - (a.minMarks || 0));
    // Prefer an exact [minMarks, maxMarks] window match…
    for (const b of bands) {
      const min = b.minMarks ?? 0;
      const max = b.maxMarks ?? 100;
      if (p >= min && p <= max) return { grade: b.grade, gpa: b.gpa ?? null, remarks: b.remarks || '' };
    }
    // …then fall back to the highest band whose lower bound we clear.
    for (const b of bands) {
      if (p >= (b.minMarks ?? 0)) return { grade: b.grade, gpa: b.gpa ?? null, remarks: b.remarks || '' };
    }
  }

  for (const b of DEFAULT_BANDS) {
    if (p >= b.min) return { grade: b.grade, gpa: b.gpa, remarks: b.remarks };
  }
  return { grade: 'F', gpa: 0, remarks: 'Fail' };
}

/**
 * The school's active Grade Scale (the one flagged default, else the first).
 * Returns null when none exist — callers then use the built-in bands.
 */
async function getDefaultScale(schoolId) {
  const { GradeScale } = require('../models/Extended');
  return (
    (await GradeScale.findOne({ school: schoolId, isDefault: true })) ||
    (await GradeScale.findOne({ school: schoolId }))
  );
}

module.exports = { DEFAULT_BANDS, DEFAULT_SCALE, resolveGrade, getDefaultScale };
