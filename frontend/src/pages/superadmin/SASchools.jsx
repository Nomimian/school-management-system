import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Eye, Edit2, Trash2, Loader2, Building2,
  ToggleLeft, ToggleRight, Key, LogIn, CreditCard,
  CheckCircle, XCircle, AlertTriangle, RefreshCw, Filter
} from 'lucide-react';
import { saAPI } from '../../services/saApi.js';
import { useSA } from '../../hooks/useSA.jsx';
import { useToast, useConfirm, Dropdown } from '../../components/ui';

const PLAN_COLORS  = { trial:'gray', basic:'blue', pro:'purple', enterprise:'orange' };
const PLAN_LABELS  = { trial:'Free Trial', basic:'Basic', pro:'Pro', enterprise:'Enterprise' };
const STATUS_ICONS = { active:<CheckCircle size={13} className="text-emerald-500"/>, inactive:<XCircle size={13} className="text-red-400"/>, expiring:<AlertTriangle size={13} className="text-orange-400"/> };

function Badge({ children, variant='blue' }) {
  const v = { blue:'bg-blue-100 text-blue-700', gray:'bg-slate-100 text-slate-600', green:'bg-emerald-100 text-emerald-700', purple:'bg-purple-100 text-purple-700', orange:'bg-amber-100 text-amber-700', red:'bg-red-100 text-red-600' };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${v[variant]||v.blue}`}>{children}</span>;
}

function Modal({ open, onClose, title, children, size='md' }) {
  if (!open) return null;
  const sizes = { sm:'max-w-sm', md:'max-w-lg', lg:'max-w-2xl', xl:'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`bg-white rounded-3xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">✕</button>
        </div>
        <div className="overflow-y-auto p-6 flex-1">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-semibold text-slate-700">{label}</label>}
      <input {...props}
        className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 bg-slate-50 focus:bg-white placeholder:text-slate-400"/>
    </div>
  );
}

const emptyForm = {
  schoolName:'', city:'', phone:'', email:'', address:'',
  adminName:'', adminEmail:'', adminPassword:'',
  plan:'trial', licenseMonths:12,
};

