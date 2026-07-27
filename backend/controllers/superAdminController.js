// SuperAdmin Controller - handles all superadmin operations
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const mongoose = require('mongoose');

// Constant-time string compare (hash first so unequal lengths don't throw and
// timing doesn't leak length).
const safeEqual = (a, b) => {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};
const School   = require('../models/School');
const User     = require('../models/User');
const { PlatformSettings, AuditLog, Announcement } = require('../models/Platform');
const { notify } = require('./notificationController');
const { modulesForRole } = require('../config/permissions');

// ── In-memory plan store (replace with DB model in production) ───────────────
const PLANS = [
  { id:'trial',      name:'Free Trial',  price:0,      duration:30,  maxStudents:100,  maxTeachers:10,  features:['Basic modules','Email support'] },
  { id:'basic',      name:'Basic',       price:2999,   duration:365, maxStudents:300,  maxTeachers:25,  features:['All modules','Phone support','Fee receipts'] },
  { id:'pro',        name:'Pro',         price:5999,   duration:365, maxStudents:1000, maxTeachers:80,  features:['All modules','Priority support','Multi-admin','SMS integration'] },
  { id:'enterprise', name:'Enterprise',  price:14999,  duration:365, maxStudents:5000, maxTeachers:500, features:['Unlimited everything','Dedicated support','Custom branding','API access'] },
];

// Persistent audit log (survives restarts). Best-effort — never blocks the
// action it records.
const logActivity = (action, details, adminEmail='superadmin') => {
  AuditLog.create({ action, details, adminEmail }).catch(e => console.warn('audit log failed:', e.message));
};

// ── SUPERADMIN AUTH ───────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const SA_EMAIL = process.env.SA_EMAIL;
    const SA_PASS  = process.env.SA_PASSWORD;

    // No published defaults: if the platform owner hasn't configured credentials,
    // the portal is closed rather than reachable with a well-known password.
    if (!SA_EMAIL || !SA_PASS) {
      return res.status(503).json({ success:false, message:'SuperAdmin access is not configured on this server.' });
    }

    const emailOk = safeEqual(String(email || '').toLowerCase().trim(), SA_EMAIL.toLowerCase().trim());
    const passOk  = safeEqual(password || '', SA_PASS);
    if (!emailOk || !passOk) {
      return res.status(401).json({ success:false, message:'Invalid superadmin credentials.' });
    }
    const token = jwt.sign(
      { id:'superadmin', role:'superadmin', email: SA_EMAIL },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    logActivity('LOGIN', `SuperAdmin logged in`, email);
    res.json({ success:true, token, user:{ id:'superadmin', name:'Super Admin', email:SA_EMAIL, role:'superadmin' } });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── MIDDLEWARE: verify superadmin token ───────────────────────────────────────
exports.protect = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ success:false, message:'No token provided.' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.role !== 'superadmin')
      return res.status(403).json({ success:false, message:'SuperAdmin access only.' });
    req.superadmin = decoded;
    next();
  } catch(e) {
    res.status(401).json({ success:false, message:'Invalid or expired token.' });
  }
};

