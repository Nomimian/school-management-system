import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle, Trash2, Info, HelpCircle } from 'lucide-react';

const ConfirmContext = createContext(null);

const TONES = {
  danger:  { icon: Trash2,        tint: 'bg-red-50',    color: 'text-red-500',    btn: 'bg-red-600 hover:bg-red-700' },
  warning: { icon: AlertTriangle, tint: 'bg-amber-50',  color: 'text-amber-500',  btn: 'bg-amber-600 hover:bg-amber-700' },
  primary: { icon: HelpCircle,    tint: 'bg-blue-50',   color: 'text-blue-500',   btn: 'bg-primary-600 hover:bg-primary-700' },
  info:    { icon: Info,          tint: 'bg-blue-50',   color: 'text-blue-500',   btn: 'bg-primary-600 hover:bg-primary-700' },
};

/**
 * Promise-based confirmation. Usage:
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title, message, tone:'danger', confirmText:'Delete' }))) return;
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { opts } | null
  const resolver = useRef(null);

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      setState({
        title: opts.title || 'Are you sure?',
        message: opts.message || 'This action cannot be undone.',
        confirmText: opts.confirmText || 'Confirm',
        cancelText: opts.cancelText || 'Cancel',
        tone: opts.tone || 'danger',
      });
    });
  }, []);

  const close = (result) => {
    if (resolver.current) { resolver.current(result); resolver.current = null; }
    setState(null);
  };

  const tone = state ? (TONES[state.tone] || TONES.danger) : TONES.danger;
  const Icon = tone.icon;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-[fadeIn_.15s_ease-out]"
          onClick={() => close(false)}>
          <div className="bg-white rounded-3xl shadow-float w-full max-w-sm p-6 animate-[popIn_.18s_ease-out]"
            onClick={e => e.stopPropagation()}>
            <div className={`w-12 h-12 rounded-2xl ${tone.tint} flex items-center justify-center mb-4`}>
              <Icon size={22} className={tone.color} />
            </div>
            <h3 className="font-display font-bold text-slate-800 text-lg">{state.title}</h3>
            <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">{state.message}</p>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => close(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                {state.cancelText}
              </button>
              <button onClick={() => close(true)} autoFocus
                className={`px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md transition-colors ${tone.btn}`}>
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return ctx;
}
