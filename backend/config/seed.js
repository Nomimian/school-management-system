require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/User');
const School   = require('../models/School');
const Student  = require('../models/Student');
const Teacher  = require('../models/Teacher');
const Fee      = require('../models/Fee');
const Attendance = require('../models/Attendance');
const { Notice, Class, Staff, Book, Event } = require('../models/Other');
const { Exam, Result } = require('../models/Exam');
const {
  Admission, Route, Homework, Message, Account,
  Subject, GradeScale, FeeStructure, Certificate,
} = require('../models/Extended');

const connect = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB connected');
};

// ── Standard grading scale (same for every school) ───────────────────────────
const GRADE_SCALES = [
  { grade:'A+', minMarks:90, maxMarks:100, gpa:4.0, remarks:'Outstanding'       },
  { grade:'A',  minMarks:80, maxMarks:89,  gpa:3.7, remarks:'Excellent'         },
  { grade:'B+', minMarks:70, maxMarks:79,  gpa:3.3, remarks:'Very Good'         },
  { grade:'B',  minMarks:60, maxMarks:69,  gpa:3.0, remarks:'Good'              },
  { grade:'C',  minMarks:50, maxMarks:59,  gpa:2.5, remarks:'Satisfactory'      },
  { grade:'D',  minMarks:40, maxMarks:49,  gpa:2.0, remarks:'Needs Improvement' },
  { grade:'F',  minMarks:0,  maxMarks:39,  gpa:0.0, remarks:'Fail'              },
];

/**
 * Seeds a complete, isolated dataset for ONE school.
 * Every document created here is stamped with `school: schoolId` so the two
 * demo tenants never see each other's data.
 */
