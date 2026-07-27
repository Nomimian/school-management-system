import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfDay, endOfDay, addMonths, subMonths,
  eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, isSameMonth, isToday,
  isWithinInterval, startOfYear, endOfYear, subDays,
} from 'date-fns';
import { rangeLabel } from '../utils/reportExport.js';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function buildPresets() {
  const now = new Date();
  const som = startOfMonth(now), eom = endOfMonth(now);
  const lastM = subMonths(now, 1);
  return [
    { label: 'Today',        from: startOfDay(now),                 to: endOfDay(now) },
    { label: 'Last 7 days',  from: startOfDay(subDays(now, 6)),     to: endOfDay(now) },
    { label: 'Last 30 days', from: startOfDay(subDays(now, 29)),    to: endOfDay(now) },
    { label: 'This month',   from: som,                             to: endOfDay(eom) },
    { label: 'Last month',   from: startOfMonth(lastM),             to: endOfDay(endOfMonth(lastM)) },
    { label: 'This quarter', from: startOfMonth(subMonths(now, 2)), to: endOfDay(eom) },
    { label: 'This year',    from: startOfYear(now),                to: endOfDay(endOfYear(now)) },
    { label: 'All time',     from: null,                            to: null },
  ];
}

/**
 * Premium date-range picker (bank-statement style). Controlled via
 * { from, to } (Date | null) and onApply(from, to). Two-month calendar with
 * quick presets and range highlighting. null/null means "All time".
 */
export function DateRangePicker({ from, to, onApply, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(startOfMonth(from || new Date()));
  const [pFrom, setPFrom] = useState(from || null);
  const [pTo, setPTo] = useState(to || null);
  const [hover, setHover] = useState(null);
  const ref = useRef(null);
  const presets = buildPresets();

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Sync internal draft when opened or when props change externally
  useEffect(() => { if (open) { setPFrom(from || null); setPTo(to || null); setView(startOfMonth(from || new Date())); } }, [open]); // eslint-disable-line

  const pickDay = (d) => {
    if (!pFrom || (pFrom && pTo)) { setPFrom(startOfDay(d)); setPTo(null); return; }
    // second click completes the range (auto-order)
    if (d < pFrom) { setPTo(endOfDay(pFrom)); setPFrom(startOfDay(d)); }
    else           { setPTo(endOfDay(d)); }
  };

  const apply = () => {
    if (pFrom && !pTo) { onApply(pFrom, endOfDay(pFrom)); }   // single day
    else onApply(pFrom, pTo);
    setOpen(false);
  };
  const usePreset = (p) => { onApply(p.from, p.to); setOpen(false); };

  const inDraft = (d) => {
    if (pFrom && pTo) return isWithinInterval(d, { start: pFrom, end: pTo });
    if (pFrom && hover) {
      const a = hover < pFrom ? hover : pFrom, b = hover < pFrom ? pFrom : hover;
      return isWithinInterval(d, { start: startOfDay(a), end: endOfDay(b) });
    }
    return false;
  };

  const renderMonth = (month) => {
    const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });
    return (
      <div className="w-[15rem]">
        <div className="text-center text-sm font-semibold text-slate-700 mb-2">{format(month, 'MMMM yyyy')}</div>
        <div className="grid grid-cols-7 gap-y-1 text-[11px] text-slate-400 mb-1">
          {WEEKDAYS.map(w => <div key={w} className="text-center font-medium">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((d, i) => {
            const out = !isSameMonth(d, month);
            const isFrom = pFrom && isSameDay(d, pFrom);
            const isTo   = pTo && isSameDay(d, pTo);
            const inR    = inDraft(d);
            const edge   = isFrom || isTo;
            return (
              <button key={i} type="button"
                onClick={() => pickDay(d)} onMouseEnter={() => setHover(d)}
                className={[
                  'h-8 text-xs relative flex items-center justify-center transition-colors',
                  out ? 'text-slate-300' : 'text-slate-700',
                  inR && !edge ? 'bg-primary-50' : '',
                  isFrom ? 'rounded-l-lg' : '', isTo ? 'rounded-r-lg' : '',
                  edge ? 'bg-primary-600 text-white font-semibold rounded-lg' : 'hover:bg-slate-100 rounded-lg',
                ].join(' ')}>
                {format(d, 'd')}
                {isToday(d) && !edge && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary-500" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const menuPos = align === 'left' ? 'left-0' : 'right-0';

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all">
        <Calendar size={14} className="text-primary-600" />
        <span>{rangeLabel(from, to)}</span>
        <ChevronLeft size={13} className={`transition-transform ${open ? 'rotate-90' : '-rotate-90'}`} />
      </button>

      {open && (
        <div className={`absolute ${menuPos} mt-2 z-50 bg-white rounded-2xl shadow-float border border-slate-100 overflow-hidden animate-[popIn_.16s_ease-out]`}>
          <div className="flex flex-col sm:flex-row">
            {/* Presets */}
            <div className="p-2 sm:border-r border-slate-100 bg-slate-50/50 flex sm:flex-col gap-1 overflow-x-auto sm:w-36 shrink-0">
              {presets.map(p => (
                <button key={p.label} type="button" onClick={() => usePreset(p)}
                  className="text-left whitespace-nowrap text-xs font-medium text-slate-600 px-3 py-2 rounded-lg hover:bg-primary-50 hover:text-primary-700 transition-colors">
                  {p.label}
                </button>
              ))}
            </div>

            {/* Calendar */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={() => setView(v => subMonths(v, 1))}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ChevronLeft size={16} /></button>
                <div className="text-xs text-slate-400">
                  {pFrom ? format(pFrom, 'MMM d, yyyy') : 'Start'} → {pTo ? format(pTo, 'MMM d, yyyy') : 'End'}
                </div>
                <button type="button" onClick={() => setView(v => addMonths(v, 1))}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ChevronRight size={16} /></button>
              </div>
              <div className="flex gap-6" onMouseLeave={() => setHover(null)}>
                {renderMonth(view)}
                <div className="hidden lg:block">{renderMonth(addMonths(view, 1))}</div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => { setPFrom(null); setPTo(null); }}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600">Clear</button>
                <button type="button" onClick={apply}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:-translate-y-0.5 transition-all shadow">
                  <Check size={14} /> Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
