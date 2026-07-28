import { useNavigate, useLocation } from 'react-router-dom';
import { Compass, ArrowLeft, Home } from 'lucide-react';

/**
 * Friendly 404 for any unmatched route. Renders inside whatever shell it's
 * mounted in (app layout, superadmin layout, or standalone), so it always fits.
 *
 * Props: home – path the "Home" button goes to (defaults to '/').
 */
export default function NotFound({ home = '/' }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-20 h-20 rounded-3xl bg-primary-50 flex items-center justify-center mb-5">
          <Compass size={38} className="text-primary-500" />
        </div>
        <div className="font-display font-extrabold text-primary-600 text-6xl leading-none tracking-tight">404</div>
        <h1 className="font-display font-bold text-slate-800 text-xl mt-3">Page not found</h1>
        <p className="text-slate-500 text-sm mt-2">
          The page you’re looking for doesn’t exist, was moved, or you don’t have access to it.
        </p>
        <div className="mt-2 inline-block text-xs font-mono text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 max-w-full truncate">
          {location.pathname}
        </div>
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-all">
            <ArrowLeft size={16} /> Go back
          </button>
          <button onClick={() => navigate(home)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:-translate-y-0.5 transition-all shadow-lg">
            <Home size={16} /> Go home
          </button>
        </div>
      </div>
    </div>
  );
}
