import { useState, useEffect } from 'react';
import {
  UserPlus, Trash2, KeyRound, Loader2, ShieldCheck, Power, Mail, Pencil,
} from 'lucide-react';
import { Card, Button, Input, Select, Modal, Badge, useToast, useConfirm } from './ui';
import { useAuth } from '../hooks/useAuth.jsx';
import { ROLE_LABEL } from '../config/access.js';
import { userAPI } from '../services/api';

// The principal (the school's single top account) creates staff logins only —
// never another principal/admin. Mirrors ASSIGNABLE_ROLES on the backend.
const ASSIGNABLE = ['accountant', 'teacher', 'frontdesk'];
const ROLE_BADGE = {
  admin: 'purple', principal: 'blue', accountant: 'green', teacher: 'teal', frontdesk: 'orange',
};

const emptyForm = { name: '', email: '', role: 'teacher', phone: '', password: '' };

export default function UsersPanel() {
  const { user: me } = useAuth();
  const toast   = useToast();
  const confirm = useConfirm();

  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);

  const [addOpen, setAddOpen]   = useState(false);
  const [editUser, setEditUser] = useState(null);   // user being edited
  const [pwUser, setPwUser]     = useState(null);    // user whose pw is being reset
  const [form, setForm]         = useState(emptyForm);
  const [pw, setPw]             = useState('');
  const [err, setErr]           = useState('');

  const load = async () => {
    setLoading(true);
    try { const res = await userAPI.getAll(); setUsers(res.data || []); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(emptyForm); setErr(''); setAddOpen(true); };
  const openEdit = (u) => { setEditUser(u); setForm({ name: u.name, email: u.email, role: u.role, phone: u.phone || '', password: '' }); setErr(''); };
  const openPw  = (u) => { setPwUser(u); setPw(''); setErr(''); };

  const createUser = async () => {
    setErr('');
    if (!form.name.trim() || !form.email.trim()) return setErr('Name and email are required.');
    if (form.password.length < 6) return setErr('Password must be at least 6 characters.');
    setBusy(true);
    try {
      await userAPI.create({ name: form.name, email: form.email, role: form.role, phone: form.phone, password: form.password });
      toast.success(`${form.name} added as ${ROLE_LABEL[form.role]}`);
      setAddOpen(false); await load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const saveEdit = async () => {
    setErr(''); setBusy(true);
    try {
      await userAPI.update(editUser._id, { name: form.name, phone: form.phone, role: form.role });
      toast.success('User updated'); setEditUser(null); await load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const savePw = async () => {
    setErr('');
    if (pw.length < 6) return setErr('Password must be at least 6 characters.');
    setBusy(true);
    try {
      await userAPI.resetPassword(pwUser._id, { newPassword: pw });
      toast.success(`Password reset for ${pwUser.name}`); setPwUser(null);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const toggleActive = async (u) => {
    try { await userAPI.update(u._id, { isActive: !u.isActive }); await load(); toast.success(u.isActive ? 'Account deactivated' : 'Account activated'); }
    catch (e) { toast.error(e.message); }
  };

  const removeUser = async (u) => {
    const ok = await confirm({ title: 'Remove user', message: `Permanently remove ${u.name} (${u.email})? They will no longer be able to sign in.`, confirmText: 'Remove', tone: 'danger' });
    if (!ok) return;
    try { await userAPI.delete(u._id); await load(); toast.success('User removed'); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display font-bold text-slate-800 text-lg">Team & Staff Accounts</h3>
        <Button variant="primary" icon={UserPlus} onClick={openAdd}>Add User</Button>
      </div>
      <p className="text-slate-400 text-sm mb-5">
        Give colleagues their own login. Each account belongs only to this school, and its role
        controls exactly which sections it can access.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-10 justify-center"><Loader2 size={16} className="animate-spin"/> Loading team…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-left">
                {['User', 'Role', 'Status', 'Last login', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isSelf = String(u._id) === String(me?.id);
                return (
                  <tr key={u._id} className="border-b border-slate-50 last:border-0 hover:bg-primary-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-700 truncate">{u.name} {isSelf && <span className="text-[10px] text-slate-400">(you)</span>}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 truncate"><Mail size={11}/> {u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant={ROLE_BADGE[u.role] || 'gray'}>{ROLE_LABEL[u.role] || u.role}</Badge></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${u.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}/>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <IconBtn title="Edit" onClick={() => openEdit(u)} icon={Pencil}/>
                        <IconBtn title="Reset password" onClick={() => openPw(u)} icon={KeyRound}/>
                        {!isSelf && <IconBtn title={u.isActive ? 'Deactivate' : 'Activate'} onClick={() => toggleActive(u)} icon={Power} className={u.isActive ? 'hover:text-amber-600' : 'hover:text-emerald-600'}/>}
                        {!isSelf && <IconBtn title="Remove" onClick={() => removeUser(u)} icon={Trash2} className="hover:text-red-600"/>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-400">No staff accounts yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Add user */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Staff Account">
        {err && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2.5 text-sm mb-4">{err}</div>}
        <div className="space-y-4">
          <Input label="Full Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sara Khan"/>
          <Input label="Email (login) *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="sara@school.edu"/>
          <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/>
          <Select label="Role *" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            {ASSIGNABLE.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </Select>
          <Input label="Temporary Password *" type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters"/>
          <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700 flex items-start gap-2">
            <ShieldCheck size={14} className="mt-0.5 flex-shrink-0"/>
            Share this password with the staff member. They can change it later under Settings → Security.
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="primary" icon={busy ? Loader2 : UserPlus} loading={busy} onClick={createUser}>Create Account</Button>
        </div>
      </Modal>

      {/* Edit user */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        {err && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2.5 text-sm mb-4">{err}</div>}
        <div className="space-y-4">
          <Input label="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/>
          <Input label="Email" value={form.email} disabled className="opacity-60"/>
          <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/>
          <Select label="Role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} disabled={String(editUser?._id) === String(me?.id)}>
            {ASSIGNABLE.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </Select>
          {String(editUser?._id) === String(me?.id) && <p className="text-xs text-slate-400">You cannot change your own role.</p>}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setEditUser(null)}>Cancel</Button>
          <Button variant="primary" loading={busy} onClick={saveEdit}>Save Changes</Button>
        </div>
      </Modal>

      {/* Reset password */}
      <Modal open={!!pwUser} onClose={() => setPwUser(null)} title={`Reset password — ${pwUser?.name || ''}`} size="sm">
        {err && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2.5 text-sm mb-4">{err}</div>}
        <Input label="New Password" type="text" value={pw} onChange={e => setPw(e.target.value)} placeholder="At least 6 characters"/>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setPwUser(null)}>Cancel</Button>
          <Button variant="primary" icon={KeyRound} loading={busy} onClick={savePw}>Reset Password</Button>
        </div>
      </Modal>
    </Card>
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
