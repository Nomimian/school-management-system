import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Layers, Loader2, Info } from 'lucide-react';
import { enrollmentGroupAPI } from '../services/api';
import { useClasses } from '../hooks/useClasses.js';
import { Card, Button, Switch, useToast, useConfirm, EmptyState } from './ui';

const toArr = (str) => String(str || '').split(',').map(s => s.trim()).filter(Boolean);

/**
 * Groups & Categories — dynamic enrollment classifications (Group, House, Shift …)
 * that appear as dropdowns on the Add-Student / New-Application forms.
 */
export default function EnrollmentGroupsPanel() {
  const toast = useToast();
  const confirm = useConfirm();
  const { names: classNames } = useClasses();

  const [groups, setGroups]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSaving] = useState(null);
  const [adding, setAdding]   = useState(false);
  const [draft, setDraft]     = useState({ name: '', options: '' });

  const load = async () => {
    setLoading(true);
    try { const r = await enrollmentGroupAPI.getAll(); setGroups(r.data || []); }
    catch (e) { toast.error(e.message || 'Could not load categories'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // Local edit buffers keyed by id (options/classes edited as comma-strings)
  const patch = (id, changes) => setGroups(gs => gs.map(g => g._id === id ? { ...g, ...changes } : g));

  const saveGroup = async (g) => {
    if (!g.name?.trim()) return toast.error('Category name is required.');
    setSaving(g._id);
    try {
      await enrollmentGroupAPI.update(g._id, {
        name: g.name.trim(),
        options: Array.isArray(g.options) ? g.options : toArr(g.options),
        appliesToClasses: Array.isArray(g.appliesToClasses) ? g.appliesToClasses : toArr(g.appliesToClasses),
        required: !!g.required, isActive: g.isActive !== false,
      });
      toast.success('Saved');
    } catch (e) { toast.error(e.message || 'Could not save'); }
    finally { setSaving(null); }
  };

  const addGroup = async () => {
    if (!draft.name.trim()) return toast.error('Enter a category name.');
    setAdding(true);
    try {
      const r = await enrollmentGroupAPI.create({ name: draft.name.trim(), options: toArr(draft.options), order: groups.length });
      setGroups(gs => [...gs, r.data]);
      setDraft({ name: '', options: '' });
      toast.success('Category added');
    } catch (e) { toast.error(e.message || 'Could not add'); }
    finally { setAdding(false); }
  };

  const removeGroup = async (g) => {
    if (!(await confirm({ title: 'Delete category?', message: `Remove “${g.name}”? Existing students keep their recorded value; the field just won't show on forms anymore.`, tone: 'danger', confirmText: 'Delete' }))) return;
    try { await enrollmentGroupAPI.delete(g._id); setGroups(gs => gs.filter(x => x._id !== g._id)); toast.success('Deleted'); }
    catch (e) { toast.error(e.message || 'Could not delete'); }
  };

  return (
    <Card>
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-primary-600"/>
          <h3 className="font-display font-bold text-slate-800">Groups & Categories</h3>
        </div>
        <p className="text-sm text-slate-500 mt-1">Define the classifications a student is enrolled into (e.g. <strong>Group</strong> → Pre-Medical, Pre-Engineering…). Each appears as a dropdown on the Add-Student and New-Application forms. Optionally limit a category to specific classes.</p>
      </div>

      <div className="p-5 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-6 justify-center"><Loader2 className="animate-spin" size={16}/> Loading…</div>
        ) : groups.length === 0 ? (
          <EmptyState icon={Layers} title="No categories yet" subtitle="Add your first category below (e.g. Group)." />
        ) : groups.map(g => {
          const optionsStr = Array.isArray(g.options) ? g.options.join(', ') : (g.options || '');
          const classesStr = Array.isArray(g.appliesToClasses) ? g.appliesToClasses.join(', ') : (g.appliesToClasses || '');
          return (
            <div key={g._id} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <input value={g.name} onChange={e => patch(g._id, { name: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"/>
                <label className="flex items-center gap-1.5 text-xs text-slate-500">Required <Switch checked={!!g.required} onChange={v => patch(g._id, { required: v })} size="sm"/></label>
                <label className="flex items-center gap-1.5 text-xs text-slate-500">Active <Switch checked={g.isActive !== false} onChange={v => patch(g._id, { isActive: v })} size="sm"/></label>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Options (comma-separated)</label>
                <input value={optionsStr} onChange={e => patch(g._id, { options: e.target.value })} placeholder="Pre-Medical, Pre-Engineering, ICS, I.Com, Arts"
                  className="w-full mt-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"/>
                {toArr(optionsStr).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {toArr(optionsStr).map(o => <span key={o} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{o}</span>)}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Applies to classes (comma-separated · blank = all classes)</label>
                <input value={classesStr} onChange={e => patch(g._id, { appliesToClasses: e.target.value })} placeholder={`Blank = all${classNames.length ? ` · e.g. ${classNames.slice(0,3).join(', ')}` : ''}`}
                  className="w-full mt-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"/>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => saveGroup(g)} disabled={savingId === g._id}
                  className="text-xs bg-primary-100 text-primary-700 hover:bg-primary-200 px-3 py-1.5 rounded-lg font-medium inline-flex items-center gap-1">
                  {savingId === g._id ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>} Save
                </button>
                <button onClick={() => removeGroup(g)} className="text-slate-400 hover:text-red-500 p-1.5"><Trash2 size={15}/></button>
              </div>
            </div>
          );
        })}

        {/* Add new category */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 pt-3 border-t border-slate-100">
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-500">New category</label>
            <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. House"
              className="w-full mt-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"/>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-500">Options (comma-separated)</label>
            <input value={draft.options} onChange={e => setDraft({ ...draft, options: e.target.value })} placeholder="Red, Blue, Green, Yellow"
              className="w-full mt-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"/>
          </div>
          <Button variant="primary" icon={adding ? Loader2 : Plus} onClick={addGroup} disabled={adding}>{adding ? 'Adding…' : 'Add'}</Button>
        </div>
        <div className="flex items-start gap-2 text-xs text-slate-400">
          <Info size={13} className="mt-0.5 flex-shrink-0"/>
          <span>Categories show above the fee section on the student &amp; admission forms. Deleting one keeps already-saved values on existing students.</span>
        </div>
      </div>
    </Card>
  );
}
