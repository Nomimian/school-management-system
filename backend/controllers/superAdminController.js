// SuperAdmin Controller - handles all superadmin operations
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const mongoose = require('mongoose');
const School   = require('../models/School');
const User     = require('../models/User');
const { modulesForRole } = require('../config/permissions');

// ── In-memory plan store (replace with DB model in production) ───────────────
const PLANS = [
  { id:'trial',      name:'Free Trial',  price:0,      duration:30,  maxStudents:100,  maxTeachers:10,  features:['Basic modules','Email support'] },
  { id:'basic',      name:'Basic',       price:2999,   duration:365, maxStudents:300,  maxTeachers:25,  features:['All modules','Phone support','Fee receipts'] },
  { id:'pro',        name:'Pro',         price:5999,   duration:365, maxStudents:1000, maxTeachers:80,  features:['All modules','Priority support','Multi-admin','SMS integration'] },
  { id:'enterprise', name:'Enterprise',  price:14999,  duration:365, maxStudents:5000, maxTeachers:500, features:['Unlimited everything','Dedicated support','Custom branding','API access'] },
];

const ACTIVITY_LOG = []; // In-memory, replace with MongoDB collection

const logActivity = (action, details, adminEmail='superadmin') => {
  ACTIVITY_LOG.unshift({ action, details, adminEmail, timestamp: new Date() });
  if (ACTIVITY_LOG.length > 500) ACTIVITY_LOG.pop();
};

// ── SUPERADMIN AUTH ───────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const SA_EMAIL = process.env.SA_EMAIL || 'superadmin@edumanage.pro';
    const SA_PASS  = process.env.SA_PASSWORD || 'SuperAdmin@123';

    if (email !== SA_EMAIL || password !== SA_PASS) {
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
    const {
      schoolName, city, phone, email, address,
      adminName, adminEmail, adminPassword,
      plan='trial', licenseMonths=1,
    } = req.body;

    if (!schoolName || !adminEmail || !adminPassword)
      return res.status(400).json({ success:false, message:'schoolName, adminEmail and adminPassword are required.' });

    // Check admin email not already taken
    const exists = await User.findOne({ email:adminEmail });
    if (exists) return res.status(400).json({ success:false, message:'Admin email already in use.' });

    const planMap = { trial:{students:100,teachers:10}, basic:{students:300,teachers:25}, pro:{students:1000,teachers:80}, enterprise:{students:5000,teachers:500} };
    const limits  = planMap[plan] || planMap.trial;

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + (plan==='trial'?1:licenseMonths));

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

// ── ACTIVITY LOG ──────────────────────────────────────────────────────────────
exports.getActivity = (req, res) => {
  const { limit=50 } = req.query;
  res.json({ success:true, data:ACTIVITY_LOG.slice(0, Number(limit)) });
};

// ── ANNOUNCEMENTS (broadcast to all school admins) ────────────────────────────
const ANNOUNCEMENTS = [];
exports.getAnnouncements = (req, res) => res.json({ success:true, data:ANNOUNCEMENTS });
exports.sendAnnouncement = async (req, res) => {
  try {
    const ann = { ...req.body, id:Date.now(), sentAt:new Date(), sentBy:'SuperAdmin' };
    ANNOUNCEMENTS.unshift(ann);
    logActivity('ANNOUNCEMENT', `Sent: "${ann.title}" to ${ann.audience||'All'}`, req.superadmin.email);
    res.json({ success:true, data:ann });
  } catch(e) { res.status(400).json({ success:false, message:e.message }); }
};
