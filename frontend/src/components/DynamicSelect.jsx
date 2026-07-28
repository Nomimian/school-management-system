import { useOptions } from '../hooks/useOptions.js';
import { Dropdown } from './ui';

/**
 * A dropdown backed by a configurable Option Set (Settings → Dropdown Options).
 * Falls back to built-in defaults if the list isn't configured, and always
 * preserves an already-saved value even if it's no longer in the list.
 *
 * Props: optionKey, value, onChange, fallback[], label?, placeholder?, required?, className?
 */
export default function DynamicSelect({
  optionKey, value, onChange, fallback = [], label, placeholder = 'Select…',
  required = false, className, includeBlank = true,
}) {
  const { get } = useOptions();
  let opts = get(optionKey, fallback);
  if (value && !opts.includes(value)) opts = [value, ...opts];   // keep legacy values selectable

  const select = (
    <Dropdown value={value || ''} onChange={onChange}
      className={className || 'px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200'}>
      {includeBlank && <option value="">{placeholder}</option>}
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </Dropdown>
  );

  if (!label) return select;
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{label}{required && <span className="text-red-500"> *</span>}</label>
      {select}
    </div>
  );
}