async function seedSchoolData(school, admin, d) {
  const schoolId = school._id;
  const S = { school: schoolId };

  // NOTE: insertMany bypasses pre('save') hooks, so we assign the per-school
  // sequential IDs explicitly here (mirroring the hook format).

  // ── TEACHERS ────────────────────────────────────────────────────────────────
  const teachers = await Teacher.insertMany(d.teachers.map((t, i) => ({
    ...t, teacherId: `T${String(i + 1).padStart(3, '0')}`, ...S,
  })));

  // ── CLASSES ─────────────────────────────────────────────────────────────────
  await Class.insertMany(d.classes.map((c) => ({
    ...c, classTeacher: teachers[c.teacherIdx]?._id, ...S,
  })));

  // ── STUDENTS ────────────────────────────────────────────────────────────────
  const students = await Student.insertMany(d.students.map((s, i) => ({
    ...s, studentId: `S${String(i + 1).padStart(4, '0')}`, ...S,
  })));

  // ── FEES — last 6 months of the CURRENT year (so charts populate today) ──────
  const now = new Date();
  const YEAR = now.getFullYear();
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthIdxs = [];
  for (let m = Math.max(0, now.getMonth() - 5); m <= now.getMonth(); m++) monthIdxs.push(m);
  const feeInserts = [];
  let receiptSeq = 0;
  for (const s of students) {
    monthIdxs.forEach((mi, k) => {
      const isLast = k === monthIdxs.length - 1;           // current month may be unpaid
      const isPaid = s.feeStatus === 'Paid' || !isLast;
      feeInserts.push({
        ...S,
        student: s._id, month: MONTH_NAMES[mi], year: YEAR, amount: s.feeAmount,
        paid:    isPaid ? s.feeAmount : (s.feeStatus === 'Partial' && isLast ? Math.floor(s.feeAmount/2) : 0),
        balance: isPaid ? 0 : (s.feeStatus === 'Partial' && isLast ? Math.ceil(s.feeAmount/2) : s.feeAmount),
        status:  isLast ? s.feeStatus : 'Paid',
        dueDate: new Date(YEAR, mi, 10),
        paidDate:isPaid ? new Date(YEAR, mi, 5) : null,
        method:  isPaid ? ['Cash','Bank Transfer','Online'][k % 3] : null,
        receiptNo: isPaid ? `RCP-${YEAR}-${String(++receiptSeq).padStart(4, '0')}` : undefined,
      });
    });
  }
  await Fee.insertMany(feeInserts);

  // ── ATTENDANCE — recent weekdays incl. today (populates dashboard charts) ────
  const attInserts = [];
  const day0 = new Date(); day0.setHours(0, 0, 0, 0);
  let madeDays = 0, back = 0;
  while (madeDays < 12 && back < 25) {
    const day = new Date(day0); day.setDate(day0.getDate() - back); back++;
    if (day.getDay() === 0) continue;                      // skip Sundays (holiday)
    madeDays++;
    students.forEach((s, si) => {
      const r = (si * 3 + madeDays) % 12;                  // deterministic spread, mostly Present
      const status = r === 0 ? 'Absent' : r === 1 ? 'Late' : r === 2 ? 'Leave' : 'Present';
      attInserts.push({ ...S, student: s._id, class: s.class, date: new Date(day), status });
    });
  }
  await Attendance.insertMany(attInserts);

  // ── STAFF ───────────────────────────────────────────────────────────────────
  await Staff.insertMany(d.staff.map((x, i) => ({ ...x, staffId: `HR${String(i + 1).padStart(3, '0')}`, ...S })));

  // ── NOTICES ─────────────────────────────────────────────────────────────────
  await Notice.insertMany(d.notices.map(n => ({ ...n, ...S })));

  // ── BOOKS ───────────────────────────────────────────────────────────────────
  await Book.insertMany(d.books.map((b, i) => ({ ...b, bookId: `B${String(i + 1).padStart(3, '0')}`, ...S })));

  // ── EVENTS ──────────────────────────────────────────────────────────────────
  await Event.insertMany(d.events.map(e => ({ ...e, ...S })));

  // ── EXAMS + RESULTS ─────────────────────────────────────────────────────────
  const exams = await Exam.insertMany(d.exams.map(e => ({ ...e, createdBy: admin._id, ...S })));
  const completedExams = exams.filter(e => e.status === 'Completed');
  const firstClass = d.classes[0]?.name;
  const classStudents = students.filter(s => s.class === firstClass);
  const resultInserts = [];
  for (const stu of classStudents) {
    completedExams.forEach((ex, i) => {
      const marks = 60 + ((stu.name.length + i * 7) % 38); // deterministic 60-97
      resultInserts.push({ ...S, exam: ex._id, student: stu._id, marks });
    });
  }
  if (resultInserts.length) {
    // save() one-by-one so the grade pre-save hook runs
    for (const r of resultInserts) await new Result(r).save();
  }

  // ── ADMISSIONS ──────────────────────────────────────────────────────────────
  await Admission.insertMany(d.admissions.map((a, i) => ({
    ...a, admissionNo: `ADM-2025-${String(i + 1).padStart(4, '0')}`, ...S,
  })));

  // ── TRANSPORT ROUTES ────────────────────────────────────────────────────────
  await Route.insertMany(d.routes.map(r => ({ ...r, ...S })));

  // ── HOMEWORK ────────────────────────────────────────────────────────────────
  await Homework.insertMany(d.homework.map(h => ({
    ...h, teacher: teachers[h.teacherIdx]?._id, ...S,
  })));

  // ── MESSAGES ────────────────────────────────────────────────────────────────
  await Message.insertMany(d.messages.map(m => ({ ...m, sentBy: admin._id, ...S })));

  // ── ACCOUNTS ────────────────────────────────────────────────────────────────
  await Account.insertMany(d.accounts.map(a => ({ ...a, recordedBy: admin._id, ...S })));

  // ── SUBJECTS ────────────────────────────────────────────────────────────────
  await Subject.insertMany(d.subjects.map(s => ({
    ...s, teacher: teachers[s.teacherIdx]?._id, ...S,
  })));

  // ── GRADE SCALE ─────────────────────────────────────────────────────────────
  await GradeScale.create({ ...S, name:'Standard BISE Scale', isDefault:true, scales:GRADE_SCALES });

  // ── FEE STRUCTURES ──────────────────────────────────────────────────────────
  await FeeStructure.insertMany(d.feeStructures.map(f => ({ ...f, ...S })));

  console.log(`   ✅ ${teachers.length} teachers · ${students.length} students · ${feeInserts.length} fees · ${attInserts.length} attendance · ${exams.length} exams`);
}

