import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Mail, Phone, Loader2, RefreshCw, Users } from 'lucide-react';
import { teacherAPI } from '../services/api';
import { SectionHeader, Card, Badge, Button, Modal, Input, Avatar, ProgressBar, useToast, useConfirm, Dropdown, TableSkeleton } from '../components/ui';

const statusColors = { Active:'green', 'On Leave':'orange', Inactive:'red' };

export default function Teachers() {
  const toast = useToast();
  const confirm = useConfirm();
  const location = useLocation();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [viewT, setViewT]       = useState(null);
  const [editData, setEditData] = useState(null);
  const [modalOpen, setModal]   = useState(false);
  const [saving, setSaving]     = useState(false);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      const res = await teacherAPI.getAll(params);
      setTeachers(res.data || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  useEffect(() => { if (location.state?.search) setSearch(location.state.search); }, [location.state]);

  const openAdd = () => {
    setEditData({ name:'', subject:'', qualification:'', experience:'', phone:'', email:'', salary:'', joinDate:'', status:'Active', gender:'Male', classes:[] });
    setModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const isEdit = !!editData._id;
      if (isEdit) await teacherAPI.update(editData._id, editData);
      else await teacherAPI.create(editData);
      setModal(false);
      fetchTeachers();
      toast.success(isEdit ? 'Teacher updated' : 'Teacher added');
    } catch(e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!(await confirm({ title:'Remove teacher?', message:'This will remove the teacher record.', tone:'danger', confirmText:'Remove' }))) return;
    await teacherAPI.delete(id);
    fetchTeachers();
    toast.success('Teacher removed');
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Teachers Management"
        subtitle={`${teachers.length} teachers on staff`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchTeachers}>Refresh</Button>
            <Button variant="primary"   size="sm" icon={Plus}      onClick={openAdd}>Add Teacher</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Total',    val: teachers.length,                              cls:'bg-blue-50 text-blue-700 border-blue-200' },
          { label:'Active',   val: teachers.filter(t=>t.status==='Active').length,    cls:'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label:'On Leave', val: teachers.filter(t=>t.status==='On Leave').length,  cls:'bg-orange-50 text-orange-700 border-orange-200' },
          { label:'Inactive', val: teachers.filter(t=>t.status==='Inactive').length,  cls:'bg-red-50 text-red-600 border-red-200' },
        ].map(i => (
          <div key={i.label} className={`rounded-2xl border p-4 ${i.cls}`}>
            <div className="text-2xl font-display font-bold">{i.val}</div>
            <div className="text-xs font-medium mt-0.5">{i.label}</div>
          </div>
        ))}
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teachers…"
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200"/>
          </div>
        </div>

        {loading ? <TableSkeleton rows={6} cols={5}/>
         : teachers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/60 flex items-center justify-center mx-auto mb-4 ring-1 ring-blue-100"><Users size={28} className="text-blue-400"/></div>
            <h3 className="font-display font-semibold text-slate-600 mb-1">No teachers yet</h3>
            <p className="text-slate-400 text-sm">Add your teaching staff to get started.</p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachers.map(t => (
              <div key={t._id} className="border border-slate-100 rounded-2xl p-4 hover:shadow-card transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar name={t.name} size="lg"/>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-slate-800 leading-tight truncate">{t.name}</div>
                    <div className="text-primary-600 text-sm font-medium mt-0.5">{t.subject}</div>
                    <Badge variant={statusColors[t.status]||'gray'}>{t.status}</Badge>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-slate-500 mb-3">
                  <div className="flex items-center gap-2"><Mail size={11}/>{t.email}</div>
                  <div className="flex items-center gap-2"><Phone size={11}/>{t.phone}</div>
                </div>
                <div className="text-xs text-slate-500 mb-3">{t.qualification} · {t.experience}</div>
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button onClick={() => setViewT(t)} className="flex-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 py-1.5 rounded-lg font-medium">View</button>
                  <button onClick={() => { setEditData({...t, joinDate:t.joinDate?.slice(0,10)||''}); setModal(true); }} className="flex-1 text-xs bg-slate-50 text-slate-600 hover:bg-slate-100 py-1.5 rounded-lg font-medium">Edit</button>
                  <button onClick={() => remove(t._id)} className="flex-1 text-xs bg-red-50 text-red-500 hover:bg-red-100 py-1.5 rounded-lg font-medium">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={!!viewT} onClose={() => setViewT(null)} title="Teacher Profile" size="md">
        {viewT && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <Avatar name={viewT.name} size="lg"/>
              <div>
                <h3 className="font-display font-bold text-slate-800 text-lg">{viewT.name}</h3>
                <div className="text-primary-600 font-medium">{viewT.subject}</div>
                <Badge variant={statusColors[viewT.status]||'gray'}>{viewT.status}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['ID',viewT.teacherId],['Qualification',viewT.qualification],['Experience',viewT.experience],['Phone',viewT.phone],['Email',viewT.email],['Salary',`Rs ${viewT.salary?.toLocaleString()}`],['Join Date',viewT.joinDate?.slice(0,10)],['Gender',viewT.gender]].map(([k,v]) => (
                <div key={k}><span className="text-slate-400 block text-xs mb-0.5">{k}</span><span className="text-slate-700 font-medium">{v||'–'}</span></div>
              ))}
            </div>
            {viewT.classes?.length > 0 && (
              <div><div className="text-slate-400 text-xs mb-2">Assigned Classes</div>
                <div className="flex flex-wrap gap-2">{viewT.classes.map(c => <Badge key={c} variant="blue">{c}</Badge>)}</div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={modalOpen} onClose={() => setModal(false)} title={editData?._id ? 'Edit Teacher' : 'Add Teacher'} size="lg">
        {editData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full Name" value={editData.name} onChange={e => setEditData({...editData, name:e.target.value})} placeholder="Teacher full name"/>
            <Input label="Subject" value={editData.subject} onChange={e => setEditData({...editData, subject:e.target.value})} placeholder="e.g. Mathematics"/>
            <Input label="Qualification" value={editData.qualification} onChange={e => setEditData({...editData, qualification:e.target.value})} placeholder="M.Sc Mathematics"/>
            <Input label="Experience" value={editData.experience} onChange={e => setEditData({...editData, experience:e.target.value})} placeholder="5 Years"/>
            <Input label="Phone" value={editData.phone} onChange={e => setEditData({...editData, phone:e.target.value})}/>
            <Input label="Email" value={editData.email} onChange={e => setEditData({...editData, email:e.target.value})}/>
            <Input label="Salary" type="number" value={editData.salary} onChange={e => setEditData({...editData, salary:Number(e.target.value)})}/>
            <Input label="Join Date" type="date" value={editData.joinDate} onChange={e => setEditData({...editData, joinDate:e.target.value})}/>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Status</label>
              <Dropdown value={editData.status} onChange={e => setEditData({...editData, status:e.target.value})}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
                {['Active','On Leave','Inactive'].map(s => <option key={s}>{s}</option>)}
              </Dropdown>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Gender</label>
              <Dropdown value={editData.gender} onChange={e => setEditData({...editData, gender:e.target.value})}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
                <option>Male</option><option>Female</option>
              </Dropdown>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Teacher'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
