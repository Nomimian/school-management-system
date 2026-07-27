const School = require('../models/School');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { modulesForRole } = require('../config/permissions');
const { PlatformSettings } = require('../models/Platform');
const mailer = require('../services/mailer');

const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// NOTE: public self-registration is intentionally NOT implemented. New schools
// and their admin accounts are provisioned exclusively by the SuperAdmin panel,
// and staff/parent accounts by a school operator. A former `register` handler
// that trusted `role` from the body was removed as a privilege-escalation risk.

// @route POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    if (!user.isActive)
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });

    // Platform maintenance mode blocks all school-side logins (superadmin uses a
    // separate portal and is unaffected).
    const platform = await PlatformSettings.getSingleton().catch(() => null);
    if (platform?.maintenanceMode)
      return res.status(503).json({ success: false, message: 'The platform is under maintenance. Please try again later.' });

    const token = signToken(user._id);
    let schoolData = null;
    if (user.school) {
      schoolData = await School.findById(user.school).select('-__v');
      // Subscription gate: a suspended or expired tenant cannot sign in.
      if (schoolData && schoolData.isActive === false)
        return res.status(403).json({ success: false, message: 'This school account is suspended. Please contact your provider.' });
      if (schoolData && schoolData.licenseExpiry && new Date(schoolData.licenseExpiry) < new Date())
        return res.status(403).json({ success: false, message: 'Your subscription has expired. Please renew to continue.' });
    }

    user.lastLogin = new Date();
    await user.save();
    res.json({
      success: true,
      token,
      user: {
        id: user._id, name: user.name, email: user.email, role: user.role,
        school: user.school, permissions: modulesForRole(user.role),
      },
      school: schoolData,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route GET /api/auth/me
exports.getMe = async (req, res) => {
  const u = req.user;
  res.json({
    success: true,
    user: {
      id: u._id, name: u.name, email: u.email, role: u.role,
      school: u.school, phone: u.phone, isActive: u.isActive,
      permissions: modulesForRole(u.role),
    },
  });
};

// @route POST /api/auth/forgot-password
// Always responds success so we never reveal which emails are registered.
exports.forgotPassword = async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const generic = { success: true, message: 'If that email is registered, a reset link has been sent.' };
    const user = await User.findOne({ email });
    if (!user || !user.isActive) return res.json(generic);

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(rawToken);
    user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    const appUrl = process.env.FRONTEND_URL || (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',')[0].trim() : 'http://localhost:5173');
    const link = `${appUrl}/reset-password/${rawToken}`;
    const school = user.school ? await School.findById(user.school).select('name') : null;

    let result;
    try {
      result = await mailer.sendMail({
        to: user.email,
        subject: 'Reset your password',
        fromName: school?.name || 'School Management',
        text: `Hello ${user.name},\n\nReset your password using this link (valid for 1 hour):\n${link}\n\nIf you didn't request this, you can ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1e293b;line-height:1.6;">
          <p>Hello ${user.name},</p>
          <p>You requested a password reset. Click the button below to choose a new password — this link expires in <b>1 hour</b>.</p>
          <p><a href="${link}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;">Reset Password</a></p>
          <p style="color:#64748b;font-size:12px;">Or paste this link into your browser:<br/>${link}</p>
          <p style="color:#94a3b8;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
        </div>`,
      });
    } catch (e) { console.warn('forgot-password email failed:', e.message); }

    const payload = { ...generic };
    // Dev convenience: when email isn't really configured, hand back the link so
    // it can be tested without an inbox. Never leaked in production.
    if (process.env.NODE_ENV !== 'production' && (result?.simulated || !mailer.isConfigured())) payload.devResetLink = link;
    res.json(payload);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route POST /api/auth/reset-password/:token
exports.resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

    const user = await User.findOne({
      resetPasswordToken: hashToken(req.params.token),
      resetPasswordExpire: { $gt: new Date() },
    }).select('+password +resetPasswordToken +resetPasswordExpire');

    if (!user) return res.status(400).json({ success: false, message: 'This reset link is invalid or has expired.' });

    user.password = newPassword;              // re-hashed by the pre-save hook
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(currentPassword)))
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
