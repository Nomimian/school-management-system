import { X, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Dropdown } from './Dropdown.jsx';

// Re-export the interactive providers/hooks so pages can import from one place
export { ToastProvider, useToast } from './Toast.jsx';
export { ConfirmProvider, useConfirm } from './Confirm.jsx';
export { Dropdown };

// ─── STAT CARD ────────────────────────────────────────────────────────────────
export function StatCard({ icon: Icon, label, value, sub, color = 'blue', trend, onClick }) {
  const colors = {
    blue:   { grad: 'from-blue-500 to-blue-700',      tint: 'bg-blue-500/10',    glow: 'shadow-blue-500/30' },
    orange: { grad: 'from-orange-400 to-orange-600',  tint: 'bg-orange-500/10',  glow: 'shadow-orange-500/30' },
    green:  { grad: 'from-emerald-500 to-emerald-700',tint: 'bg-emerald-500/10', glow: 'shadow-emerald-500/30' },
    purple: { grad: 'from-purple-500 to-purple-700',  tint: 'bg-purple-500/10',  glow: 'shadow-purple-500/30' },
    red:    { grad: 'from-red-500 to-red-600',        tint: 'bg-red-500/10',     glow: 'shadow-red-500/30' },
    teal:   { grad: 'from-teal-500 to-teal-700',      tint: 'bg-teal-500/10',    glow: 'shadow-teal-500/30' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div onClick={onClick}
      className={`relative bg-white rounded-2xl p-5 shadow-card border border-slate-100/80 flex items-center gap-4
        overflow-hidden transition-all duration-200 hover:shadow-float hover:-translate-y-0.5 ${onClick ? 'cursor-pointer' : ''}`}>
      {/* soft corner tint */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${c.tint} blur-xl`} />
      <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${c.grad} flex items-center justify-center shadow-lg ${c.glow} flex-shrink-0`}>
        <Icon size={24} className="text-white" />
      </div>
      <div className="relative flex-1 min-w-0">
        <div className="text-2xl font-display font-bold text-slate-800 leading-none tracking-tight">{value}</div>
        <div className="text-slate-500 text-sm mt-1.5">{label}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
      {trend != null && (
        <div className={`relative text-xs font-bold px-2 py-1 rounded-lg ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'blue', dot = false }) {
  const variants = {
    blue:   'bg-blue-50 text-blue-700 ring-blue-600/15',
    green:  'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
    orange: 'bg-orange-50 text-orange-700 ring-orange-600/15',
    red:    'bg-red-50 text-red-600 ring-red-600/15',
    gray:   'bg-slate-100 text-slate-600 ring-slate-500/15',
    purple: 'bg-purple-50 text-purple-700 ring-purple-600/15',
    teal:   'bg-teal-50 text-teal-700 ring-teal-600/15',
  };
  const dotColor = { blue:'bg-blue-500', green:'bg-emerald-500', orange:'bg-orange-500', red:'bg-red-500', gray:'bg-slate-400', purple:'bg-purple-500', teal:'bg-teal-500' };
  const v = variants[variant] || variants.blue;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${v}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor[variant] || dotColor.blue}`} />}
      {children}
    </span>
  );
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h2 className="font-display font-bold text-slate-800 text-xl tracking-tight flex items-center gap-2.5">
          <span className="w-1 h-6 rounded-full bg-gradient-to-b from-primary-500 to-primary-700 flex-shrink-0" />
          {title}
        </h2>
        {subtitle && <p className="text-slate-500 text-sm mt-1 sm:pl-3.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', hover = false }) {
  return (
    <div className={`bg-white rounded-2xl shadow-card border border-slate-100/80 ${hover ? 'transition-all duration-200 hover:shadow-float hover:-translate-y-0.5' : ''} ${className}`}>
      {children}
    </div>
  );
}

// ─── BUTTON ──────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', onClick, className = '', icon: Icon, disabled, loading = false, type = 'button' }) {
  const variants = {
    primary: 'bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:from-primary-700 hover:to-primary-600 shadow-md',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    ghost: 'text-primary-600 hover:bg-blue-50',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
    xl: 'px-7 py-3 text-base',
  };
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all ${variants[variant]} ${sizes[size]} ${className} ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-[.98]'}`}
    >
      {loading ? <Loader2 size={size === 'sm' ? 13 : 15} className="animate-spin" /> : Icon && <Icon size={size === 'sm' ? 13 : 15} />}
      {children}
    </button>
  );
}

// ─── SWITCH / TOGGLE ───────────────────────────────────────────────────────────
export function Switch({ checked, onChange, size = 'md', disabled = false }) {
  // Fully pixel-based (inline styles) so the knob can NEVER overflow the track
  // regardless of the app's font-size setting. The knob slides between a fixed
  // left inset (off) and `track − knob − gap` (on), always staying inside.
  const cfg = size === 'sm'
    ? { w: 36, h: 20, k: 16, gap: 2 }
    : { w: 44, h: 24, k: 20, gap: 2 };
  const left = checked ? cfg.w - cfg.k - cfg.gap : cfg.gap;
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{ width: cfg.w, height: cfg.h }}
      className={`relative rounded-full flex-shrink-0 p-0 border-0 outline-none align-middle
        transition-colors duration-200 ease-out
        focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[.97]'}
        ${checked ? 'bg-primary-600' : 'bg-slate-300'}`}>
      <span style={{ width: cfg.k, height: cfg.k, left, top: '50%', transform: 'translateY(-50%)' }}
        className="absolute bg-white rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.35)] ring-1 ring-black/5
          transition-[left] duration-200 ease-out" />
    </button>
  );
}

