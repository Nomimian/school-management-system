import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, CreditCard, Activity,
  Megaphone, Settings, LogOut, Menu, X, Globe, Bell,
  ChevronDown, Shield, BookOpen
} from 'lucide-react';
import { useSA } from '../../hooks/useSA.jsx';

const navItems = [
  { label:'Dashboard',     icon:LayoutDashboard, path:'/superadmin' },
  { label:'Schools',       icon:Building2,       path:'/superadmin/schools' },
  { label:'Subscriptions', icon:CreditCard,      path:'/superadmin/subscriptions' },
  { label:'Activity Log',  icon:Activity,        path:'/superadmin/activity' },
  { label:'Announcements', icon:Megaphone,       path:'/superadmin/announcements' },
  { label:'SA Settings',   icon:Settings,        path:'/superadmin/settings' },
];

export default function SALayout() {
  const { saUser, logout } = useSA();
  const navigate           = useNavigate();
  const [open, setOpen]    = useState(true);
  const [userMenu, setUserMenu] = useState(false);

  const handleLogout = () => { logout(); navigate('/superadmin/login'); };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={()=>setOpen(false)}/>}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-40 flex flex-col
        bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900
        border-r border-white/5 shadow-2xl transition-all duration-300
        ${open ? 'w-64' : 'w-0 lg:w-[70px]'} overflow-hidden`}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10 flex-shrink-0 min-w-[256px]">
          <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Globe size={18} className="text-white"/>
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-none">EduManage Pro</div>
            <div className="text-slate-400 text-[10px] mt-0.5 flex items-center gap-1">
              <Shield size={9} className="text-red-400"/> SuperAdmin Panel
            </div>
          </div>
          <button onClick={()=>setOpen(false)} className="ml-auto text-slate-500 hover:text-white lg:hidden p-1">
            <X size={16}/>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 min-w-[256px] overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">Platform Control</div>
          <ul className="space-y-0.5">
            {navItems.map(({label,icon:Icon,path})=>(
              <li key={path}>
                <NavLink to={path} end={path==='/superadmin'}
                  onClick={()=>{ if(window.innerWidth<1024) setOpen(false); }}
                  className={({isActive})=>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                     ${isActive
                       ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                       : 'text-slate-300 hover:bg-white/10 hover:text-white'
                     }`
                  }>
                  <Icon size={16} className="flex-shrink-0"/>
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="mt-6 pt-4 border-t border-white/5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">Quick Access</div>
            <a href="/login" target="_blank"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-all">
              <BookOpen size={16}/>
              <span>School App ↗</span>
            </a>
          </div>
        </nav>

        {/* Footer user */}
        <div className="px-3 py-4 border-t border-white/10 min-w-[256px]">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              SA
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">Super Admin</div>
              <div className="text-slate-400 text-[10px] truncate">{saUser?.email}</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"/>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${open?'lg:ml-64':'lg:ml-[70px]'}`}>

        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-20 shadow-sm">
          <button onClick={()=>setOpen(!open)}
            className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-lg">
            <Menu size={20}/>
          </button>

          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
            <Shield size={14} className="text-red-500"/>
            <span className="font-semibold text-slate-800">SuperAdmin</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Alert badge */}
            <button className="relative p-2.5 rounded-xl hover:bg-slate-100 text-slate-500">
              <Bell size={18}/>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"/>
            </button>

            {/* User dropdown */}
            <div className="relative">
              <button onClick={()=>setUserMenu(!userMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                  SA
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-semibold text-slate-700 leading-none">Super Admin</div>
                  <div className="text-xs text-slate-400 mt-0.5">Platform Owner</div>
                </div>
                <ChevronDown size={14} className="text-slate-400"/>
              </button>

              {userMenu && (
                <div className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                    <div className="text-xs text-slate-400">Signed in as</div>
                    <div className="text-sm font-semibold text-slate-700 truncate">{saUser?.email}</div>
                  </div>
                  <div className="p-1">
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors">
                      <LogOut size={15}/> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet/>
        </main>

        <footer className="px-6 py-3 bg-white border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
          <span>EduManage Pro — SuperAdmin Panel</span>
          <span>v2.0.0 · Platform Control Center</span>
        </footer>
      </div>
    </div>
  );
}
