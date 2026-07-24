import { useState, useEffect } from 'react';
import { Plus, Search, Users, UserCheck, Wallet, Pencil, Eye } from 'lucide-react';
import { staffAPI } from '../services/api';
import { SectionHeader, Card, Badge, Button, Modal, Input, Avatar, StatCard, TableSkeleton, EmptyState, useToast, useConfirm, Dropdown } from '../components/ui';

const roleColors = { Principal:'purple', 'Vice Principal':'blue', Accountant:'green', Librarian:'orange', 'IT Admin':'teal', Receptionist:'gray', Peon:'gray', Nurse:'red', Security:'gray', Clerk:'blue', Other:'gray' };
const ROLES = ['Principal','Vice Principal','Accountant','Librarian','IT Admin','Receptionist','Peon','Nurse','Security','Clerk','Other'];
const EMPTY = { name:'', role:'', department:'', salary:'', joinDate:'', status:'Active', gender:'Male', phone:'', email:'' };

function Field({ label, children, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <div className="text-xs text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="font-medium text-slate-700 mt-1">{children}</div>
    </div>
  );
}

export default function HR() {
  const toast = useToast();
  const confirm = useConfirm();
  const [staff, setStaff]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [form, setForm]       = useState(EMPTY);

  const fetchStaff = async () => {
    setLoading(true);
    try { const res = await staffAPI.getAll(); setStaff(res.data||[]); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetchStaff(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (s) => {
    setEditing(s._id);
    setForm({ name:s.name||'', role:s.role||'', department:s.department||'', salary:s.salary??'', joinDate:s.joinDate?.slice(0,10)||'', status:s.status||'Active', gender:s.gender||'Male', phone:s.phone||'', email:s.email||'' });
    setModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, salary:Number(form.salary) };
      if (editing) { await staffAPI.update(editing, payload); toast.success('Staff updated'); }
      else { await staffAPI.create(payload); toast.success('Staff added'); }
      setModal(false); fetchStaff();
    }
    catch(e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!(await confirm({ title:'Remove staff member?', message:'This permanently removes the staff record.', tone:'danger', confirmText:'Remove' }))) return;
    try { await staffAPI.delete(id); fetchStaff(); toast.success('Staff removed'); }
    catch(e) { toast.error(e.message); }
  };

  const q = search.toLowerCase();
  const filtered = staff.filter(s => (s.name||'').toLowerCase().includes(q) || (s.role||'').toLowerCase().includes(q));
  const totalPayroll = staff.filter(s=>s.status==='Active').reduce((a,s) => a+(s.salary||0),0);

  return (
    <div className="space-y-5">
      <SectionHeader title="HR Management" subtitle={`${staff.length} staff members`}
        action={<Button variant="primary" size="sm" icon={Plus} onClick={openAdd}>Add Staff</Button>}/>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={Users}     label="Total Staff"     value={staff.length} color="blue" />
        <StatCard icon={UserCheck} label="Active"          value={staff.filter(s=>s.status==='Active').length} color="green" />
        <StatCard icon={Wallet}    label="Monthly Payroll" value={`Rs ${(totalPayroll/1000).toFixed(0)}K`} color="purple" />
      </div>
      <Card>
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff…"
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200"/>
          </div>
        </div>
        {loading ? <TableSkeleton rows={6} cols={6} /> : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No staff found"
            subtitle={search ? 'Try a different search term.' : 'Add your first staff member to get started.'}
            action={<Button variant="primary" size="sm" icon={Plus} onClick={openAdd}>Add Staff</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 bg-slate-50/50">{['Staff Member','Role','Department','Salary','Join Date','Status','Action'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s._id} className="border-b border-slate-50 hover:bg-blue-50/40">
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={s.name} size="md"/><div><div className="font-medium text-slate-800">{s.name}</div><div className="text-xs text-slate-400">{s.staffId}</div></div></div></td>
                    <td className="px-4 py-3"><Badge variant={roleColors[s.role]||'gray'}>{s.role}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{s.department}</td>
                    <td className="px-4 py-3 font-medium">Rs {s.salary?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{s.joinDate?.slice(0,10)}</td>
                    <td className="px-4 py-3"><Badge variant={s.status==='Active'?'green':'red'} dot>{s.status}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={()=>setViewItem(s)} className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-1 rounded-lg font-medium inline-flex items-center gap-1"><Eye size={11}/>View</button>
                        <button onClick={()=>openEdit(s)} className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-1 rounded-lg font-medium inline-flex items-center gap-1"><Pencil size={11}/>Edit</button>
                        <button onClick={()=>remove(s._id)} className="text-xs bg-red-50 text-red-500 hover:bg-red-100 px-2.5 py-1 rounded-lg font-medium">Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Staff Member' : 'Add Staff Member'} size="md">
        <div className="space-y-4">
          <Input label="Full Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Staff full name"/>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Role</label>
              <Dropdown value={form.role} onChange={e=>setForm({...form,role:e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option value="">Select role</option>
                {ROLES.map(r=><option key={r}>{r}</option>)}
              </Dropdown>
            </div>
            <Input label="Department" value={form.department} onChange={e=>setForm({...form,department:e.target.value})} placeholder="e.g. Finance"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Salary" type="number" value={form.salary} onChange={e=>setForm({...form,salary:e.target.value})}/>
            <Input label="Join Date" type="date" value={form.joinDate} onChange={e=>setForm({...form,joinDate:e.target.value})}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="03XX-XXXXXXX"/>
            <Input label="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="name@school.com"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Gender</label>
              <Dropdown value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option>Male</option><option>Female</option>
              </Dropdown>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Status</label>
              <Dropdown value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option>Active</option><option>Inactive</option>
              </Dropdown>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={saving}>{editing ? 'Save Changes' : 'Add Staff'}</Button>
          </div>
        </div>
      </Modal>

      {viewItem && (
        <Modal open onClose={() => setViewItem(null)} title="Staff Details" size="md">
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <Avatar name={viewItem.name} size="lg"/>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-slate-800 text-lg leading-tight">{viewItem.name}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <Badge variant={roleColors[viewItem.role]||'gray'}>{viewItem.role||'—'}</Badge>
                  <Badge variant={viewItem.status==='Active'?'green':'red'} dot>{viewItem.status}</Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name">{viewItem.name||'—'}</Field>
              <Field label="Role"><Badge variant={roleColors[viewItem.role]||'gray'}>{viewItem.role||'—'}</Badge></Field>
              <Field label="Department">{viewItem.department||'—'}</Field>
              <Field label="Status"><Badge variant={viewItem.status==='Active'?'green':'red'} dot>{viewItem.status}</Badge></Field>
              <Field label="Salary">Rs {viewItem.salary?.toLocaleString()||'—'}</Field>
              <Field label="Gender">{viewItem.gender||'—'}</Field>
              <Field label="Phone">{viewItem.phone||'—'}</Field>
              <Field label="Email"><span className="break-all">{viewItem.email||'—'}</span></Field>
              <Field label="Staff ID"><span className="font-mono text-xs">{viewItem.staffId||'—'}</span></Field>
              <Field label="Join Date">{viewItem.joinDate?.slice(0,10)||'—'}</Field>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
