import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// ── Providers / hooks / guards stay EAGER (tiny, needed on every route) ──────
import { AppProvider }   from './hooks/useApp.jsx';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { SchoolProvider } from './hooks/useSchool.jsx';
import { ToastProvider }   from './components/ui/Toast.jsx';
import { ConfirmProvider } from './components/ui/Confirm.jsx';
import { SAProvider, useSA } from './hooks/useSA.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// ── Page components are LAZY — each route is its own chunk, so a staff user no
//    longer downloads the SuperAdmin + parent bundles on first load. ──────────
const Layout        = lazy(() => import('./components/layout/Layout'));
const Login         = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard     = lazy(() => import('./pages/Dashboard'));
const Students      = lazy(() => import('./pages/Students'));
const Teachers      = lazy(() => import('./pages/Teachers'));
const Classes       = lazy(() => import('./pages/Classes'));
const Attendance    = lazy(() => import('./pages/Attendance'));
const Fees          = lazy(() => import('./pages/Fees'));
const Exams         = lazy(() => import('./pages/Exams'));
const Timetable     = lazy(() => import('./pages/Timetable'));
const LibraryPage   = lazy(() => import('./pages/Library'));
const HR            = lazy(() => import('./pages/HR'));
const Notices       = lazy(() => import('./pages/Notices'));
const Reports       = lazy(() => import('./pages/Reports'));
const Calendar      = lazy(() => import('./pages/Calendar'));
const Settings      = lazy(() => import('./pages/Settings'));
const Admissions    = lazy(() => import('./pages/Admissions'));
const ResultCard    = lazy(() => import('./pages/ResultCard'));
const Accounts      = lazy(() => import('./pages/Accounts'));
const TeacherHiring = lazy(() => import('./pages/TeacherHiring'));
const Parents       = lazy(() => import('./pages/Parents'));
const Messaging     = lazy(() => import('./pages/Messaging'));
const Transport     = lazy(() => import('./pages/ExtendedPages').then(m => ({ default: m.Transport })));
const Homework      = lazy(() => import('./pages/ExtendedPages').then(m => ({ default: m.Homework })));
const Promotions    = lazy(() => import('./pages/ExtendedPages').then(m => ({ default: m.Promotions })));
const Certificates  = lazy(() => import('./pages/ExtendedPages').then(m => ({ default: m.Certificates })));

// ── Parent Portal ───────────────────────────────────────────────────────────
const ParentLayout    = lazy(() => import('./pages/parent/ParentLayout'));
const ParentDashboard = lazy(() => import('./pages/parent/ParentDashboard'));
const ParentChild     = lazy(() => import('./pages/parent/ParentChild'));
const ParentMessages  = lazy(() => import('./pages/parent/ParentMessages'));

// ── SuperAdmin ────────────────────────────────────────────────────────────────
const SALayout        = lazy(() => import('./pages/superadmin/SALayout'));
const SALogin         = lazy(() => import('./pages/superadmin/SALogin'));
const SADashboard     = lazy(() => import('./pages/superadmin/SADashboard'));
const SASchools       = lazy(() => import('./pages/superadmin/SASchools'));
const SASubscriptions = lazy(() => import('./pages/superadmin/SASubscriptions'));
const SAActivity      = lazy(() => import('./pages/superadmin/SAOtherPages').then(m => ({ default: m.SAActivity })));
const SAAnnouncements = lazy(() => import('./pages/superadmin/SAOtherPages').then(m => ({ default: m.SAAnnouncements })));
const SASettings      = lazy(() => import('./pages/superadmin/SAOtherPages').then(m => ({ default: m.SASettings })));

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
        <div className={`w-10 h-10 border-4 border-t-transparent rounded-full animate-spin ${dark?'border-blue-400':'border-primary-600'}`}/>
        <div className={`text-sm font-medium ${dark?'text-slate-400':'text-slate-500'}`}>{text}</div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
         <ConfirmProvider>
          <AuthProvider>
          <SAProvider>
            <Suspense fallback={<Spinner text="Loading…"/>}>
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
            </Suspense>
          </SAProvider>
          </AuthProvider>
         </ConfirmProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
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
