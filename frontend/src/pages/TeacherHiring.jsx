import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Eye, Edit2, Trash2, Loader2, Printer, Upload, X, Briefcase } from 'lucide-react';
import { useSchool } from '../hooks/useSchool.jsx';
import { buildPrintPage, openPrintWindow } from '../components/print/PrintComponents.jsx';
import { SectionHeader, Card, Badge, Button, Modal, Input, Avatar, useToast, useConfirm, Dropdown } from '../components/ui';
import { schoolAPI, hiringAPI } from '../services/api';

const API_BASE = 'http://localhost:5000';

const statusColors = {
  Applied: 'blue', Shortlisted: 'orange', 'Interview Scheduled': 'purple',
  Interviewed: 'teal', Hired: 'green', Rejected: 'red',
};

const SUBJECTS = [
  'Mathematics','English','Urdu','Physics','Chemistry','Biology',
  'Computer Science','Pakistan Studies','Islamiat','History','Geography',
  'Economics','Accounting','Fine Arts','Physical Education','Other',
];

const emptyForm = {
  fullName:'', fatherName:'', dateOfBirth:'', gender:'Male', cnic:'', religion:'Islam',
  maritalStatus:'Single', phone:'', email:'', address:'',
  applyingFor:'Mathematics', qualification:'M.Sc', university:'', passingYear:'',
  experience:'', previousSchool:'', previousSalary:'', expectedSalary:'',
  skills:'', references:'', status:'Applied', interviewDate:'', remarks:'', photo:'',
};

