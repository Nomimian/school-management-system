import { useState, useEffect, useCallback, useRef } from 'react';
import { SERVER_URL } from '../config/env.js';
import {
  Plus, Search, Eye, Edit2, Trash2, Loader2, UserPlus,
  Camera, Printer, X, Upload
} from 'lucide-react';
import { admissionAPI, schoolAPI } from '../services/api';
import { useSchool } from '../hooks/useSchool.jsx';
import { buildPrintPage, openPrintWindow, stampEnabled } from '../components/print/PrintComponents.jsx';
import { SectionHeader, Card, Badge, Button, Modal, Input, Avatar, useToast, useConfirm, Dropdown, EmptyState, TableSkeleton } from '../components/ui';
import { ReportMenu } from '../components/ReportMenu.jsx';
import { DateRangePicker } from '../components/DateRangePicker.jsx';
import { inDateRange, rangeLabel, rangeSlug } from '../utils/reportExport.js';
import { startOfMonth, endOfMonth, endOfDay } from 'date-fns';
import { useClasses } from '../hooks/useClasses';

const API_BASE = SERVER_URL;

const statusColors = {
  Applied:'blue','Test Scheduled':'orange',Interviewed:'purple',
  Approved:'teal',Rejected:'red',Enrolled:'green',
};
const emptyForm = {
  applicantName:'',applyingClass:'',gender:'Male',dateOfBirth:'',
  religion:'Islam',bloodGroup:'',previousSchool:'',previousClass:'',
  guardian:{ name:'',relationship:'Father',phone:'',cnic:'',occupation:'',email:'' },
  address:'',testDate:'',testMarks:'',status:'Applied',
  registrationFee:500,remarks:'',photo:'',
};

