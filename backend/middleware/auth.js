const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { canAccess } = require('../config/permissions');

exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized. No token.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found.' });
    // Convenience: the tenant this request operates within
    req.schoolId = req.user.school || null;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired.' });
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: `Role '${req.user.role}' not authorized.` });
  }
  next();
};

// Role-based module guard. Mount on a path prefix (covers all methods/subpaths):
//   router.use('/fees', requireModule('fees'))
// Enforces both read access and, for write methods, write access — using the
// central permission matrix so behaviour matches the frontend exactly.
exports.requireModule = (module) => (req, res, next) => {
  const role = req.user?.role;
  if (!role || !canAccess(role, module, req.method)) {
    return res.status(403).json({
      success: false,
      message: `Your role (${role || 'unknown'}) is not permitted to ${req.method === 'GET' ? 'view' : 'modify'} ${module}.`,
    });
  }
  next();
};

// Guard tenant routes: every data request must belong to a school.
// Prevents accidental cross-tenant / global queries when school is missing.
exports.requireSchool = (req, res, next) => {
  if (!req.schoolId) {
    return res.status(403).json({
      success: false,
      message: 'No school is linked to this account. Ask your provider to (re)provision access.',
    });
  }
  next();
};