export default function TeacherHiring() {
  const toast = useToast();
  const confirm = useConfirm();
  const { school } = useSchool();
  const [records, setRecords]       = useState([]);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilter]   = useState('');
  const [modalOpen, setModal]       = useState(false);
  const [viewOpen, setView]         = useState(false);
  const [selected, setSelected]     = useState(null);
  const [editData, setEditData]     = useState(null);
  const [saving, setSaving]         = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef();

  const loadRecords = async () => {
    try { const res = await hiringAPI.getAll(); setRecords(res.data || []); }
    catch(e) { toast.error(e.message); }
  };
  useEffect(() => { loadRecords(); }, []);

  const filtered = records.filter(r => {
    const ms = r.fullName?.toLowerCase().includes(search.toLowerCase()) ||
               r.applyingFor?.toLowerCase().includes(search.toLowerCase());
    const mf = !filterStatus || r.status === filterStatus;
    return ms && mf;
  });

  const openAdd  = () => { setEditData({...emptyForm}); setModal(true); };
  const openEdit = (r) => { setEditData({...r}); setModal(true); };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await schoolAPI.uploadStudentPhoto(fd);
      if (res.success) { setEditData(d => ({...d, photo: res.url})); toast.success('Photo uploaded'); }
    } catch(e2) { toast.error(e2.message); }
    finally { setPhotoUploading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { _id, ...payload } = editData;
      if (_id) await hiringAPI.update(_id, payload);
      else     await hiringAPI.create(payload);
      await loadRecords();
      setModal(false);
      toast.success(_id ? 'Application updated' : 'Application saved');
    } catch(e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!(await confirm({ title:'Delete application?', message:'This permanently removes the job application.', tone:'danger', confirmText:'Delete' }))) return;
    try { await hiringAPI.delete(id); setRecords(rs => rs.filter(r => r._id !== id)); toast.success('Application deleted'); }
    catch(e) { toast.error(e.message); }
  };

  const quickStatus = async (id, status) => {
    try {
      await hiringAPI.update(id, { status });
      setRecords(rs => rs.map(r => r._id === id ? { ...r, status } : r));
      toast.success(`Status updated to ${status}`);
    } catch(e) { toast.error(e.message); }
  };

  // ── Print Application Form ─────────────────────────────────────────────────
  const printApplication = (r) => {
    const photoHtml = r.photo
      ? `<img src="${API_BASE}${r.photo}" style="width:90px;height:110px;object-fit:cover;border:2px solid #e2e8f0;border-radius:6px;float:right;margin-left:12px;"/>`
      : `<div style="width:90px;height:110px;border:2px dashed #e2e8f0;border-radius:6px;float:right;margin-left:12px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#94a3b8;text-align:center;">Photo<br/>Here</div>`;

    const stampHtml = school?.stamp
      ? `<div style="text-align:center;margin:16px 0;opacity:0.75;"><img src="${API_BASE}${school.stamp}" style="width:90px;height:90px;border-radius:50%;"/></div>`
      : '';

    const content = `
      <div style="overflow:hidden;">
        ${photoHtml}
        <div class="info-grid" style="grid-template-columns:1fr 1fr 1fr;">
          <div class="info-item"><label>Application ID</label><span>APP-${r._id?.slice(-6)}</span></div>
          <div class="info-item"><label>Date Applied</label><span>${r.createdAt?.slice(0,10) || new Date().toLocaleDateString('en-PK')}</span></div>
          <div class="info-item"><label>Status</label><span>${r.status}</span></div>
        </div>
        <div style="clear:both;"></div>
      </div>

      <h3 style="font-size:13px;font-weight:bold;color:#475569;margin:12px 0 6px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">Personal Information</h3>
      <div class="info-grid">
        <div class="info-item"><label>Full Name</label><span>${r.fullName}</span></div>
        <div class="info-item"><label>Father's Name</label><span>${r.fatherName||'—'}</span></div>
        <div class="info-item"><label>Date of Birth</label><span>${r.dateOfBirth||'—'}</span></div>
        <div class="info-item"><label>Gender</label><span>${r.gender}</span></div>
        <div class="info-item"><label>CNIC</label><span>${r.cnic||'—'}</span></div>
        <div class="info-item"><label>Religion</label><span>${r.religion}</span></div>
        <div class="info-item"><label>Marital Status</label><span>${r.maritalStatus}</span></div>
        <div class="info-item"><label>Phone</label><span>${r.phone||'—'}</span></div>
        <div class="info-item"><label>Email</label><span>${r.email||'—'}</span></div>
        <div class="info-item" style="grid-column:span 3"><label>Address</label><span>${r.address||'—'}</span></div>
      </div>

      <h3 style="font-size:13px;font-weight:bold;color:#475569;margin:12px 0 6px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">Position Applied For</h3>
      <div class="info-grid">
        <div class="info-item"><label>Subject / Position</label><span style="font-size:15px;color:#1d4ed8;font-weight:bold;">${r.applyingFor}</span></div>
        <div class="info-item"><label>Expected Salary</label><span>Rs ${r.expectedSalary||'—'}/month</span></div>
        <div class="info-item"><label>Experience</label><span>${r.experience||'Fresher'}</span></div>
      </div>

      <h3 style="font-size:13px;font-weight:bold;color:#475569;margin:12px 0 6px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">Education</h3>
      <div class="info-grid">
        <div class="info-item"><label>Highest Qualification</label><span>${r.qualification||'—'}</span></div>
        <div class="info-item"><label>University / Board</label><span>${r.university||'—'}</span></div>
        <div class="info-item"><label>Passing Year</label><span>${r.passingYear||'—'}</span></div>
      </div>

      <h3 style="font-size:13px;font-weight:bold;color:#475569;margin:12px 0 6px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">Previous Employment</h3>
      <div class="info-grid">
        <div class="info-item"><label>Previous School</label><span>${r.previousSchool||'—'}</span></div>
        <div class="info-item"><label>Previous Salary</label><span>${r.previousSalary ? 'Rs '+r.previousSalary : '—'}</span></div>
      </div>

      ${r.skills ? `<div style="background:#f8fafc;padding:8px 12px;border-radius:6px;margin:8px 0;">
        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;margin-bottom:3px;">Skills & Competencies</div>
        <div style="font-size:12px;">${r.skills}</div>
      </div>` : ''}

      ${r.references ? `<div style="background:#f8fafc;padding:8px 12px;border-radius:6px;margin:8px 0;">
        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;margin-bottom:3px;">References</div>
        <div style="font-size:12px;">${r.references}</div>
      </div>` : ''}

      ${stampHtml}

      <div style="background:#fffbeb;border:1px solid #fde68a;padding:8px 12px;border-radius:6px;margin:10px 0;font-size:11px;color:#92400e;">
        <strong>Declaration:</strong> I hereby declare that all information provided above is true and correct to the best of my knowledge.
        I understand that any misrepresentation may result in disqualification.
      </div>

      <div class="sig-row">
        <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Applicant Signature</div></div>
        <div class="sig-box"><div class="sig-line"></div><div class="sig-label">HR Officer</div></div>
        <div class="sig-box"><div class="sig-line"></div><div class="sig-label">${school?.principal || 'Principal'}</div></div>
      </div>`;

    openPrintWindow(buildPrintPage(content, school, 'Teacher Job Application'));
  };

  // ── Print Interview Call Letter ─────────────────────────────────────────────
  const printInterviewLetter = (r) => {
    const stampHtml = school?.stamp
      ? `<div style="text-align:right;margin-bottom:12px;opacity:0.75;"><img src="${API_BASE}${school.stamp}" style="width:80px;height:80px;border-radius:50%;"/></div>`
      : '';

    const content = `
      ${stampHtml}
      <div style="text-align:right;margin-bottom:16px;font-size:12px;color:#64748b;">
        Date: ${new Date().toLocaleDateString('en-PK',{year:'numeric',month:'long',day:'numeric'})}
      </div>
      <div style="margin-bottom:16px;">
        <strong>${r.fullName}</strong><br/>
        ${r.address||''}<br/>
        Phone: ${r.phone||'—'}
      </div>
      <div style="font-size:14px;font-weight:bold;text-align:center;background:#1d4ed8;color:#fff;padding:8px;border-radius:6px;margin-bottom:16px;">
        INTERVIEW CALL LETTER
      </div>
      <p style="line-height:1.8;font-size:13px;">
        Dear <strong>${r.fullName}</strong>,
      </p>
      <br/>
      <p style="line-height:1.8;font-size:13px;">
        With reference to your application for the post of <strong>${r.applyingFor} Teacher</strong>,
        we are pleased to inform you that you have been shortlisted for an interview.
      </p>
      <br/>
      <div style="background:#f0f9ff;border:1px solid #bae6fd;padding:12px 16px;border-radius:6px;margin:12px 0;">
        <table style="margin-bottom:0;"><tbody>
          <tr><td style="border:none;padding:4px 8px;font-weight:bold;color:#0369a1;width:140px;">Date &amp; Time:</td>
              <td style="border:none;padding:4px 8px;">${r.interviewDate || '___________________'}</td></tr>
          <tr><td style="border:none;padding:4px 8px;font-weight:bold;color:#0369a1;">Venue:</td>
              <td style="border:none;padding:4px 8px;">${school?.address || 'School Main Office'}</td></tr>
          <tr><td style="border:none;padding:4px 8px;font-weight:bold;color:#0369a1;">Report To:</td>
              <td style="border:none;padding:4px 8px;">${school?.principal || 'Principal'}</td></tr>
        </tbody></table>
      </div>
      <p style="line-height:1.8;font-size:12px;color:#64748b;">
        Please bring the following documents:<br/>
        • Original CNIC &amp; 2 photocopies<br/>
        • Original Educational Certificates &amp; photocopies<br/>
        • Experience letters (if any)<br/>
        • 2 recent passport-size photographs<br/>
        • This call letter
      </p>
      <br/>
      <p style="font-size:13px;">We look forward to meeting you.</p>
      <div class="sig-row" style="margin-top:30px;">
        <div></div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">${school?.principal || 'Principal'}<br/>${school?.name || ''}</div>
        </div>
      </div>`;

    openPrintWindow(buildPrintPage(content, school, 'Interview Call Letter'));
  };

  const stats = {
    total: records.length,
    applied: records.filter(r=>r.status==='Applied').length,
    shortlisted: records.filter(r=>r.status==='Shortlisted').length,
    hired: records.filter(r=>r.status==='Hired').length,
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Teacher Hiring"
        subtitle="Manage job applications and interview process"
        action={<Button variant="primary" size="sm" icon={Plus} onClick={openAdd}>New Application</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:'Total',val:stats.total,cls:'bg-blue-50 text-blue-700 border-blue-200'},
          {label:'Applied',val:stats.applied,cls:'bg-indigo-50 text-indigo-700 border-indigo-200'},
          {label:'Shortlisted',val:stats.shortlisted,cls:'bg-orange-50 text-orange-700 border-orange-200'},
          {label:'Hired',val:stats.hired,cls:'bg-emerald-50 text-emerald-700 border-emerald-200'},
        ].map(i=>(
          <div key={i.label} className={`rounded-2xl border p-4 ${i.cls}`}>
            <div className="text-2xl font-display font-bold">{i.val}</div>
            <div className="text-xs font-medium mt-0.5">{i.label}</div>
          </div>
        ))}
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input placeholder="Search name or subject…" value={search} onChange={e=>setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200"/>
          </div>
          <Dropdown value={filterStatus} onChange={e=>setFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
            <option value="">All Status</option>
            {Object.keys(statusColors).map(s=><option key={s}>{s}</option>)}
          </Dropdown>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Applicant','Position','Qualification','Phone','Exp. Salary','Status','Actions'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r._id} className="border-b border-slate-50 hover:bg-blue-50/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {r.photo
                        ? <img src={`${API_BASE}${r.photo}`} className="w-9 h-9 rounded-full object-cover border border-blue-100" alt=""/>
                        : <Avatar name={r.fullName} size="md"/>
                      }
                      <div>
                        <div className="font-medium text-slate-800">{r.fullName}</div>
                        <div className="text-xs text-slate-400">{r.gender} · {r.cnic}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant="blue">{r.applyingFor}</Badge></td>
                  <td className="px-4 py-3 text-slate-600">{r.qualification}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{r.phone}</td>
                  <td className="px-4 py-3 text-slate-600">Rs {r.expectedSalary||'—'}</td>
                  <td className="px-4 py-3"><Badge variant={statusColors[r.status]||'gray'}>{r.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      <button onClick={()=>{setSelected(r);setView(true);}} className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600" title="View"><Eye size={14}/></button>
                      <button onClick={()=>openEdit(r)} className="p-1.5 rounded-lg hover:bg-orange-100 text-slate-400 hover:text-orange-600" title="Edit"><Edit2 size={14}/></button>
                      <button onClick={()=>printApplication(r)} className="p-1.5 rounded-lg hover:bg-purple-100 text-slate-400 hover:text-purple-600" title="Print Form"><Printer size={14}/></button>
                      {r.status==='Applied' && <button onClick={()=>quickStatus(r._id,'Shortlisted')} className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 px-2 py-1 rounded-lg font-medium">Shortlist</button>}
                      {r.status==='Shortlisted' && <button onClick={()=>quickStatus(r._id,'Interview Scheduled')} className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-2 py-1 rounded-lg font-medium">Schedule</button>}
                      {['Shortlisted','Interview Scheduled','Interviewed'].includes(r.status) && <button onClick={()=>quickStatus(r._id,'Hired')} className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-1 rounded-lg font-medium">Hire</button>}
                      <button onClick={()=>remove(r._id)} className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500" title="Delete"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length===0 && (
            <div className="text-center py-12">
              <Briefcase size={40} className="mx-auto text-slate-200 mb-3"/>
              <p className="text-slate-400">No applications found</p>
            </div>
          )}
        </div>
      </Card>

      {/* ── Add/Edit Modal ───────────────────────────────────────────────────── */}
      <Modal open={modalOpen} onClose={()=>setModal(false)} title={editData?.fullName ? `Edit — ${editData.fullName}` : 'New Teacher Application'} size="xl">
        {editData && (
          <div className="space-y-5">

            {/* Photo Upload */}
            <div className="flex items-start gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="relative flex-shrink-0">
                {editData.photo
                  ? <img src={`${API_BASE}${editData.photo}`} className="w-24 h-28 rounded-xl object-cover border-2 border-blue-200 shadow" alt=""/>
                  : <div className="w-24 h-28 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex flex-col items-center justify-center text-blue-400 border-2 border-dashed border-blue-300">
                      <Upload size={22}/><span className="text-[10px] mt-1 font-medium">Photo</span>
                    </div>
                }
                {photoUploading && <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center"><Loader2 size={20} className="animate-spin text-primary-600"/></div>}
              </div>
              <div>
                <div className="font-semibold text-slate-700 mb-1">Applicant Photo</div>
                <div className="text-xs text-slate-400 mb-3">Passport-size photo. JPG/PNG, max 5MB.</div>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange}/>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" icon={Upload} onClick={()=>photoInputRef.current?.click()} disabled={photoUploading}>
                    {photoUploading?'Uploading…':'Upload Photo'}
                  </Button>
                  {editData.photo && <Button variant="ghost" size="sm" icon={X} onClick={()=>setEditData(d=>({...d,photo:''}))}>Remove</Button>}
                </div>
              </div>
            </div>

            {/* Personal */}
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Personal Information</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Full Name *" value={editData.fullName} onChange={e=>setEditData({...editData,fullName:e.target.value})} placeholder="Full name"/>
                <Input label="Father's Name" value={editData.fatherName} onChange={e=>setEditData({...editData,fatherName:e.target.value})}/>
                <Input label="Date of Birth" type="date" value={editData.dateOfBirth} onChange={e=>setEditData({...editData,dateOfBirth:e.target.value})}/>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Gender</label>
                  <Dropdown value={editData.gender} onChange={e=>setEditData({...editData,gender:e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                    <option>Male</option><option>Female</option>
                  </Dropdown>
                </div>
                <Input label="CNIC" value={editData.cnic} onChange={e=>setEditData({...editData,cnic:e.target.value})} placeholder="XXXXX-XXXXXXX-X"/>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Marital Status</label>
                  <Dropdown value={editData.maritalStatus} onChange={e=>setEditData({...editData,maritalStatus:e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                    {['Single','Married','Divorced','Widowed'].map(m=><option key={m}>{m}</option>)}
                  </Dropdown>
                </div>
                <Input label="Phone *" value={editData.phone} onChange={e=>setEditData({...editData,phone:e.target.value})} placeholder="03XX-XXXXXXX"/>
                <Input label="Email" value={editData.email} onChange={e=>setEditData({...editData,email:e.target.value})} type="email"/>
                <div className="sm:col-span-2">
                  <Input label="Address" value={editData.address} onChange={e=>setEditData({...editData,address:e.target.value})}/>
                </div>
              </div>
            </div>

            {/* Position */}
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Position & Experience</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Applying for Subject *</label>
                  <Dropdown value={editData.applyingFor} onChange={e=>setEditData({...editData,applyingFor:e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                    {SUBJECTS.map(s=><option key={s}>{s}</option>)}
                  </Dropdown>
                </div>
                <Input label="Experience" value={editData.experience} onChange={e=>setEditData({...editData,experience:e.target.value})} placeholder="e.g. 5 Years / Fresher"/>
                <Input label="Previous School" value={editData.previousSchool} onChange={e=>setEditData({...editData,previousSchool:e.target.value})}/>
                <Input label="Previous Salary" type="number" value={editData.previousSalary} onChange={e=>setEditData({...editData,previousSalary:e.target.value})} placeholder="Rs"/>
                <Input label="Expected Salary" type="number" value={editData.expectedSalary} onChange={e=>setEditData({...editData,expectedSalary:e.target.value})} placeholder="Rs"/>
              </div>
            </div>

            {/* Education */}
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Education</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Highest Qualification</label>
                  <Dropdown value={editData.qualification} onChange={e=>setEditData({...editData,qualification:e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                    {['Matric','Intermediate','B.Ed','B.Sc','M.Sc','M.A','M.Ed','M.Phil','Ph.D','Other'].map(q=><option key={q}>{q}</option>)}
                  </Dropdown>
                </div>
                <Input label="University / Board" value={editData.university} onChange={e=>setEditData({...editData,university:e.target.value})} placeholder="Institution name"/>
                <Input label="Passing Year" value={editData.passingYear} onChange={e=>setEditData({...editData,passingYear:e.target.value})} placeholder="e.g. 2020"/>
              </div>
            </div>

            {/* Other */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Skills / Competencies</label>
                <textarea value={editData.skills} onChange={e=>setEditData({...editData,skills:e.target.value})} rows={2} placeholder="e.g. MS Office, Smart Board, IELTS…" className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">References</label>
                <textarea value={editData.references} onChange={e=>setEditData({...editData,references:e.target.value})} rows={2} placeholder="Name, Position, Phone…" className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"/>
              </div>
            </div>

            {/* Status & Interview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Status</label>
                <Dropdown value={editData.status} onChange={e=>setEditData({...editData,status:e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                  {Object.keys(statusColors).map(s=><option key={s}>{s}</option>)}
                </Dropdown>
              </div>
              <Input label="Interview Date" type="datetime-local" value={editData.interviewDate} onChange={e=>setEditData({...editData,interviewDate:e.target.value})}/>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Remarks</label>
                <textarea value={editData.remarks} onChange={e=>setEditData({...editData,remarks:e.target.value})} rows={1} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"/>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={()=>setModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={save} disabled={saving}>{saving?'Saving…':'Save Application'}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── View Modal ───────────────────────────────────────────────────────── */}
      <Modal open={viewOpen} onClose={()=>setView(false)} title="Application Details" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
              {selected.photo
                ? <img src={`${API_BASE}${selected.photo}`} className="w-20 h-24 rounded-xl object-cover border-2 border-blue-100 flex-shrink-0" alt=""/>
                : <Avatar name={selected.fullName} size="lg"/>
              }
              <div>
                <h3 className="font-display font-bold text-slate-800 text-lg">{selected.fullName}</h3>
                <div className="text-primary-600 font-medium">{selected.applyingFor} Teacher</div>
                <Badge variant={statusColors[selected.status]||'gray'}>{selected.status}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['CNIC',selected.cnic],['Phone',selected.phone],
                ['Qualification',selected.qualification],['Experience',selected.experience||'Fresher'],
                ['Previous School',selected.previousSchool||'—'],['Expected Salary',`Rs ${selected.expectedSalary||'—'}`],
                ['Interview Date',selected.interviewDate?.slice(0,16)||'—'],['Remarks',selected.remarks||'—'],
              ].map(([k,v])=>(
                <div key={k}><span className="text-slate-400 block text-xs mb-0.5">{k}</span><span className="text-slate-700 font-medium">{v}</span></div>
              ))}
            </div>
            <div className="flex gap-2 pt-3 border-t border-slate-100 flex-wrap">
              <Button variant="secondary" size="sm" icon={Printer} onClick={()=>{setView(false);printApplication(selected);}}>Print Application</Button>
              {['Shortlisted','Interview Scheduled'].includes(selected.status) && (
                <Button variant="secondary" size="sm" icon={Printer} onClick={()=>{setView(false);printInterviewLetter(selected);}}>Interview Letter</Button>
              )}
              {selected.status==='Applied' && <Button variant="success" size="sm" onClick={()=>{quickStatus(selected._id,'Shortlisted');setView(false);}}>Shortlist</Button>}
              {selected.status==='Shortlisted' && <Button variant="primary" size="sm" onClick={()=>{quickStatus(selected._id,'Hired');setView(false);}}>Hire</Button>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
