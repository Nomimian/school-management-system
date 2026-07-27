import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, Users, Pencil, Trash2 } from 'lucide-react';
import { classAPI, teacherAPI } from '../services/api';
import { SectionHeader, Card, Badge, Button, Modal, Input, Avatar, EmptyState, TableSkeleton, useToast, useConfirm, Dropdown } from '../components/ui';

const emptyForm = { name:'', section:'', room:'', capacity:'', classTeacher:'' };

export default function Classes() {
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [classes, setClasses]   = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState(emptyForm);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [clsRes, tRes] = await Promise.all([classAPI.getAll(), teacherAPI.getAll()]);
      setClasses(clsRes.data||[]);
      setTeachers(tRes.data||[]);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (cls) => {
    setEditing(cls);
    setForm({
      name: cls.name || '',
      section: cls.section || '',
      room: cls.room || '',
      capacity: cls.capacity ?? '',
      classTeacher: cls.classTeacher?._id || cls.classTeacher || '',
    });
    setModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing) { await classAPI.update(editing._id, form); toast.success('Class updated'); }
      else { await classAPI.create(form); toast.success('Class added'); }
      setModal(false);
      setEditing(null);
      fetchAll();
    }
    catch(e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const removeClass = async (cls) => {
    if (!(await confirm({ title:'Delete class?', message:`This will remove ${cls.name} from your records.`, tone:'danger', confirmText:'Delete' }))) return;
    try { await classAPI.delete(cls._id); fetchAll(); toast.success('Class removed'); }
    catch(e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Classes & Sections"
        subtitle={`${classes.length} classes · ${classes.reduce((s,c)=>s+(c.studentCount||0),0)} total students`}
        action={<Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>Add Class</Button>}
      />
      {loading ? (
        <Card><TableSkeleton rows={6} cols={3}/></Card>
      ) : classes.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No classes yet"
            subtitle="Create your first class to organise students, teachers and attendance."
            action={<Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>Add Class</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(cls => (
            <Card key={cls._id} hover className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center shadow-lg shadow-blue-500/30"><Building2 size={22} className="text-white"/></div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant="blue">Room {cls.room||'—'}</Badge>
                  <Badge variant="green" dot>{cls.studentCount||0} students</Badge>
                </div>
              </div>
              <h3 className="font-display font-bold text-slate-800 text-lg mb-1">{cls.name}{cls.section ? ` · ${cls.section}` : ''}</h3>
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-3"><Users size={14}/><span>{cls.studentCount||0} students enrolled{cls.capacity ? ` / ${cls.capacity}` : ''}</span></div>
              <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
                <Avatar name={cls.classTeacher?.name||'?'} size="sm"/>
                <div>
                  <div className="text-xs text-slate-400">Class Teacher</div>
                  <div className="text-sm font-medium text-slate-700">{cls.classTeacher?.name||'Not assigned'}</div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                <button onClick={()=>navigate('/students', { state: { search: cls.name } })}
                  className="flex-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 py-1.5 rounded-lg font-medium">View Students</button>
                <button onClick={()=>openEdit(cls)} title="Edit class"
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-primary-50 hover:text-blue-600"><Pencil size={14}/></button>
                <button onClick={()=>removeClass(cls)} title="Delete class"
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={14}/></button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={modal} onClose={()=>{setModal(false);setEditing(null);}} title={editing ? 'Edit Class' : 'Add New Class'} size="md">
        <div className="space-y-4">
          <Input label="Class Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Grade 8-A"/>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Section" value={form.section} onChange={e=>setForm({...form,section:e.target.value})} placeholder="A, B, C…"/>
            <Input label="Room No." value={form.room} onChange={e=>setForm({...form,room:e.target.value})} placeholder="101"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Capacity" type="number" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})} placeholder="40"/>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Class Teacher</label>
              <Dropdown value={form.classTeacher} onChange={e=>setForm({...form,classTeacher:e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
                <option value="">Select teacher</option>
                {teachers.map(t=><option key={t._id} value={t._id}>{t.name}</option>)}
              </Dropdown>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={()=>{setModal(false);setEditing(null);}}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={saving}>{editing ? 'Save Changes' : 'Add Class'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
