import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { useSchool } from '../hooks/useSchool.jsx';
import { downloadCsv, printReport, MONTHS } from '../utils/reportExport.js';

/**
 * Reusable "Download Report" dropdown — offers a branded PDF (via the print
 * pipeline) and an Excel/CSV file for the same dataset.
 *
 * Props: { title, subtitle, filename, columns, rows, totals, docType, label, size, disabled }
 * See utils/reportExport.js for the column/totals shape.
 */
export function ReportMenu({
  title, subtitle, filename, columns, rows = [], totals,
  docType, label = 'Download Report', size = 'sm', disabled = false,
}) {
  const { school } = useSchool();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const noData = !rows || rows.length === 0;
  const isDisabled = disabled || noData;
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';

  const asPdf = () => { printReport({ school, title, subtitle, columns, rows, totals, docType }); setOpen(false); };
  const asCsv = () => { downloadCsv({ filename, title, columns, rows, totals }); setOpen(false); };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => setOpen(o => !o)}
        title={noData ? 'No data to export' : undefined}
        className={`inline-flex items-center gap-2 rounded-xl font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all ${pad} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[.98]'}`}
      >
        <Download size={size === 'sm' ? 14 : 16} /> {label}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !isDisabled && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-float border border-slate-100 z-50 overflow-hidden animate-[popIn_.15s_ease-out]">
          <button onClick={asPdf}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-primary-50 text-left">
            <FileText size={16} className="text-red-500" />
            <div>
              <div className="font-medium">PDF</div>
              <div className="text-xs text-slate-400">Branded · print or save</div>
            </div>
          </button>
          <button onClick={asCsv}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-primary-50 text-left border-t border-slate-50">
            <FileSpreadsheet size={16} className="text-emerald-600" />
            <div>
              <div className="font-medium">Excel (CSV)</div>
              <div className="text-xs text-slate-400">Opens in Excel / Sheets</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Compact month + year selector for "monthly report" filters.
 * Controlled: pass { month, year, onMonth, onYear }. `years` defaults to the
 * current year and the two prior years.
 */
export function PeriodPicker({ month, year, onMonth, onYear, years }) {
  const thisYear = new Date().getFullYear();
  const yearOpts = years || [thisYear, thisYear - 1, thisYear - 2];
  const sel = 'px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-200';
  return (
    <div className="flex items-center gap-2">
      <select aria-label="Report month" value={month} onChange={e => onMonth(e.target.value)} className={sel}>
        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <select aria-label="Report year" value={year} onChange={e => onYear(Number(e.target.value))} className={sel}>
        {yearOpts.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}
