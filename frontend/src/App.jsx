import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// ── School App imports ────────────────────────────────────────────────────
import { AppProvider }   from './hooks/useApp.jsx';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { SchoolProvider } from './hooks/useSchool.jsx';
import Layout        from './components/layout/Layout';
import Login         from './pages/Login';
import ResetPassword  from './pages/ResetPassword';
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
import Parents       from './pages/Parents';
import Messaging     from './pages/Messaging';
import { Transport, Homework, Promotions, Certificates } from './pages/ExtendedPages';

// ── Parent Portal ─────────────────────────────────────────────────────────
import ParentLayout    from './pages/parent/ParentLayout';
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentChild     from './pages/parent/ParentChild';
import ParentMessages  from './pages/parent/ParentMessages';

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
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <Spinner text="Loading EduManage Pro…"/>;
  if (!isAuthenticated) return <Navigate to="/login" replace/>;
  // Parents belong to the parent portal, not the staff app.
  if (user?.role === 'parent') return <Navigate to="/parent" replace/>;
  return children;
}

// Parent portal guard: authenticated AND role 'parent' (staff bounced to /).
function ParentGuard({ children }) {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <Spinner text="Loading Parent Portal…"/>;
  if (!isAuthenticated) return <Navigate to="/login" replace/>;
  if (user?.role !== 'parent') return <Navigate to="/" replace/>;
  return children;
}

function SAGuard({ children }) {
  const { isAuthenticated, loading } = useSA();
  if (loading) return <Spinner dark text="Loading SuperAdmin Panel…"/>;
  return isAuthenticated ? children : <Navigate to="/superadmin/login" replace/>;
}

// Route-level RBAC guard. Redirects to the dashboard if the signed-in user's
// role lacks access to the module. The backend enforces the same rules, so this
// is a UX safeguard against a user typing a disallowed URL directly.
function RequireModule({ module, children }) {
  const { can } = useAuth();
  return can(module) ? children : <Navigate to="/" replace/>;
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
            <Route path="/reset-password/:token" element={<ResetPassword/>}/>

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
              <Route path="students"        element={<RequireModule module="students"><Students/></RequireModule>}/>
              <Route path="parents"         element={<RequireModule module="parents"><Parents/></RequireModule>}/>
              <Route path="teachers"        element={<RequireModule module="teachers"><Teachers/></RequireModule>}/>
              <Route path="classes"         element={<RequireModule module="classes"><Classes/></RequireModule>}/>
              <Route path="attendance"      element={<RequireModule module="attendance"><Attendance/></RequireModule>}/>
              <Route path="fees"            element={<RequireModule module="fees"><Fees/></RequireModule>}/>
              <Route path="exams"           element={<RequireModule module="exams"><Exams/></RequireModule>}/>
              <Route path="result-card"     element={<RequireModule module="results"><ResultCard/></RequireModule>}/>
              <Route path="timetable"       element={<RequireModule module="timetable"><Timetable/></RequireModule>}/>
              <Route path="library"         element={<RequireModule module="library"><LibraryPage/></RequireModule>}/>
              <Route path="hr"              element={<RequireModule module="hr"><HR/></RequireModule>}/>
              <Route path="notices"         element={<RequireModule module="notices"><Notices/></RequireModule>}/>
              <Route path="reports"         element={<RequireModule module="reports"><Reports/></RequireModule>}/>
              <Route path="calendar"        element={<RequireModule module="calendar"><Calendar/></RequireModule>}/>
              <Route path="admissions"      element={<RequireModule module="admissions"><Admissions/></RequireModule>}/>
              <Route path="accounts"        element={<RequireModule module="accounts"><Accounts/></RequireModule>}/>
              <Route path="transport"       element={<RequireModule module="transport"><Transport/></RequireModule>}/>
              <Route path="homework"        element={<RequireModule module="homework"><Homework/></RequireModule>}/>
              <Route path="messaging"       element={<RequireModule module="messaging"><Messaging/></RequireModule>}/>
              <Route path="promotions"      element={<RequireModule module="promotions"><Promotions/></RequireModule>}/>
              <Route path="certificates"    element={<RequireModule module="certificates"><Certificates/></RequireModule>}/>
              <Route path="hiring"          element={<RequireModule module="hiring"><TeacherHiring/></RequireModule>}/>
              <Route path="settings"        element={<RequireModule module="settings"><Settings/></RequireModule>}/>
            </Route>

            {/* ── Parent Portal ─────────────────────────────────────── */}
            <Route path="/parent" element={
              <ParentGuard>
                <SchoolProvider>
                  <ParentLayout/>
                </SchoolProvider>
              </ParentGuard>
            }>
              <Route index            element={<ParentDashboard/>}/>
              <Route path="child/:id"  element={<ParentChild/>}/>
              <Route path="messages"   element={<ParentMessages/>}/>
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