// ── DEMO DATA FACTORIES ───────────────────────────────────────────────────────
const richSchoolDemo = {
  teachers: [
    { name:'Prof. Ahsan Malik', subject:'Mathematics', qualification:'M.Sc Mathematics', experience:'12 Years', phone:'0311-1234567', email:'ahsan@pms.edu', salary:65000, gender:'Male',   status:'Active',   classes:['Grade 8-A','Grade 9-B','Grade 10-A'] },
    { name:'Ms. Rabia Noor',    subject:'English',     qualification:'M.A English',       experience:'8 Years',  phone:'0312-2345678', email:'rabia@pms.edu', salary:55000, gender:'Female', status:'Active',   classes:['Grade 6-A','Grade 7-C','Grade 8-A'] },
    { name:'Mr. Kamran Shah',   subject:'Physics',     qualification:'M.Sc Physics',      experience:'15 Years', phone:'0313-3456789', email:'kamran@pms.edu', salary:70000, gender:'Male',   status:'Active',   classes:['Grade 9-B','Grade 10-A'] },
    { name:'Mrs. Sadia Riaz',   subject:'Chemistry',   qualification:'M.Sc Chemistry',    experience:'10 Years', phone:'0314-4567890', email:'sadia@pms.edu', salary:62000, gender:'Female', status:'Active',   classes:['Grade 9-B','Grade 10-B'] },
    { name:'Mr. Imran Baig',    subject:'Computer Science', qualification:'MCS',          experience:'7 Years',  phone:'0315-5678901', email:'imran@pms.edu', salary:58000, gender:'Male',   status:'Active',   classes:['Grade 7-C','Grade 8-A'] },
    { name:'Ms. Hina Javed',    subject:'Biology',     qualification:'M.Sc Biology',      experience:'6 Years',  phone:'0316-6789012', email:'hina@pms.edu', salary:54000, gender:'Female', status:'On Leave', classes:['Grade 9-B'] },
    { name:'Mr. Saleem Akhtar', subject:'Urdu',        qualification:'M.A Urdu',          experience:'20 Years', phone:'0317-7890123', email:'saleem@pms.edu', salary:75000, gender:'Male',   status:'Active',   classes:['Grade 6-A','Grade 7-C','Grade 8-A'] },
    { name:'Ms. Ayesha Siddiqui', subject:'Islamiat',  qualification:'M.A Islamiat',      experience:'9 Years',  phone:'0318-8901234', email:'ayesha@pms.edu', salary:50000, gender:'Female', status:'Active', classes:['Grade 6-A','Grade 7-C'] },
    { name:'Mr. Zubair Ahmed',  subject:'Pakistan Studies', qualification:'M.A History',  experience:'11 Years', phone:'0319-9012345', email:'zubair@pms.edu', salary:52000, gender:'Male',   status:'Active',   classes:['Grade 9-B','Grade 10-A'] },
  ],
  classes: [
    { name:'Grade 6-A', section:'A', room:'101', capacity:35, teacherIdx:1 },
    { name:'Grade 7-C', section:'C', room:'205', capacity:32, teacherIdx:4 },
    { name:'Grade 8-A', section:'A', room:'302', capacity:36, teacherIdx:0 },
    { name:'Grade 9-B', section:'B', room:'401', capacity:34, teacherIdx:2 },
    { name:'Grade 10-A',section:'A', room:'501', capacity:30, teacherIdx:3 },
    { name:'Grade 10-B',section:'B', room:'502', capacity:30, teacherIdx:5 },
  ],
  students: [
    { name:'Ahmed Ali Khan', class:'Grade 8-A', rollNumber:'G8A-01', gender:'Male',   dateOfBirth:new Date('2010-03-15'), guardian:{name:'Tariq Khan',   phone:'0300-1234567', relationship:'Father'}, phone:'0300-1234567', feeAmount:5500, feeStatus:'Paid',    address:'House 12, Gulberg, Lahore',  email:'ahmed@pms.edu',  bloodGroup:'B+' },
    { name:'Fatima Zara',    class:'Grade 8-A', rollNumber:'G8A-02', gender:'Female', dateOfBirth:new Date('2010-07-22'), guardian:{name:'Zara Bibi',    phone:'0301-2345678', relationship:'Mother'}, phone:'0301-2345678', feeAmount:5500, feeStatus:'Pending', address:'House 5, Garden Town, Lahore',email:'fatima@pms.edu', bloodGroup:'A+' },
    { name:'Usman Tariq',    class:'Grade 9-B', rollNumber:'G9B-01', gender:'Male',   dateOfBirth:new Date('2009-11-08'), guardian:{name:'Tariq Ahmed',  phone:'0302-3456789', relationship:'Father'}, phone:'0302-3456789', feeAmount:6000, feeStatus:'Paid',    address:'House 88, Model Town, Lahore',email:'usman@pms.edu', bloodGroup:'O+' },
    { name:'Ayesha Malik',   class:'Grade 7-C', rollNumber:'G7C-03', gender:'Female', dateOfBirth:new Date('2011-02-14'), guardian:{name:'Malik Riaz',   phone:'0303-4567890', relationship:'Father'}, phone:'0303-4567890', feeAmount:5000, feeStatus:'Overdue', address:'House 21, Johar Town, Lahore', email:'ayesha2@pms.edu',bloodGroup:'AB+' },
    { name:'Hassan Raza',    class:'Grade 10-A',rollNumber:'G10A-05',gender:'Male',   dateOfBirth:new Date('2008-05-30'), guardian:{name:'Raza Butt',    phone:'0304-5678901', relationship:'Father'}, phone:'0304-5678901', feeAmount:6500, feeStatus:'Paid',    address:'House 44, DHA Phase 5, Lahore',email:'hassan@pms.edu',bloodGroup:'B-' },
    { name:'Sana Bashir',    class:'Grade 6-A', rollNumber:'G6A-07', gender:'Female', dateOfBirth:new Date('2012-09-19'), guardian:{name:'Bashir Ahmed', phone:'0305-6789012', relationship:'Father'}, phone:'0305-6789012', feeAmount:4500, feeStatus:'Paid',    address:'House 67, Wapda Town, Lahore', email:'sana@pms.edu',  bloodGroup:'O-' },
    { name:'Bilal Hassan',   class:'Grade 9-B', rollNumber:'G9B-04', gender:'Male',   dateOfBirth:new Date('2009-12-01'), guardian:{name:'Hassan Raza',  phone:'0306-7890123', relationship:'Father'}, phone:'0306-7890123', feeAmount:6000, feeStatus:'Pending', address:'House 33, Bahria Town, Lahore',email:'bilal@pms.edu', bloodGroup:'A-' },
    { name:'Zainab Qureshi', class:'Grade 8-A', rollNumber:'G8A-09', gender:'Female', dateOfBirth:new Date('2010-04-11'), guardian:{name:'Qureshi Sahib',phone:'0308-9012345', relationship:'Father'}, phone:'0308-9012345', feeAmount:5500, feeStatus:'Paid',    address:'House 15, Gulshan-e-Ravi',    email:'zainab@pms.edu',bloodGroup:'A+' },
    { name:'Omar Farooq',    class:'Grade 9-B', rollNumber:'G9B-10', gender:'Male',   dateOfBirth:new Date('2009-06-20'), guardian:{name:'Farooq Sahib', phone:'0309-0123456', relationship:'Father'}, phone:'0309-0123456', feeAmount:6000, feeStatus:'Partial', address:'House 7, Township, Lahore',   email:'omar@pms.edu',  bloodGroup:'O+' },
    { name:'Hira Aslam',     class:'Grade 6-A', rollNumber:'G6A-11', gender:'Female', dateOfBirth:new Date('2012-01-30'), guardian:{name:'Aslam Sahib',  phone:'0310-1234567', relationship:'Father'}, phone:'0310-1234567', feeAmount:4500, feeStatus:'Paid',    address:'House 29, Shadman, Lahore',   email:'hira@pms.edu',  bloodGroup:'B+' },
    { name:'Hamza Sheikh',   class:'Grade 10-A',rollNumber:'G10A-12',gender:'Male',   dateOfBirth:new Date('2008-09-14'), guardian:{name:'Sheikh Sahib', phone:'0311-2345678', relationship:'Father'}, phone:'0311-2345678', feeAmount:6500, feeStatus:'Paid',    address:'House 51, Askari 10, Lahore', email:'hamza@pms.edu', bloodGroup:'AB-' },
  ],
  staff: [
    { name:'Mrs. Khalida Parveen',role:'Vice Principal', department:'Administration', salary:110000, status:'Active', gender:'Female' },
    { name:'Mr. Faisal Qureshi',  role:'Accountant',     department:'Finance',        salary:55000,  status:'Active', gender:'Male'   },
    { name:'Ms. Amna Butt',       role:'Librarian',      department:'Library',        salary:42000,  status:'Active', gender:'Female' },
    { name:'Mr. Junaid Khan',     role:'IT Admin',       department:'IT',             salary:60000,  status:'Active', gender:'Male'   },
    { name:'Mrs. Rukhsana Begum', role:'Receptionist',   department:'Administration', salary:35000,  status:'Active', gender:'Female' },
  ],
  notices: [
    { title:'Mid-Term Exam Schedule Released', content:'The schedule for the upcoming mid-term examinations has been published. All students should check the notice board.', audience:'All',      priority:'High',   author:'Principal' },
    { title:'Parent-Teacher Meeting – June 5', content:'Parents are invited to the quarterly PTM on June 5, 2025 from 9:00 AM to 1:00 PM in the auditorium.', audience:'Parents',  priority:'High',   author:'Admin' },
    { title:'Annual Sports Day – June 15',     content:'The Annual Sports Day will be held on June 15. Register for events before June 8.', audience:'Students', priority:'Medium', author:'Sports Dept' },
    { title:'Fee Submission Last Date',        content:'Last date for May 2025 fee submission is May 10. A late fine of Rs. 200 applies after the due date.', audience:'Parents',  priority:'High',   author:'Accounts' },
  ],
  books: [
    { title:'Advanced Mathematics Grade 10', author:'Prof. S. M. Yusuf', category:'Science',    copies:12, available:8,  isbn:'978-969-0-001' },
    { title:'English Grammar in Use',        author:'Raymond Murphy',     category:'Language',   copies:15, available:11, isbn:'978-0-521-002' },
    { title:'Fundamentals of Physics',       author:'Halliday & Resnick', category:'Science',    copies:10, available:3,  isbn:'978-0-471-003' },
    { title:'Pakistan Studies',              author:'Dr. M. Sarwar',      category:'Social',     copies:20, available:18, isbn:'978-969-0-004' },
    { title:'Computer Fundamentals',         author:'P.K. Sinha',         category:'Technology', copies:8,  available:5,  isbn:'978-81-239-005' },
  ],
  events: [
    { title:'Parent-Teacher Meeting', date:new Date('2025-06-05'), type:'Meeting' },
    { title:'Mid-Term Exams Start',   date:new Date('2025-06-10'), type:'Exam'    },
    { title:'Annual Sports Day',      date:new Date('2025-06-15'), type:'Event'   },
    { title:'Fee Due Date',           date:new Date('2025-06-10'), type:'Finance' },
    { title:'Eid Holiday',            date:new Date('2025-06-28'), type:'Holiday' },
  ],
  exams: [
    { name:'First Term – Mathematics', class:'Grade 8-A', subject:'Mathematics', startDate:new Date('2025-04-01'), endDate:new Date('2025-04-01'), totalMarks:100, passMark:40, status:'Completed' },
    { name:'First Term – English',     class:'Grade 8-A', subject:'English',     startDate:new Date('2025-04-02'), endDate:new Date('2025-04-02'), totalMarks:100, passMark:40, status:'Completed' },
    { name:'First Term – Physics',     class:'Grade 8-A', subject:'Physics',     startDate:new Date('2025-04-03'), endDate:new Date('2025-04-03'), totalMarks:100, passMark:40, status:'Completed' },
    { name:'First Term – Urdu',        class:'Grade 8-A', subject:'Urdu',        startDate:new Date('2025-04-05'), endDate:new Date('2025-04-05'), totalMarks:100, passMark:40, status:'Completed' },
    { name:'Mid-Term Examination',     class:'Grade 9-B', subject:null,          startDate:new Date('2025-06-10'), endDate:new Date('2025-06-20'), totalMarks:100, passMark:40, status:'Upcoming' },
  ],
  admissions: [
    { applicantName:'Ali Hassan', applyingClass:'Grade 9-A', gender:'Male',   status:'Applied',  guardian:{name:'Hassan Ali', phone:'0300-1111111', relationship:'Father'}, testDate:new Date('2025-06-15'), registrationFee:500 },
    { applicantName:'Sara Nawaz', applyingClass:'Grade 6-A', gender:'Female', status:'Approved', guardian:{name:'Nawaz Ahmad',phone:'0300-2222222', relationship:'Father'}, testMarks:85, registrationFee:500, feePaid:true },
    { applicantName:'Tariq Butt', applyingClass:'Grade 8-B', gender:'Male',   status:'Enrolled', guardian:{name:'Butt Sahib', phone:'0300-3333333', relationship:'Father'}, testMarks:78, registrationFee:500, feePaid:true },
  ],
  routes: [
    { routeName:'Gulberg Route', routeNo:'R-01', driver:{name:'Muhammad Ashraf',phone:'0333-1234567',cnic:'35202-1234567-1',licenseNo:'LHR-19-001'}, vehicle:{type:'Bus',regNo:'LHR-2019-001',capacity:45,model:'Hino 2019'}, stops:[{stopName:'Gulberg III',time:'07:10',fare:800},{stopName:'Liberty',time:'07:30',fare:600}], morningTime:'07:10', eveningTime:'14:15' },
    { routeName:'DHA Route',     routeNo:'R-02', driver:{name:'Khalid Mehmood', phone:'0333-2345678',cnic:'35202-2345678-2',licenseNo:'LHR-20-002'}, vehicle:{type:'Van',regNo:'LHR-2020-002',capacity:14,model:'Toyota HiAce'}, stops:[{stopName:'DHA Phase 5',time:'07:15',fare:1000},{stopName:'Cantt',time:'07:35',fare:800}], morningTime:'07:15', eveningTime:'14:20' },
  ],
  homework: [
    { title:'Chapter 5 Exercises', description:'Complete all exercises from Chapter 5 of Mathematics. Show working.', class:'Grade 8-A', subject:'Mathematics', teacherIdx:0, dueDate:new Date('2025-06-07'), totalMarks:20, status:'Active' },
    { title:'Essay Writing',       description:'Write a 500-word essay on "My Favourite Season".', class:'Grade 8-A', subject:'English', teacherIdx:1, dueDate:new Date('2025-06-06'), totalMarks:15, status:'Active' },
  ],
  messages: [
    { title:'Fee Reminder – May 2025', body:'Dear Parents, last date for May fee submission is May 10.', type:'In-App', audience:'Parents', recipients:120, status:'Sent' },
    { title:'PTM Notice',              body:'Parent-Teacher Meeting is on June 5, 2025. Your presence is mandatory.', type:'SMS', audience:'Parents', recipients:120, status:'Sent' },
  ],
  accounts: [
    { type:'Income',  category:'Student Fees',   amount:780000, description:'May 2025 fee collection', date:new Date(2025,4,15) },
    { type:'Expense', category:'Teacher Salary', amount:620000, description:'May 2025 teacher salaries', date:new Date(2025,4,28) },
    { type:'Expense', category:'Utility Bills',  amount:45000,  description:'May 2025 electricity & gas', date:new Date(2025,4,20) },
    { type:'Income',  category:'Registration',   amount:125000, description:'New admission registration fees', date:new Date(2025,4,5) },
  ],
  subjects: [
    { name:'Mathematics', code:'MATH-8', class:'Grade 8-A', teacherIdx:0, totalMarks:100, passMark:40 },
    { name:'English',     code:'ENG-8',  class:'Grade 8-A', teacherIdx:1, totalMarks:100, passMark:40 },
    { name:'Physics',     code:'PHY-8',  class:'Grade 8-A', teacherIdx:2, totalMarks:100, passMark:40 },
    { name:'Urdu',        code:'URD-8',  class:'Grade 8-A', teacherIdx:6, totalMarks:100, passMark:40 },
  ],
  feeStructures: [
    { class:'Grade 6-A', session:'2024-2025', components:[{name:'Tuition Fee',amount:3500,isMonthly:true},{name:'Computer Fee',amount:500,isMonthly:true}], totalMonthly:4500, dueDay:10, lateFine:200 },
    { class:'Grade 8-A', session:'2024-2025', components:[{name:'Tuition Fee',amount:4000,isMonthly:true},{name:'Science Lab',amount:600,isMonthly:true}], totalMonthly:5500, dueDay:10, lateFine:200 },
    { class:'Grade 10-A',session:'2024-2025', components:[{name:'Tuition Fee',amount:4800,isMonthly:true},{name:'Exam Fee',amount:200,isMonthly:false}], totalMonthly:6500, dueDay:10, lateFine:200 },
  ],
};

