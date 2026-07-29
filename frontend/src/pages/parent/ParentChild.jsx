import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2, ArrowLeft, CalendarCheck, Wallet, Award, BookMarked, User, Clock, Scroll,
  Printer, Upload, CheckCircle2, ChevronLeft, ChevronRight, FileText,
} from 'lucide-react';
import { Card, Badge, Button, Modal, useToast } from '../../components/ui';
import { portalAPI, attachmentAPI } from '../../services/api';
import { useSchool } from '../../hooks/useSchool.jsx';
import { SERVER_URL } from '../../config/env.js';
import { buildPrintPage, openPrintWindow } from '../../components/print/PrintComponents.jsx';

const money = (n) => 'Rs ' + (Number(n) || 0).toLocaleString();
const fileUrl = (u) => (u?.startsWith('http') ? u : `${SERVER_URL}${u}`);
const STATUS_TONE = { Present: 'green', Absent: 'red', Late: 'orange', Leave: 'gray', Paid: 'green', Pending: 'orange', Overdue: 'red', Partial: 'purple' };
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const TABS = [
  { id: 'profile',    label: 'Profile',    icon: User },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'fees',       label: 'Fees',       icon: Wallet },
  { id: 'results',    label: 'Results',    icon: Award },
  { id: 'homework',   label: 'Homework',   icon: BookMarked },
  { id: 'timetable',  label: 'Timetable',  icon: Clock },
  { id: 'certificates', label: 'Certificates', icon: Scroll },
];

