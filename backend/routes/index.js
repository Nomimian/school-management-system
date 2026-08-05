const express = require('express');
const router = express.Router();

const authCtrl       = require('../controllers/authController');
const studentCtrl    = require('../controllers/studentController');
const teacherCtrl    = require('../controllers/teacherController');
const feeCtrl        = require('../controllers/feeController');
const feeHeadCtrl    = require('../controllers/feeHeadController');
const enrollGrpCtrl  = require('../controllers/enrollmentGroupController');
const optionSetCtrl  = require('../controllers/optionSetController');
const studentImport  = require('../controllers/studentImportController');
const importUpload   = require('../middleware/importUpload');
const attendanceCtrl = require('../controllers/attendanceController');
const examCtrl       = require('../controllers/examController');
const otherCtrl      = require('../controllers/otherController');
const schoolCtrl     = require('../controllers/schoolController');
const ext            = require('../controllers/extendedController');
const userCtrl       = require('../controllers/userController');
const parentCtrl     = require('../controllers/parentController');
const chatCtrl       = require('../controllers/chatController');
const notifCtrl      = require('../controllers/notificationController');
const outboundCtrl   = require('../controllers/outboundController');
const attachmentCtrl = require('../controllers/attachmentController');
const attachmentUpload = require('../middleware/attachmentUpload');
const { protect, requireSchool, requireModule, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// ── AUTH (public + self) ────────────────────────────────────────────────────
// NOTE: public self-registration is intentionally disabled. New schools and
// their admin accounts are provisioned exclusively by the SuperAdmin panel.
router.post('/auth/login',
  [ body('email').isEmail().withMessage('A valid email is required.').bail().customSanitizer(v => String(v).toLowerCase().trim()),
    body('password').notEmpty().withMessage('Password is required.') ],
  validate, authCtrl.login);
router.post('/auth/forgot-password',
  [ body('email').isEmail().withMessage('A valid email is required.') ],
  validate, authCtrl.forgotPassword);
router.post('/auth/reset-password/:token',
  [ body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.') ],
  validate, authCtrl.resetPassword);
router.get ('/auth/me',               protect, authCtrl.getMe);
router.put ('/auth/change-password',  protect,
  [ body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters.') ],
  validate, authCtrl.changePassword);

// ── PUBLIC SCHOOL BRANDING (no auth) ────────────────────────────────────────
// Login screen needs the school's name/logo/accent BEFORE anyone signs in.
// Returns presentational fields only (see controller). Must be declared before
// the `router.use(protect, requireSchool)` gate further down.
router.get('/school/public', schoolCtrl.getPublicBranding);

// ── SCHOOL PROFILE (own tenant only) ────────────────────────────────────────
// getSchool/createSchool must work before a school is linked, so they only
// require auth; the controller enforces ownership.
// GET stays open to every authenticated user — the SPA needs the school's
// name/logo/theme to render for staff of ANY role. Mutations are settings-gated.
router.get ('/school',                    protect, schoolCtrl.getSchool);
router.post('/school',                    protect, schoolCtrl.createSchool);
router.put ('/school',                    protect, requireSchool, requireModule('settings'), schoolCtrl.updateSchool);
router.post('/school/upload-logo',          protect, requireSchool, requireModule('settings'), schoolCtrl.upload.single('logo'),  schoolCtrl.uploadLogo);
router.post('/school/upload-stamp',         protect, requireSchool, requireModule('settings'), schoolCtrl.upload.single('stamp'), schoolCtrl.uploadStamp);
router.post('/school/upload-student-photo', protect, requireSchool, schoolCtrl.upload.single('photo'), schoolCtrl.uploadStudentPhoto);

// ── Everything below is tenant data: require auth AND a linked school ────────
router.use(protect, requireSchool);

// ── ROLE-BASED ACCESS CONTROL ───────────────────────────────────────────────
// Mounted as path-prefix guards so they cover every method and sub-path of a
// module in one place. They run BEFORE the handlers below. Read vs. write is
// resolved from the central permission matrix (config/permissions.js).
router.use('/dashboard',       requireModule('dashboard'));
router.use('/students',        requireModule('students'));
router.use('/health',          requireModule('students'));
router.use('/teachers',        requireModule('teachers'));
router.use('/classes',         requireModule('classes'));
router.use('/subjects',        requireModule('classes'));
router.use('/admissions',      requireModule('admissions'));
router.use('/attendance',      requireModule('attendance'));
router.use('/timetable-db',    requireModule('timetable'));
router.use('/homework',        requireModule('homework'));
router.use('/promotions',      requireModule('promotions'));
router.use('/exams',           requireModule('exams'));
router.use('/exam-groups',     requireModule('exams'));
router.use('/grade-scales',    requireModule('exams'));
router.use('/report-card',     requireModule('results'));
router.use('/fees',            requireModule('fees'));
router.use('/fee-structures',  requireModule('fees'));
router.use('/fee-heads',       requireModule('fees'));
router.use('/accounts',        requireModule('accounts'));
router.use('/library',         requireModule('library'));
router.use('/books',           requireModule('library'));
router.use('/transport',       requireModule('transport'));
router.use('/staff',           requireModule('hr'));
router.use('/certificates',    requireModule('certificates'));
router.use('/notices',         requireModule('notices'));
router.use('/messages',        requireModule('messaging'));
router.use('/reports',         requireModule('reports'));
router.use('/events',          requireModule('calendar'));
router.use('/hiring',          requireModule('hiring'));
router.use('/users',           requireModule('users'));
router.use('/parents',         requireModule('parents'));

// ── STAFF USER MANAGEMENT (operators only, own school) ───────────────────────
router.get   ('/users',              userCtrl.listUsers);
router.post  ('/users',              userCtrl.createUser);
router.put   ('/users/:id',          userCtrl.updateUser);
router.put   ('/users/:id/password', userCtrl.resetPassword);
router.delete('/users/:id',          userCtrl.deleteUser);

// ── PARENT ACCOUNT MANAGEMENT (operators: admin/principal/frontdesk) ─────────
router.get   ('/parents',              parentCtrl.listParents);
router.post  ('/parents',              parentCtrl.createParent);
router.put   ('/parents/:id',          parentCtrl.updateParent);
router.put   ('/parents/:id/password', parentCtrl.resetParentPassword);
router.delete('/parents/:id',          parentCtrl.deleteParent);

// ── PARENT PORTAL (role: parent only — data double-scoped to own children) ───
router.use('/portal', authorize('parent'));
router.get ('/portal/overview',  parentCtrl.portalOverview);
router.get ('/portal/child/:id', parentCtrl.portalChild);
router.post('/portal/child/:id/homework/:hwId/submit', parentCtrl.submitHomework);

// ── MESSAGING / CHAT (every authenticated school user, incl. parents) ────────
// Not module-gated: staff and parents alike must be able to converse. Access is
// enforced per-conversation (participant + school) inside the controller.
router.get ('/chat/recipients',                 chatCtrl.getRecipients);
router.get ('/chat/unread-count',               chatCtrl.unreadTotal);
router.get ('/chat/conversations',              chatCtrl.listConversations);
router.post('/chat/conversations',              chatCtrl.createConversation);
router.get ('/chat/conversations/:id',          chatCtrl.getConversation);
router.post('/chat/conversations/:id/messages', chatCtrl.sendMessage);

// ── NOTIFICATIONS (every authenticated school user, incl. parents) ───────────
router.get  ('/notifications',             notifCtrl.list);
router.get  ('/notifications/unread-count', notifCtrl.unreadCount);
router.patch('/notifications/read-all',     notifCtrl.markAllRead);
router.patch('/notifications/:id/read',     notifCtrl.markRead);

// ── ATTACHMENTS (images + documents; every authenticated school user) ────────
router.post('/attachments', attachmentUpload.single('file'), attachmentCtrl.uploadAttachment);

// ── OUTBOUND EMAIL / WHATSAPP (staff only — parents can't broadcast) ─────────
router.use('/outbound', authorize('admin', 'principal', 'teacher', 'accountant', 'frontdesk'));
router.get ('/outbound/status', outboundCtrl.status);
router.get ('/outbound/log',    outboundCtrl.logList);
router.post('/outbound/send',   outboundCtrl.send);

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
router.get('/dashboard/stats', otherCtrl.getDashboardStats);

// ── STUDENTS ──────────────────────────────────────────────────────────────────
router.get   ('/students/stats',  studentCtrl.getStats);
router.post  ('/students/import/preview', importUpload.single('file'), studentImport.importPreview);
router.post  ('/students/import',         studentImport.importStudents);
router.get   ('/students',        studentCtrl.getStudents);
router.post  ('/students',        studentCtrl.createStudent);
router.get   ('/students/:id',    studentCtrl.getStudent);
router.put   ('/students/:id',    studentCtrl.updateStudent);
router.delete('/students/:id',    studentCtrl.deleteStudent);

// ── TEACHERS ─────────────────────────────────────────────────────────────────
router.get   ('/teachers',        teacherCtrl.getTeachers);
router.post  ('/teachers',        teacherCtrl.createTeacher);
router.get   ('/teachers/:id',    teacherCtrl.getTeacher);
router.put   ('/teachers/:id',    teacherCtrl.updateTeacher);
router.delete('/teachers/:id',    teacherCtrl.deleteTeacher);

// ── FEE HEADS (fee-type master: Tuition, Exam, AC …) ────────────────────────────
router.get   ('/fee-heads',       feeHeadCtrl.getFeeHeads);
router.post  ('/fee-heads',       feeHeadCtrl.createFeeHead);
router.put   ('/fee-heads/:id',   feeHeadCtrl.updateFeeHead);
router.delete('/fee-heads/:id',   feeHeadCtrl.deleteFeeHead);

// ── ENROLLMENT GROUPS (dynamic Group/House/Shift categories) ────────────────────
// Reads are open to any authenticated school user (the student/admission forms
// need them regardless of role); only operators may edit the configuration.
router.get   ('/enrollment-groups',     enrollGrpCtrl.getEnrollmentGroups);
router.post  ('/enrollment-groups',     authorize('admin', 'principal'), enrollGrpCtrl.createEnrollmentGroup);
router.put   ('/enrollment-groups/:id', authorize('admin', 'principal'), enrollGrpCtrl.updateEnrollmentGroup);
router.delete('/enrollment-groups/:id', authorize('admin', 'principal'), enrollGrpCtrl.deleteEnrollmentGroup);

// ── OPTION SETS (all configurable dropdown lists) ───────────────────────────────
// Reads open to any authenticated school user (forms need them); operators edit.
router.get   ('/option-sets',     optionSetCtrl.getOptionSets);
router.post  ('/option-sets',     authorize('admin', 'principal'), optionSetCtrl.createOptionSet);
router.put   ('/option-sets/:id', authorize('admin', 'principal'), optionSetCtrl.updateOptionSet);
router.delete('/option-sets/:id', authorize('admin', 'principal'), optionSetCtrl.deleteOptionSet);

// ── FEES ──────────────────────────────────────────────────────────────────────
router.get   ('/fees/stats',           feeCtrl.getFeeStats);
router.get   ('/fees/generate/preview', feeCtrl.previewGenerate);
router.post  ('/fees/generate',        feeCtrl.generateChallans);
router.get   ('/fees',            feeCtrl.getFees);
router.post  ('/fees',            feeCtrl.createFee);
router.get   ('/fees/:id',        feeCtrl.getFee);
router.put   ('/fees/:id',        feeCtrl.updateFee);
router.patch ('/fees/:id/pay',    feeCtrl.markPaid);
router.delete('/fees/:id',        feeCtrl.deleteFee);

// ── ATTENDANCE ────────────────────────────────────────────────────────────────
router.get ('/attendance',          attendanceCtrl.getAttendance);
router.post('/attendance/bulk',     attendanceCtrl.markBulk);
router.get ('/attendance/summary',  attendanceCtrl.getDailySummary);
router.get ('/attendance/trend',    attendanceCtrl.getTrend);

// ── EXAM GROUPS (Monthly / Daily / Yearly … containers) ─────────────────────────
router.get   ('/exam-groups',              examCtrl.getExamGroups);
router.post  ('/exam-groups',              examCtrl.createExamGroup);
router.put   ('/exam-groups/:id',          examCtrl.updateExamGroup);
router.delete('/exam-groups/:id',          examCtrl.deleteExamGroup);

// ── EXAMS ─────────────────────────────────────────────────────────────────────
// Static/collection routes first, then :examId sub-resources, then :id mutations.
router.get   ('/exams/archive',            examCtrl.getExamArchive);
router.get   ('/exams',                    examCtrl.getExams);
router.post  ('/exams',                    examCtrl.createExam);
router.patch ('/exams/:id/publish',        examCtrl.publishExam);
router.put   ('/exams/:id',                examCtrl.updateExam);
router.delete('/exams/:id',                examCtrl.deleteExam);
router.get   ('/exams/:examId/marksheet',  examCtrl.getMarksheet);
router.post  ('/exams/:examId/marks',      examCtrl.saveMarks);
router.get   ('/exams/:examId/attendance', examCtrl.getExamAttendance);
router.post  ('/exams/:examId/attendance', examCtrl.saveExamAttendance);
router.get   ('/exams/:examId/report',     examCtrl.getExamReport);
router.get   ('/exams/:examId/results',    examCtrl.getResults);
router.post  ('/exams/:examId/results',    examCtrl.addResult);

// ── NOTICES ───────────────────────────────────────────────────────────────────
router.get   ('/notices',         otherCtrl.getNotices);
router.post  ('/notices',         otherCtrl.createNotice);
router.put   ('/notices/:id',     otherCtrl.updateNotice);
router.delete('/notices/:id',     otherCtrl.deleteNotice);

// ── CLASSES ───────────────────────────────────────────────────────────────────
router.get   ('/classes',         otherCtrl.getClasses);
router.post  ('/classes',         otherCtrl.createClass);
router.put   ('/classes/:id',     otherCtrl.updateClass);
router.delete('/classes/:id',     otherCtrl.deleteClass);

// ── STAFF / HR ────────────────────────────────────────────────────────────────
router.get   ('/staff',           otherCtrl.getStaff);
router.post  ('/staff',           otherCtrl.createStaff);
router.put   ('/staff/:id',       otherCtrl.updateStaff);
router.delete('/staff/:id',       otherCtrl.deleteStaff);

// ── LIBRARY ───────────────────────────────────────────────────────────────────
router.get   ('/books',           otherCtrl.getBooks);
router.post  ('/books',           otherCtrl.createBook);
router.put   ('/books/:id',       otherCtrl.updateBook);
router.patch ('/books/:id/issue', otherCtrl.issueBook);
router.patch ('/books/:id/return',otherCtrl.returnBook);
router.delete('/books/:id',       otherCtrl.deleteBook);

// ── EVENTS / CALENDAR ─────────────────────────────────────────────────────────
router.get   ('/events',          otherCtrl.getEvents);
router.post  ('/events',          otherCtrl.createEvent);
router.put   ('/events/:id',      otherCtrl.updateEvent);
router.delete('/events/:id',      otherCtrl.deleteEvent);

// ── ADMISSIONS ────────────────────────────────────────────────────────────────
router.get   ('/admissions',           ext.getAdmissions);
router.post  ('/admissions',           ext.createAdmission);
router.put   ('/admissions/:id',       ext.updateAdmission);
router.delete('/admissions/:id',       ext.deleteAdmission);

// ── TRANSPORT ─────────────────────────────────────────────────────────────────
router.get   ('/transport/routes',           ext.getRoutes);
router.post  ('/transport/routes',           ext.createRoute);
router.put   ('/transport/routes/:id',       ext.updateRoute);
router.delete('/transport/routes/:id',       ext.deleteRoute);
router.get   ('/transport/students',         ext.getStudentTransports);
router.post  ('/transport/assign',           ext.assignTransport);

// ── HOMEWORK ──────────────────────────────────────────────────────────────────
router.get   ('/homework',             ext.getHomework);
router.post  ('/homework',             ext.createHomework);
router.put   ('/homework/:id',         ext.updateHomework);
router.delete('/homework/:id',         ext.deleteHomework);

// ── MESSAGES ──────────────────────────────────────────────────────────────────
router.get   ('/messages',             ext.getMessages);
router.post  ('/messages',             ext.sendMessage);
router.delete('/messages/:id',         ext.deleteMessage);

// ── ACCOUNTS ──────────────────────────────────────────────────────────────────
router.get   ('/accounts/stats',       ext.getAccountStats);
router.get   ('/accounts',             ext.getAccounts);
router.post  ('/accounts',             ext.createAccount);
router.put   ('/accounts/:id',         ext.updateAccount);
router.delete('/accounts/:id',         ext.deleteAccount);

// ── SUBJECTS ──────────────────────────────────────────────────────────────────
router.get   ('/subjects',             ext.getSubjects);
router.post  ('/subjects',             ext.createSubject);
router.put   ('/subjects/:id',         ext.updateSubject);
router.delete('/subjects/:id',         ext.deleteSubject);

// ── GRADE SCALES (dynamic grading bands) ────────────────────────────────────────
router.get   ('/grade-scales',         ext.getGradeScales);
router.post  ('/grade-scales',         ext.createGradeScale);
router.put   ('/grade-scales/:id',     ext.updateGradeScale);
router.delete('/grade-scales/:id',     ext.deleteGradeScale);

// ── FEE STRUCTURES ────────────────────────────────────────────────────────────
router.get   ('/fee-structures',       ext.getFeeStructures);
router.post  ('/fee-structures',       ext.saveFeeStructure);

// ── TIMETABLE (DB-backed) ─────────────────────────────────────────────────────
router.get   ('/timetable-db',         ext.getTimetable);
router.post  ('/timetable-db',         ext.saveTimetable);

// ── PROMOTIONS ────────────────────────────────────────────────────────────────
router.get   ('/promotions',           ext.getPromotions);
router.post  ('/promotions/promote',   ext.promoteStudents);

// ── CERTIFICATES ──────────────────────────────────────────────────────────────
router.get   ('/certificates',         ext.getCertificates);
router.post  ('/certificates',         ext.createCertificate);
router.delete('/certificates/:id',     ext.deleteCertificate);

// ── TEACHER HIRING ────────────────────────────────────────────────────────────
const hiringCtrl = require('../controllers/hiringController');
router.get   ('/hiring',        hiringCtrl.getApplications);
router.post  ('/hiring',        hiringCtrl.createApplication);
router.put   ('/hiring/:id',    hiringCtrl.updateApplication);
router.delete('/hiring/:id',    hiringCtrl.deleteApplication);

// ── REPORTS ───────────────────────────────────────────────────────────────────
router.get   ('/reports/subject-performance', examCtrl.getSubjectPerformance);

// ── REPORT CARD ───────────────────────────────────────────────────────────────
router.get   ('/report-card',          ext.generateReportCard);

// ── HEALTH ────────────────────────────────────────────────────────────────────
router.get   ('/health/:studentId',    ext.getStudentHealth);
router.put   ('/health/:studentId',    ext.saveStudentHealth);

module.exports = router;
