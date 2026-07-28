import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, DollarSign, Loader2, Info } from 'lucide-react';
import { feeHeadAPI, schoolAPI } from '../services/api';
import { useSchool } from '../hooks/useSchool.jsx';
import { Card, Button, Input, Switch, Dropdown, useToast, useConfirm, EmptyState } from './ui';

const FREQ = ['Monthly', 'One-Time', 'Optional'];
const FREQ_HELP = {
  Monthly:   'Billed on every monthly challan (e.g. Tuition, AC).',
  'One-Time':'Charged once, at admission (e.g. Admission / Registration).',
  Optional:  'Not billed automatically — you add it to a specific month from the Challan Generator (e.g. an Exam / Test fee).',
};

/**
 * Fee Configuration — the master list of fee heads (types) a school charges.
 * This drives both the student fee table and the monthly challan generator.
 */
export default function FeeConfigPanel() {
  const toast = useToast();
  const confirm = useConfirm();
  const { school, refresh: refreshSchool } = useSchool();

  const [heads, setHeads]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSaving] = useState(null);
  const [adding, setAdding]   = useState(false);
  const [newHead, setNewHead] = useState({ name: '', amount: '', frequency: 'Monthly' });

  const [autoGen, setAutoGen] = useState(true);
  const [dueDay, setDueDay]   = useState(10);
  const [savingSchool, setSavingSchool] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await feeHeadAPI.getAll();
      setHeads(res.data || []);
    } catch (e) { toast.error(e.message || 'Could not load fee heads'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (school) {
      setAutoGen(school.autoGenerateChallans !== false);
      setDueDay(school.feeDay || 10);
    }
  }, [school]);

  const patchLocal = (id, changes) => setHeads(hs => hs.map(h => h._id === id ? { ...h, ...changes } : h));

  const saveHead = async (h) => {
    if (!h.name?.trim()) return toast.error('Name is required.');
    setSaving(h._id);
    try {
      await feeHeadAPI.update(h._id, { name: h.name.trim(), amount: Number(h.amount) || 0, frequency: h.frequency, isActive: h.isActive });
      toast.success('Saved');
    } catch (e) { toast.error(e.message || 'Could not save'); }
    finally { setSaving(null); }
  };

  const addHead = async () => {
    if (!newHead.name.trim()) return toast.error('Enter a fee head name.');
    setAdding(true);
    try {
      const res = await feeHeadAPI.create({ name: newHead.name.trim(), amount: Number(newHead.amount) || 0, frequency: newHead.frequency, order: heads.length });
      setHeads(hs => [...hs, res.data]);
      setNewHead({ name: '', amount: '', frequency: 'Monthly' });
      toast.success('Fee head added');
    } catch (e) { toast.error(e.message || 'Could not add'); }
    finally { setAdding(false); }
  };

  const removeHead = async (h) => {
    if (!(await confirm({ title: 'Delete fee head?', message: `Remove “${h.name}” from your fee configuration? Existing challans are not affected.`, tone: 'danger', confirmText: 'Delete' }))) return;
    try {
      await feeHeadAPI.delete(h._id);
      setHeads(hs => hs.filter(x => x._id !== h._id));
      toast.success('Deleted');
    } catch (e) { toast.error(e.message || 'Could not delete'); }
  };

  const saveSchool = async () => {
    setSavingSchool(true);
    try {
      await schoolAPI.update({ autoGenerateChallans: autoGen, feeDay: Number(dueDay) || 10 });
      await refreshSchool?.();
      toast.success('Automation settings saved');
    } catch (e) { toast.error(e.message || 'Could not save'); }
    finally { setSavingSchool(false); }
  };

  return (
    <div className="space-y-5">
      {/* Automation */}
      <Card>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0"><DollarSign size={20}/></div>
              <div>
                <h3 className="font-display font-bold text-slate-800">Monthly Challan Automation</h3>
                <p className="text-sm text-slate-500 mt-0.5 max-w-lg">When on, each active student's monthly challan is created automatically at the start of every month (self-heals if the server was offline on the 1st). You can always generate manually from the Challan Generator.</p>
              </div>
            </div>
            <Switch checked={autoGen} onChange={setAutoGen} />
          </div>
          <div className="flex items-end gap-3 mt-4 pl-13">
            <div className="w-40">
              <Input label="Fee due day (of month)" type="number" min="1" max="28" value={dueDay} onChange={e => setDueDay(e.target.value)} />
            </div>
            <Button variant="primary" size="sm" icon={savingSchool ? Loader2 : Save} onClick={saveSchool} disabled={savingSchool}>
              {savingSchool ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Fee heads */}
      <Card>
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-display font-bold text-slate-800">Fee Heads</h3>
          <p className="text-sm text-slate-500 mt-0.5">The fee types your school charges. These feed the student fee table and the challan generator. The base amount is the same for every class — per-student concessions are set as a discount on each student.</p>
        </div>

        <div className="p-5 space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-6 justify-center"><Loader2 className="animate-spin" size={16}/> Loading…</div>
          ) : heads.length === 0 ? (
            <EmptyState icon={DollarSign} title="No fee heads yet" subtitle="Add your first fee head below (e.g. Tuition Fee)." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-2 py-2">Fee Head</th>
                    <th className="px-2 py-2 w-40">Base Amount (Rs)</th>
                    <th className="px-2 py-2 w-44">Frequency</th>
                    <th className="px-2 py-2 w-24 text-center">Active</th>
                    <th className="px-2 py-2 w-28 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {heads.map(h => (
                    <tr key={h._id} className="border-t border-slate-50">
                      <td className="px-2 py-2">
                        <input value={h.name} onChange={e => patchLocal(h._id, { name: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"/>
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" value={h.amount} onChange={e => patchLocal(h._id, { amount: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"/>
                      </td>
                      <td className="px-2 py-2">
                        <Dropdown value={h.frequency} onChange={e => patchLocal(h._id, { frequency: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200" title={FREQ_HELP[h.frequency]}>
                          {FREQ.map(f => <option key={f}>{f}</option>)}
                        </Dropdown>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <div className="flex justify-center"><Switch checked={h.isActive !== false} onChange={v => patchLocal(h._id, { isActive: v })} size="sm"/></div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => saveHead(h)} disabled={savingId === h._id}
                            className="text-xs bg-primary-100 text-primary-700 hover:bg-primary-200 px-2.5 py-1.5 rounded-lg font-medium inline-flex items-center gap-1">
                            {savingId === h._id ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>} Save
                          </button>
                          <button onClick={() => removeHead(h)} className="text-slate-400 hover:text-red-500 p-1.5"><Trash2 size={15}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 pt-3 border-t border-slate-100">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500">New fee head</label>
              <input value={newHead.name} onChange={e => setNewHead({ ...newHead, name: e.target.value })} placeholder="e.g. Transport Fee"
                className="w-full mt-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"/>
            </div>
            <div className="w-full sm:w-36">
              <label className="text-xs font-medium text-slate-500">Amount</label>
              <input type="number" value={newHead.amount} onChange={e => setNewHead({ ...newHead, amount: e.target.value })} placeholder="0"
                className="w-full mt-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"/>
            </div>
            <div className="w-full sm:w-40">
              <label className="text-xs font-medium text-slate-500">Frequency</label>
              <Dropdown value={newHead.frequency} onChange={e => setNewHead({ ...newHead, frequency: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
                {FREQ.map(f => <option key={f}>{f}</option>)}
              </Dropdown>
            </div>
            <Button variant="primary" icon={adding ? Loader2 : Plus} onClick={addHead} disabled={adding}>{adding ? 'Adding…' : 'Add'}</Button>
          </div>

          <div className="flex items-start gap-2 text-xs text-slate-400 pt-1">
            <Info size={13} className="mt-0.5 flex-shrink-0"/>
            <span><strong>Monthly</strong> → every challan · <strong>One-Time</strong> → admission only · <strong>Optional</strong> → add per month in the generator (e.g. exam fee).</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
