// ─────────────────────────────────────────────────────────────────────────────
// CENTRAL PERMISSION MATRIX  —  single source of truth for role-based access.
//
// Every tenant API route belongs to a "module". A role may READ a module if it
// is listed in MODULE_ACCESS[module]; it may WRITE (POST/PUT/PATCH/DELETE) only
// if listed in MODULE_WRITE[module] (which defaults to the read list when not
// specified). The same map drives the frontend nav/route guards via the
// `allowedModules` array returned at login — so backend and frontend can never
// drift apart.
//
// NOTE: this governs WHAT a role can do; tenant isolation (WHICH school's data)
// is enforced separately and unconditionally in every controller by scoping to
// req.user.school. The two layers are independent and both always apply.
// ─────────────────────────────────────────────────────────────────────────────

// School-staff roles. `admin` and `principal` are full-access operators.
// `superadmin` is the platform owner and never operates inside a tenant here.
const STAFF_ROLES = ['admin', 'principal', 'accountant', 'teacher', 'frontdesk'];

const ALL = STAFF_ROLES;                      // every staff role
const OPS = ['admin', 'principal'];           // school operators (full access)

// module -> roles allowed to READ / use it
const MODULE_ACCESS = {
  dashboard:    ALL,
  students:     ALL,                                    // everyone can look up a student
  teachers:     [...OPS, 'frontdesk'],
  classes:      [...OPS, 'teacher'],
  admissions:   [...OPS, 'frontdesk'],
  attendance:   [...OPS, 'teacher'],
  timetable:    [...OPS, 'teacher'],
  homework:     [...OPS, 'teacher'],
  promotions:   OPS,
  exams:        [...OPS, 'teacher'],
  results:      [...OPS, 'teacher'],
  fees:         [...OPS, 'accountant'],
  accounts:     [...OPS, 'accountant'],
  library:      [...OPS, 'frontdesk', 'teacher'],
  transport:    [...OPS, 'frontdesk'],
  hr:           OPS,
  certificates: [...OPS, 'frontdesk'],
  notices:      ALL,                                    // everyone reads notices
  messaging:    ALL,                                    // everyone can message
  reports:      [...OPS, 'accountant'],
  calendar:     ALL,
  hiring:       OPS,
  settings:     OPS,
  users:        ['principal'],                          // ONLY the principal manages staff accounts
  parents:      [...OPS, 'frontdesk'],                  // parent-account management
};

// module -> roles allowed to WRITE (mutate). Only listed where it differs from
// the read list above (i.e. read-for-many, write-for-few).
const MODULE_WRITE = {
  students:     [...OPS, 'frontdesk'],   // teachers/accountants read-only
  classes:      OPS,                     // teachers read-only
  library:      [...OPS, 'frontdesk'],   // teachers browse, desk manages stock
  notices:      OPS,                     // everyone reads, operators post
  calendar:     OPS,                     // everyone views, operators edit
};

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** All module keys a given role may access (read). Drives frontend nav. */
function modulesForRole(role) {
  return Object.keys(MODULE_ACCESS).filter((m) => MODULE_ACCESS[m].includes(role));
}

/** Can `role` perform `method` on `module`? */
function canAccess(role, module, method = 'GET') {
  const readers = MODULE_ACCESS[module];
  if (!readers || !readers.includes(role)) return false;
  if (WRITE_METHODS.has(String(method).toUpperCase())) {
    const writers = MODULE_WRITE[module] || readers;
    return writers.includes(role);
  }
  return true;
}

module.exports = {
  STAFF_ROLES,
  MODULE_ACCESS,
  MODULE_WRITE,
  modulesForRole,
  canAccess,
};
