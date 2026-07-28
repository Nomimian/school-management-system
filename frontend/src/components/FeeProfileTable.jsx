import { useState, useEffect, useRef } from 'react';
import { DollarSign, Loader2 } from 'lucide-react';
import { feeHeadAPI } from '../services/api';

/**
 * Editable per-student fee table: Fee Type · Fee · Discount · Total.
 * Rows come from the school's configured fee heads (Monthly + One-Time). The
 * parent gets back the `feeProfile` array plus the net MONTHLY total (used as the
 * student's cached feeAmount and by the challan generator).
 *
 * Props:
 *   value    – existing feeProfile [{ name, amount, discount }]
 *   seedKey  – changes when the edited student changes (re-seeds the rows)
 *   onChange – (profile, monthlyTotal) => void
 */
export default function FeeProfileTable({ value = [], seedKey = 'new', onChange }) {
  const [heads, setHeads]   = useState(null);
  const [rows, setRows]     = useState([]);       // [{ name, frequency, amount, discount }]
  const seededFor = useRef(null);

  useEffect(() => {
    feeHeadAPI.getAll()
      .then(r => setHeads((r.data || []).filter(h => h.isActive !== false && h.frequency !== 'Optional')))
      .catch(() => setHeads([]));
  }, []);

  // Seed rows once heads are available, or whenever we switch students.
  useEffect(() => {
    if (!heads) return;
    if (seededFor.current === seedKey) return;
    const byName = new Map((value || []).map(p => [String(p.name).toLowerCase(), p]));
    const seeded = heads.map(h => {
      const p = byName.get(String(h.name).toLowerCase());
      return {
        name: h.name,
        frequency: h.frequency,
        amount: p && Number(p.amount) > 0 ? Number(p.amount) : Number(h.amount) || 0,
        discount: p ? Number(p.discount) || 0 : 0,
      };
    });
    setRows(seeded);
    seededFor.current = seedKey;
    emit(seeded);
  }, [heads, seedKey]);       // eslint-disable-line react-hooks/exhaustive-deps

  const emit = (rs) => {
    const profile = rs
      .filter(r => Number(r.amount) > 0 || Number(r.discount) > 0)
      .map(r => ({ name: r.name, amount: Number(r.amount) || 0, discount: Number(r.discount) || 0 }));
    const monthly = rs
      .filter(r => r.frequency === 'Monthly')
      .reduce((s, r) => s + Math.max(0, (Number(r.amount) || 0) - (Number(r.discount) || 0)), 0);
    onChange?.(profile, monthly);
  };

  const setRow = (name, changes) => {
    setRows(rs => {
      const next = rs.map(r => r.name === name ? { ...r, ...changes } : r);
      emit(next);
      return next;
    });
  };

  if (heads === null) return <div className="flex items-center gap-2 text-slate-400 text-sm py-4"><Loader2 size={14} className="animate-spin"/> Loading fee heads…</div>;
  if (!heads.length) return (
    <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
      No fee heads configured yet. Set them up under <strong>Settings → Fee Configuration</strong>.
    </div>
  );

  const monthlyTotal = rows.filter(r => r.frequency === 'Monthly').reduce((s, r) => s + Math.max(0, (Number(r.amount)||0) - (Number(r.discount)||0)), 0);
  const oneTimeTotal = rows.filter(r => r.frequency === 'One-Time').reduce((s, r) => s + Math.max(0, (Number(r.amount)||0) - (Number(r.discount)||0)), 0);

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <DollarSign size={15} className="text-primary-500"/>
        <span className="text-sm font-semibold text-slate-700">Fee Details</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-2">Fee Type</th>
              <th className="px-3 py-2 w-32">Fee (Rs)</th>
              <th className="px-3 py-2 w-32">Discount (Rs)</th>
              <th className="px-4 py-2 w-32 text-right">Total (Rs)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const total = Math.max(0, (Number(r.amount)||0) - (Number(r.discount)||0));
              return (
                <tr key={r.name} className="border-t border-slate-50">
                  <td className="px-4 py-2">
                    <span className="font-medium text-slate-700">{r.name}</span>
                    <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${r.frequency === 'Monthly' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>{r.frequency === 'Monthly' ? 'Monthly' : 'One-time'}</span>
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={r.amount} onChange={e => setRow(r.name, { amount: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"/>
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={r.discount} onChange={e => setRow(r.name, { discount: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"/>
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-800">{total.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50/70">
              <td className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase" colSpan={3}>Net Monthly Fee</td>
              <td className="px-4 py-2 text-right font-display font-bold text-primary-700">Rs {monthlyTotal.toLocaleString()}</td>
            </tr>
            {oneTimeTotal > 0 && (
              <tr className="bg-slate-50/70">
                <td className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase" colSpan={3}>One-time (at admission)</td>
                <td className="px-4 py-2 text-right font-medium text-slate-500">Rs {oneTimeTotal.toLocaleString()}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  );
}
