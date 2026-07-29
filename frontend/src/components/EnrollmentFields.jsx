import { useState, useEffect, useRef, useMemo } from 'react';
import { Layers, Loader2 } from 'lucide-react';
import { enrollmentGroupAPI } from '../services/api';
import { Dropdown } from './ui';

/**
 * Renders the school's dynamic enrollment categories (Group / House / Shift …)
 * as dropdowns for the Add-Student and New-Application forms. A category is shown
 * only when it applies to the selected class (a category with no class filter
 * applies to all classes).
 *
 * Props:
 *   value        – existing enrollment [{ name, value }]
 *   studentClass – selected class (to filter class-scoped categories)
 *   seedKey      – changes when the edited record changes (re-seeds selections)
 *   onChange     – (enrollment, { missingRequired:[names] }) => void
 *                  `enrollment` contains ONLY the categories visible for this
 *                  class, so what's saved always matches what's shown.
 */
export default function EnrollmentFields({ value = [], studentClass = '', seedKey = 'new', onChange }) {
  const [groups, setGroups] = useState(null);
  const [sel, setSel] = useState({});          // { [categoryName]: value }
  const seededFor = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    enrollmentGroupAPI.getAll()
      .then(r => setGroups((r.data || []).filter(g => g.isActive !== false)))
      .catch(() => setGroups([]));
  }, []);

  // Seed selections from the existing record once, or when switching records.
  useEffect(() => {
    if (!groups) return;
    if (seededFor.current === seedKey) return;
    const map = {};
    (value || []).forEach(e => { if (e?.name) map[e.name] = e.value; });
    setSel(map);
    seededFor.current = seedKey;
  }, [groups, seedKey]);      // eslint-disable-line react-hooks/exhaustive-deps

  // Categories that apply to the current class (empty filter ⇒ all classes).
  const applicable = useMemo(
    () => (groups || []).filter(g => !g.appliesToClasses?.length || (studentClass && g.appliesToClasses.includes(studentClass))),
    [groups, studentClass],
  );

  // Report the value (visible categories only) + any unfilled required ones, so
  // the parent form can save cleanly and block on missing required selections.
  useEffect(() => {
    if (!groups || seededFor.current !== seedKey) return;
    const enrollment = applicable.map(g => ({ name: g.name, value: sel[g.name] || '' })).filter(e => e.value);
    const missingRequired = applicable.filter(g => g.required && !sel[g.name]).map(g => g.name);
    onChangeRef.current?.(enrollment, { missingRequired });
  }, [groups, applicable, sel, seedKey]);

  const setValue = (name, v) => setSel(s => ({ ...s, [name]: v }));

  if (groups === null) return <div className="flex items-center gap-2 text-slate-400 text-sm py-3"><Loader2 size={14} className="animate-spin"/> Loading categories…</div>;

  // There ARE categories, but none apply yet. Rather than render an invisible
  // gap (which reads as "the enrollment part is missing"), show the section with
  // a hint. Most categories here are class-scoped, so the usual cause is simply
  // that no class is selected yet on a new form.
  if (!applicable.length) {
    const activeGroups = groups || [];
    if (!activeGroups.length) return null;   // truly nothing configured → stay quiet
    return (
      <div className="rounded-xl border border-dashed border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
          <Layers size={15} className="text-primary-500"/>
          <span className="text-sm font-semibold text-slate-700">Enrollment</span>
        </div>
        <p className="px-4 py-3 text-sm text-slate-400">
          {studentClass
            ? `No enrollment categories apply to “${studentClass}”. Adjust a category's classes in Settings → Groups & Categories.`
            : 'Select a class above to choose enrollment options (Group, House, …).'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <Layers size={15} className="text-primary-500"/>
        <span className="text-sm font-semibold text-slate-700">Enrollment</span>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {applicable.map(g => {
          const missing = g.required && !sel[g.name];
          return (
            <div key={g._id} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">{g.name}{g.required && <span className="text-red-500"> *</span>}</label>
              <Dropdown value={sel[g.name] || ''} onChange={e => setValue(g.name, e.target.value)}
                className={`px-3 py-2 text-sm border rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200 ${missing ? 'border-red-300' : 'border-slate-200'}`}>
                <option value="">Select {g.name}…</option>
                {(g.options || []).map(o => <option key={o} value={o}>{o}</option>)}
              </Dropdown>
            </div>
          );
        })}
      </div>
    </div>
  );
}