// ─── TEXTAREA ──────────────────────────────────────────────────────────────────
export function Textarea({ label, rows = 3, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <textarea rows={rows} {...props}
        className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-slate-50 focus:bg-white placeholder:text-slate-400 resize-y" />
    </div>
  );
}

// ─── SKELETON ──────────────────────────────────────────────────────────────────
export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

// A ready-made table skeleton for list pages
export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={`h-4 ${c === 0 ? 'w-1/4' : 'flex-1'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
export function Input({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <input
        {...props}
        className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-slate-50 focus:bg-white placeholder:text-slate-400"
      />
    </div>
  );
}

// ─── SELECT (labeled) — now powered by the custom <Dropdown> ────────────────────
export function Select({ label, children, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <Dropdown {...props} className={`w-full ${className}`}>
        {children}
      </Dropdown>
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  // Rendered in a portal on <body> so the fixed backdrop always covers the FULL
  // viewport — never confined by a transformed ancestor (e.g. page animations).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-[fadeIn_.15s_ease-out]"
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className={`bg-white rounded-3xl shadow-float w-full ${sizes[size]} max-h-[90vh] flex flex-col animate-[popIn_.18s_ease-out] ring-1 ring-black/5`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="font-display font-bold text-slate-800 text-lg">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto scrollbar-thin p-6 flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── TABLE ────────────────────────────────────────────────────────────────────
export function Table({ columns, data, onRowClick }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50/70 border-b border-slate-100">
            {columns.map(col => (
              <th key={col.key} className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id || i}
              onClick={() => onRowClick && onRowClick(row)}
              className={`border-b border-slate-50 last:border-0 transition-colors hover:bg-blue-50/50 ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="text-center py-12 text-slate-400">No records found</div>
      )}
    </div>
  );
}

// ─── AVATAR ───────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 'md', color = 'blue' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' };
  const colors = ['from-blue-400 to-blue-600', 'from-purple-400 to-purple-600', 'from-emerald-400 to-emerald-600', 'from-orange-400 to-orange-600', 'from-rose-400 to-rose-600', 'from-teal-400 to-teal-600'];
  const idx = name ? name.charCodeAt(0) % colors.length : 0;
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {name ? name.charAt(0).toUpperCase() : '?'}
    </div>
  );
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color = 'blue' }) {
  const pct = Math.round((value / max) * 100);
  const colors = { blue: 'bg-blue-500', green: 'bg-emerald-500', orange: 'bg-orange-500', red: 'bg-red-500' };
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colors[color] || colors.blue}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/60 flex items-center justify-center mb-4 ring-1 ring-blue-100">
        {Icon && <Icon size={28} className="text-blue-400" />}
      </div>
      <h3 className="font-display font-semibold text-slate-600 mb-1">{title}</h3>
      {subtitle && <p className="text-slate-400 text-sm max-w-sm">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── PAGE HEADER (premium gradient banner, optional for page tops) ─────────────
export function PageHeader({ title, subtitle, icon: Icon, action, color = 'primary' }) {
  const grads = {
    primary: 'from-primary-800 via-primary-700 to-primary-600',
    teal:    'from-teal-800 via-teal-700 to-teal-600',
    purple:  'from-purple-800 via-purple-700 to-purple-600',
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${grads[color] || grads.primary} px-6 py-5 shadow-float`}>
      <div className="absolute -right-8 -top-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute right-16 -bottom-10 w-28 h-28 rounded-full bg-white/5 blur-2xl" />
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          {Icon && (
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
              <Icon size={22} className="text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-display font-bold text-white text-xl tracking-tight truncate">{title}</h2>
            {subtitle && <p className="text-blue-100/80 text-sm mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