// Second, smaller tenant — proves data isolation (its own teachers/students/classes)
const secondSchoolDemo = {
  teachers: [
    { name:'Mr. Bilal Ahmed',   subject:'Mathematics', qualification:'M.Sc Math',    experience:'9 Years',  phone:'0321-1111111', email:'bilal@bcs.edu',  salary:60000, gender:'Male',   status:'Active', classes:['Class 5','Class 6'] },
    { name:'Ms. Nida Kamal',    subject:'English',     qualification:'M.A English',  experience:'6 Years',  phone:'0321-2222222', email:'nida@bcs.edu',   salary:52000, gender:'Female', status:'Active', classes:['Class 5','Class 7'] },
    { name:'Mr. Asad Rehman',   subject:'Science',     qualification:'M.Sc Physics', experience:'11 Years', phone:'0321-3333333', email:'asad@bcs.edu',   salary:64000, gender:'Male',   status:'Active', classes:['Class 6','Class 7'] },
  ],
  classes: [
    { name:'Class 5', section:'A', room:'A1', capacity:30, teacherIdx:0 },
    { name:'Class 6', section:'A', room:'A2', capacity:30, teacherIdx:2 },
    { name:'Class 7', section:'A', room:'A3', capacity:28, teacherIdx:1 },
  ],
  students: [
    { name:'Zoya Imran',   class:'Class 5', rollNumber:'C5-01', gender:'Female', dateOfBirth:new Date('2013-05-10'), guardian:{name:'Imran Sethi', phone:'0345-1111111', relationship:'Father'}, phone:'0345-1111111', feeAmount:4000, feeStatus:'Paid',    address:'House 2, Cantt, Rawalpindi', email:'zoya@bcs.edu',  bloodGroup:'A+' },
    { name:'Daniyal Khan', class:'Class 6', rollNumber:'C6-01', gender:'Male',   dateOfBirth:new Date('2012-08-19'), guardian:{name:'Khan Sahib',  phone:'0345-2222222', relationship:'Father'}, phone:'0345-2222222', feeAmount:4500, feeStatus:'Pending', address:'House 9, Saddar, Rawalpindi', email:'daniyal@bcs.edu',bloodGroup:'O+' },
    { name:'Maryam Tariq', class:'Class 6', rollNumber:'C6-02', gender:'Female', dateOfBirth:new Date('2012-03-25'), guardian:{name:'Tariq Jamil', phone:'0345-3333333', relationship:'Father'}, phone:'0345-3333333', feeAmount:4500, feeStatus:'Paid',    address:'House 14, Bahria, Rawalpindi',email:'maryam@bcs.edu',bloodGroup:'B+' },
    { name:'Hassan Ali',   class:'Class 7', rollNumber:'C7-01', gender:'Male',   dateOfBirth:new Date('2011-11-02'), guardian:{name:'Ali Raza',    phone:'0345-4444444', relationship:'Father'}, phone:'0345-4444444', feeAmount:5000, feeStatus:'Overdue', address:'House 21, DHA, Rawalpindi',   email:'hassan@bcs.edu',bloodGroup:'AB+' },
  ],
  staff: [
    { name:'Mrs. Sana Malik', role:'Coordinator', department:'Administration', salary:70000, status:'Active', gender:'Female' },
    { name:'Mr. Waqas Ali',   role:'Accountant',  department:'Finance',        salary:48000, status:'Active', gender:'Male'   },
  ],
  notices: [
    { title:'Welcome to the New Session', content:'Classes for the 2025 session begin on schedule. Please collect your timetables from the office.', audience:'All', priority:'Medium', author:'Principal' },
    { title:'Fee Due Reminder',           content:'Monthly fee is due by the 10th. Kindly clear dues to avoid a late fine.', audience:'Parents', priority:'High', author:'Accounts' },
  ],
  books: [
    { title:'Oxford Science Book 6', author:'Oxford Press',   category:'Science',  copies:10, available:7, isbn:'978-019-006' },
    { title:'New Countdown Maths 5', author:'Shazia Asad',    category:'Science',  copies:12, available:9, isbn:'978-019-005' },
  ],
  events: [
    { title:'Orientation Day', date:new Date('2025-06-02'), type:'Event' },
    { title:'Monthly Test',    date:new Date('2025-06-18'), type:'Exam'  },
  ],
  exams: [
    { name:'Monthly Test – Mathematics', class:'Class 5', subject:'Mathematics', startDate:new Date('2025-04-10'), endDate:new Date('2025-04-10'), totalMarks:50, passMark:20, status:'Completed' },
    { name:'Monthly Test – English',     class:'Class 5', subject:'English',     startDate:new Date('2025-04-11'), endDate:new Date('2025-04-11'), totalMarks:50, passMark:20, status:'Completed' },
    { name:'Mid-Term',                   class:'Class 6', subject:null,          startDate:new Date('2025-06-12'), endDate:new Date('2025-06-18'), totalMarks:100,passMark:40, status:'Upcoming' },
  ],
  admissions: [
    { applicantName:'Fahad Iqbal', applyingClass:'Class 5', gender:'Male', status:'Applied', guardian:{name:'Iqbal Sahib', phone:'0345-9999999', relationship:'Father'}, registrationFee:400 },
  ],
  routes: [
    { routeName:'Saddar Route', routeNo:'BR-01', driver:{name:'Nadeem Akhtar',phone:'0333-9999999',cnic:'37405-1111111-1',licenseNo:'RWP-21-001'}, vehicle:{type:'Van',regNo:'RWP-2021-001',capacity:16,model:'Toyota HiAce'}, stops:[{stopName:'Saddar',time:'07:20',fare:900},{stopName:'Cantt',time:'07:35',fare:800}], morningTime:'07:20', eveningTime:'14:10' },
  ],
  homework: [
    { title:'Maths Worksheet 3', description:'Solve worksheet 3 (addition & subtraction).', class:'Class 5', subject:'Mathematics', teacherIdx:0, dueDate:new Date('2025-06-09'), totalMarks:10, status:'Active' },
  ],
  messages: [
    { title:'Session Fee Notice', body:'Please clear the June fee by the 10th.', type:'In-App', audience:'Parents', recipients:40, status:'Sent' },
  ],
  accounts: [
    { type:'Income',  category:'Student Fees',   amount:180000, description:'May 2025 fee collection', date:new Date(2025,4,15) },
    { type:'Expense', category:'Teacher Salary', amount:176000, description:'May 2025 teacher salaries', date:new Date(2025,4,28) },
  ],
  subjects: [
    { name:'Mathematics', code:'MATH-5', class:'Class 5', teacherIdx:0, totalMarks:50, passMark:20 },
    { name:'English',     code:'ENG-5',  class:'Class 5', teacherIdx:1, totalMarks:50, passMark:20 },
  ],
  feeStructures: [
    { class:'Class 5', session:'2024-2025', components:[{name:'Tuition Fee',amount:3500,isMonthly:true},{name:'Activity Fee',amount:500,isMonthly:true}], totalMonthly:4000, dueDay:10, lateFine:150 },
    { class:'Class 6', session:'2024-2025', components:[{name:'Tuition Fee',amount:4000,isMonthly:true},{name:'Lab Fee',amount:500,isMonthly:true}], totalMonthly:4500, dueDay:10, lateFine:150 },
  ],
};

