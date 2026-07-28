import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, School as SchoolIcon, GraduationCap, User, FileText,
  Loader2, CheckCircle2, Printer, Info, Sparkles,
} from 'lucide-react';
import { feeAPI, studentAPI } from '../services/api';
import { useSchool } from '../hooks/useSchool.jsx';
import { useClasses } from '../hooks/useClasses.js';
import { SectionHeader, Card, Button, Input, Dropdown, Switch, Badge, useToast, EmptyState } from '../components/ui';
import { buildPrintPage, openPrintWindow } from '../components/print/PrintComponents.jsx';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const NOW = new Date();

// ── one challan voucher body (used for single + bulk print) ────────────────────
function challanBody(fee, school) {
  const items = (fee.items && fee.items.length)
    ? fee.items
    : [{ name: `School Fee – ${fee.month} ${fee.year}`, amount: fee.amount || 0, discount: 0 }];
  const rows = items.map(it => `<tr>
      <td>${it.name}</td>
      <td style="text-align:right">Rs ${(it.amount||0).toLocaleString()}</td>
      <td style="text-align:right">Rs ${(it.discount||0).toLocaleString()}</td>
      <td style="text-align:right">Rs ${((it.amount||0)-(it.discount||0)).toLocaleString()}</td>
    </tr>`).join('');
  return `
    <div class="info-grid" style="grid-template-columns:1fr 1fr 1fr;">
      <div class="info-item"><label>Challan For</label><span>${fee.month} ${fee.year}</span></div>
      <div class="info-item"><label>Status</label><span><span class="badge badge-${(fee.status||'pending').toLowerCase()}">${fee.status||'Pending'}</span></span></div>
      <div class="info-item"><label>Due Date</label><span>${fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-PK') : '—'}</span></div>
    </div>
    <div class="info-grid">
      <div class="info-item"><label>Student</label><span>${fee.student?.name || '—'}</span></div>
      <div class="info-item"><label>Class</label><span>${fee.student?.class || '—'}${fee.student?.section ? ' · '+fee.student.section : ''}</span></div>
      <div class="info-item"><label>Roll / Reg No</label><span>${fee.student?.rollNumber || fee.student?.studentId || '—'}</span></div>
      <div class="info-item"><label>Student ID</label><span>${fee.student?.studentId || '—'}</span></div>
    </div>
    <table>
      <thead><tr><th>Fee Head</th><th style="text-align:right">Amount</th><th style="text-align:right">Discount</th><th style="text-align:right">Payable</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;margin-bottom:6px;">
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:8px 16px;border-radius:6px;font-size:15px;font-weight:bold;color:#065f46;">
        Total Payable: Rs ${(fee.amount||0).toLocaleString()}
      </div>
    </div>
    <div class="sig-row">
      <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Parent / Guardian</div></div>
      <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Accountant</div></div>
      <div class="sig-box"><div class="sig-line"></div><div class="sig-label">${school?.principal || 'Principal'}</div></div>
    </div>`;
}

// bulk: one challan per printed page
function printAllChallans(fees, school, month, year) {
  if (!fees.length) return;
  const pages = fees.map((f, i) => `
    <div style="page-break-after:${i < fees.length - 1 ? 'always' : 'auto'};">
      ${challanBody(f, school)}
    </div>`).join('');
  openPrintWindow(buildPrintPage(pages, school, `Fee Challans – ${month} ${year}`, 'fee'));
}

