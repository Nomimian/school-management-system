import { useState, useEffect, useRef } from 'react';
import { Layers, Loader2 } from 'lucide-react';
import { enrollmentGroupAPI } from '../services/api';
import { Dropdown } from './ui';

/**
 * Renders the school's dynamic enrollment categories (Group / House / Shift …)
 * as dropdowns for the Add-Student and New-Application forms. Categories are
 * filtered by the student's class when a category is scoped to specific classes.
 *
 * Props:
 *   value       – existing enrollment [{ name, value }]
 *   studentClass– the currently selected class (to filter class-scoped categories)
 *   seedKey     – changes when the edited record changes (re-seeds selections)
 *   onChange    – (enrollment) => void
 */
export default function EnrollmentFields({ value = [], studentClass = '', seedKey = 'new', onChange }) {
  const [groups, setGroups] = useState(null);
  const [sel, setSel] = useState({});          // { [categoryName]: value }
  const seededFor = useRef(null);

  useEffect(() => {
    enrollmentGroupAPI.getAll()
      .then(r => setGroups((r.data || []).filter(g => g.isActive !== false)))
      .catch(() => setGroups([]));
  }, []);

  // Seed selections from existing value once, or when switching records.
  useEffect(() => {
    if (!groups) return;
    if (seededFor.current === seedKey) return;
    const map = {};
    (value || []).forEach(e => { if (e?.name) map[e.name] = e.value; });
    setSel(map);
    seededFor.current = seedKey;
  }, [groups, seedKey]);      // eslint-disable-line react-hooks/exhaustive-deps

  const emit = (map) => {
    const enrollment = Object.entries(map)
      .filter(([, v]) => v)
      .map(([name, v]) => ({ name, value: v }));
    onChange?.(enrollment);
  };
  const setValue = (name, v) => setSel(s => { const next = { ...s, [name]: v }; emit(next); return next; });

  if (groups === null) return <div className="flex items-center gap-2 text-slate-400 text-sm py-3"><Loader2 size={14} className="animate-spin"/> Loading categories…</div>;

  // Only categories that apply to this class (or to all classes).
  const applicable = groups.filter(g => !g.appliesToClasses?.length || (studentClass && g.appliesToClasses.includes(studentClass)));
  if (!applicable.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <Layers size={15} className="text-primary-500"/>
        <span className="text-sm font-semibold text-slate-700">Enrollment</span>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {applicable.map(g => (
          <div key={g._id} className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">{g.name}{g.required && <span className="text-red-500"> *</span>}</label>
            <Dropdown value={sel[g.name] || ''} onChange={e => setValue(g.name, e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
              <option value="">Select {g.name}…</option>
              {(g.options || []).map(o => <option key={o} value={o}>{o}</option>)}
            </Dropdown>
          </div>
        ))}
      </div>
    </div>
  );
}
