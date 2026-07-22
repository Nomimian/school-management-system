import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../../hooks/useApp.jsx';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, DollarSign,
  ClipboardCheck, Calendar, Award, Library, Bell, BarChart3,
  Settings, Building2, Briefcase, Clock, FileText, Bus,
  BookMarked, MessageSquare, TrendingUp, UserPlus, ArrowUpCircle,
  Scroll, ChevronDown, ChevronRight, X
} from 'lucide-react';
import { useState } from 'react';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',    icon: LayoutDashboard, path: '/' },
    ],
  },
  {
    label: 'Academics',
    items: [
      { label: 'Students',     icon: GraduationCap,   path: '/students' },
      { label: 'Teachers',     icon: Users,           path: '/teachers' },
      { label: 'Classes',      icon: Building2,       path: '/classes' },
      { label: 'Admissions',   icon: UserPlus,        path: '/admissions' },
      { label: 'Attendance',   icon: ClipboardCheck,  path: '/attendance' },
      { label: 'Timetable',    icon: Clock,           path: '/timetable' },
      { label: 'Homework',     icon: BookMarked,      path: '/homework' },
      { label: 'Promotions',   icon: ArrowUpCircle,   path: '/promotions' },
    ],
  },
  {
    label: 'Examinations',
    items: [
      { label: 'Exams',        icon: Award,           path: '/exams' },
      { label: 'Result Card',  icon: FileText,        path: '/result-card' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Fee Management', icon: DollarSign,    path: '/fees' },
      { label: 'Accounts',       icon: TrendingUp,    path: '/accounts' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Library',      icon: Library,         path: '/library' },
      { label: 'Transport',    icon: Bus,             path: '/transport' },
      { label: 'HR Management',icon: Briefcase,       path: '/hr' },
      { label: 'Certificates', icon: Scroll,          path: '/certificates' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { label: 'Notices',      icon: Bell,            path: '/notices' },
      { label: 'Messaging',    icon: MessageSquare,   path: '/messaging' },
    ],
  },
  {
    label: 'Reports & Tools',
    items: [
      { label: 'Reports',      icon: BarChart3,       path: '/reports' },
      { label: 'Calendar',     icon: Calendar,        path: '/calendar' },
      { label: 'Settings',     icon: Settings,        path: '/settings' },
    ],
  },
];

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useApp();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState({});

  // `sidebarOpen` doubles as "expanded": true → full labels; false → icons-only rail (desktop) / hidden (mobile)
  const expanded = sidebarOpen;
  const toggleGroup = (label) => setCollapsed(c => ({ ...c, [label]: !c[label] }));

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-40 flex flex-col
        bg-gradient-to-b from-[#0c1e50] via-[#1e3a8a] to-[#1e40af]
        shadow-float transition-all duration-300 overflow-hidden
        ${expanded ? 'w-64' : 'w-0 lg:w-[80px]'}
      `}>
        {/* Logo */}
        <div className={`flex items-center py-4 border-b border-white/10 flex-shrink-0 ${expanded ? 'gap-3 px-4' : 'justify-center px-0'}`}>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 border border-white/30">
            <BookOpen size={20} className="text-white" />
          </div>
          {expanded && (
            <>
              <div>
                <div className="font-display font-bold text-white text-base leading-none">EduManage</div>
                <div className="text-blue-300 text-[10px] font-medium mt-0.5">Pro School System</div>
              </div>
              <button onClick={() => setSidebarOpen(false)}
                className="ml-auto text-white/50 hover:text-white lg:hidden p-1">
                <X size={16} />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin py-3 ${expanded ? 'px-2' : 'px-0'}`}>
          {navGroups.map((group, gi) => (
            <div key={group.label} className="mb-1">
              {/* Group label (expanded) or subtle divider (collapsed) */}
              {expanded ? (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-3 py-1.5 mb-0.5 group"
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors
                    ${collapsed[group.label] ? 'text-white/30' : 'text-blue-300/70'}`}>
                    {group.label}
                  </span>
                  <span className="text-white/30 group-hover:text-white/60">
                    {collapsed[group.label] ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                  </span>
                </button>
              ) : (
                gi > 0 && <div className="h-px bg-white/10 mx-4 my-2" />
              )}

              {(expanded ? !collapsed[group.label] : true) && (
                <ul className={expanded ? 'space-y-0.5' : 'space-y-1.5'}>
                  {group.items.map(({ label, icon: Icon, path }) => (
                    <li key={path}>
                      <NavLink
                        to={path}
                        end={path === '/'}
                        title={!expanded ? label : undefined}
                        onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
                        className={({ isActive }) =>
                          `flex items-center rounded-xl font-medium transition-all
                           ${expanded ? 'gap-2.5 px-3 py-2 text-sm' : 'justify-center mx-auto w-12 h-12'}
                           ${isActive
                             ? 'bg-white/20 text-white shadow-sm border border-white/20'
                             : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
                           }`
                        }
                      >
                        <Icon size={expanded ? 17 : 22} className="flex-shrink-0" />
                        {expanded && <span className="truncate">{label}</span>}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={`py-3 border-t border-white/10 flex-shrink-0 ${expanded ? 'px-3' : 'px-0'}`}>
          <div className={`flex items-center ${expanded ? 'gap-3 px-2' : 'justify-center'}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0" title="Admin · Principal">
              A
            </div>
            {expanded && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs font-semibold truncate">Admin</div>
                  <div className="text-blue-300 text-[10px] truncate">Principal</div>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" title="Online" />
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