export default function SASchools() {
  const { impersonate }         = useSA();
  const toast                   = useToast();
  const confirm                 = useConfirm();
  const [schools, setSchools]   = useState([]);
  const [plans, setPlans]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterPlan, setFPlan]  = useState('');
  const [filterStatus, setFStatus] = useState('');
  const [page, setPage]         = useState(1);

  const [createModal, setCreateModal] = useState(false);
  const [viewModal, setViewModal]     = useState(false);
  const [editModal, setEditModal]     = useState(false);
  const [planModal, setPlanModal]     = useState(false);
  const [pwModal, setPwModal]         = useState(false);
  const [confirmDel, setConfirmDel]   = useState(null);

  const [selected, setSelected]     = useState(null);
  const [form, setForm]             = useState({...emptyForm});
  const [editForm, setEditForm]     = useState({});
  const [planForm, setPlanForm]     = useState({ planId:'pro', licenseMonths:12 });
  const [newPw, setNewPw]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [result, setResult]         = useState(null);
  const [err, setErr]               = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit:15 };
      if (search)       params.search = search;
      if (filterPlan)   params.plan   = filterPlan;
      if (filterStatus) params.status = filterStatus;
      const res = await saAPI.getSchools(params);
      setSchools(res.data||[]);
      setTotal(res.total||0);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, filterPlan, filterStatus, page]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { saAPI.getPlans().then(r=>setPlans(r.data||[])).catch(console.error); }, []);

  const createSchool = async () => {
    setSaving(true); setErr(''); setResult(null);
    try {
      const res = await saAPI.createSchool(form);
      setResult(res.data);
    } catch(e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const updateSchool = async () => {
    setSaving(true); setErr('');
    try {
      await saAPI.updateSchool(selected._id, editForm);
      setEditModal(false); fetch();
    } catch(e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (school) => {
    try {
      await saAPI.toggleSchool(school._id);
      toast.success(`${school.name} ${school.isActive ? 'deactivated' : 'activated'}`);
      fetch();
    } catch(e) { toast.error(e.message); }
  };

  const assignPlan = async () => {
    setSaving(true); setErr('');
    try {
      await saAPI.assignPlan(selected._id, planForm);
      setPlanModal(false); fetch();
    } catch(e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const resetPassword = async () => {
    if (newPw.length < 6) { setErr('Min 6 characters'); return; }
    setSaving(true); setErr('');
    try {
      await saAPI.resetPassword(selected._id, { newPassword:newPw });
      setPwModal(false); setNewPw('');
      toast.success('Password reset successfully');
    } catch(e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const deleteSchool = async (id) => {
    try { await saAPI.deleteSchool(id); setConfirmDel(null); toast.success('School deactivated'); fetch(); }
    catch(e) { toast.error(e.message); }
  };

  const openCreate = () => { setForm({...emptyForm}); setResult(null); setErr(''); setCreateModal(true); };
  const openView   = (s) => { setSelected(s); setViewModal(true); };
  const openEdit   = (s) => { setSelected(s); setEditForm({ name:s.name, city:s.city, phone:s.phone, email:s.email, address:s.address, principal:s.principal }); setErr(''); setEditModal(true); };
  const openPlan   = (s) => { setSelected(s); setPlanForm({ planId:s.plan||'trial', licenseMonths:12 }); setErr(''); setPlanModal(true); };
  const openPw     = (s) => { setSelected(s); setNewPw(''); setErr(''); setPwModal(true); };

  const getDaysLeft = (expiry) => {
    if (!expiry) return null;
    const days = Math.ceil((new Date(expiry) - new Date()) / (1000*60*60*24));
    return days;
  };

  const getStatusBadge = (school) => {
    if (!school.isActive) return <Badge variant="red">Inactive</Badge>;
    const days = getDaysLeft(school.licenseExpiry);
    if (days !== null && days <= 0) return <Badge variant="red">Expired</Badge>;
    if (days !== null && days <= 30) return <Badge variant="orange">Expiring ({days}d)</Badge>;
    return <Badge variant="green">Active</Badge>;
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Schools Management</h2>
          <p className="text-slate-400 text-sm mt-0.5">{total} schools on the platform</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-md">
          <Plus size={16}/> Add New School
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
              placeholder="Search school name, city, email…"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200"/>
          </div>
          <Dropdown value={filterPlan} onChange={e=>{setFPlan(e.target.value);setPage(1);}}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
            <option value="">All Plans</option>
            {['trial','basic','pro','enterprise'].map(p=><option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
          </Dropdown>
          <Dropdown value={filterStatus} onChange={e=>{setFStatus(e.target.value);setPage(1);}}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="expiring">Expiring Soon</option>
          </Dropdown>
          <button onClick={fetch} className="flex items-center gap-2 px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 hover:bg-white text-slate-600 transition-colors">
            <RefreshCw size={14}/> Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['School','City','Plan','Admin Email','Students','License Expiry','Status','Actions'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schools.map(s=>{
                  const days = getDaysLeft(s.licenseExpiry);
                  return (
                    <tr key={s._id} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${s.isActive?'bg-gradient-to-br from-blue-500 to-blue-700':'bg-slate-400'}`}>
                            {s.shortName?.charAt(0)||s.name?.charAt(0)||'S'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">{s.name}</div>
                            <div className="text-xs text-slate-400">{s.phone||s.email||'—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.city||'—'}</td>
                      <td className="px-4 py-3"><Badge variant={PLAN_COLORS[s.plan]||'gray'}>{PLAN_LABELS[s.plan]||s.plan}</Badge></td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{s.admin?.email||'—'}</td>
                      <td className="px-4 py-3 text-slate-600 text-center">{s.maxStudents||'—'}</td>
                      <td className="px-4 py-3">
                        {s.licenseExpiry ? (
                          <div>
                            <div className="text-xs font-medium text-slate-700">{new Date(s.licenseExpiry).toLocaleDateString('en-PK')}</div>
                            <div className={`text-[10px] font-semibold mt-0.5 ${days<=0?'text-red-500':days<=30?'text-orange-500':'text-emerald-600'}`}>
                              {days<=0 ? 'Expired' : days<=30 ? `${days} days left` : `${days} days left`}
                            </div>
                          </div>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(s)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <button onClick={()=>openView(s)} title="View Details"
                            className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors"><Eye size={14}/></button>
                          <button onClick={()=>openEdit(s)} title="Edit School"
                            className="p-1.5 rounded-lg hover:bg-orange-100 text-slate-400 hover:text-orange-600 transition-colors"><Edit2 size={14}/></button>
                          <button onClick={()=>openPlan(s)} title="Change Plan"
                            className="p-1.5 rounded-lg hover:bg-purple-100 text-slate-400 hover:text-purple-600 transition-colors"><CreditCard size={14}/></button>
                          <button onClick={()=>openPw(s)} title="Reset Password"
                            className="p-1.5 rounded-lg hover:bg-amber-100 text-slate-400 hover:text-amber-600 transition-colors"><Key size={14}/></button>
                          <button onClick={()=>impersonate(s._id)} title="Login as School Admin"
                            className="p-1.5 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 transition-colors"><LogIn size={14}/></button>
                          <button onClick={()=>toggleActive(s)} title={s.isActive?'Deactivate':'Activate'}
                            className={`p-1.5 rounded-lg transition-colors ${s.isActive?'hover:bg-red-100 text-slate-400 hover:text-red-500':'hover:bg-emerald-100 text-slate-400 hover:text-emerald-600'}`}>
                            {s.isActive?<ToggleRight size={14}/>:<ToggleLeft size={14}/>}
                          </button>
                          <button onClick={()=>setConfirmDel(s)} title="Delete"
                            className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && schools.length===0 && (
            <div className="text-center py-16">
              <Building2 size={44} className="mx-auto text-slate-200 mb-3"/>
              <p className="text-slate-400 font-medium">No schools found</p>
              <p className="text-slate-300 text-sm mt-1">Add your first school to get started</p>
              <button onClick={openCreate} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
                + Add School
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-400">Page {page} of {totalPages} · {total} schools</span>
            <div className="flex gap-2">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 text-xs font-medium">← Prev</button>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 text-xs font-medium">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* ── CREATE SCHOOL MODAL ──────────────────────────────────────────────── */}
      <Modal open={createModal} onClose={()=>{setCreateModal(false);setResult(null);setErr('');}} title="Add New School" size="lg">
        {result ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-emerald-700 font-bold mb-3"><CheckCircle size={18}/>School Created Successfully!</div>
              <div className="grid grid-cols-2 gap-3 text-sm text-emerald-600">
                <div><div className="text-xs text-emerald-400 mb-0.5">School Name</div><div className="font-semibold">{result.school?.name}</div></div>
                <div><div className="text-xs text-emerald-400 mb-0.5">Plan</div><div className="font-semibold capitalize">{result.school?.plan}</div></div>
                <div><div className="text-xs text-emerald-400 mb-0.5">Admin Email</div><div className="font-semibold">{result.admin?.email}</div></div>
                <div><div className="text-xs text-emerald-400 mb-0.5">Login URL</div><div className="font-semibold">{result.credentials?.loginUrl}</div></div>
              </div>
              <div className="mt-4 p-3 bg-white/80 rounded-xl border border-emerald-200">
                <div className="text-xs font-bold text-emerald-700 mb-2">📋 Share These Credentials With School Admin:</div>
                <div className="font-mono text-xs text-slate-700 space-y-1">
                  <div>Email: <strong>{result.credentials?.email}</strong></div>
                  <div>Password: <strong>{result.credentials?.password}</strong></div>
                  <div>URL: <strong>{result.credentials?.loginUrl}</strong></div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={()=>{setResult(null);setForm({...emptyForm});}} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Add Another</button>
              <button onClick={()=>{setCreateModal(false);setResult(null);fetch();}} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">Done</button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {err && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{err}</div>}

            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">School Information</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><Input label="School Full Name *" value={form.schoolName} onChange={e=>setForm({...form,schoolName:e.target.value})} placeholder="e.g. Beaconhouse School System Lahore"/></div>
                <Input label="City" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Lahore"/>
                <Input label="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="042-XXXXXXXX"/>
                <Input label="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="info@school.edu.pk"/>
                <div className="sm:col-span-2"><Input label="Address" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Street, Area, City"/></div>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Admin Account (School will use these to login)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Admin Full Name" value={form.adminName} onChange={e=>setForm({...form,adminName:e.target.value})} placeholder="e.g. Mr. Ahmed Khan"/>
                <Input label="Admin Email *" type="email" value={form.adminEmail} onChange={e=>setForm({...form,adminEmail:e.target.value})} placeholder="admin@school.edu.pk"/>
                <Input label="Admin Password *" type="password" value={form.adminPassword} onChange={e=>setForm({...form,adminPassword:e.target.value})} placeholder="min 6 characters"/>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Subscription Plan</div>
              <div className="grid grid-cols-2 gap-3">
                {plans.map(p=>(
                  <button key={p.id} onClick={()=>setForm({...form,plan:p.id})}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${form.plan===p.id?'border-blue-500 bg-blue-50':'border-slate-200 hover:border-slate-300 bg-white'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${form.plan===p.id?'bg-blue-600 text-white':'bg-slate-100 text-slate-600'}`}>{p.name}</span>
                      <span className="text-sm font-bold text-slate-700">
                        {p.price===0?'Free':`Rs ${p.price.toLocaleString()}/yr`}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{p.maxStudents} students · {p.maxTeachers} teachers</div>
                  </button>
                ))}
              </div>
              {form.plan !== 'trial' && (
                <div className="mt-3">
                  <Input label="License Duration (months)" type="number" value={form.licenseMonths}
                    onChange={e=>setForm({...form,licenseMonths:Number(e.target.value)})} placeholder="12"/>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button onClick={()=>setCreateModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={createSchool} disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
                {saving?<><Loader2 size={14} className="animate-spin"/>Creating…</>:<><CheckCircle size={14}/>Create School</>}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── VIEW MODAL ───────────────────────────────────────────────────────── */}
      <Modal open={viewModal} onClose={()=>setViewModal(false)} title="School Details" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold">
                {selected.shortName?.charAt(0)||selected.name?.charAt(0)||'S'}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-xl">{selected.name}</h3>
                <div className="flex gap-2 mt-1">
                  <Badge variant={PLAN_COLORS[selected.plan]||'gray'}>{PLAN_LABELS[selected.plan]}</Badge>
                  {getStatusBadge(selected)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['City', selected.city], ['Phone', selected.phone],
                ['Email', selected.email], ['Website', selected.website],
                ['Principal', selected.principal], ['Students Limit', selected.maxStudents],
                ['Teachers Limit', selected.maxTeachers], ['License Expiry', selected.licenseExpiry?.slice(0,10)],
                ['Admin Email', selected.admin?.email], ['Admin Name', selected.admin?.name],
                ['Created', new Date(selected.createdAt).toLocaleDateString('en-PK')], ['Reg No.', selected.registrationNo],
              ].map(([k,v])=>(
                <div key={k}><span className="text-slate-400 block text-xs mb-0.5">{k}</span><span className="text-slate-700 font-medium">{v||'—'}</span></div>
              ))}
              <div className="col-span-2"><span className="text-slate-400 block text-xs mb-0.5">Address</span><span className="text-slate-700">{selected.address||'—'}</span></div>
            </div>
            <div className="flex gap-2 pt-3 border-t border-slate-100 flex-wrap">
              <button onClick={()=>{setViewModal(false);openPlan(selected);}} className="flex items-center gap-1.5 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-2 rounded-lg font-medium"><CreditCard size={12}/>Change Plan</button>
              <button onClick={()=>{setViewModal(false);openPw(selected);}} className="flex items-center gap-1.5 text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-2 rounded-lg font-medium"><Key size={12}/>Reset Password</button>
              <button onClick={()=>impersonate(selected._id)} className="flex items-center gap-1.5 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-2 rounded-lg font-medium"><LogIn size={12}/>Login as Admin</button>
              <button onClick={()=>toggleActive(selected)} className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium ${selected.isActive?'bg-red-100 text-red-600 hover:bg-red-200':'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                {selected.isActive?<><ToggleRight size={12}/>Deactivate</>:<><ToggleLeft size={12}/>Activate</>}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── EDIT MODAL ───────────────────────────────────────────────────────── */}
      <Modal open={editModal} onClose={()=>setEditModal(false)} title={`Edit — ${selected?.name}`} size="md">
        <div className="space-y-4">
          {err && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{err}</div>}
          <Input label="School Name" value={editForm.name||''} onChange={e=>setEditForm({...editForm,name:e.target.value})}/>
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={editForm.city||''} onChange={e=>setEditForm({...editForm,city:e.target.value})}/>
            <Input label="Phone" value={editForm.phone||''} onChange={e=>setEditForm({...editForm,phone:e.target.value})}/>
          </div>
          <Input label="Email" type="email" value={editForm.email||''} onChange={e=>setEditForm({...editForm,email:e.target.value})}/>
          <Input label="Principal Name" value={editForm.principal||''} onChange={e=>setEditForm({...editForm,principal:e.target.value})}/>
          <Input label="Address" value={editForm.address||''} onChange={e=>setEditForm({...editForm,address:e.target.value})}/>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={()=>setEditModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">Cancel</button>
            <button onClick={updateSchool} disabled={saving} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
              {saving?'Saving…':'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── PLAN MODAL ───────────────────────────────────────────────────────── */}
      <Modal open={planModal} onClose={()=>setPlanModal(false)} title={`Change Plan — ${selected?.name}`} size="md">
        <div className="space-y-4">
          {err && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{err}</div>}
          <div className="grid grid-cols-2 gap-3">
            {plans.map(p=>(
              <button key={p.id} onClick={()=>setPlanForm({...planForm,planId:p.id})}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${planForm.planId===p.id?'border-purple-500 bg-purple-50':'border-slate-200 hover:border-slate-300'}`}>
                <div className="font-bold text-slate-800 text-sm mb-1">{p.name}</div>
                <div className="text-xs text-slate-500">{p.price===0?'Free':`Rs ${p.price.toLocaleString()}/yr`}</div>
                <div className="text-xs text-slate-400 mt-1">{p.maxStudents} students · {p.maxTeachers} teachers</div>
              </button>
            ))}
          </div>
          <Input label="License Duration (months)" type="number" value={planForm.licenseMonths}
            onChange={e=>setPlanForm({...planForm,licenseMonths:Number(e.target.value)})}/>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={()=>setPlanModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">Cancel</button>
            <button onClick={assignPlan} disabled={saving} className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-60">
              {saving?'Assigning…':'Assign Plan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── PASSWORD RESET MODAL ─────────────────────────────────────────────── */}
      <Modal open={pwModal} onClose={()=>setPwModal(false)} title={`Reset Password — ${selected?.admin?.email||'Admin'}`} size="sm">
        <div className="space-y-4">
          {err && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{err}</div>}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            ⚠️ This will reset the login password for the admin of <strong>{selected?.name}</strong>. Share the new password with them securely.
          </div>
          <Input label="New Password" type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="min 6 characters"/>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={()=>setPwModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">Cancel</button>
            <button onClick={resetPassword} disabled={saving} className="px-5 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-60">
              {saving?'Resetting…':'Reset Password'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── DELETE CONFIRM ───────────────────────────────────────────────────── */}
      <Modal open={!!confirmDel} onClose={()=>setConfirmDel(null)} title="Confirm Deactivation" size="sm">
        {confirmDel && (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              Are you sure you want to deactivate <strong>{confirmDel.name}</strong>?
              The school and all its data will be preserved but access will be blocked.
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={()=>setConfirmDel(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">Cancel</button>
              <button onClick={()=>deleteSchool(confirmDel._id)} className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">
                Yes, Deactivate
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
