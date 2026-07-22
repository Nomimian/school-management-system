import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

const VARIANTS = {
  success: { icon: CheckCircle2,   ring: 'border-emerald-200', bar: 'bg-emerald-500', iconColor: 'text-emerald-500', tint: 'bg-emerald-50' },
  error:   { icon: AlertCircle,    ring: 'border-red-200',     bar: 'bg-red-500',     iconColor: 'text-red-500',     tint: 'bg-red-50'     },
  warning: { icon: AlertTriangle,  ring: 'border-amber-200',   bar: 'bg-amber-500',   iconColor: 'text-amber-500',   tint: 'bg-amber-50'   },
  info:    { icon: Info,           ring: 'border-blue-200',    bar: 'bg-blue-500',    iconColor: 'text-blue-500',    tint: 'bg-blue-50'    },
};

let seq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(list => list.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), 240);
  }, []);

  const push = useCallback((type, message, opts = {}) => {
    const id = ++seq;
    const duration = opts.duration ?? 4000;
    setToasts(list => [...list, { id, type, message, title: opts.title }]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const api = {
    success: (m, o) => push('success', m, o),
    error:   (m, o) => push('error',   m, o),
    warning: (m, o) => push('warning', m, o),
    info:    (m, o) => push('info',    m, o),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2.5 w-[min(92vw,380px)] pointer-events-none">
        {toasts.map(t => <ToastCard key={t.id} toast={t} onClose={() => dismiss(t.id)} />)}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }) {
  const v = VARIANTS[toast.type] || VARIANTS.info;
  const Icon = v.icon;
  const [enter, setEnter] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setEnter(true)); return () => cancelAnimationFrame(r); }, []);
  return (
    <div
      className={`pointer-events-auto relative flex items-start gap-3 bg-white rounded-2xl shadow-float border ${v.ring}
        pl-4 pr-3 py-3 overflow-hidden transition-all duration-300 ease-out
        ${toast.leaving ? 'opacity-0 translate-x-3' : enter ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'}`}
      role="status"
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${v.bar}`} />
      <div className={`w-8 h-8 rounded-xl ${v.tint} flex items-center justify-center flex-shrink-0`}>
        <Icon size={17} className={v.iconColor} />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        {toast.title && <div className="text-sm font-semibold text-slate-800 leading-tight">{toast.title}</div>}
        <div className={`text-sm text-slate-600 break-words ${toast.title ? 'mt-0.5' : ''}`}>{toast.message}</div>
      </div>
      <button onClick={onClose} className="text-slate-300 hover:text-slate-500 p-1 flex-shrink-0 transition-colors">
        <X size={15} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
