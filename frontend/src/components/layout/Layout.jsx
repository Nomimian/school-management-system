import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useApp } from '../../hooks/useApp.jsx';
import ThemeApplier from '../ThemeApplier.jsx';

export default function Layout() {
  const { sidebarOpen } = useApp();
  return (
    <div className="min-h-screen bg-surface flex">
      <ThemeApplier />
      <Sidebar />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300
        ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-[80px]'}`}>
        <Topbar />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
        <footer className="px-6 py-3 border-t border-blue-50 bg-white text-xs text-slate-400 flex items-center justify-between">
          <span>© {new Date().getFullYear()} EduManage Pro — School Management System</span>
          <span className="hidden sm:block">v2.0.0 · All rights reserved</span>
        </footer>
      </div>
    </div>
  );
}
