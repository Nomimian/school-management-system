import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// ── School App imports ────────────────────────────────────────────────────
import { AppProvider }   from './hooks/useApp.jsx';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { SchoolProvider } from './hooks/useSchool.jsx';
import Layout        from './components/layout/Layout';
import Login         from './pages/Login';
import Dashboard     from './pages/Dashboard';
import Students      from './pages/Students';
import Teachers      from './pages/Teachers';
import Classes       from './pages/Classes';
import Attendance    from './pages/Attendance';
import Fees          from './pages/Fees';
import Exams         from './pages/Exams';
import Timetable     from './pages/Timetable';
import LibraryPage   from './pages/Library';
import HR            from './pages/HR';
import Notices       from './pages/Notices';
import Reports       from './pages/Reports';
import Calendar      from './pages/Calendar';
import Settings      from './pages/Settings';
import Admissions    from './pages/Admissions';
import ResultCard    from './pages/ResultCard';
import Accounts      from './pages/Accounts';
import TeacherHiring from './pages/TeacherHiring';
import { Transport, Homework, Messaging, Promotions, Certificates } from './pages/ExtendedPages';

// ── Global UI providers ───────────────────────────────────────────────────
import { ToastProvider }   from './components/ui/Toast.jsx';
import { ConfirmProvider } from './components/ui/Confirm.jsx';

// ── SuperAdmin imports ────────────────────────────────────────────────────
import { SAProvider, useSA }   from './hooks/useSA.jsx';
import SALayout                from './pages/superadmin/SALayout';
import SALogin                 from './pages/superadmin/SALogin';
import SADashboard             from './pages/superadmin/SADashboard';
import SASchools               from './pages/superadmin/SASchools';
import SASubscriptions         from './pages/superadmin/SASubscriptions';
import { SAActivity, SAAnnouncements, SASettings } from './pages/superadmin/SAOtherPages';

// ── Guards ────────────────────────────────────────────────────────────────
function SchoolGuard({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Spinner text="Loading EduManage Pro…"/>;
  return isAuthenticated ? children : <Navigate to="/login" replace/>;
}

function SAGuard({ children }) {
  const { isAuthenticated, loading } = useSA();
  if (loading) return <Spinner dark text="Loading SuperAdmin Panel…"/>;
  return isAuthenticated ? children : <Navigate to="/superadmin/login" replace/>;
}

function Spinner({ dark, text }) {
  return (
    <div className={`min-h-screen flex items-center justify-center ${dark?'bg-slate-900':'bg-slate-50'}`}>
      <div className="flex flex-col items-center gap-3">
        <div className={`w-10 h-10 border-4 border-t-transparent rounded-full animate-spin ${dark?'border-blue-400':'border-blue-600'}`}/>
        <div className={`text-sm font-medium ${dark?'text-slate-400':'text-slate-500'}`}>{text}</div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
       <ConfirmProvider>
        <AuthProvider>
        <SAProvider>
          <Routes>

            {/* ── SuperAdmin Portal ─────────────────────────────────── */}
            <Route path="/superadmin/login" element={<SALoginGuarded/>}/>
            <Route path="/superadmin" element={<SAGuard><SALayout/></SAGuard>}>
              <Route index               element={<SADashboard/>}/>
              <Route path="schools"      element={<SASchools/>}/>
              <Route path="subscriptions" element={<SASubscriptions/>}/>
              <Route path="activity"     element={<SAActivity/>}/>
              <Route path="announcements" element={<SAAnnouncements/>}/>
              <Route path="settings"     element={<SASettings/>}/>
            </Route>

            {/* ── School Login ──────────────────────────────────────── */}
            <Route path="/login" element={<SchoolLoginGuarded/>}/>

            {/* ── School App ────────────────────────────────────────── */}
            <Route path="/" element={
              <SchoolGuard>
                <AppProvider>
                  <SchoolProvider>
                    <Layout/>
                  </SchoolProvider>
                </AppProvider>
              </SchoolGuard>
            }>
              <Route index                  element={<Dashboard/>}/>
              <Route path="students"        element={<Students/>}/>
              <Route path="teachers"        element={<Teachers/>}/>
              <Route path="classes"         element={<Classes/>}/>
              <Route path="attendance"      element={<Attendance/>}/>
              <Route path="fees"            element={<Fees/>}/>
              <Route path="exams"           element={<Exams/>}/>
              <Route path="result-card"     element={<ResultCard/>}/>
              <Route path="timetable"       element={<Timetable/>}/>
              <Route path="library"         element={<LibraryPage/>}/>
              <Route path="hr"              element={<HR/>}/>
              <Route path="notices"         element={<Notices/>}/>
              <Route path="reports"         element={<Reports/>}/>
              <Route path="calendar"        element={<Calendar/>}/>
              <Route path="admissions"      element={<Admissions/>}/>
              <Route path="accounts"        element={<Accounts/>}/>
              <Route path="transport"       element={<Transport/>}/>
              <Route path="homework"        element={<Homework/>}/>
              <Route path="messaging"       element={<Messaging/>}/>
              <Route path="promotions"      element={<Promotions/>}/>
              <Route path="certificates"    element={<Certificates/>}/>
              <Route path="hiring"          element={<TeacherHiring/>}/>
              <Route path="settings"        element={<Settings/>}/>
            </Route>

          </Routes>
        </SAProvider>
        </AuthProvider>
       </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

// Redirect already-logged-in users
function SchoolLoginGuarded() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace/> : <Login/>;
}
function SALoginGuarded() {
  const { isAuthenticated } = useSA();
  return isAuthenticated ? <Navigate to="/superadmin" replace/> : <SALogin/>;
}
