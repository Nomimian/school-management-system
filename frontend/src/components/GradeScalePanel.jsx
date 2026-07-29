import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, GraduationCap, Loader2, Star, CheckCircle2 } from 'lucide-react';
import { gradeScaleAPI } from '../services/api';
import { Card, Button, useToast, useConfirm, EmptyState } from './ui';

const emptyBand = () => ({ grade: '', minMarks: 0, maxMarks: 100, gpa: '', remarks: '' });

/**
 * Manage Grades — configurable grade scales (bands of percentage → grade/GPA).
 * The scale flagged "default" drives grading everywhere: marks entry, exam
 * reports and report cards. Shared by the Exams page and Settings.
 */
export default function GradeScalePanel() {
  const toast = useToast();
  const confirm = useConfirm();
  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSaving] = useState(null);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await gradeScaleAPI.getAll(); setScales(r.data || []); }
    catch (e) { toast.error(e.message || 'Could not load grade scales'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const patch = (id, changes) => setScales(ss => ss.map(s => s._id === id ? { ...s, ...changes } : s));
  const patchBand = (id, idx, changes) => setScales(ss => ss.map(s =>
    s._id === id ? { ...s, scales: s.scales.map((b, i) => i === idx ? { ...b, ...changes } : b) } : s));
  const addBand = (id) => setScales(ss => ss.map(s => s._id === id ? { ...s, scales: [...(s.scales || []), emptyBand()] } : s));
  const removeBand = (id, idx) => setScales(ss => ss.map(s => s._id === id ? { ...s, scales: s.scales.filter((_, i) => i !== idx) } : s));

  const clean = (bands) => (bands || [])
    .filter(b => String(b.grade).trim())
    .map(b => ({
      grade: String(b.grade).trim(),
      minMarks: Number(b.minMarks) || 0,
      maxMarks: Number(b.maxMarks) || 0,
      gpa: b.gpa === '' || b.gpa === null ? undefined : Number(b.gpa),
      remarks: b.remarks || '',
    }));

  const saveScale = async (s) => {
    if (!clean(s.scales).length) return toast.error('Add at least one grade band.');
    setSaving(s._id);
    try {
      await gradeScaleAPI.update(s._id, { name: s.name, scales: clean(s.scales), isDefault: s.isDefault });
      toast.success('Grade scale saved');
      load();
    } catch (e) { toast.error(e.message || 'Could not save'); }
    finally { setSaving(null); }
  };

  const makeDefault = async (s) => {
    try { await gradeScaleAPI.update(s._id, { isDefault: true }); toast.success(`“${s.name}” is now the default`); load(); }
    catch (e) { toast.error(e.message); }
  };

  const addScale = async () => {
    setAdding(true);
    try {
      const r = await gradeScaleAPI.create({ name: `Scale ${scales.length + 1}`, scales: [emptyBand()] });
      setScales(ss => [...ss, r.data]);
      toast.success('Scale added');
    } catch (e) { toast.error(e.message); }
    finally { setAdding(false); }
  };

  const removeScale = async (s) => {
    if (!(await confirm({ title: 'Delete grade scale?', message: `Remove “${s.name}”?`, tone: 'danger', confirmText: 'Delete' }))) return;
    try { await gradeScaleAPI.delete(s._id); setScales(ss => ss.filter(x => x._id !== s._id)); toast.success('Deleted'); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <Card>
      <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap size={18} className="text-primary-600" />
            <h3 className="font-display font-bold text-slate-800">Manage Grades</h3>
          </div>
          <p className="text-sm text-slate-500 mt-1">Define percentage bands → grade, GPA and remark. The <b>default</b> scale is applied automatically across marks entry, exam reports and report cards.</p>
        </div>
        <Button variant="primary" size="sm" icon={adding ? Loader2 : Plus} onClick={addScale} disabled={adding}>Add Scale</Button>
      </div>

      <div className="p-5 space-y-5">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-6 justify-center"><Loader2 className="animate-spin" size={16} /> Loading…</div>
        ) : scales.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No grade scales yet" subtitle="Add your first scale to start grading." />
        ) : scales.map(s => (
          <div key={s._id} className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex-wrap">
              <div className="flex items-center gap-2">
                <input value={s.name || ''} onChange={e => patch(s._id, { name: e.target.value })}
                  className="font-semibold text-slate-800 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-primary-400 px-1 py-0.5" />
                {s.isDefault
                  ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full"><Star size={11} className="fill-emerald-500 text-emerald-500" /> Default</span>
                  : <button onClick={() => makeDefault(s)} className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-primary-600 border border-slate-200 hover:border-primary-200 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} /> Set default</button>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => saveScale(s)} disabled={savingId === s._id}
                  className="text-xs bg-primary-100 text-primary-700 hover:bg-primary-200 px-3 py-1.5 rounded-lg font-medium inline-flex items-center gap-1">
                  {savingId === s._id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                </button>
                <button onClick={() => removeScale(s)} className="text-slate-400 hover:text-red-500 p-1.5"><Trash2 size={15} /></button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider bg-white">
                    <th className="px-4 py-2">Grade</th>
                    <th className="px-4 py-2">Min %</th>
                    <th className="px-4 py-2">Max %</th>
                    <th className="px-4 py-2">GPA</th>
                    <th className="px-4 py-2">Remark</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {(s.scales || []).map((b, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-3 py-2"><input value={b.grade || ''} onChange={e => patchBand(s._id, i, { grade: e.target.value })} className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg" placeholder="A+" /></td>
                      <td className="px-3 py-2"><input type="number" value={b.minMarks ?? ''} onChange={e => patchBand(s._id, i, { minMarks: e.target.value })} className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg" /></td>
                      <td className="px-3 py-2"><input type="number" value={b.maxMarks ?? ''} onChange={e => patchBand(s._id, i, { maxMarks: e.target.value })} className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg" /></td>
                      <td className="px-3 py-2"><input type="number" step="0.1" value={b.gpa ?? ''} onChange={e => patchBand(s._id, i, { gpa: e.target.value })} className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg" placeholder="4.0" /></td>
                      <td className="px-3 py-2"><input value={b.remarks || ''} onChange={e => patchBand(s._id, i, { remarks: e.target.value })} className="w-full min-w-[8rem] px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg" placeholder="Outstanding" /></td>
                      <td className="px-3 py-2 text-right"><button onClick={() => removeBand(s._id, i)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-slate-100">
              <button onClick={() => addBand(s._id)} className="text-xs text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1"><Plus size={13} /> Add band</button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
