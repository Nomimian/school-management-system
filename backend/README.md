# 🏫 EduManage Pro v2.0 — Full Stack MERN School Management System

A production-ready school management system built with React + Vite + Tailwind (frontend)
and Express + MongoDB (backend). Designed to be sold as a product to schools.

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

### 1. Start MongoDB
```bash
# Windows (run as Admin in PowerShell)
net start MongoDB

# macOS / Linux
mongod --dbpath /data/db
```

### 2. Backend Setup
```bash
cd school-backend
npm install

# Copy env file and edit if needed
copy .env.example .env       # Windows
cp .env.example .env         # Mac/Linux

# Seed the database with demo data
npm run seed

# Start the server
npm run dev
```
Backend: http://localhost:5000

### 3. Frontend Setup
```bash
cd school-ms
npm install
npm run dev
```
Frontend: http://localhost:5175

### Login
- Email: **admin@school.edu**
- Password: **admin123**

---

## 📦 Complete Feature List

### 🎓 Student Management
- Full CRUD (add, edit, view, delete)
- Search by name, roll number, student ID
- Filter by class, fee status, gender
- Detailed student profiles with photo support
- Guardian/parent info management
- Fee status tracking

### 👩‍🏫 Teacher Management
- Teacher card grid with all details
- Qualification, experience, subject info
- Class assignments
- Salary records
- Leave status tracking

### 🏛️ Class Management
- Class and section configuration
- Class teacher assignment
- Real-time student count from DB
- Room management

### 📋 Admissions
- Full application workflow: Applied → Test → Interview → Approved → Enrolled
- Auto-generate admission number
- Auto-create Student record when status = Enrolled
- Registration fee tracking
- Guardian/CNIC information

### ✅ Attendance
- Daily per-student attendance (Present/Absent/Late/Leave)
- Bulk mark all present/absent
- Class-wise attendance view
- Saved to MongoDB with date
- Weekly trend charts in Reports

### 💰 Fee Management
- Monthly fee records per student
- Mark as paid with payment method
- Partial payment support
- Auto-generate receipt number
- Fee receipt print view
- Collection stats and charts

### 💵 Accounts & Finance
- Income and expense tracking
- Categories: Fees, Salaries, Utilities, Maintenance, etc.
- Monthly trend charts
- Income breakdown pie chart
- Net surplus/deficit calculation

### 📝 Fee Structures
- Per-class fee component breakdown
- Monthly vs one-time fees
- Late fine configuration
- Session-wise fee templates

### 🎯 Examinations
- Create exams with date range, total marks, pass marks
- Enter results per student per exam
- Auto-calculate grade (A+, A, B+, B, C, D, F)
- Pass/Fail auto-determination

### 📊 Result Card Generator ⭐ (Key Feature)
- Select any student + any exams
- Beautiful printable report card
- Shows all subject marks in table
- Overall percentage, grade, GPA
- Class rank calculation
- Remarks (Outstanding, Excellent, etc.)
- Teacher and principal signature lines
- One-click print via browser

### 🕐 Timetable
- Weekly class schedule view
- Color-coded subjects
- Period timing display

### 📚 Library
- Book inventory management
- Issue and return system
- Category-wise organization
- Available vs issued count

### 🚌 Transport
- Route management with stops and fares
- Driver details (name, phone, CNIC, license)
- Vehicle registration
- Morning/evening timings
- Per-stop fare configuration

### 📖 Homework & Assignments
- Assign homework per class/subject
- Due date and marks tracking
- Teacher assignment
- Active/Expired/Graded status

### 📣 Notices & Announcements
- Create notices with priority levels (High/Medium/Low)
- Target audience (All/Students/Parents/Teachers)
- Date and author tracking

### 💬 Communication Center
- Send messages via In-App, SMS, WhatsApp, Email
- Target by audience or specific class
- Recipient count tracking
- Message history

### ⬆️ Student Promotions
- Process entire class at once
- Set promoted/detained/left per student
- Edit target class inline
- Auto-update student class in DB
- Academic year tracking

### 📜 Certificates
- Character, Leaving, Bonafide, Transfer, Merit
- Auto-generate serial number
- Print-ready with proper formatting
- Default content templates per type
- Principal signature line

### 👥 HR Management
- All non-teaching staff directory
- Role-based listing
- Monthly payroll summary
- Add/remove staff

### 📈 Reports & Analytics
- 6 live charts (all from real DB data):
  - Fee collection trend (area chart)
  - Subject performance (bar chart)
  - Fee status breakdown (pie chart)
  - Gender ratio (pie chart)
  - Attendance trend (line chart)
  - Income vs expense (bar chart)
- KPI cards: students, teachers, collection rate

### 📅 Calendar
- Monthly calendar view
- Event dots on dates
- Upcoming events panel
- Add/delete events
- Event types: Meeting, Exam, Event, Finance, Holiday

### ⚙️ Settings
- School information configuration
- Notification toggles
- Live password change (JWT API)
- Appearance options

---

## 🔐 API Reference

All routes require `Authorization: Bearer <token>` except auth endpoints.

| Module | Endpoints |
|--------|-----------|
| Auth | POST /login, POST /register, GET /me, PUT /change-password |
| Dashboard | GET /dashboard/stats |
| Students | CRUD /students, GET /students/stats |
| Teachers | CRUD /teachers |
| Fees | CRUD /fees, PATCH /:id/pay, GET /fees/stats |
| Attendance | GET, POST /attendance/bulk, GET /summary, GET /trend |
| Exams | CRUD /exams, CRUD /exams/:id/results |
| Admissions | CRUD /admissions |
| Transport | CRUD /transport/routes, POST /transport/assign |
| Homework | CRUD /homework |
| Messages | GET, POST, DELETE /messages |
| Accounts | CRUD /accounts, GET /accounts/stats |
| Subjects | GET, POST, DELETE /subjects |
| Fee Structures | GET, POST /fee-structures |
| Promotions | GET /promotions, POST /promotions/promote |
| Certificates | GET, POST /certificates |
| Report Card | GET /report-card?studentId=&examIds= |
| Classes | CRUD /classes |
| Staff | CRUD /staff |
| Books | CRUD /books, PATCH /:id/issue, PATCH /:id/return |
| Events | CRUD /events |
| Notices | GET, POST, DELETE /notices |
| Health | GET, PUT /health/:studentId |

---

## 🛠️ Tech Stack

### Frontend
- React 18 + Vite 5
- Tailwind CSS 3
- React Router v6
- Recharts (6 chart types)
- Lucide React (icons)
- Sora + DM Sans (Google Fonts)

### Backend
- Node.js + Express 4
- MongoDB + Mongoose 8
- JWT Authentication
- bcryptjs (password hashing)
- Morgan (HTTP logging)
- CORS

### Database Models
User, Student, Teacher, Fee, Attendance, Exam, Result,
Notice, Class, Staff, Book, Event, Admission, Route,
StudentTransport, Homework, Message, Account, Promotion,
Certificate, Subject, GradeScale, FeeStructure, Timetable, StudentHealth

---

## 🌐 Production Deployment

### Backend (Render / Railway)
1. Set `MONGO_URI` to MongoDB Atlas URI
2. Set `JWT_SECRET` to a 64-char random string
3. Set `NODE_ENV=production`
4. Deploy and note the URL

### Frontend (Vercel / Netlify)
1. Set `VITE_API_URL` in `.env` to backend URL
2. `npm run build` → deploy `dist/`

---

## 📞 Support
For product inquiries, customization, or white-labeling contact the developer.
