import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, ChevronDown, LogOut, User, GraduationCap, Users, Loader2, Sun, Moon } from 'lucide-react';
import { useApp } from '../../hooks/useApp.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';
import { studentAPI, teacherAPI } from '../../services/api';
import NotificationBell from '../NotificationBell.jsx';

const pageTitles = {
  '/': 'Dashboard', '/students': 'Students Management', '/teachers': 'Teachers Management',
  '/classes': 'Classes & Sections', '/attendance': 'Attendance Management',
  '/fees': 'Fee Management', '/exams': 'Examinations', '/timetable': 'Timetable',
  '/library': 'Library Management', '/hr': 'HR Management',
  '/notices': 'Notices & Announcements', '/reports': 'Reports & Analytics',
  '/calendar': 'School Calendar', '/settings': 'Settings',
  '/admissions': 'Admissions Management',
  '/result-card': 'Result Card Generator',
  '/accounts': 'Accounts & Finance',
  '/transport': 'Transport Management',
  '/homework': 'Homework & Assignments',
  '/messaging': 'Communication Center',
  '/promotions': 'Student Promotions',
  '/certificates': 'Certificates',
  '/hiring': 'Teacher Hiring',
};

export default function Topbar() {
  const { sidebarOpen, setSidebarOpen } = useApp();
  const { user, logout } = useAuth();
  const [showUser, setShowUser]     = useState(false);
  const [dark, setDark]             = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const toggleDark = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch { /* ignore */ }
    setDark(next);
  };
  const [search, setSearch]         = useState('');
  const [results, setResults]       = useState({ students: [], teachers: [] });
  const [searching, setSearching]   = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const title = pageTitles[location.pathname] || 'EduManage Pro';
  const today = new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const handleLogout = () => { logout(); navigate('/login'); };

  // ── Global search (debounced) ────────────────────────────────────────────
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) { setResults({ students: [], teachers: [] }); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const [stu, tch] = await Promise.all([
          studentAPI.getAll({ search: q, limit: 6 }).catch(() => ({ data: [] })),
          teacherAPI.getAll().catch(() => ({ data: [] })),
        ]);
        const ql = q.toLowerCase();
        const teachers = (tch.data || []).filter(t =>
          t.name?.toLowerCase().includes(ql) || t.subject?.toLowerCase().includes(ql)
        ).slice(0, 5);
        setResults({ students: stu.data || [], teachers });
      } catch { setResults({ students: [], teachers: [] }); }
      finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (path, query) => {
    setShowResults(false); setSearch('');
    navigate(path, { state: { search: query } });
  };

  const total = results.students.length + results.teachers.length;

  return (
    <>
    <header className="h-16 bg-white border-b border-blue-100 flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-20 shadow-sm">
      <button onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar"
        className="text-slate-500 hover:text-primary-700 hover:bg-primary-50 p-2 rounded-lg">
        <Menu size={20} />
      </button>

      <div className="hidden sm:block">
        <h1 className="font-display font-semibold text-slate-800 text-lg leading-none">{title}</h1>
        <p className="text-slate-400 text-xs mt-0.5">{today}</p>
      </div>

      <div ref={searchRef} className="flex-1 max-w-sm mx-auto lg:mx-0 lg:ml-6 relative">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search}
            onChange={e => { setSearch(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            placeholder="Search students, teachers…"
            className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:bg-white placeholder:text-slate-400" />
          {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
        </div>

        {showResults && search.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-11 bg-white rounded-2xl shadow-float border border-slate-100 z-50 overflow-hidden max-h-[70vh] overflow-y-auto scrollbar-thin">
            {!searching && total === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-400">No matches for “{search}”</div>
            )}
            {results.students.length > 0 && (
              <div>
                <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Students</div>
                {results.students.map(s => (
                  <button key={s._id} onClick={() => go('/students', s.name)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary-50 text-left">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0"><GraduationCap size={15}/></div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-700 truncate">{s.name}</div>
                      <div className="text-xs text-slate-400 truncate">{s.class} · {s.rollNumber || s.studentId}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {results.teachers.length > 0 && (
              <div>
                <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Teachers</div>
                {results.teachers.map(t => (
                  <button key={t._id} onClick={() => go('/teachers', t.name)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary-50 text-left">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0"><Users size={15}/></div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-700 truncate">{t.name}</div>
                      <div className="text-xs text-slate-400 truncate">{t.subject}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Light / dark toggle */}
        <button onClick={toggleDark} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle dark mode"
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
          {dark ? <Sun size={18}/> : <Moon size={18}/>}
        </button>

        {/* Notifications — API-backed, polling */}
        <NotificationBell/>

        {/* User menu */}
        <div className="relative">
          <button onClick={() => setShowUser(!showUser)}
            className="flex items-center gap-2 pl-2 cursor-pointer group">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-slate-700 leading-none">{user?.name?.split(' ')[0] || 'Admin'}</div>
              <div className="text-xs text-slate-400 mt-0.5 capitalize">{user?.role || 'Admin'}</div>
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>

          {showUser && (
            <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-float border border-slate-100 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <div className="font-semibold text-slate-800 text-sm">{user?.name}</div>
                <div className="text-xs text-slate-400 capitalize">{user?.role}</div>
              </div>
              <div className="p-1">
                <button onClick={() => { navigate('/settings'); setShowUser(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-primary-50 hover:text-primary-700">
                  <User size={15}/> Profile & Settings
                </button>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50">
                  <LogOut size={15}/> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
    </>
  );
}
