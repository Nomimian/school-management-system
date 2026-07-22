const express = require('express');
const router = express.Router();

const authCtrl       = require('../controllers/authController');
const studentCtrl    = require('../controllers/studentController');
const teacherCtrl    = require('../controllers/teacherController');
const feeCtrl        = require('../controllers/feeController');
const attendanceCtrl = require('../controllers/attendanceController');
const examCtrl       = require('../controllers/examController');
const otherCtrl      = require('../controllers/otherController');
const schoolCtrl     = require('../controllers/schoolController');
const ext            = require('../controllers/extendedController');
const { protect, requireSchool } = require('../middleware/auth');

// ── AUTH (public + self) ────────────────────────────────────────────────────
// NOTE: public self-registration is intentionally disabled. New schools and
// their admin accounts are provisioned exclusively by the SuperAdmin panel.
router.post('/auth/login',            authCtrl.login);
router.get ('/auth/me',               protect, authCtrl.getMe);
router.put ('/auth/change-password',  protect, authCtrl.changePassword);

// ── SCHOOL PROFILE (own tenant only) ────────────────────────────────────────
// getSchool/createSchool must work before a school is linked, so they only
// require auth; the controller enforces ownership.
router.get ('/school',                    protect, schoolCtrl.getSchool);
router.post('/school',                    protect, schoolCtrl.createSchool);
router.put ('/school',                    protect, requireSchool, schoolCtrl.updateSchool);
router.post('/school/upload-logo',          protect, requireSchool, schoolCtrl.upload.single('logo'),  schoolCtrl.uploadLogo);
router.post('/school/upload-stamp',         protect, requireSchool, schoolCtrl.upload.single('stamp'), schoolCtrl.uploadStamp);
router.post('/school/upload-student-photo', protect, requireSchool, schoolCtrl.upload.single('photo'), schoolCtrl.uploadStudentPhoto);

// ── Everything below is tenant data: require auth AND a linked school ────────
router.use(protect, requireSchool);

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
router.get('/dashboard/stats', otherCtrl.getDashboardStats);

// ── STUDENTS ──────────────────────────────────────────────────────────────────
router.get   ('/students/stats',  studentCtrl.getStats);
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

// ── FEES ──────────────────────────────────────────────────────────────────────
router.get   ('/fees/stats',      feeCtrl.getFeeStats);
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

// ── EXAMS ─────────────────────────────────────────────────────────────────────
router.get   ('/exams',                    examCtrl.getExams);
router.post  ('/exams',                    examCtrl.createExam);
router.put   ('/exams/:id',                examCtrl.updateExam);
router.delete('/exams/:id',                examCtrl.deleteExam);
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
router.delete('/subjects/:id',         ext.deleteSubject);

// ── GRADE SCALES ──────────────────────────────────────────────────────────────
router.get   ('/grade-scales',         ext.getGradeScales);
router.post  ('/grade-scales',         ext.createGradeScale);

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
