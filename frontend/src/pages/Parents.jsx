import { useState, useEffect } from 'react';
import {
  UserPlus, Trash2, KeyRound, Loader2, Search, X, Mail, Pencil, Users2, ShieldCheck,
} from 'lucide-react';
import {
  SectionHeader, Card, Button, Input, Modal, Badge, useToast, useConfirm,
} from '../components/ui';
import { useAuth } from '../hooks/useAuth.jsx';
import { parentAdminAPI, studentAPI } from '../services/api';

const empty = { name: '', email: '', phone: '', password: '', children: [] };

export default function Parents() {
  const { user: me } = useAuth();
  const toast   = useToast();
  const confirm = useConfirm();

  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit]       = useState(null);
  const [pwFor, setPwFor]     = useState(null);
  const [form, setForm]       = useState(empty);
  const [pw, setPw]           = useState('');
  const [err, setErr]         = useState('');

  const load = async () => {
    setLoading(true);
    try { const r = await parentAdminAPI.getAll(); setParents(r.data || []); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openAdd  = () => { setForm(empty); setErr(''); setAddOpen(true); };
  const openEdit = (p) => {
    setEdit(p);
    setForm({ name: p.name, email: p.email, phone: p.phone || '', password: '',
      children: (p.children || []).map(c => ({ _id: c._id, name: c.name, class: c.class, section: c.section })) });
    setErr('');
  };

  const createParent = async () => {
    setErr('');
    if (!form.name.trim() || !form.email.trim()) return setErr('Name and email are required.');
    if (form.password.length < 6) return setErr('Password must be at least 6 characters.');
    if (!form.children.length) return setErr('Link at least one child.');
    setBusy(true);
    try {
      await parentAdminAPI.create({
        name: form.name, email: form.email, phone: form.phone, password: form.password,
        children: form.children.map(c => c._id),
      });
      toast.success('Parent account created'); setAddOpen(false); await load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const saveEdit = async () => {
    setErr(''); setBusy(true);
    try {
      await parentAdminAPI.update(edit._id, {
        name: form.name, phone: form.phone, children: form.children.map(c => c._id),
      });
      toast.success('Parent updated'); setEdit(null); await load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const savePw = async () => {
    setErr('');
    if (pw.length < 6) return setErr('Password must be at least 6 characters.');
    setBusy(true);
    try { await parentAdminAPI.resetPassword(pwFor._id, { newPassword: pw }); toast.success('Password reset'); setPwFor(null); setPw(''); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const toggleActive = async (p) => {
    try { await parentAdminAPI.update(p._id, { isActive: !p.isActive }); await load(); toast.success(p.isActive ? 'Deactivated' : 'Activated'); }
    catch (e) { toast.error(e.message); }
  };

  const remove = async (p) => {
    if (!(await confirm({ title: 'Remove parent', message: `Remove ${p.name}'s login? They will lose portal access.`, confirmText: 'Remove', tone: 'danger' }))) return;
    try { await parentAdminAPI.delete(p._id); await load(); toast.success('Parent removed'); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Parent Accounts" subtitle="Create parent portal logins and link them to their children"
        action={<Button variant="primary" icon={UserPlus} onClick={openAdd}>Add Parent</Button>}/>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 py-12 justify-center"><Loader2 size={16} className="animate-spin"/> Loading parents…</div>
        ) : parents.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users2 size={30} className="mx-auto mb-3 text-slate-300"/>
            No parent accounts yet. Click “Add Parent” to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-left">
                  {['Parent', 'Linked children', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parents.map(p => (
                  <tr key={p._id} className="border-b border-slate-50 last:border-0 hover:bg-primary-50/40 align-top">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-purple-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-700 truncate">{p.name}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 truncate"><Mail size={11}/> {p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {(p.children || []).length === 0 && <span className="text-xs text-slate-400">No children linked</span>}
                        {(p.children || []).map(c => (
                          <Badge key={c._id} variant="blue">{c.name} · {c.class}{c.section ? `-${c.section}` : ''}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${p.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}/>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <IconBtn title="Edit / link children" icon={Pencil} onClick={() => openEdit(p)}/>
                        <IconBtn title="Reset password" icon={KeyRound} onClick={() => { setPwFor(p); setPw(''); setErr(''); }}/>
                        <IconBtn title={p.isActive ? 'Deactivate' : 'Activate'} icon={p.isActive ? X : ShieldCheck} onClick={() => toggleActive(p)} className={p.isActive ? 'hover:text-amber-600' : 'hover:text-emerald-600'}/>
                        <IconBtn title="Remove" icon={Trash2} onClick={() => remove(p)} className="hover:text-red-600"/>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add parent */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Parent Account" size="lg">
        {err && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2.5 text-sm mb-4">{err}</div>}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Parent Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mr. Ahmed Raza"/>
            <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/>
            <Input label="Email (login) *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/>
            <Input label="Temporary Password *" type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters"/>
          </div>
          <ChildPicker selected={form.children} onChange={children => setForm({ ...form, children })}/>
          <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700 flex items-start gap-2">
            <ShieldCheck size={14} className="mt-0.5 flex-shrink-0"/>
            The parent will only ever see the children linked here — never any other student.
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="primary" icon={busy ? Loader2 : UserPlus} loading={busy} onClick={createParent}>Create Parent</Button>
        </div>
      </Modal>

      {/* Edit parent */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit Parent" size="lg">
        {err && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2.5 text-sm mb-4">{err}</div>}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Parent Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/>
            <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/>
            <Input label="Email" value={form.email} disabled className="opacity-60"/>
          </div>
          <ChildPicker selected={form.children} onChange={children => setForm({ ...form, children })}/>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
          <Button variant="primary" loading={busy} onClick={saveEdit}>Save Changes</Button>
        </div>
      </Modal>

      {/* Reset password */}
      <Modal open={!!pwFor} onClose={() => setPwFor(null)} title={`Reset password — ${pwFor?.name || ''}`} size="sm">
        {err && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2.5 text-sm mb-4">{err}</div>}
        <Input label="New Password" type="text" value={pw} onChange={e => setPw(e.target.value)} placeholder="At least 6 characters"/>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setPwFor(null)}>Cancel</Button>
          <Button variant="primary" icon={KeyRound} loading={busy} onClick={savePw}>Reset Password</Button>
        </div>
      </Modal>
    </div>
  );
}

// ── Searchable student multi-select ──────────────────────────────────────────
function ChildPicker({ selected, onChange }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try { const r = await studentAPI.getAll({ search: term, limit: 8 }); setResults(r.data || []); }
      catch { setResults([]); }
      finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const add = (s) => { if (!selected.some(c => c._id === s._id)) onChange([...selected, { _id: s._id, name: s.name, class: s.class, section: s.section }]); setQ(''); setResults([]); };
  const remove = (id) => onChange(selected.filter(c => c._id !== id));

  return (
    <div>
      <label className="text-sm font-medium text-slate-700 block mb-1.5">Linked Children *</label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(c => (
            <span key={c._id} className="inline-flex items-center gap-1.5 bg-primary-600 text-white text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-full">
              {c.name} · {c.class}{c.section ? `-${c.section}` : ''}
              <button onClick={() => remove(c._id)} className="hover:bg-white/20 rounded-full p-0.5"><X size={12}/></button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search students by name to link…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200"/>
        {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin"/>}
        {results.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-float max-h-56 overflow-y-auto scrollbar-thin">
            {results.map(s => (
              <button key={s._id} onClick={() => add(s)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary-50 text-left border-b border-slate-50 last:border-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-white text-xs font-bold">{s.name.charAt(0)}</div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">{s.name}</div>
                  <div className="text-xs text-slate-400">{s.class}{s.section ? `-${s.section}` : ''} · {s.rollNumber || s.studentId || '—'}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({ icon: Icon, title, onClick, className = '' }) {
  return (
    <button title={title} onClick={onClick}
      className={`p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors ${className}`}>
      <Icon size={15}/>
    </button>
  );
}
