import { useState, useEffect, useCallback, useRef } from 'react';
import { SERVER_URL } from '../config/env.js';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Eye, Edit2, Trash2, GraduationCap, Loader2, RefreshCw, Upload, X } from 'lucide-react';
import { studentAPI, schoolAPI } from '../services/api';
import { useClasses } from '../hooks/useClasses.js';
import { SectionHeader, Card, Badge, Button, Input, Modal, Avatar, useToast, useConfirm, Dropdown, TableSkeleton } from '../components/ui';
import FeeProfileTable from '../components/FeeProfileTable.jsx';
import EnrollmentFields from '../components/EnrollmentFields.jsx';
import DynamicSelect from '../components/DynamicSelect.jsx';
import ImportStudentsModal from '../components/ImportStudentsModal.jsx';

const API_BASE = SERVER_URL;
const feeColors = { Paid:'green', Pending:'orange', Overdue:'red', Partial:'purple' };
const emptyForm = { name:'', class:'', rollNumber:'', gender:'Male', dateOfBirth:'', guardian:{name:'',phone:''}, phone:'', enrollment:[], feeProfile:[], feeAmount:'', feeStatus:'Pending', address:'', email:'', admissionDate:'', bloodGroup:'', photo:'' };

export default function Students() {
  const toast = useToast();
  const confirm = useConfirm();
  const location = useLocation();
  const [students, setStudents]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterFee, setFilterFee]     = useState('');
  const [selected, setSelected]   = useState(null);
  const [editData, setEditData]   = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoRef = useRef();

  // Real class list (never hardcoded) — shared source of truth.
  const { names: classes } = useClasses();

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setPhotoUploading(true);
    try {
      const fd = new FormData(); fd.append('photo', file);
      const res = await schoolAPI.uploadStudentPhoto(fd);
      if (res.success) { setEditData(d => ({ ...d, photo: res.url })); toast.success('Photo uploaded'); }
      else toast.error(res.message || 'Upload failed');
    } catch (e2) { toast.error(e2.message); }
    finally { setPhotoUploading(false); }
  };

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)      params.search    = search;
      if (filterClass) params.class     = filterClass;
      if (filterFee)   params.feeStatus = filterFee;
      const res = await studentAPI.getAll(params);
      setStudents(res.data || []);
      setTotal(res.total || 0);
    } catch (e) { console.error(e); toast.error('Could not load students. Please try again.'); }
    finally { setLoading(false); }
  }, [search, filterClass, filterFee, toast]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  // Prefill search when navigated here from global search
  useEffect(() => {
    if (location.state?.search) setSearch(location.state.search);
  }, [location.state]);

  const openAdd  = () => { setEditData({ ...emptyForm }); setModalOpen(true); setError(''); };
  const openEdit = (s) => { setEditData({ ...s, dateOfBirth: s.dateOfBirth?.slice(0,10) || '', admissionDate: s.admissionDate?.slice(0,10) || '' }); setModalOpen(true); setError(''); };

  const enrollMissingRef = useRef([]);   // required enrollment categories left blank
  const [importOpen, setImportOpen] = useState(false);

  const save = async () => {
    if (enrollMissingRef.current.length) {
      return setError(`Please select: ${enrollMissingRef.current.join(', ')}.`);
    }
    setSaving(true); setError('');
    try {
      if (editData._id) {
        await studentAPI.update(editData._id, editData);
      } else {
        await studentAPI.create(editData);
      }
      setModalOpen(false);
      fetchStudents();
      toast.success(editData._id ? 'Student updated' : 'Student added');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!(await confirm({ title:'Remove student?', message:'This permanently removes the student record.', tone:'danger', confirmText:'Delete' }))) return;
    await studentAPI.delete(id);
    fetchStudents();
    toast.success('Student removed');
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Students Management"
        subtitle={`${total} students enrolled · enrolled admissions land here automatically; use “Add Student” for direct entry`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchStudents}>Refresh</Button>
            <Button variant="secondary" size="sm" icon={Upload}    onClick={() => setImportOpen(true)}>Import Excel</Button>
            <Button variant="primary"   size="sm" icon={Plus}      onClick={openAdd}>Add Student</Button>
          </div>
        }
      />

      <ImportStudentsModal open={importOpen} onClose={() => setImportOpen(false)} onImported={fetchStudents} />


      <Card>
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input placeholder="Search name, roll, ID…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200"/>
          </div>
          <Dropdown value={filterClass} onChange={e => setFilterClass(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
            <option value="">All Classes</option>
            {classes.map(c => <option key={c}>{c}</option>)}
          </Dropdown>
          <Dropdown value={filterFee} onChange={e => setFilterFee(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
            <option value="">All Fee Status</option>
            {['Paid','Pending','Overdue','Partial'].map(s => <option key={s}>{s}</option>)}
          </Dropdown>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={8} cols={6}/>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Student','Roll No','Class','Guardian','Contact','Fee Status','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s._id} className="border-b border-slate-50 hover:bg-primary-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {s.photo
                          ? <img src={`${API_BASE}${s.photo}`} alt={s.name} className="w-9 h-9 rounded-full object-cover border border-slate-200 flex-shrink-0"/>
                          : <Avatar name={s.name} size="md"/>}
                        <div>
                          <div className="font-medium text-slate-800">{s.name}</div>
                          <div className="text-xs text-slate-400">{s.studentId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.rollNumber}</td>
                    <td className="px-4 py-3"><Badge variant="blue">{s.class}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{s.guardian?.name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{s.phone || s.guardian?.phone}</td>
                    <td className="px-4 py-3"><Badge variant={feeColors[s.feeStatus]}>{s.feeStatus}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setSelected(s); setViewOpen(true); }} className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600"><Eye size={14}/></button>
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-orange-100 text-slate-400 hover:text-orange-600"><Edit2 size={14}/></button>
                        <button onClick={() => remove(s._id)} className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && students.length === 0 && (
            <div className="text-center py-12"><GraduationCap size={40} className="mx-auto text-slate-200 mb-3"/><p className="text-slate-400">No students found</p></div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">Showing {students.length} of {total}</div>
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editData?._id ? 'Edit Student' : 'Add New Student'} size="lg">
        {editData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {error && <div className="sm:col-span-2 bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-2 text-sm">{error}</div>}

            {/* Photo */}
            <div className="sm:col-span-2 flex items-center gap-4 pb-2 border-b border-slate-100">
              {editData.photo
                ? <img src={`${API_BASE}${editData.photo}`} alt="Student" className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-200 shadow-sm"/>
                : <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center text-white text-xl font-bold">{editData.name?.charAt(0) || <GraduationCap size={22}/>}</div>}
              <div>
                <div className="text-sm font-medium text-slate-700 mb-1">Student Photo</div>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange}/>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" icon={photoUploading ? Loader2 : Upload} onClick={() => photoRef.current?.click()} disabled={photoUploading}>
                    {photoUploading ? 'Uploading…' : 'Upload'}
                  </Button>
                  {editData.photo && <Button variant="ghost" size="sm" icon={X} onClick={() => setEditData(d => ({ ...d, photo:'' }))}>Remove</Button>}
                </div>
              </div>
            </div>

            <Input label="Full Name" value={editData.name} onChange={e => setEditData({...editData, name:e.target.value})} placeholder="Student full name"/>
            <Input label="Roll Number" value={editData.rollNumber} onChange={e => setEditData({...editData, rollNumber:e.target.value})} placeholder="G8A-01"/>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Class</label>
              <Dropdown value={editData.class} onChange={e => setEditData({...editData, class:e.target.value})}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c}>{c}</option>)}
              </Dropdown>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Gender</label>
              <Dropdown value={editData.gender} onChange={e => setEditData({...editData, gender:e.target.value})}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
                <option>Male</option><option>Female</option>
              </Dropdown>
            </div>
            <Input label="Date of Birth" type="date" value={editData.dateOfBirth} onChange={e => setEditData({...editData, dateOfBirth:e.target.value})}/>
            <DynamicSelect label="Blood Group" optionKey="bloodGroups" value={editData.bloodGroup}
              onChange={e => setEditData({...editData, bloodGroup:e.target.value})} placeholder="Select blood group…"/>
            <Input label="Guardian Name" value={editData.guardian?.name||''} onChange={e => setEditData({...editData, guardian:{...editData.guardian, name:e.target.value}})} placeholder="Parent/Guardian"/>
            <Input label="Guardian Phone" value={editData.guardian?.phone||''} onChange={e => setEditData({...editData, guardian:{...editData.guardian, phone:e.target.value}})} placeholder="03XX-XXXXXXX"/>
            <Input label="Student Email" value={editData.email||''} onChange={e => setEditData({...editData, email:e.target.value})} placeholder="student@school.edu"/>
            <Input label="Admission Date" type="date" value={editData.admissionDate} onChange={e => setEditData({...editData, admissionDate:e.target.value})}/>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Fee Status</label>
              <Dropdown value={editData.feeStatus} onChange={e => setEditData({...editData, feeStatus:e.target.value})}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
                {['Paid','Pending','Overdue','Partial'].map(s => <option key={s}>{s}</option>)}
              </Dropdown>
            </div>
            <div className="sm:col-span-2">
              <Input label="Address" value={editData.address||''} onChange={e => setEditData({...editData, address:e.target.value})} placeholder="Full address"/>
            </div>

            {/* Dynamic enrollment categories (Group / House / …) */}
            <div className="sm:col-span-2">
              <EnrollmentFields
                value={editData.enrollment || []}
                studentClass={editData.class}
                seedKey={editData._id || 'new'}
                onChange={(enrollment, meta) => { enrollMissingRef.current = meta?.missingRequired || []; setEditData(d => ({ ...d, enrollment })); }}
              />
            </div>

            {/* Per-student fee table (Type · Fee · Discount · Total) */}
            <div className="sm:col-span-2">
              <FeeProfileTable
                value={editData.feeProfile || []}
                seedKey={editData._id || 'new'}
                onChange={(profile, monthly) => setEditData(d => ({ ...d, feeProfile: profile, feeAmount: monthly }))}
              />
            </div>

            <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Student'}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* View Modal */}
      <Modal open={viewOpen} onClose={() => setViewOpen(false)} title="Student Profile" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              {selected.photo
                ? <img src={`${API_BASE}${selected.photo}`} alt={selected.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-100 flex-shrink-0"/>
                : <Avatar name={selected.name} size="lg"/>}
              <div>
                <h3 className="font-display font-bold text-slate-800 text-lg">{selected.name}</h3>
                <div className="text-slate-500 text-sm">{selected.rollNumber} · {selected.class}</div>
                <div className="flex gap-2 mt-2">
                  <Badge variant={feeColors[selected.feeStatus]}>{selected.feeStatus}</Badge>
                  <Badge variant="blue">{selected.gender}</Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['Student ID',selected.studentId],['Blood Group',selected.bloodGroup],['DOB',selected.dateOfBirth?.slice(0,10)],['Phone',selected.phone||selected.guardian?.phone],['Guardian',selected.guardian?.name],['Email',selected.email],['Admission',selected.admissionDate?.slice(0,10)],['Fee/Month',`Rs ${selected.feeAmount}`]].map(([k,v]) => (
                <div key={k}><span className="text-slate-400 block text-xs mb-0.5">{k}</span><span className="text-slate-700 font-medium">{v||'–'}</span></div>
              ))}
              <div className="col-span-2"><span className="text-slate-400 block text-xs mb-0.5">Address</span><span className="text-slate-700 font-medium">{selected.address||'–'}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