export default function ChallanGenerator() {
  const toast = useToast();
  const navigate = useNavigate();
  const { school } = useSchool();
  const { names: classNames } = useClasses();

  const [month, setMonth] = useState(MONTHS[NOW.getMonth()]);
  const [year, setYear]   = useState(NOW.getFullYear());
  const [dueDay, setDueDay] = useState(10);

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [heads, setHeads]     = useState([]);   // [{name, amount, include, optional}]
  const [scope, setScope]     = useState('school');
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [printing, setPrinting] = useState(false);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await feeAPI.previewGenerate({ month, year });
      const d = res.data;
      setPreview(d);
      setDueDay(d.dueDay || 10);
      setHeads([
        ...d.monthlyHeads.map(h => ({ ...h, include: true,  optional: false })),
        ...d.optionalHeads.map(h => ({ ...h, include: false, optional: true })),
      ]);
    } catch (e) { toast.error(e.message || 'Could not load preview'); }
    finally { setLoading(false); }
  }, [month, year]);        // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadPreview(); }, [loadPreview]);
  useEffect(() => { studentAPI.getAll({ limit: 500 }).then(r => setStudents(r.data || [])).catch(() => {}); }, []);

  const setHead = (name, changes) => setHeads(hs => hs.map(h => h.name === name ? { ...h, ...changes } : h));
  const activeHeads = heads.filter(h => h.include && Number(h.amount) > 0);

  const targetCount = useMemo(() => {
    if (!preview) return 0;
    if (scope === 'school')  return preview.totalStudents;
    if (scope === 'class')   return preview.classes.find(c => c.name === selectedClass)?.students || 0;
    if (scope === 'students') return studentId ? 1 : 0;
    return 0;
  }, [scope, preview, selectedClass, studentId]);

  const perStudent = activeHeads.reduce((s, h) => s + Number(h.amount || 0), 0);
  const estTotal   = perStudent * targetCount;

  const canGenerate = activeHeads.length > 0 && targetCount > 0 &&
    (scope !== 'class' || selectedClass) && (scope !== 'students' || studentId);

  const generate = async () => {
    if (!canGenerate) return;
    setGenerating(true); setResult(null);
    try {
      const res = await feeAPI.generate({
        month, year, scope, dueDay,
        class: scope === 'class' ? selectedClass : undefined,
        studentIds: scope === 'students' ? [studentId] : undefined,
        heads: activeHeads.map(h => ({ name: h.name, amount: Number(h.amount) || 0 })),
      });
      setResult(res.data);
      toast.success(res.message || 'Challans generated');
      loadPreview();   // refresh already-generated count
    } catch (e) { toast.error(e.message || 'Generation failed'); }
    finally { setGenerating(false); }
  };

  const handlePrintAll = async () => {
    setPrinting(true);
    try {
      const res = await feeAPI.getAll({ month, year });
      printAllChallans(res.data || [], school, month, year);
    } catch (e) { toast.error(e.message || 'Could not load challans to print'); }
    finally { setPrinting(false); }
  };

  const SCOPES = [
    { id:'school',   icon:SchoolIcon,    title:'Entire School', desc:'Bill every active student in one click.' },
    { id:'class',    icon:GraduationCap, title:'By Class',       desc:'Generate for a single class / grade.' },
    { id:'students', icon:User,          title:'Single Student', desc:'Generate one challan for one student.' },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Challan Generator"
        subtitle="Create monthly fee challans — single or in bulk"
        action={<Button variant="secondary" size="sm" icon={ArrowLeft} onClick={() => navigate('/fees')}>Back to Fees</Button>}
      />

      {/* Period + due day */}
      <Card>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Fee Month</label>
            <Dropdown value={month} onChange={e => setMonth(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
              {MONTHS.map(m => <option key={m}>{m}</option>)}
            </Dropdown>
          </div>
          <Input label="Year" type="number" value={year} onChange={e => setYear(Number(e.target.value))}/>
          <Input label="Due Day (of month)" type="number" min="1" max="28" value={dueDay} onChange={e => setDueDay(e.target.value)}/>
        </div>
        {preview && (
          <div className="px-5 pb-4 -mt-1 flex items-center gap-2 text-sm text-slate-500">
            <Info size={14}/>
            <span>{preview.totalStudents} active students · <strong className="text-slate-700">{preview.alreadyGenerated}</strong> already have a {month} {year} challan (they'll be skipped).</span>
          </div>
        )}
      </Card>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-10 justify-center"><Loader2 className="animate-spin" size={18}/> Loading fee configuration…</div>
      ) : heads.length === 0 ? (
        <EmptyState icon={FileText} title="No fee heads configured"
          subtitle="Add at least one fee head under Settings → Fee Configuration before generating challans."
          action={<Button variant="primary" onClick={() => navigate('/settings')}>Go to Settings</Button>} />
      ) : (
        <>
          {/* Fee heads to bill this month */}
          <Card>
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-display font-bold text-slate-800">Fee heads to bill for {month} {year}</h3>
              <p className="text-sm text-slate-500 mt-0.5">Monthly heads are pre-selected. Tick an optional head (e.g. Exam / Test Fee) to add it just for this month, and set its amount.</p>
            </div>
            <div className="p-5 space-y-2">
              {heads.map(h => (
                <div key={h.name} className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 transition-colors ${h.include ? 'border-primary-200 bg-primary-50/40' : 'border-slate-200'}`}>
                  <Switch checked={h.include} onChange={v => setHead(h.name, { include: v })} size="sm"/>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-700">{h.name}</span>
                    {h.optional && <Badge variant="purple">Optional</Badge>}
                    {!h.optional && <Badge variant="blue">Monthly</Badge>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Rs</span>
                    <input type="number" value={h.amount} disabled={!h.include}
                      onChange={e => setHead(h.name, { amount: e.target.value })}
                      className="w-28 px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:opacity-50"/>
                  </div>
                </div>
              ))}
              {activeHeads.length === 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1.5"><Info size={13}/> Select at least one fee head with an amount above 0.</p>
              )}
            </div>
          </Card>

          {/* Scope cards */}
          <div>
            <h3 className="font-display font-bold text-slate-800 mb-3">Who to bill</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {SCOPES.map(s => {
                const active = scope === s.id;
                return (
                  <button key={s.id} onClick={() => setScope(s.id)}
                    className={`text-left rounded-2xl border p-5 transition-all ${active ? 'border-primary-500 bg-primary-50/60 shadow-sm ring-1 ring-primary-200' : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'}`}>
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${active ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <s.icon size={22}/>
                    </div>
                    <div className="font-semibold text-slate-800">{s.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{s.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Scope-specific picker */}
            {scope === 'class' && (
              <div className="mt-4 max-w-sm">
                <label className="text-sm font-medium text-slate-700">Select class</label>
                <Dropdown value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
                  <option value="">Choose a class…</option>
                  {(preview?.classes || []).map(c => <option key={c.name} value={c.name}>{c.name} ({c.students} students)</option>)}
                  {classNames.filter(n => !(preview?.classes || []).some(c => c.name === n)).map(n => <option key={n} value={n}>{n} (0 students)</option>)}
                </Dropdown>
              </div>
            )}
            {scope === 'students' && (
              <div className="mt-4 max-w-sm">
                <label className="text-sm font-medium text-slate-700">Select student</label>
                <Dropdown value={studentId} onChange={e => setStudentId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
                  <option value="">Choose a student…</option>
                  {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.class}{s.section ? ' · '+s.section : ''})</option>)}
                </Dropdown>
              </div>
            )}
          </div>

          {/* Summary + generate */}
          <Card>
            <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <div><span className="text-slate-400">Students</span><div className="text-lg font-display font-bold text-slate-800">{targetCount}</div></div>
                <div><span className="text-slate-400">Per student</span><div className="text-lg font-display font-bold text-slate-800">Rs {perStudent.toLocaleString()}</div></div>
                <div><span className="text-slate-400">Est. total</span><div className="text-lg font-display font-bold text-emerald-600">Rs {estTotal.toLocaleString()}</div></div>
              </div>
              <Button variant="primary" icon={generating ? Loader2 : Sparkles} onClick={generate} disabled={!canGenerate || generating}>
                {generating ? 'Generating…' : `Generate ${targetCount || ''} Challan${targetCount === 1 ? '' : 's'}`}
              </Button>
            </div>
            <p className="px-5 pb-4 -mt-2 text-xs text-slate-400">Estimate ignores per-student discounts; actual amounts apply each student's saved concessions.</p>
          </Card>

          {/* Result */}
          {result && (
            <Card>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={22}/></div>
                  <div>
                    <h3 className="font-display font-bold text-slate-800">Done</h3>
                    <p className="text-sm text-slate-500">Challans for {month} {year}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center"><div className="text-2xl font-display font-bold text-emerald-700">{result.created}</div><div className="text-xs text-emerald-600">Created</div></div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center"><div className="text-2xl font-display font-bold text-slate-600">{result.skipped}</div><div className="text-xs text-slate-500">Skipped (existing)</div></div>
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-center"><div className="text-2xl font-display font-bold text-blue-700">Rs {(result.totalBilled||0).toLocaleString()}</div><div className="text-xs text-blue-600">Total billed</div></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="print" icon={printing ? Loader2 : Printer} onClick={handlePrintAll} disabled={printing}>{printing ? 'Preparing…' : `Print all ${month} challans`}</Button>
                  <Button variant="secondary" onClick={() => navigate('/fees')}>View in Fee Management</Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
