import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, BookOpen, Loader2, Info, Layers } from 'lucide-react';
import { subjectAPI } from '../services/api';
import { useClasses } from '../hooks/useClasses.js';
import { useOptions } from '../hooks/useOptions.js';
import { Card, Button, Dropdown, useToast, useConfirm, EmptyState } from './ui';

const STREAM_FALLBACK = ['Pre-Medical', 'Pre-Engineering', 'ICS', 'I.Com', 'FA', 'Commerce', 'General'];
const emptyDraft = () => ({ name: '', group: '', totalMarks: 100, passMark: 40 });

const toArr = (g) => String(g || '').split(',').map(s => s.trim()).filter(Boolean);

// Toggleable stream chips. Empty selection ⇒ the subject applies to all students.
function StreamChips({ streams, value, onChange }) {
  const arr = toArr(value);
  const toggle = (s) => {
    const next = arr.includes(s) ? arr.filter(x => x !== s) : [...arr, s];
    onChange(next.join(','));
  };
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {streams.map(s => {
        const on = arr.includes(s);
        return (
          <button key={s} type="button" onClick={() => toggle(s)}
            className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${on ? 'bg-primary-100 text-primary-700 border-primary-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-primary-200'}`}>
            {s}
          </button>
        );
      })}
      {!arr.length && <span className="text-[11px] text-slate-400 pl-1">All students</span>}
    </div>
  );
}

/**
 * Subjects — configure the subjects for each class ONCE; every exam of that
 * class then uses them automatically (no per-exam subject entry). A subject can
 * optionally be tagged to a stream (e.g. Pre-Medical) so it applies only to
 * students enrolled in that stream — letting ICS vs Pre-Engineering students in
 * the same class sit different papers.
 */
export default function SubjectsPanel() {
  const toast = useToast();
  const confirm = useConfirm();
  const { names: classes } = useClasses();
  const { get } = useOptions();
  const streams = get('streams', STREAM_FALLBACK);

  const [cls, setCls] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSaving] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft());

  // Default to the first class once the class list loads.
  useEffect(() => { if (!cls && classes.length) setCls(classes[0]); }, [classes]); // eslint-disable-line

  const load = async (className) => {
    if (!className) return;
    setLoading(true);
    try { const r = await subjectAPI.getAll({ class: className }); setSubjects(r.data || []); }
    catch (e) { toast.error(e.message || 'Could not load subjects'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(cls); }, [cls]); // eslint-disable-line

  const patch = (id, ch) => setSubjects(ss => ss.map(s => s._id === id ? { ...s, ...ch } : s));

  const saveSubject = async (s) => {
    if (!s.name?.trim()) return toast.error('Subject name is required.');
    setSaving(s._id);
    try {
      await subjectAPI.update(s._id, {
        name: s.name.trim(), group: s.group || '',
        totalMarks: Number(s.totalMarks) || 100, passMark: Number(s.passMark) || 40,
      });
      toast.success('Saved');
    } catch (e) { toast.error(e.message || 'Could not save'); }
    finally { setSaving(null); }
  };

  const addSubject = async () => {
    if (!cls) return toast.error('Select a class first.');
    if (!draft.name.trim()) return toast.error('Enter a subject name.');
    setAdding(true);
    try {
      const r = await subjectAPI.create({
        class: cls, name: draft.name.trim(), group: draft.group || '',
        totalMarks: Number(draft.totalMarks) || 100, passMark: Number(draft.passMark) || 40,
        order: subjects.length,
      });
      setSubjects(ss => [...ss, r.data]);
      setDraft(emptyDraft());
      toast.success('Subject added');
    } catch (e) { toast.error(e.message || 'Could not add'); }
    finally { setAdding(false); }
  };

  const removeSubject = async (s) => {
    if (!(await confirm({ title: 'Delete subject?', message: `Remove “${s.name}” from ${cls}?`, tone: 'danger', confirmText: 'Delete' }))) return;
    try { await subjectAPI.delete(s._id); setSubjects(ss => ss.filter(x => x._id !== s._id)); toast.success('Deleted'); }
    catch (e) { toast.error(e.message || 'Could not delete'); }
  };

  return (
    <Card>
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-primary-600" />
          <h3 className="font-display font-bold text-slate-800">Subjects</h3>
        </div>
        <p className="text-sm text-slate-500 mt-1">Set each class's subjects once — every exam of that class uses them automatically. Tag a subject with a <strong>stream</strong> (e.g. Pre-Medical) to apply it only to students enrolled in that stream; leave it blank to apply to all students in the class.</p>
      </div>

      <div className="p-5 space-y-4">
        {/* Class picker */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Class</label>
          <Dropdown value={cls} onChange={e => setCls(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200 min-w-[12rem]">
            <option value="">Select class…</option>
            {classes.map(c => <option key={c}>{c}</option>)}
          </Dropdown>
        </div>

        {!cls ? (
          <EmptyState icon={BookOpen} title="Pick a class" subtitle="Choose a class above to manage its subjects." />
        ) : loading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-6 justify-center"><Loader2 className="animate-spin" size={16} /> Loading…</div>
        ) : (
          <>
            {subjects.length === 0 ? (
              <EmptyState icon={BookOpen} title={`No subjects for ${cls} yet`} subtitle="Add the first subject below." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-2.5">Subject</th>
                      <th className="px-4 py-2.5">Stream</th>
                      <th className="px-4 py-2.5">Total</th>
                      <th className="px-4 py-2.5">Pass</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map(s => (
                      <tr key={s._id} className="border-t border-slate-100">
                        <td className="px-3 py-2">
                          <input value={s.name || ''} onChange={e => patch(s._id, { name: e.target.value })}
                            className="w-full min-w-[9rem] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg" />
                        </td>
                        <td className="px-3 py-2">
                          <StreamChips streams={streams} value={s.group || ''} onChange={v => patch(s._id, { group: v })} />
                        </td>
                        <td className="px-3 py-2"><input type="number" value={s.totalMarks ?? ''} onChange={e => patch(s._id, { totalMarks: e.target.value })} className="w-20 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg" /></td>
                        <td className="px-3 py-2"><input type="number" value={s.passMark ?? ''} onChange={e => patch(s._id, { passMark: e.target.value })} className="w-20 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg" /></td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button onClick={() => saveSubject(s)} disabled={savingId === s._id}
                            className="text-xs bg-primary-100 text-primary-700 hover:bg-primary-200 px-3 py-1.5 rounded-lg font-medium inline-flex items-center gap-1">
                            {savingId === s._id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                          </button>
                          <button onClick={() => removeSubject(s)} className="text-slate-400 hover:text-red-500 p-1.5 ml-1"><Trash2 size={15} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add subject row */}
            <div className="grid grid-cols-12 gap-2 items-end pt-3 border-t border-slate-100">
              <div className="col-span-12 sm:col-span-4">
                <label className="text-xs font-medium text-slate-500">New subject</label>
                <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Biology"
                  className="w-full mt-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
              </div>
              <div className="col-span-6 sm:col-span-4">
                <label className="text-xs font-medium text-slate-500">Streams (optional · none = all)</label>
                <div className="mt-2"><StreamChips streams={streams} value={draft.group} onChange={v => setDraft({ ...draft, group: v })} /></div>
              </div>
              <div className="col-span-3 sm:col-span-1">
                <label className="text-xs font-medium text-slate-500">Total</label>
                <input type="number" value={draft.totalMarks} onChange={e => setDraft({ ...draft, totalMarks: e.target.value })}
                  className="w-full mt-1 px-2 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg" />
              </div>
              <div className="col-span-3 sm:col-span-1">
                <label className="text-xs font-medium text-slate-500">Pass</label>
                <input type="number" value={draft.passMark} onChange={e => setDraft({ ...draft, passMark: e.target.value })}
                  className="w-full mt-1 px-2 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg" />
              </div>
              <div className="col-span-12 sm:col-span-2">
                <Button variant="primary" icon={adding ? Loader2 : Plus} onClick={addSubject} disabled={adding} className="w-full">{adding ? 'Adding…' : 'Add'}</Button>
              </div>
            </div>
          </>
        )}

        <div className="flex items-start gap-2 text-xs text-slate-400">
          <Info size={13} className="mt-0.5 flex-shrink-0" />
          <span>Stream values must match the students' enrollment (e.g. the “Groups” category). Manage stream options in <Layers size={11} className="inline" /> Dropdown Options → Academic Streams.</span>
        </div>
      </div>
    </Card>
  );
}
