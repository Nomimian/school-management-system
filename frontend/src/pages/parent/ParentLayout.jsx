import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { LogOut, GraduationCap, LayoutDashboard, MessageSquare } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useSchool } from '../../hooks/useSchool.jsx';
import ThemeApplier from '../../components/ThemeApplier.jsx';
import NotificationBell from '../../components/NotificationBell.jsx';

const API_BASE = 'http://localhost:5000';

export default function ParentLayout() {
  const { user, logout } = useAuth();
  const { school }       = useSchool();
  const navigate         = useNavigate();
  const logoUrl = school?.logo ? `${API_BASE}${school.logo}` : null;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <ThemeApplier/>

      {/* Top bar */}
      <header className="sticky top-0 z-20 text-white shadow-float"
        style={{ background: 'linear-gradient(to right, var(--brand-darker, #0c1e50), var(--brand-dark, #1e3a8a), var(--brand, #1d4ed8))' }}>
        <div className="max-w-5xl mx-auto px-4 lg:px-6 h-16 flex items-center gap-3">
          {logoUrl
            ? <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-contain bg-white/90 p-0.5"/>
            : <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center"><GraduationCap size={20}/></div>}
          <div className="min-w-0 flex-1">
            <div className="font-display font-bold leading-tight truncate">{school?.name || 'Parent Portal'}</div>
            <div className="text-blue-200 text-[11px] leading-tight">Parent Portal</div>
          </div>
          <NotificationBell dark/>
          <div className="hidden sm:flex items-center gap-2 mr-1">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
              {(user?.name || 'P').charAt(0).toUpperCase()}
            </div>
            <div className="text-sm font-medium">{user?.name}</div>
          </div>
          <button onClick={handleLogout} title="Sign out"
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-colors px-3 py-2 rounded-xl text-sm font-medium">
            <LogOut size={15}/> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>

        {/* sub nav */}
        <div className="max-w-5xl mx-auto px-4 lg:px-6 flex gap-1 pb-1">
          <PTab to="/parent" end icon={LayoutDashboard} label="Overview"/>
          <PTab to="/parent/messages" icon={MessageSquare} label="Messages"/>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto p-4 lg:p-6">
        <Outlet/>
      </main>

      <footer className="border-t border-blue-50 bg-white text-xs text-slate-400 py-3 text-center">
        © {new Date().getFullYear()} {school?.name || 'EduManage Pro'} — Parent Portal
      </footer>
    </div>
  );
}

function PTab({ to, end, icon: Icon, label }) {
  return (
    <NavLink to={to} end={end}
      className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-t-lg text-sm font-medium transition-colors
        ${isActive ? 'bg-surface text-slate-800' : 'text-blue-100 hover:bg-white/10'}`}>
      <Icon size={15}/> {label}
    </NavLink>
  );
}