export default function Admissions() {
  const toast = useToast();
  const confirm = useConfirm();
  const { school } = useSchool();
  const { names: classes } = useClasses();   // dynamic class list from the school's setup (no fixed cap)
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilter]   = useState('');
  const [modalOpen, setModal]       = useState(false);
  const [viewOpen, setView]         = useState(false);
  const [selected, setSelected]     = useState(null);
  const [editData, setEditData]     = useState(null);
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      const res = await admissionAPI.getAll(params);
      setAdmissions(res.data || []);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  }, [search, filterStatus]);

  useEffect(() => { fetch(); }, [fetch]);

  // ── Date-range admissions statement (by application date) ────────────────────
  const [range, setRange] = useState({ from: startOfMonth(new Date()), to: endOfDay(endOfMonth(new Date())) });
  const repRows = admissions.filter(a => inDateRange(a.createdAt || a.admissionDate, range.from, range.to));

  const REPORT_COLS = [
    { key:'applicantName', label:'Applicant',   value:a => a.applicantName || '—' },
    { key:'admissionNo',   label:'Adm No',      value:a => a.admissionNo || '—' },
    { key:'applyingClass', label:'Class',       value:a => a.applyingClass || '—' },
    { key:'guardian',      label:'Guardian',    value:a => a.guardian?.name || '—' },
    { key:'phone',         label:'Phone',       value:a => a.guardian?.phone || '—' },
    { key:'status',        label:'Status',      value:a => a.status,
      pdf:a => `<span class="badge badge-${(a.status||'').toLowerCase()==='enrolled'?'paid':'pending'}">${a.status||''}</span>` },
    { key:'date',          label:'Applied On',  value:a => (a.createdAt || a.admissionDate || '').slice(0,10) || '—' },
  ];
  const byStatus = (s) => repRows.filter(a => a.status === s).length;
  const REPORT_TOTALS = [
    { label:'Applications', value:repRows.length },
    { label:'Approved',     value:byStatus('Approved') },
    { label:'Enrolled',     value:byStatus('Enrolled') },
    { label:'Rejected',     value:byStatus('Rejected') },
  ];

  const openAdd  = () => { setEditData({...emptyForm}); setErr(''); setModal(true); };
  const openEdit = (a) => {
    setEditData({ ...a,
      dateOfBirth: a.dateOfBirth?.slice(0,10)||'',
      testDate: a.testDate?.slice(0,10)||'',
    });
    setErr(''); setModal(true);
  };

  // ── Photo upload ───────────────────────────────────────────────────────────
  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await schoolAPI.uploadStudentPhoto(fd);
      if (res.success) { setEditData(d => ({...d, photo: res.url})); toast.success('Photo uploaded'); }
      else toast.error(res.message);
    } catch(e2) { toast.error(e2.message); }
    finally { setPhotoUploading(false); }
  };

  const save = async () => {
    setSaving(true); setErr('');
    try {
      if (editData._id) await admissionAPI.update(editData._id, editData);
      else await admissionAPI.create(editData);
      setModal(false); fetch();
      toast.success(editData._id ? 'Application updated' : 'Application submitted');
    } catch(e) { setErr(e.message); } finally { setSaving(false); }
  };

  const quickStatus = async (id, status) => {
    const res = await admissionAPI.update(id, { status }); fetch();
    if (status === 'Enrolled' && res?.enrolledStudent)
      toast.success(`${res.enrolledStudent.name} enrolled — added to the Students roster`);
    else
      toast.success(`Status updated to ${status}`);
  };
  const remove = async (id) => {
    if (!(await confirm({ title:'Delete admission?', message:'This permanently removes the admission record.', tone:'danger', confirmText:'Delete' }))) return;
    await admissionAPI.delete(id); fetch();
    toast.success('Admission deleted');
  };

  // ── Print Admission Form ───────────────────────────────────────────────────
  const printAdmissionForm = (a) => {
    const photoHtml = a.photo
      ? `<img src="${API_BASE}${a.photo}" style="width:90px;height:110px;object-fit:cover;border:2px solid #e2e8f0;border-radius:6px;float:right;margin-left:12px;"/>`
      : `<div style="width:90px;height:110px;border:2px dashed #e2e8f0;border-radius:6px;float:right;margin-left:12px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#94a3b8;text-align:center;">Photo<br/>Here</div>`;

    const stampHtml = (stampEnabled(school, 'admission') && school?.stamp)
      ? `<div style="text-align:center;margin-top:16px;opacity:0.7;"><img src="${API_BASE}${school.stamp}" style="width:90px;height:90px;border-radius:50%;"/></div>`
      : '';

    const content = `
      <div style="overflow:hidden;">
        ${photoHtml}
        <div class="info-grid" style="grid-template-columns:1fr 1fr 1fr;">
          <div class="info-item"><label>Admission No.</label><span>${a.admissionNo||'—'}</span></div>
          <div class="info-item"><label>Date</label><span>${new Date(a.createdAt||Date.now()).toLocaleDateString('en-PK')}</span></div>
          <div class="info-item"><label>Status</label><span>${a.status}</span></div>
        </div>
      </div>
      <h3 style="font-size:13px;font-weight:bold;color:#475569;margin:10px 0 6px;text-transform:uppercase;letter-spacing:.5px;">Applicant Information</h3>
      <div class="info-grid">
        <div class="info-item"><label>Full Name</label><span>${a.applicantName}</span></div>
        <div class="info-item"><label>Applying for Class</label><span>${a.applyingClass}</span></div>
        <div class="info-item"><label>Date of Birth</label><span>${a.dateOfBirth?.slice(0,10)||'—'}</span></div>
        <div class="info-item"><label>Gender</label><span>${a.gender}</span></div>
        <div class="info-item"><label>Religion</label><span>${a.religion||'—'}</span></div>
        <div class="info-item"><label>Blood Group</label><span>${a.bloodGroup||'—'}</span></div>
        <div class="info-item"><label>Previous School</label><span>${a.previousSchool||'—'}</span></div>
        <div class="info-item"><label>Previous Class</label><span>${a.previousClass||'—'}</span></div>
      </div>
      <h3 style="font-size:13px;font-weight:bold;color:#475569;margin:10px 0 6px;text-transform:uppercase;letter-spacing:.5px;">Guardian Information</h3>
      <div class="info-grid">
        <div class="info-item"><label>Guardian Name</label><span>${a.guardian?.name||'—'}</span></div>
        <div class="info-item"><label>Relationship</label><span>${a.guardian?.relationship||'—'}</span></div>
        <div class="info-item"><label>Phone</label><span>${a.guardian?.phone||'—'}</span></div>
        <div class="info-item"><label>CNIC</label><span>${a.guardian?.cnic||'—'}</span></div>
        <div class="info-item"><label>Occupation</label><span>${a.guardian?.occupation||'—'}</span></div>
        <div class="info-item"><label>Email</label><span>${a.guardian?.email||'—'}</span></div>
      </div>
      <div class="info-grid" style="grid-template-columns:1fr;">
        <div class="info-item"><label>Address</label><span>${a.address||'—'}</span></div>
      </div>
      ${a.testDate ? `
      <h3 style="font-size:13px;font-weight:bold;color:#475569;margin:10px 0 6px;text-transform:uppercase;letter-spacing:.5px;">Test / Interview</h3>
      <div class="info-grid">
        <div class="info-item"><label>Test Date</label><span>${a.testDate?.slice(0,10)||'—'}</span></div>
        <div class="info-item"><label>Test Marks</label><span>${a.testMarks ?? '—'}</span></div>
      </div>` : ''}
      <div style="background:#f8fafc;padding:10px 12px;border-radius:6px;margin-top:8px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;">
          <span>Registration Fee: <strong>Rs ${a.registrationFee||0}</strong></span>
          <span>Fee Paid: <strong>${a.feePaid ? '✓ Yes' : '✗ No'}</strong></span>
        </div>
        ${a.remarks ? `<div style="font-size:11px;color:#64748b;margin-top:4px;">Remarks: ${a.remarks}</div>` : ''}
      </div>
      ${stampHtml}
      <div class="sig-row">
        <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Parent / Guardian Signature</div></div>
        <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Admission Officer</div></div>
        <div class="sig-box"><div class="sig-line"></div><div class="sig-label">${school?.principal||'Principal'}</div></div>
      </div>`;

    openPrintWindow(buildPrintPage(content, school, 'Admission Form', 'admission'));
  };

  const stats = {
    total:repRows.length,
    applied:repRows.filter(a=>a.status==='Applied').length,
    approved:repRows.filter(a=>a.status==='Approved').length,
    enrolled:repRows.filter(a=>a.status==='Enrolled').length,
    rejected:repRows.filter(a=>a.status==='Rejected').length,
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Admissions Management"
        subtitle="New-applicant pipeline — marking an applicant “Enrolled” adds them to Students automatically"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker from={range.from} to={range.to} onApply={(from,to)=>setRange({from,to})} />
            <ReportMenu
              title={`Admissions Statement — ${rangeLabel(range.from, range.to)}`}
              subtitle={school?.name}
              filename={`admissions-${rangeSlug(range.from, range.to)}`}
              columns={REPORT_COLS} rows={repRows} totals={REPORT_TOTALS} docType="admission" />
            <Button variant="primary" size="sm" icon={UserPlus} onClick={openAdd}>New Application</Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {label:'Total',val:stats.total,cls:'bg-blue-50 text-blue-700 border-blue-200'},
          {label:'Applied',val:stats.applied,cls:'bg-indigo-50 text-indigo-700 border-indigo-200'},
          {label:'Approved',val:stats.approved,cls:'bg-teal-50 text-teal-700 border-teal-200'},
          {label:'Enrolled',val:stats.enrolled,cls:'bg-emerald-50 text-emerald-700 border-emerald-200'},
          {label:'Rejected',val:stats.rejected,cls:'bg-red-50 text-red-600 border-red-200'},
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
            <input placeholder="Search name or admission no…" value={search} onChange={e=>setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200"/>
          </div>
          <Dropdown value={filterStatus} onChange={e=>setFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
            <option value="">All Status</option>
            {['Applied','Test Scheduled','Interviewed','Approved','Rejected','Enrolled'].map(s=><option key={s}>{s}</option>)}
          </Dropdown>
        </div>

        <div className="overflow-x-auto">
          {loading
            ? <TableSkeleton rows={6} cols={6}/>
            : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Applicant','Adm No','Class','Guardian','Phone','Test','Status','Actions'].map(h=>(
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {repRows.map(a => (
                  <tr key={a._id} className="border-b border-slate-50 hover:bg-primary-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {a.photo
                          ? <img src={`${API_BASE}${a.photo}`} className="w-10 h-10 rounded-full object-cover border-2 border-blue-100" alt=""/>
                          : <Avatar name={a.applicantName} size="md"/>
                        }
                        <div>
                          <div className="font-medium text-slate-800">{a.applicantName}</div>
                          <div className="text-xs text-slate-400">{a.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{a.admissionNo}</td>
                    <td className="px-4 py-3"><Badge variant="blue">{a.applyingClass}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{a.guardian?.name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{a.guardian?.phone}</td>
                    <td className="px-4 py-3 text-center">
                      {a.testMarks != null
                        ? <span className={`font-bold ${a.testMarks>=40?'text-emerald-600':'text-red-500'}`}>{a.testMarks}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3"><Badge variant={statusColors[a.status]||'gray'}>{a.status}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 items-center flex-wrap">
                        <button onClick={()=>{setSelected(a);setView(true);}} className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600" title="View"><Eye size={14}/></button>
                        <button onClick={()=>openEdit(a)} className="p-1.5 rounded-lg hover:bg-orange-100 text-slate-400 hover:text-orange-600" title="Edit"><Edit2 size={14}/></button>
                        <button onClick={()=>printAdmissionForm(a)} className="p-1.5 rounded-lg hover:bg-purple-100 text-slate-400 hover:text-purple-600" title="Print"><Printer size={14}/></button>
                        {a.status==='Applied' && <button onClick={()=>quickStatus(a._id,'Approved')} className="text-xs bg-teal-100 text-teal-700 hover:bg-teal-200 px-2 py-1 rounded-lg font-medium">Approve</button>}
                        {a.status==='Approved' && <button onClick={()=>quickStatus(a._id,'Enrolled')} className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-1 rounded-lg font-medium">Enroll</button>}
                        <button onClick={()=>remove(a._id)} className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500" title="Delete"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && repRows.length===0 && (
            <EmptyState icon={UserPlus} title="No admissions in this range"
              subtitle={admissions.length ? 'Try widening the date range (e.g. “All time”).' : 'New admission applications will appear here.'} />
          )}
        </div>
      </Card>

      {/* ── Add/Edit Modal ───────────────────────────────────────────────────── */}
      <Modal open={modalOpen} onClose={()=>setModal(false)} title={editData?._id ? 'Edit Application' : 'New Admission Application'} size="xl">
        {editData && (
          <div className="space-y-5">
            {err && <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-2 text-sm">{err}</div>}

            {/* Photo Upload */}
            <div className="flex items-start gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="relative flex-shrink-0">
                {editData.photo
                  ? <img src={`${API_BASE}${editData.photo}`} className="w-24 h-28 rounded-xl object-cover border-2 border-blue-200 shadow" alt="Student"/>
                  : <div className="w-24 h-28 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex flex-col items-center justify-center text-blue-400 border-2 border-dashed border-blue-300">
                      <Camera size={24}/>
                      <span className="text-[10px] mt-1 font-medium">Photo</span>
                    </div>
                }
                {photoUploading && (
                  <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-primary-600"/>
                  </div>
                )}
              </div>
              <div>
                <div className="font-semibold text-slate-700 mb-1">Student Photo</div>
                <div className="text-xs text-slate-400 mb-3">Upload a recent passport-size photo. JPG/PNG, max 5MB.</div>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange}/>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" icon={Upload} onClick={()=>photoInputRef.current?.click()} disabled={photoUploading}>
                    {photoUploading ? 'Uploading…' : 'Upload Photo'}
                  </Button>
                  {editData.photo && (
                    <Button variant="ghost" size="sm" icon={X} onClick={()=>setEditData(d=>({...d,photo:''}))}>Remove</Button>
                  )}
                </div>
              </div>
            </div>

            {/* Applicant Info */}
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Applicant Information</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Full Name *" value={editData.applicantName} onChange={e=>setEditData({...editData,applicantName:e.target.value})} placeholder="Student full name"/>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Applying Class *</label>
                  <Dropdown value={editData.applyingClass} onChange={e=>setEditData({...editData,applyingClass:e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
                    <option value="">{classes.length ? 'Select class' : 'No classes yet — add them in Classes'}</option>
                    {classes.map(c=><option key={c}>{c}</option>)}
                  </Dropdown>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Gender</label>
                  <Dropdown value={editData.gender} onChange={e=>setEditData({...editData,gender:e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
                    <option>Male</option><option>Female</option>
                  </Dropdown>
                </div>
                <Input label="Date of Birth" type="date" value={editData.dateOfBirth} onChange={e=>setEditData({...editData,dateOfBirth:e.target.value})}/>
                <Input label="Blood Group" value={editData.bloodGroup} onChange={e=>setEditData({...editData,bloodGroup:e.target.value})} placeholder="A+, B-, O+"/>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Religion</label>
                  <Dropdown value={editData.religion} onChange={e=>setEditData({...editData,religion:e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
                    {['Islam','Christianity','Hinduism','Other'].map(r=><option key={r}>{r}</option>)}
                  </Dropdown>
                </div>
                <Input label="Previous School" value={editData.previousSchool} onChange={e=>setEditData({...editData,previousSchool:e.target.value})} placeholder="Previous school name"/>
                <Input label="Previous Class" value={editData.previousClass} onChange={e=>setEditData({...editData,previousClass:e.target.value})} placeholder="e.g. Grade 5"/>
              </div>
            </div>

            {/* Guardian Info */}
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Guardian Information</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Guardian Name *" value={editData.guardian?.name||''} onChange={e=>setEditData({...editData,guardian:{...editData.guardian,name:e.target.value}})}/>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Relationship</label>
                  <Dropdown value={editData.guardian?.relationship||'Father'} onChange={e=>setEditData({...editData,guardian:{...editData.guardian,relationship:e.target.value}})} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
                    {['Father','Mother','Guardian','Uncle','Aunt'].map(r=><option key={r}>{r}</option>)}
                  </Dropdown>
                </div>
                <Input label="Phone *" value={editData.guardian?.phone||''} onChange={e=>setEditData({...editData,guardian:{...editData.guardian,phone:e.target.value}})} placeholder="03XX-XXXXXXX"/>
                <Input label="CNIC" value={editData.guardian?.cnic||''} onChange={e=>setEditData({...editData,guardian:{...editData.guardian,cnic:e.target.value}})} placeholder="XXXXX-XXXXXXX-X"/>
                <Input label="Occupation" value={editData.guardian?.occupation||''} onChange={e=>setEditData({...editData,guardian:{...editData.guardian,occupation:e.target.value}})}/>
                <Input label="Email" value={editData.guardian?.email||''} onChange={e=>setEditData({...editData,guardian:{...editData.guardian,email:e.target.value}})}/>
                <div className="sm:col-span-2">
                  <Input label="Home Address" value={editData.address||''} onChange={e=>setEditData({...editData,address:e.target.value})} placeholder="Full address"/>
                </div>
              </div>
            </div>

            {/* Test & Status */}
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Test & Status</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Test Date" type="date" value={editData.testDate||''} onChange={e=>setEditData({...editData,testDate:e.target.value})}/>
                <Input label="Test Marks (out of 100)" type="number" value={editData.testMarks||''} onChange={e=>setEditData({...editData,testMarks:Number(e.target.value)})}/>
                <Input label="Registration Fee (Rs)" type="number" value={editData.registrationFee} onChange={e=>setEditData({...editData,registrationFee:Number(e.target.value)})}/>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <Dropdown value={editData.status} onChange={e=>setEditData({...editData,status:e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
                    {['Applied','Test Scheduled','Interviewed','Approved','Rejected','Enrolled'].map(s=><option key={s}>{s}</option>)}
                  </Dropdown>
                </div>
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Remarks</label>
                  <textarea value={editData.remarks||''} onChange={e=>setEditData({...editData,remarks:e.target.value})} rows={2}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none"/>
                </div>
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
      <Modal open={viewOpen} onClose={()=>setView(false)} title="Admission Details" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
              {selected.photo
                ? <img src={`${API_BASE}${selected.photo}`} className="w-20 h-24 rounded-xl object-cover border-2 border-blue-100 flex-shrink-0" alt=""/>
                : <Avatar name={selected.applicantName} size="lg"/>
              }
              <div>
                <h3 className="font-display font-bold text-slate-800 text-lg">{selected.applicantName}</h3>
                <div className="text-slate-500 text-sm">{selected.admissionNo} · {selected.applyingClass}</div>
                <Badge variant={statusColors[selected.status]||'gray'}>{selected.status}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Gender',selected.gender],['DOB',selected.dateOfBirth?.slice(0,10)],
                ['Blood Group',selected.bloodGroup],['Religion',selected.religion],
                ['Previous School',selected.previousSchool],['Test Marks',selected.testMarks??'—'],
                ['Guardian',selected.guardian?.name],['Phone',selected.guardian?.phone],
                ['CNIC',selected.guardian?.cnic],['Occupation',selected.guardian?.occupation],
                ['Reg Fee',`Rs ${selected.registrationFee}`],['Fee Paid',selected.feePaid?'Yes':'No'],
              ].map(([k,v])=>(
                <div key={k}><span className="text-slate-400 block text-xs mb-0.5">{k}</span><span className="text-slate-700 font-medium">{v||'—'}</span></div>
              ))}
              <div className="col-span-2"><span className="text-slate-400 block text-xs mb-0.5">Address</span><span className="text-slate-700">{selected.address||'—'}</span></div>
            </div>
            <div className="flex gap-2 pt-3 border-t border-slate-100 flex-wrap">
              <Button variant="print" size="sm" icon={Printer} onClick={()=>{setView(false);printAdmissionForm(selected);}}>Print Form</Button>
              {selected.status==='Applied' && <Button variant="success" size="sm" onClick={()=>{quickStatus(selected._id,'Approved');setView(false);}}>Approve</Button>}
              {selected.status==='Approved' && <Button variant="primary" size="sm" onClick={()=>{quickStatus(selected._id,'Enrolled');setView(false);}}>Enroll Student</Button>}
              {!['Rejected','Enrolled'].includes(selected.status) && (
                <Button variant="danger" size="sm" onClick={()=>{quickStatus(selected._id,'Rejected');setView(false);}}>Reject</Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
