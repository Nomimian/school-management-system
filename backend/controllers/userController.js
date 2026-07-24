// ─────────────────────────────────────────────────────────────────────────────
// STAFF USER MANAGEMENT  —  lets a school's operators (admin/principal) create
// and manage the login accounts of their OWN school only.
//
// Security invariants enforced here:
//   • Tenant isolation: every query is scoped to req.user.school. An operator
//     can never see, create, edit or delete a user in another school.
//   • No privilege escalation: role is validated against an allow-list that
//     EXCLUDES 'superadmin'; `school` is always forced to the caller's school
//     and can never be set from the request body.
//   • Self-protection: you cannot deactivate/demote/delete your own account,
//     and the school can never be left without an active admin.
// ─────────────────────────────────────────────────────────────────────────────
const User = require('../models/User');

// Roles an operator is allowed to assign. 'superadmin' is intentionally absent.
const ASSIGNABLE_ROLES = ['admin', 'principal', 'accountant', 'teacher', 'frontdesk'];

const publicUser = (u) => ({
  id: u._id, _id: u._id, name: u.name, email: u.email, role: u.role,
  phone: u.phone, isActive: u.isActive, lastLogin: u.lastLogin,
  createdAt: u.createdAt, createdBy: u.createdBy,
});

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || ''));

// GET /api/users — list staff accounts for the caller's school
exports.listUsers = async (req, res) => {
  try {
    const users = await User.find({ school: req.user.school, role: { $nin: ['superadmin', 'parent'] } })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: users.map(publicUser) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/users — create a staff account inside the caller's school
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    if (!isValidEmail(email))
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    if (String(password).length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    if (!ASSIGNABLE_ROLES.includes(role))
      return res.status(400).json({ success: false, message: 'Invalid role.' });

    const normEmail = String(email).toLowerCase().trim();
    // Email is a global login identifier — reject if taken anywhere.
    if (await User.findOne({ email: normEmail }))
      return res.status(409).json({ success: false, message: 'That email is already in use.' });

    // school is FORCED to the caller's tenant — never taken from the body.
    const user = await User.create({
      name: String(name).trim(),
      email: normEmail,
      password,                       // hashed by the model pre-save hook
      role,
      phone,
      school: req.user.school,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: publicUser(user) });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

// Fetch a target user that MUST belong to the caller's school (else 404).
async function findOwnSchoolUser(req) {
  // Staff management never touches superadmins or parent accounts.
  return User.findOne({ _id: req.params.id, school: req.user.school, role: { $nin: ['superadmin', 'parent'] } });
}

// PUT /api/users/:id — update name/phone/role/isActive
exports.updateUser = async (req, res) => {
  try {
    const target = await findOwnSchoolUser(req);
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

    const isSelf = String(target._id) === String(req.user._id);
    const { name, phone, role, isActive } = req.body;

    if (name !== undefined)  target.name = String(name).trim();
    if (phone !== undefined) target.phone = phone;

    if (role !== undefined && role !== target.role) {
      if (!ASSIGNABLE_ROLES.includes(role))
        return res.status(400).json({ success: false, message: 'Invalid role.' });
      if (isSelf)
        return res.status(400).json({ success: false, message: 'You cannot change your own role.' });
      // Prevent removing the last active admin from the school.
      if (target.role === 'admin' && !(await hasOtherActiveAdmin(req.user.school, target._id)))
        return res.status(400).json({ success: false, message: 'The school must keep at least one active admin.' });
      target.role = role;
    }

    if (isActive !== undefined && isActive !== target.isActive) {
      if (isSelf)
        return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
      if (target.role === 'admin' && isActive === false && !(await hasOtherActiveAdmin(req.user.school, target._id)))
        return res.status(400).json({ success: false, message: 'The school must keep at least one active admin.' });
      target.isActive = isActive;
    }

    await target.save();
    res.json({ success: true, data: publicUser(target) });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

// PUT /api/users/:id/password — operator resets a staff member's password
exports.resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    const target = await findOwnSchoolUser(req);
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });
    target.password = newPassword;      // re-hashed by pre-save hook
    await target.save();
    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

// DELETE /api/users/:id — remove a staff account
exports.deleteUser = async (req, res) => {
  try {
    const target = await findOwnSchoolUser(req);
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });
    if (String(target._id) === String(req.user._id))
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    if (target.role === 'admin' && !(await hasOtherActiveAdmin(req.user.school, target._id)))
      return res.status(400).json({ success: false, message: 'The school must keep at least one active admin.' });
    await target.deleteOne();
    res.json({ success: true, message: 'User removed.' });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

// Is there another active admin in this school besides `exceptId`?
async function hasOtherActiveAdmin(school, exceptId) {
  const count = await User.countDocuments({ school, role: 'admin', isActive: true, _id: { $ne: exceptId } });
  return count > 0;
}
