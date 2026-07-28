import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, List, Loader2, Info } from 'lucide-react';
import { optionSetAPI } from '../services/api';
import { invalidateOptions } from '../hooks/useOptions.js';
import { Card, Button, useToast, useConfirm, EmptyState } from './ui';

const toArr = (str) => String(str || '').split(',').map(s => s.trim()).filter(Boolean);

/**
 * Dropdown Options — one place to edit every configurable list used across the
 * app (blood groups, relationships, payment methods, categories, event types …).
 */
export default function OptionSetsPanel() {
  const toast = useToast();
  const confirm = useConfirm();
  const [sets, setSets]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSaving] = useState(null);
  const [adding, setAdding]   = useState(false);
  const [draft, setDraft]     = useState({ label: '', options: '' });

  const load = async () => {
    setLoading(true);
    try { const r = await optionSetAPI.getAll(); setSets(r.data || []); }
    catch (e) { toast.error(e.message || 'Could not load lists'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const patch = (id, changes) => setSets(ss => ss.map(s => s._id === id ? { ...s, ...changes } : s));

  const saveSet = async (s) => {
    setSaving(s._id);
    try {
      await optionSetAPI.update(s._id, { label: s.label, options: Array.isArray(s.options) ? s.options : toArr(s.options) });
      invalidateOptions();               // refresh the shared cache so forms update
      toast.success('Saved');
    } catch (e) { toast.error(e.message || 'Could not save'); }
    finally { setSaving(null); }
  };

  const addSet = async () => {
    if (!draft.label.trim()) return toast.error('Enter a list name.');
    setAdding(true);
    try {
      const r = await optionSetAPI.create({ label: draft.label.trim(), options: toArr(draft.options) });
      setSets(ss => [...ss, r.data]);
      setDraft({ label: '', options: '' });
      invalidateOptions();
      toast.success('List added');
    } catch (e) { toast.error(e.message || 'Could not add'); }
    finally { setAdding(false); }
  };

  const removeSet = async (s) => {
    if (!(await confirm({ title: 'Delete list?', message: `Remove “${s.label}”? Any form using it will fall back to its built-in defaults.`, tone: 'danger', confirmText: 'Delete' }))) return;
    try { await optionSetAPI.delete(s._id); setSets(ss => ss.filter(x => x._id !== s._id)); invalidateOptions(); toast.success('Deleted'); }
    catch (e) { toast.error(e.message || 'Could not delete'); }
  };

  return (
    <Card>
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <List size={18} className="text-primary-600"/>
          <h3 className="font-display font-bold text-slate-800">Dropdown Options</h3>
        </div>
        <p className="text-sm text-slate-500 mt-1">Edit the values that appear in dropdowns across the app — blood groups, guardian relationships, payment methods, departments, categories, event types and more. Changes apply everywhere instantly.</p>
      </div>

      <div className="p-5 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-6 justify-center"><Loader2 className="animate-spin" size={16}/> Loading…</div>
        ) : sets.length === 0 ? (
          <EmptyState icon={List} title="No lists yet" subtitle="Add your first list below." />
        ) : sets.map(s => {
          const optionsStr = Array.isArray(s.options) ? s.options.join(', ') : (s.options || '');
          return (
            <div key={s._id} className="rounded-xl border border-slate-200 p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-slate-800">{s.label}</span>
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">{s.key}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => saveSet(s)} disabled={savingId === s._id}
                    className="text-xs bg-primary-100 text-primary-700 hover:bg-primary-200 px-3 py-1.5 rounded-lg font-medium inline-flex items-center gap-1">
                    {savingId === s._id ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>} Save
                  </button>
                  <button onClick={() => removeSet(s)} className="text-slate-400 hover:text-red-500 p-1.5"><Trash2 size={15}/></button>
                </div>
              </div>
              <input value={optionsStr} onChange={e => patch(s._id, { options: e.target.value })} placeholder="Comma-separated values"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"/>
              {toArr(optionsStr).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {toArr(optionsStr).map(o => <span key={o} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{o}</span>)}
                </div>
              )}
            </div>
          );
        })}

        {/* Add new list */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 pt-3 border-t border-slate-100">
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-500">New list name</label>
            <input value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} placeholder="e.g. Transport Zones"
              className="w-full mt-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"/>
          </div>
          <div className="flex-[2]">
            <label className="text-xs font-medium text-slate-500">Options (comma-separated)</label>
            <input value={draft.options} onChange={e => setDraft({ ...draft, options: e.target.value })} placeholder="Zone A, Zone B, Zone C"
              className="w-full mt-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"/>
          </div>
          <Button variant="primary" icon={adding ? Loader2 : Plus} onClick={addSet} disabled={adding}>{adding ? 'Adding…' : 'Add'}</Button>
        </div>
        <div className="flex items-start gap-2 text-xs text-slate-400">
          <Info size={13} className="mt-0.5 flex-shrink-0"/>
          <span>Deleting a built-in list just reverts that dropdown to its default values — nothing breaks.</span>
        </div>
      </div>
    </Card>
  );
}
