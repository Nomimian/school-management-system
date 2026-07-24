import { useState, useRef, useEffect, useCallback, Children, isValidElement } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// <Dropdown> — a fully styled, theme-aware replacement for the native <select>.
//
// Drop-in by design:
//   • same props as a native select: `value`, `onChange`, `disabled`, `className`
//   • accepts <option> children exactly like a native select
//   • onChange fires with a native-like event: { target: { value } }, so existing
//     handlers written as `e => setX(e.target.value)` keep working unchanged.
//
// The options panel renders in a portal (position: fixed from the trigger's
// rect) so it is NEVER clipped by an overflow-hidden card, modal, or table cell.
// Keyboard: Enter/Space/↓ open · ↑/↓ move · Enter select · Esc close.
// ─────────────────────────────────────────────────────────────────────────────
function parseOptions(children) {
  const out = [];
  Children.toArray(children).forEach((c) => {
    if (!isValidElement(c) || c.type !== 'option') return;
    const label = c.props.children;
    const value = c.props.value !== undefined
      ? c.props.value
      : (typeof label === 'string' || typeof label === 'number' ? label : '');
    out.push({ value: String(value), label, disabled: !!c.props.disabled });
  });
  return out;
}

export function Dropdown({
  value, onChange, children, disabled = false,
  className = '', placeholder = 'Select…', size = 'md',
}) {
  const options = parseOptions(children);
  const selected = options.find((o) => String(o.value) === String(value ?? ''));

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [activeIdx, setActiveIdx] = useState(-1);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  const pad = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm';

  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const wantUp = below < 260 && r.top > below;
    setCoords({
      left: r.left,
      width: r.width,
      ...(wantUp ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
    });
  }, []);

  const openMenu = () => {
    if (disabled) return;
    place();
    setActiveIdx(options.findIndex((o) => String(o.value) === String(value ?? '')));
    setOpen(true);
  };
  const close = () => setOpen(false);

  const pick = (opt) => {
    if (opt.disabled) return;
    onChange?.({ target: { value: opt.value } });
    setOpen(false);
    btnRef.current?.focus();
  };

  // Outside-click / scroll / resize handling while open.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (btnRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      close();
    };
    const onScroll = (e) => { if (!panelRef.current?.contains(e.target)) close(); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); openMenu(); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(options.length - 1, i + 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
    if (e.key === 'Enter')     { e.preventDefault(); if (options[activeIdx]) pick(options[activeIdx]); }
  };

  const menu = open && coords && createPortal(
    <div
      ref={panelRef}
      role="listbox"
      style={{
        position: 'fixed', left: coords.left, width: coords.width,
        ...(coords.top != null ? { top: coords.top } : { bottom: coords.bottom }),
        zIndex: 120,
      }}
      className="bg-white rounded-xl shadow-float border border-slate-100 py-1 max-h-64 overflow-y-auto scrollbar-thin animate-[fadeIn_.12s_ease-out]"
    >
      {options.length === 0 && <div className="px-3 py-2 text-sm text-slate-400">No options</div>}
      {options.map((o, i) => {
        const isSel = String(o.value) === String(value ?? '');
        const isActive = i === activeIdx;
        return (
          <button
            key={`${o.value}-${i}`}
            type="button"
            role="option"
            aria-selected={isSel}
            disabled={o.disabled}
            onMouseEnter={() => setActiveIdx(i)}
            onClick={() => pick(o)}
            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors
              ${o.disabled ? 'text-slate-300 cursor-not-allowed'
                : isActive ? 'bg-primary-600 text-white'
                : isSel ? 'bg-blue-50 text-primary-700 font-medium'
                : 'text-slate-700 hover:bg-blue-50'}`}
          >
            <span className="truncate">{o.label}</span>
            {isSel && <Check size={14} className={isActive ? 'text-white' : 'text-primary-600'} />}
          </button>
        );
      })}
    </div>,
    document.body,
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
        className={`inline-flex items-center justify-between gap-2 rounded-xl border bg-slate-50 text-left
          border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400
          transition-colors ${pad}
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-slate-300'}
          ${open ? 'ring-2 ring-blue-200 border-blue-400 bg-white' : ''}
          ${className}`}
      >
        <span className={`truncate ${selected ? 'text-slate-700' : 'text-slate-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={15} className={`text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {menu}
    </>
  );
}