// ── PLATFORM STATS ────────────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const [
      totalSchools, activeSchools, trialSchools,
      totalUsers,
    ] = await Promise.all([
      School.countDocuments(),
      School.countDocuments({ isActive:true }),
      School.countDocuments({ plan:'trial' }),
      User.countDocuments(),
    ]);

    // Revenue calculation from subscriptions
    const schools = await School.find().select('plan licenseExpiry createdAt');
    const planPrices = { trial:0, basic:2999, pro:5999, enterprise:14999 };
    const monthlyRevenue = schools.filter(s=>s.isActive).reduce((sum,s) => sum + (planPrices[s.plan]||0)/12, 0);
    const totalRevenue   = schools.reduce((sum,s) => sum + (planPrices[s.plan]||0), 0);

    // New schools this month
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
    const newThisMonth = await School.countDocuments({ createdAt:{ $gte:startOfMonth } });

    // Expiring soon (within 30 days)
    const in30Days = new Date(); in30Days.setDate(in30Days.getDate()+30);
    const expiringSoon = await School.countDocuments({
      licenseExpiry:{ $gte:new Date(), $lte:in30Days }, isActive:true
    });

    // Plan distribution
    const planDist = await School.aggregate([
      { $group:{ _id:'$plan', count:{ $sum:1 } } }
    ]);

    // Monthly signups (last 6 months)
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth()-6);
    const monthlySignups = await School.aggregate([
      { $match:{ createdAt:{ $gte:sixMonthsAgo } } },
      { $group:{
        _id:{ year:{ $year:'$createdAt' }, month:{ $month:'$createdAt' } },
        count:{ $sum:1 }
      }},
      { $sort:{ '_id.year':1,'_id.month':1 } }
    ]);

    res.json({ success:true, data:{
      totalSchools, activeSchools, trialSchools, totalUsers,
      monthlyRevenue:Math.round(monthlyRevenue),
      totalRevenue,
      newThisMonth,
      expiringSoon,
      planDist,
      monthlySignups,
    }});
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── SCHOOLS CRUD ──────────────────────────────────────────────────────────────
exports.getSchools = async (req, res) => {
  try {
    const { search, plan, status, page=1, limit=20 } = req.query;
    const filter = {};
    if (plan)   filter.plan = plan;
    if (status === 'active')   filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (status === 'expiring') {
      const in30 = new Date(); in30.setDate(in30.getDate()+30);
      filter.licenseExpiry = { $gte:new Date(), $lte:in30 };
    }
    if (search) filter.$or = [
      { name:{ $regex:search,$options:'i' } },
      { city:{ $regex:search,$options:'i' } },
      { email:{ $regex:search,$options:'i' } },
    ];

    const [schools, total] = await Promise.all([
      School.find(filter).sort({ createdAt:-1 }).skip((page-1)*limit).limit(Number(limit)),
      School.countDocuments(filter),
    ]);

    // Attach admin user + real per-school student count
    const schoolsWithAdmin = await Promise.all(schools.map(async s => {
      const admin = await User.findOne({ school:s._id, role:'admin' }).select('name email');
      const studentCount = await mongoose.model('Student')
        .countDocuments({ school:s._id, isActive:true }).catch(()=>0);
      return { ...s.toObject(), admin, studentCount };
    }));

    res.json({ success:true, total, page:Number(page), data:schoolsWithAdmin });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getSchool = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ success:false, message:'School not found.' });
    const admin = await User.findOne({ school:school._id }).select('name email role createdAt');
    res.json({ success:true, data:{ ...school.toObject(), admin } });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.createSchool = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSingleton();
    if (!settings.newSignups)
      return res.status(403).json({ success:false, message:'New school signups are currently disabled in platform settings.' });

    const {
      schoolName, city, phone, email, address,
      adminName, adminEmail, adminPassword,
      plan = settings.defaultPlan || 'trial', licenseMonths=1,
    } = req.body;

    if (!schoolName || !adminEmail || !adminPassword)
      return res.status(400).json({ success:false, message:'schoolName, adminEmail and adminPassword are required.' });

    // Check admin email not already taken
    const exists = await User.findOne({ email:adminEmail });
    if (exists) return res.status(400).json({ success:false, message:'Admin email already in use.' });

    const planMap = { trial:{students:100,teachers:10}, basic:{students:300,teachers:25}, pro:{students:1000,teachers:80}, enterprise:{students:5000,teachers:500} };
    const limits  = planMap[plan] || planMap.trial;

    const expiry = new Date();
    if (plan === 'trial') expiry.setDate(expiry.getDate() + (settings.trialDays || 30));
    else expiry.setMonth(expiry.getMonth() + licenseMonths);

    const school = await School.create({
      name:schoolName, city, phone, email, address,
      plan, maxStudents:limits.students, maxTeachers:limits.teachers,
      licenseExpiry:expiry, isActive:true,
    });

    const user = await User.create({
      name:adminName||`Admin – ${schoolName}`,
      email:adminEmail,
      password:adminPassword,
      role:'admin',
      school:school._id,
    });

    logActivity('SCHOOL_CREATED', `Created: ${schoolName} (${plan}) → ${adminEmail}`, req.superadmin.email);

    res.status(201).json({
      success:true,
      message:`School "${schoolName}" created successfully.`,
      data:{
        school,
        admin:{ name:user.name, email:user.email },
        credentials:{ email:adminEmail, password:adminPassword, loginUrl:'http://localhost:5175/login' },
      },
    });
  } catch(e) { res.status(400).json({ success:false, message:e.message }); }
};

exports.updateSchool = async (req, res) => {
  try {
    const school = await School.findByIdAndUpdate(req.params.id, req.body, { new:true, runValidators:true });
    if (!school) return res.status(404).json({ success:false, message:'School not found.' });
    logActivity('SCHOOL_UPDATED', `Updated: ${school.name}`, req.superadmin.email);
    res.json({ success:true, data:school });
  } catch(e) { res.status(400).json({ success:false, message:e.message }); }
};