export default function ParentChild() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { school } = useSchool();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('profile');
  const [hwTarget, setHwTarget] = useState(null);   // homework being submitted

  const load = () => {
    setLoading(true);
    portalAPI.child(id).then(r => setData(r.data)).catch(e => setErr(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={30} className="animate-spin text-primary-600"/></div>;
  if (err) return (
    <div className="space-y-4">
      <button onClick={() => navigate('/parent')} className="text-sm text-primary-600 flex items-center gap-1"><ArrowLeft size={15}/> Back</button>
      <Card className="p-6 text-red-600">{err}</Card>
    </div>
  );

  const { student, attendance = [], fees = [], results = [], homework = [], timetable = [], certificates = [], transport, health, summary = {} } = data;

  // ── print builders ──────────────────────────────────────────────────────────
  const printChallan = (f) => {
    const items = f.items?.length ? f.items : [{ name: `School Fee – ${f.month} ${f.year}`, amount: f.amount, discount: 0 }];
    const rows = items.map(it => `<tr><td>${it.name}</td><td style="text-align:right">Rs ${(it.amount||0).toLocaleString()}</td><td style="text-align:right">Rs ${(it.discount||0).toLocaleString()}</td><td style="text-align:right">Rs ${((it.amount||0)-(it.discount||0)).toLocaleString()}</td></tr>`).join('');
    const content = `
      <div class="info-grid" style="grid-template-columns:1fr 1fr 1fr;">
        <div class="info-item"><label>Student</label><span>${student.name}</span></div>
        <div class="info-item"><label>Class</label><span>${student.class}${student.section ? ' · '+student.section : ''}</span></div>
        <div class="info-item"><label>Roll / ID</label><span>${student.rollNumber || student.studentId || '—'}</span></div>
        <div class="info-item"><label>Fee For</label><span>${f.month} ${f.year}</span></div>
        <div class="info-item"><label>Status</label><span><span class="badge badge-${(f.status||'pending').toLowerCase()}">${f.status}</span></span></div>
        <div class="info-item"><label>Due Date</label><span>${f.dueDate ? new Date(f.dueDate).toLocaleDateString('en-PK') : '—'}</span></div>
      </div>
      <table><thead><tr><th>Fee Head</th><th style="text-align:right">Amount</th><th style="text-align:right">Discount</th><th style="text-align:right">Payable</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="display:flex;justify-content:flex-end;gap:24px;font-size:13px;margin-top:6px;">
        <span>Total: <strong>Rs ${(f.amount||0).toLocaleString()}</strong></span>
        <span>Paid: <strong style="color:#059669">Rs ${(f.paid||0).toLocaleString()}</strong></span>
        <span>Balance: <strong style="color:#dc2626">Rs ${((f.amount||0)-(f.paid||0)).toLocaleString()}</strong></span>
      </div>
      <div class="sig-row"><div class="sig-box"><div class="sig-line"></div><div class="sig-label">Parent / Guardian</div></div><div class="sig-box"><div class="sig-line"></div><div class="sig-label">Accountant</div></div></div>`;
    openPrintWindow(buildPrintPage(content, school, f.status === 'Paid' ? 'Fee Receipt' : 'Fee Challan', 'fee'));
  };

  const printReportCard = () => {
    if (!results.length) return toast.error('No results to print yet.');
    const rows = results.map(r => `<tr>
        <td>${r.exam?.name || '—'}</td><td>${r.exam?.subject || '—'}</td>
        <td style="text-align:center">${r.marks} / ${r.exam?.totalMarks || 100}</td>
        <td style="text-align:center">${r.grade || '—'}</td>
        <td style="text-align:center;color:${r.isPassed ? '#059669' : '#dc2626'};font-weight:bold">${r.isPassed ? 'Pass' : 'Fail'}</td>
      </tr>`).join('');
    const obtained = results.reduce((s, r) => s + (r.marks || 0), 0);
    const outOf = results.reduce((s, r) => s + (r.exam?.totalMarks || 100), 0);
    const pct = outOf ? Math.round((obtained / outOf) * 100) : 0;
    const content = `
      <div class="info-grid">
        <div class="info-item"><label>Student</label><span>${student.name}</span></div>
        <div class="info-item"><label>Class</label><span>${student.class}${student.section ? ' · '+student.section : ''}</span></div>
        <div class="info-item"><label>Roll / ID</label><span>${student.rollNumber || student.studentId || '—'}</span></div>
        <div class="info-item"><label>Father / Guardian</label><span>${student.guardian?.name || '—'}</span></div>
      </div>
      <table><thead><tr><th>Exam</th><th>Subject</th><th style="text-align:center">Marks</th><th style="text-align:center">Grade</th><th style="text-align:center">Result</th></tr></thead><tbody>${rows}</tbody>
        <tfoot><tr><td colspan="2" style="text-align:right;font-weight:bold">Total</td><td style="text-align:center;font-weight:bold">${obtained} / ${outOf}</td><td colspan="2" style="text-align:center;font-weight:bold">${pct}%</td></tr></tfoot>
      </table>
      <div class="sig-row"><div class="sig-box"><div class="sig-line"></div><div class="sig-label">Class Teacher</div></div><div class="sig-box"><div class="sig-line"></div><div class="sig-label">${school?.principal || 'Principal'}</div></div></div>`;
    openPrintWindow(buildPrintPage(content, school, 'Report Card', 'result'));
  };

  const printCertificate = (c) => {
    const content = `
      <div style="text-align:center;margin:10px 0 18px;">
        <div class="doc-title" style="font-size:14px;">Certificate of ${c.type}</div>
      </div>
      <p style="font-size:14px;line-height:2;text-align:center;padding:0 20px;">
        ${c.content || `This is to certify that <strong>${student.name}</strong>, ${student.gender === 'Female' ? 'daughter' : 'son'} of ${student.guardian?.name || '—'}, of class ${student.class}, is a student of this institution.`}
      </p>
      <div class="info-grid" style="margin-top:20px;">
        <div class="info-item"><label>Student</label><span>${student.name}</span></div>
        <div class="info-item"><label>Class</label><span>${student.class}${student.section ? ' · '+student.section : ''}</span></div>
        <div class="info-item"><label>Serial No</label><span>${c.serialNo || '—'}</span></div>
        <div class="info-item"><label>Issue Date</label><span>${c.issueDate ? new Date(c.issueDate).toLocaleDateString('en-PK') : '—'}</span></div>
      </div>
      <div class="sig-row"><div class="sig-box"><div class="sig-line"></div><div class="sig-label">${c.issuedBy || 'Issued By'}</div></div><div class="sig-box"><div class="sig-line"></div><div class="sig-label">${school?.principal || 'Principal'}</div></div></div>`;
    openPrintWindow(buildPrintPage(content, school, `${c.type} Certificate`, 'certificate'));
  };

  return (
    <div className="space-y-5 animate-rise">
      <button onClick={() => navigate('/parent')} className="text-sm text-primary-600 flex items-center gap-1 hover:underline"><ArrowLeft size={15}/> Back to overview</button>

      {/* Header */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center text-white text-2xl font-display font-bold flex-shrink-0">{student.name.charAt(0)}</div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-bold text-slate-800 text-xl truncate">{student.name}</div>
            <div className="text-sm text-slate-400">Class {student.class}{student.section ? `-${student.section}` : ''} · Roll {student.rollNumber || '—'} · {student.studentId || ''}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          <Metric label="Attendance" value={summary.attendancePct != null ? `${summary.attendancePct}%` : '—'} tone={summary.attendancePct == null ? 'gray' : summary.attendancePct >= 75 ? 'green' : 'red'}/>
          <Metric label="Fees Paid" value={money(summary.feePaid)} tone="green"/>
          <Metric label="Balance" value={money(summary.feeBalance)} tone={summary.feeBalance > 0 ? 'red' : 'green'}/>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${tab === t.id ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-primary-50'}`}>
            <t.icon size={15}/>{t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileTab student={student} transport={transport} health={health}/>}

      {tab === 'attendance' && <AttendanceTab records={attendance}/>}

      {tab === 'fees' && (
        <TableCard empty={!fees.length} emptyText="No fee records yet."
          head={['Month', 'Amount', 'Paid', 'Balance', 'Status', '']}
          rows={fees.map(f => [
            `${f.month} ${f.year}`, money(f.amount), money(f.paid), money((f.amount || 0) - (f.paid || 0)),
            <Badge variant={STATUS_TONE[f.status] || 'gray'}>{f.status}</Badge>,
            <button onClick={() => printChallan(f)} className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1"><Printer size={12}/> {f.status === 'Paid' ? 'Receipt' : 'Challan'}</button>,
          ])}/>
      )}

      {tab === 'results' && (
        <div className="space-y-3">
          {results.length > 0 && <div className="flex justify-end"><Button variant="print" size="sm" icon={Printer} onClick={printReportCard}>Download Report Card</Button></div>}
          <TableCard empty={!results.length} emptyText="No results published yet."
            head={['Exam', 'Subject', 'Marks', 'Grade', 'Result']}
            rows={results.map(r => [
              r.exam?.name || '—', r.exam?.subject || '—', `${r.marks} / ${r.exam?.totalMarks || 100}`,
              <Badge variant="blue">{r.grade || '—'}</Badge>,
              <span className={r.isPassed ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>{r.isPassed ? 'Pass' : 'Fail'}</span>,
            ])}/>
        </div>
      )}

      {tab === 'homework' && <HomeworkTab homework={homework} onSubmit={setHwTarget}/>}

      {tab === 'timetable' && <TimetableTab timetable={timetable}/>}

      {tab === 'certificates' && (
        <TableCard empty={!certificates.length} emptyText="No certificates issued yet."
          head={['Type', 'Serial', 'Issued', '']}
          rows={certificates.map(c => [
            <Badge variant="teal">{c.type}</Badge>, c.serialNo || '—',
            c.issueDate ? new Date(c.issueDate).toLocaleDateString() : '—',
            <button onClick={() => printCertificate(c)} className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1"><Printer size={12}/> Print</button>,
          ])}/>
      )}

      <SubmitHomeworkModal open={!!hwTarget} homework={hwTarget} childId={id} onClose={() => setHwTarget(null)} onDone={() => { setHwTarget(null); load(); }}/>
    </div>
  );
}

// ── Profile ──────────────────────────────────────────────────────────────────
function ProfileTab({ student, transport, health }) {
  const rows = [
    ['Full Name', student.name], ['Student ID', student.studentId], ['Roll Number', student.rollNumber],
    ['Class', `${student.class}${student.section ? ' · ' + student.section : ''}`],
    ['Gender', student.gender], ['Date of Birth', student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '—'],
    ['Blood Group', student.bloodGroup], ['Religion', student.religion],
    ['Guardian', student.guardian?.name], ['Guardian Phone', student.guardian?.phone],
    ['Address', student.address], ['Admission Date', student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '—'],
  ];
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-display font-bold text-slate-800 mb-3">Student Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-slate-50 py-1.5 text-sm">
              <span className="text-slate-400">{k}</span><span className="font-medium text-slate-700 text-right">{v || '—'}</span>
            </div>
          ))}
        </div>
      </Card>
      {transport && (
        <Card className="p-5">
          <h3 className="font-display font-bold text-slate-800 mb-3">Transport</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            {[['Route', transport.route?.routeName], ['Route No', transport.route?.routeNo], ['Stop', transport.stopName], ['Pickup', transport.pickupTime], ['Drop', transport.dropTime], ['Monthly Fare', transport.monthlyFare ? money(transport.monthlyFare) : '—']].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-slate-50 py-1.5"><span className="text-slate-400">{k}</span><span className="font-medium text-slate-700">{v || '—'}</span></div>
            ))}
          </div>
        </Card>
      )}
      {health && (
        <Card className="p-5">
          <h3 className="font-display font-bold text-slate-800 mb-3">Health</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            {[['Height', health.height && `${health.height} cm`], ['Weight', health.weight && `${health.weight} kg`], ['Blood Group', health.bloodGroup], ['Allergies', (health.allergies || []).join(', ')], ['Last Checkup', health.lastCheckup && new Date(health.lastCheckup).toLocaleDateString()], ['Doctor', health.doctor]].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-slate-50 py-1.5"><span className="text-slate-400">{k}</span><span className="font-medium text-slate-700">{v || '—'}</span></div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Attendance calendar ──────────────────────────────────────────────────────
function AttendanceTab({ records }) {
  const byDate = new Map(records.map(r => [new Date(r.date).toISOString().slice(0, 10), r.status]));
  const latest = records.length ? new Date(records[0].date) : new Date();
  const [cursor, setCursor] = useState(new Date(latest.getFullYear(), latest.getMonth(), 1));

  const y = cursor.getFullYear(), m = cursor.getMonth();
  const firstDay = new Date(y, m, 1).getDay();          // 0=Sun
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const tone = { Present: 'bg-emerald-100 text-emerald-700', Absent: 'bg-red-100 text-red-600', Late: 'bg-orange-100 text-orange-600', Leave: 'bg-slate-100 text-slate-500' };
  const counts = records.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCursor(new Date(y, m - 1, 1))} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ChevronLeft size={18}/></button>
        <div className="font-display font-bold text-slate-800">{cursor.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
        <button onClick={() => setCursor(new Date(y, m + 1, 1))} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ChevronRight size={18}/></button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-[11px] font-semibold text-slate-400 py-1">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i}/>;
          const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const st = byDate.get(key);
          return <div key={i} className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium ${st ? tone[st] : 'text-slate-500'}`} title={st || ''}>{d}</div>;
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-4 text-xs">
        {['Present','Absent','Late','Leave'].map(s => (
          <span key={s} className="inline-flex items-center gap-1.5"><span className={`w-3 h-3 rounded ${tone[s].split(' ')[0]}`}/> {s} <strong className="text-slate-600">{counts[s] || 0}</strong></span>
        ))}
      </div>
    </Card>
  );
}

// ── Homework ─────────────────────────────────────────────────────────────────
function HomeworkTab({ homework, onSubmit }) {
  if (!homework.length) return <Card className="p-10 text-center text-slate-400 text-sm">No homework assigned.</Card>;
  return (
    <div className="space-y-3">
      {homework.map(h => (
        <Card key={h._id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-slate-800">{h.title}</div>
              <div className="text-xs text-slate-400 mt-0.5">{h.subject} · due {h.dueDate ? new Date(h.dueDate).toLocaleDateString() : '—'}</div>
              {h.description && <p className="text-sm text-slate-500 mt-2">{h.description}</p>}
              {(h.attachments || []).map((a, i) => <a key={i} href={fileUrl(a.url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-600 mt-2 mr-3"><FileText size={12}/> {a.name}</a>)}
            </div>
            <div className="flex-shrink-0 text-right">
              {h.mySubmission ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle2 size={14}/> Submitted</span>
              ) : (
                <Button variant="primary" size="sm" icon={Upload} onClick={() => onSubmit(h)}>Submit</Button>
              )}
              {h.mySubmission?.grade && <div className="text-xs text-slate-500 mt-1">Grade: <strong>{h.mySubmission.grade}</strong></div>}
            </div>
          </div>
          {h.mySubmission && (
            <div className="mt-3 pt-3 border-t border-slate-50 text-xs text-slate-500">
              Submitted {new Date(h.mySubmission.submittedAt).toLocaleString()}
              {h.mySubmission.note && <> · “{h.mySubmission.note}”</>}
              {(h.mySubmission.attachments || []).map((a, i) => <a key={i} href={fileUrl(a.url)} target="_blank" rel="noreferrer" className="ml-2 text-primary-600 inline-flex items-center gap-1"><FileText size={11}/> {a.name}</a>)}
              {h.mySubmission.feedback && <div className="mt-1 text-slate-600">Teacher: {h.mySubmission.feedback}</div>}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function SubmitHomeworkModal({ open, homework, childId, onClose, onDone }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [note, setNote] = useState('');
  const [atts, setAtts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setNote(''); setAtts([]); } }, [open]);

  const onAttach = async (e) => {
    const files = [...e.target.files]; e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    try { for (const f of files) { const fd = new FormData(); fd.append('file', f); const r = await attachmentAPI.upload(fd); setAtts(a => [...a, r.data]); } }
    catch (er) { toast.error(er.message); } finally { setUploading(false); }
  };
  const submit = async () => {
    if (!note.trim() && !atts.length) return toast.error('Add a note or attach your work.');
    setBusy(true);
    try { await portalAPI.submitHomework(childId, homework._id, { note, attachments: atts }); toast.success('Homework submitted'); onDone(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  if (!homework) return null;
  return (
    <Modal open={open} onClose={onClose} title={`Submit — ${homework.title}`} size="md">
      <div className="space-y-4">
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Add a note for the teacher (optional)…"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200 resize-y"/>
        <div>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={onAttach} accept="image/*,.pdf,.doc,.docx,.txt"/>
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            {uploading ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>} Attach work
          </button>
          <div className="flex flex-wrap gap-2 mt-2">
            {atts.map((a, i) => <span key={i} className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-lg"><FileText size={12}/> <span className="truncate max-w-[140px]">{a.name}</span></span>)}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={busy ? Loader2 : CheckCircle2} onClick={submit} disabled={busy}>{busy ? 'Submitting…' : 'Submit'}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Timetable ────────────────────────────────────────────────────────────────
function TimetableTab({ timetable }) {
  const byDay = new Map((timetable || []).map(t => [t.day, t]));
  const days = DAYS.filter(d => byDay.has(d));
  if (!days.length) return <Card className="p-10 text-center text-slate-400 text-sm">No timetable published yet.</Card>;
  return (
    <div className="space-y-3">
      {days.map(day => {
        const periods = (byDay.get(day).periods || []).slice().sort((a, b) => (a.periodNo || 0) - (b.periodNo || 0));
        return (
          <Card key={day} className="p-0 overflow-hidden">
            <div className="px-4 py-2.5 bg-primary-50 text-primary-700 font-semibold text-sm">{day}</div>
            <div className="divide-y divide-slate-50">
              {periods.map((p, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${p.isBreak ? 'bg-slate-50/60' : ''}`}>
                  <span className="text-xs text-slate-400 w-24 flex-shrink-0">{p.startTime || ''}{p.endTime ? `–${p.endTime}` : ''}</span>
                  {p.isBreak ? <span className="text-slate-400 italic">Break</span> : (
                    <>
                      <span className="font-medium text-slate-700 flex-1">{p.subject || '—'}</span>
                      <span className="text-xs text-slate-400">{p.teacher?.name || ''}{p.room ? ` · Room ${p.room}` : ''}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ── shared bits ──────────────────────────────────────────────────────────────
function Metric({ label, value, tone }) {
  const tones = { green: 'text-emerald-600', red: 'text-red-500', gray: 'text-slate-500' };
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-center">
      <div className={`text-xl font-display font-bold ${tones[tone] || tones.gray}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}

function TableCard({ head, rows, empty, emptyText }) {
  return (
    <Card className="p-0 overflow-hidden">
      {empty ? <div className="text-center py-12 text-slate-400 text-sm">{emptyText}</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50/70 border-b border-slate-100 text-left">
              {head.map((h, i) => <th key={i} className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-primary-50/40">
                  {r.map((cell, j) => <td key={j} className="px-4 py-3 text-slate-700 whitespace-nowrap">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