const seed = async () => {
  await connect();

  // ── Clear everything ────────────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany(), Student.deleteMany(), Teacher.deleteMany(), Fee.deleteMany(),
    Attendance.deleteMany(),
    Notice.deleteMany(), Class.deleteMany(), Staff.deleteMany(), Book.deleteMany(),
    Event.deleteMany(), Exam.deleteMany(), Result.deleteMany(), Admission.deleteMany(),
    Route.deleteMany(), Homework.deleteMany(), Message.deleteMany(), Account.deleteMany(),
    Subject.deleteMany(), GradeScale.deleteMany(), FeeStructure.deleteMany(),
    Certificate.deleteMany(), School.deleteMany(),
  ]);
  console.log('🗑️  Cleared existing data');

  // ── SCHOOL 1 — Pakistan Model School (Pro, rich dataset) ─────────────────────
  const school1 = await School.create({
    name:'Pakistan Model School', shortName:'PMS',
    address:'House 1, Block A, Model Town, Lahore', city:'Lahore',
    phone:'042-35761234', phone2:'042-35761235', email:'info@pms.edu.pk', website:'www.pms.edu.pk',
    principal:'Dr. Nasir Mahmood', vicePrincipal:'Mrs. Khalida Parveen',
    established:'1995', board:'Punjab Board of Secondary Education',
    registrationNo:'FBISE-LHR-2024-001', academicYear:'2024-2025',
    stampText:'PAKISTAN MODEL SCHOOL', tagline:'Excellence in Education',
    plan:'pro', maxStudents:1000, maxTeachers:80, isActive:true,
    primaryColor:'#1d4ed8', feeDay:10, lateFine:200,
  });
  const admin1 = await User.create({
    name:'Dr. Nasir Mahmood', email:'admin@school.edu', password:'admin123',
    role:'principal', school:school1._id,
  });
  console.log(`🏫 School 1: ${school1.name}  (login: admin@school.edu / admin123)`);
  await seedSchoolData(school1, admin1, richSchoolDemo);

  // ── SCHOOL 2 — Beaconhouse Cantt (Basic, smaller dataset) ────────────────────
  const school2 = await School.create({
    name:'Beaconhouse Cantt Branch', shortName:'BCS',
    address:'12 Mall Road, Cantt, Rawalpindi', city:'Rawalpindi',
    phone:'051-5551234', email:'info@bcs.edu.pk', website:'www.bcs.edu.pk',
    principal:'Ms. Farah Naz', established:'2005', board:'Federal Board (FBISE)',
    registrationNo:'FBISE-RWP-2024-014', academicYear:'2024-2025',
    stampText:'BEACONHOUSE CANTT', tagline:'Learning for Life',
    plan:'basic', maxStudents:300, maxTeachers:25, isActive:true,
    primaryColor:'#0f766e', feeDay:10, lateFine:150,
  });
  const admin2 = await User.create({
    name:'Ms. Farah Naz', email:'admin@beaconhouse.edu', password:'admin123',
    role:'principal', school:school2._id,
  });
  console.log(`🏫 School 2: ${school2.name}  (login: admin@beaconhouse.edu / admin123)`);
  await seedSchoolData(school2, admin2, secondSchoolDemo);

  console.log('\n✅ ================================');
  console.log('   Database seeded successfully!');
  console.log('   School A: admin@school.edu / admin123');
  console.log('   School B: admin@beaconhouse.edu / admin123');
  console.log('   SuperAdmin: use SA_EMAIL / SA_PASSWORD from .env');
  console.log('================================\n');
  process.exit(0);
};

seed().catch(err => { console.error('❌ Seed error:', err); process.exit(1); });