exports.toggleSchool = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ success:false, message:'School not found.' });
    school.isActive = !school.isActive;
    await school.save();
    logActivity(school.isActive?'SCHOOL_ACTIVATED':'SCHOOL_DEACTIVATED', `${school.name}`, req.superadmin.email);
    res.json({ success:true, data:school, message:`School ${school.isActive?'activated':'deactivated'}.` });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.deleteSchool = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ success:false, message:'School not found.' });
    // Soft delete: deactivate instead of remove
    school.isActive = false;
    await school.save();
    logActivity('SCHOOL_DELETED', `Soft-deleted: ${school.name}`, req.superadmin.email);
    res.json({ success:true, message:'School deactivated successfully.' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── RESET SCHOOL ADMIN PASSWORD ───────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ success:false, message:'Minimum 6 characters.' });
    const user = await User.findOne({ school:req.params.id, role:'admin' });
    if (!user) return res.status(404).json({ success:false, message:'Admin not found.' });
    user.password = newPassword;
    await user.save();
    logActivity('PASSWORD_RESET', `Reset password for school ID ${req.params.id}`, req.superadmin.email);
    res.json({ success:true, message:'Password reset successfully.' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── IMPERSONATE (login as school admin) ───────────────────────────────────────
exports.impersonate = async (req, res) => {
  try {
    const user = await User.findOne({ school:req.params.id, role:'admin' });
    if (!user) return res.status(404).json({ success:false, message:'School admin not found.' });
    const school = await School.findById(req.params.id);
    const token = jwt.sign({ id:user._id, role:user.role }, process.env.JWT_SECRET, { expiresIn:'4h' });
    logActivity('IMPERSONATE', `Impersonating admin of ${school?.name}`, req.superadmin.email);
    res.json({ success:true, token, user:{ id:user._id, name:user.name, email:user.email, role:user.role, school:user.school, permissions: modulesForRole(user.role) }, school });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── PLANS ─────────────────────────────────────────────────────────────────────
exports.getPlans = (req, res) => res.json({ success:true, data:PLANS });

exports.assignPlan = async (req, res) => {
  try {
    const { planId, licenseMonths=12 } = req.body;
    const plan = PLANS.find(p=>p.id===planId);
    if (!plan) return res.status(404).json({ success:false, message:'Plan not found.' });
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth()+Number(licenseMonths));
    const school = await School.findByIdAndUpdate(req.params.schoolId, {
      plan:planId,
      maxStudents:plan.maxStudents,
      maxTeachers:plan.maxTeachers,
      licenseExpiry:expiry,
      isActive:true,
    }, { new:true });
    logActivity('PLAN_ASSIGNED', `Assigned ${planId} to ${school?.name} for ${licenseMonths}mo`, req.superadmin.email);
    res.json({ success:true, data:school, message:`Plan "${plan.name}" assigned.` });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── ACTIVITY LOG (persistent) ─────────────────────────────────────────────────
exports.getActivity = async (req, res) => {
  try {
    const { limit=50 } = req.query;
    const data = await AuditLog.find().sort({ timestamp: -1 }).limit(Number(limit));
    res.json({ success:true, data });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── ANNOUNCEMENTS (persisted + actually delivered to school admins) ───────────
exports.getAnnouncements = async (req, res) => {
  try {
    const data = await Announcement.find().sort({ sentAt: -1 }).limit(100);
    res.json({ success:true, data });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.sendAnnouncement = async (req, res) => {
  try {
    const { title, body, audience='All', type='Info', priority='Normal' } = req.body;
    if (!title || !body) return res.status(400).json({ success:false, message:'Title and body are required.' });

    const ann = await Announcement.create({ title, body, audience, type, priority, sentBy:'SuperAdmin' });

    // Deliver to every targeted school's admin/principal as an in-app notification.
    const planByAudience = { 'Pro Schools':'pro', 'Basic Schools':'basic', 'Trial Schools':'trial' };
    const schoolFilter = { isActive:true };
    if (planByAudience[audience]) schoolFilter.plan = planByAudience[audience];
    const schools = await School.find(schoolFilter).select('_id');
    const admins = await User.find({ school:{ $in: schools.map(s=>s._id) }, role:{ $in:['admin','principal'] }, isActive:true }).select('_id school');
    await Promise.all(admins.map(a => notify({
      school:a.school, users:[a._id],
      type: type==='Warning'||type==='Maintenance' ? 'warning' : 'info',
      title:`📢 ${title}`, body, link:'/',
    })));

    logActivity('ANNOUNCEMENT', `Sent: "${title}" to ${audience} (${admins.length} admins)`, req.superadmin.email);
    res.json({ success:true, data:ann, delivered:admins.length });
  } catch(e) { res.status(400).json({ success:false, message:e.message }); }
};

// ── PLATFORM SETTINGS ─────────────────────────────────────────────────────────
exports.getSettings = async (req, res) => {
  try {
    const s = await PlatformSettings.getSingleton();
    res.json({ success:true, data:s });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.updateSettings = async (req, res) => {
  try {
    const { platformName, supportEmail, defaultPlan, trialDays, autoExpire, newSignups, maintenanceMode } = req.body;
    const s = await PlatformSettings.getSingleton();
    if (platformName    !== undefined) s.platformName = platformName;
    if (supportEmail    !== undefined) s.supportEmail = supportEmail;
    if (defaultPlan     !== undefined) s.defaultPlan = defaultPlan;
    if (trialDays       !== undefined) s.trialDays = Number(trialDays);
    if (autoExpire      !== undefined) s.autoExpire = autoExpire;
    if (newSignups      !== undefined) s.newSignups = newSignups;
    if (maintenanceMode !== undefined) s.maintenanceMode = maintenanceMode;
    await s.save();
    logActivity('SETTINGS_UPDATED', 'Platform settings updated', req.superadmin.email);
    res.json({ success:true, data:s });
  } catch(e) { res.status(400).json({ success:false, message:e.message }); }
};
