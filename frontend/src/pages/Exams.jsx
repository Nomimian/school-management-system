import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Award, Trash2, Pencil, ClipboardList, Layers, PencilRuler,
  UserCheck, BarChart3, Archive, Printer, Send, CheckCircle2,
  ChevronRight, Trophy, X,
} from 'lucide-react';
import { examAPI, examGroupAPI, subjectAPI } from '../services/api';
import {
  SectionHeader, Card, Badge, Button, Modal, Input, Avatar, EmptyState,
  TableSkeleton, useToast, useConfirm, Dropdown, StatCard,
} from '../components/ui';
import DynamicSelect from '../components/DynamicSelect';
import { useClasses } from '../hooks/useClasses';

const statusColors = { Upcoming: 'blue', Ongoing: 'orange', Completed: 'green' };
const EXAM_TYPE_FALLBACK = ['Daily', 'Weekly', 'Monthly', 'Term', 'Half-Yearly', 'Yearly', 'Annual'];
const EXAM_STATUS_FALLBACK = ['Upcoming', 'Ongoing', 'Completed'];
const ATT_STATUS_FALLBACK = ['Present', 'Absent', 'Late', 'Leave', 'Exempted'];

const TABS = [
  { id: 'groups',     label: 'Exam Groups',    icon: Layers },
  { id: 'exams',      label: 'Exams',          icon: Award },
  { id: 'marks',      label: 'Marks Entry',    icon: PencilRuler },
  { id: 'attendance', label: 'Exam Attendance',icon: UserCheck },
  { id: 'reports',    label: 'Reports',        icon: BarChart3 },
  { id: 'archive',    label: 'Previous Reports',icon: Archive },
];

const gradeColor = (g) => {
  if (!g || g === '—') return 'bg-slate-100 text-slate-500';
  if (g === 'AB') return 'bg-amber-100 text-amber-700';
  if (g.includes('+')) return 'bg-emerald-100 text-emerald-700';
  if (g === 'F') return 'bg-red-100 text-red-600';
  return 'bg-blue-100 text-blue-700';
};

const emptyGroup = { name: '', type: '', session: '', startDate: '', endDate: '', description: '' };
const emptyExam = () => ({
  name: '', examGroup: '', class: '', session: '', startDate: '', endDate: '',
  status: 'Upcoming', description: '',
});

export default function Exams() {
  const { names: classes } = useClasses();

  const [tab, setTab] = useState('groups');
  const [groups, setGroups] = useState([]);
  const [exams, setExams] = useState([]);
  const [activeExam, setActiveExam] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchGroups = async () => { try { const r = await examGroupAPI.getAll(); setGroups(r.data || []); } catch (e) { console.error(e); } };
  const fetchExams = async () => { try { const r = await examAPI.getAll(); setExams(r.data || []); } catch (e) { console.error(e); } };

  useEffect(() => {
    (async () => { setLoading(true); await Promise.all([fetchGroups(), fetchExams()]); setLoading(false); })();
  }, []);

  return (
    <div className="space-y-5">
      <SectionHeader title="Examinations" subtitle="Groups, exams, marks, attendance, reports & grading — end to end" />

      {/* Workflow tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap inline-flex items-center gap-2 transition-all
                ${tab === t.id ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-primary-50 border border-slate-200'}`}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'groups' && <GroupsTab groups={groups} loading={loading} reload={fetchGroups} />}
      {tab === 'exams' && <ExamsTab exams={exams} groups={groups} classes={classes} loading={loading} reload={fetchExams}
        goto={(id, exam) => { setActiveExam(exam); setTab(id); }} />}
      {tab === 'marks' && <MarksTab exams={exams} activeExam={activeExam} setActiveExam={setActiveExam} />}
      {tab === 'attendance' && <AttendanceTab exams={exams} activeExam={activeExam} setActiveExam={setActiveExam} />}
      {tab === 'reports' && <ReportsTab exams={exams} activeExam={activeExam} setActiveExam={setActiveExam} />}
      {tab === 'archive' && <ArchiveTab goToReport={(exam) => { setActiveExam(exam); setTab('reports'); }} />}
    </div>
  );
}

// ── EXAM GROUPS ───────────────────────────────────────────────────────────────
function GroupsTab({ groups, loading, reload }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyGroup);
  const [saving, setSaving] = useState(false);

  const open = (g) => {
    setEditing(g || null);
    setForm(g ? {
      name: g.name || '', type: g.type || '', session: g.session || '',
      startDate: g.startDate?.slice(0, 10) || '', endDate: g.endDate?.slice(0, 10) || '',
      description: g.description || '',
    } : emptyGroup);
    setModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error('Group name is required.');
    setSaving(true);
    try {
      if (editing) await examGroupAPI.update(editing._id, form);
      else await examGroupAPI.create(form);
      toast.success(editing ? 'Group updated' : 'Group created');
      setModal(false); setEditing(null); reload();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const remove = async (g) => {
    if (!(await confirm({ title: 'Delete group?', message: `Remove “${g.name}”?`, tone: 'danger', confirmText: 'Delete' }))) return;
    try { await examGroupAPI.delete(g._id); reload(); toast.success('Group deleted'); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" icon={Plus} onClick={() => open(null)}>New Exam Group</Button>
      </div>
      {loading ? <Card><TableSkeleton rows={3} cols={3} /></Card>
        : groups.length === 0 ? (
          <Card><EmptyState icon={Layers} title="No exam groups yet"
            subtitle="Create a group like “Monthly Test” or “First Term” to organise your exams."
            action={<Button variant="primary" size="sm" icon={Plus} onClick={() => open(null)}>New Exam Group</Button>} /></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(g => (
              <Card key={g._id} hover className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center">
                    <Layers size={20} className="text-white" />
                  </div>
                  {g.type ? <Badge variant="blue">{g.type}</Badge> : null}
                </div>
                <h3 className="font-display font-bold text-slate-800 mb-1">{g.name}</h3>
                <div className="text-sm text-slate-500 mb-3">{g.session || '—'}</div>
                {g.description && <p className="text-xs text-slate-400 mb-3 line-clamp-2">{g.description}</p>}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-xs font-medium text-slate-500">{g.examCount || 0} exam{g.examCount === 1 ? '' : 's'}</span>
                  <div className="flex gap-1">
                    <button onClick={() => open(g)} title="Edit" className="p-1.5 rounded-lg text-slate-400 hover:bg-primary-50 hover:text-blue-600"><Pencil size={14} /></button>
                    <button onClick={() => remove(g)} title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? 'Edit Exam Group' : 'New Exam Group'} size="md">
        <div className="space-y-4">
          <Input label="Group Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Monthly Test — January" />
          <div className="grid grid-cols-2 gap-4">
            <DynamicSelect label="Type" optionKey="examTypes" fallback={EXAM_TYPE_FALLBACK}
              value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} placeholder="Select type" />
            <Input label="Session" value={form.session} onChange={e => setForm({ ...form, session: e.target.value })} placeholder="2025-2026" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            <Input label="End Date" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Description (optional)</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setModal(false); setEditing(null); }}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={saving}>{editing ? 'Save Changes' : 'Create Group'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── EXAMS (T1, T2 …) with per-subject schedule ────────────────────────────────
function ExamsTab({ exams, groups, classes, loading, reload, goto }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyExam());
  const [saving, setSaving] = useState(false);
  const [filterGroup, setFilterGroup] = useState('');
  const [filterClass, setFilterClass] = useState('');

  const filtered = exams.filter(e =>
    (!filterGroup || String(e.examGroup?._id || e.examGroup) === filterGroup) &&
    (!filterClass || e.class === filterClass));

  const open = (ex) => {
    setEditing(ex || null);
    setForm(ex ? {
      name: ex.name || '', examGroup: ex.examGroup?._id || ex.examGroup || '', class: ex.class || '',
      session: ex.session || '', startDate: ex.startDate?.slice(0, 10) || '', endDate: ex.endDate?.slice(0, 10) || '',
      status: ex.status || 'Upcoming', description: ex.description || '',
    } : emptyExam());
    setModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error('Exam name is required.');
    if (!form.class) return toast.error('Select a class.');
    if (!form.startDate) return toast.error('Start date is required.');
    setSaving(true);
    const payload = { ...form, examGroup: form.examGroup || null };
    try {
      if (editing) await examAPI.update(editing._id, payload);
      else await examAPI.create(payload);
      toast.success(editing ? 'Exam updated' : 'Exam created');
      setModal(false); setEditing(null); reload();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const remove = async (ex) => {
    if (!(await confirm({ title: 'Delete exam?', message: 'This removes the exam, its marks and exam attendance.', tone: 'danger', confirmText: 'Delete' }))) return;
    try { await examAPI.delete(ex._id); reload(); toast.success('Exam deleted'); }
    catch (e) { toast.error(e.message); }
  };

  const togglePublish = async (ex) => {
    try { await examAPI.publish(ex._id, !ex.resultPublished); reload(); toast.success(ex.resultPublished ? 'Results unpublished' : 'Results published to parents'); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2 flex-wrap">
          <Dropdown value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-200">
            <option value="">All groups</option>
            {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
          </Dropdown>
          <Dropdown value={filterClass} onChange={e => setFilterClass(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-200">
            <option value="">All classes</option>
            {classes.map(c => <option key={c}>{c}</option>)}
          </Dropdown>
        </div>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => open(null)}>Create Exam</Button>
      </div>

      {loading ? <Card><TableSkeleton rows={4} cols={4} /></Card>
        : filtered.length === 0 ? (
          <Card><EmptyState icon={Award} title="No exams found"
            subtitle="Create an exam (e.g. T1, T2) for a class — its subjects come from Settings → Subjects."
            action={<Button variant="primary" size="sm" icon={Plus} onClick={() => open(null)}>Create Exam</Button>} /></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(e => (
              <Card key={e._id} hover className="p-5 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center">
                    <Award size={20} className="text-white" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={statusColors[e.status] || 'gray'} dot>{e.status}</Badge>
                    {e.resultPublished && <span className="text-[10px] font-semibold text-emerald-600">● Published</span>}
                  </div>
                </div>
                <h3 className="font-display font-bold text-slate-800 mb-0.5">{e.name}</h3>
                <div className="text-sm text-slate-500 mb-2">
                  {e.class}{e.examGroup?.name ? ` · ${e.examGroup.name}` : ''}{e.session ? ` · ${e.session}` : ''}
                </div>
                <div className="text-xs text-slate-400 mb-3">{e.startDate?.slice(0, 10)}{e.endDate ? ` → ${e.endDate.slice(0, 10)}` : ''}</div>

                <div className="mt-auto grid grid-cols-3 gap-1.5 pt-3 border-t border-slate-100">
                  <button onClick={() => goto('marks', e)} className="text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-100 py-1.5 rounded-lg font-medium">Marks</button>
                  <button onClick={() => goto('attendance', e)} className="text-[11px] bg-violet-50 text-violet-700 hover:bg-violet-100 py-1.5 rounded-lg font-medium">Attendance</button>
                  <button onClick={() => goto('reports', e)} className="text-[11px] bg-amber-50 text-amber-700 hover:bg-amber-100 py-1.5 rounded-lg font-medium">Report</button>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => togglePublish(e)}
                    className={`flex-1 text-[11px] py-1.5 rounded-lg font-medium inline-flex items-center justify-center gap-1 ${e.resultPublished ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                    <Send size={12} /> {e.resultPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={() => open(e)} title="Edit" className="p-1.5 rounded-lg text-slate-400 hover:bg-primary-50 hover:text-blue-600"><Pencil size={14} /></button>
                  <button onClick={() => remove(e)} title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </Card>
            ))}
          </div>
        )}

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? 'Edit Exam' : 'Create Exam'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Exam Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. T1" />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Exam Group</label>
              <Dropdown value={form.examGroup} onChange={e => setForm({ ...form, examGroup: e.target.value })}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
                <option value="">— None —</option>
                {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
              </Dropdown>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Class</label>
              <Dropdown value={form.class} onChange={e => setForm({ ...form, class: e.target.value })}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c}>{c}</option>)}
              </Dropdown>
            </div>
            <Input label="Session" value={form.session} onChange={e => setForm({ ...form, session: e.target.value })} placeholder="2025-2026" />
            <DynamicSelect label="Status" optionKey="examStatuses" fallback={EXAM_STATUS_FALLBACK}
              value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} includeBlank={false} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            <Input label="End Date" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs text-slate-500">
            <ClipboardList size={14} className="mt-0.5 flex-shrink-0 text-primary-500" />
            <span>This exam is held for <b>all subjects of {form.class || 'the class'}</b>. Subjects (and which stream they apply to) are configured once in <b>Settings → Subjects</b> and used automatically for marks, attendance and reports.</span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setModal(false); setEditing(null); }}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={saving}>{editing ? 'Save Changes' : 'Create Exam'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Shared control bar: pick an exam, its subject (from the class config), and an
// optional section to narrow the roster.
function ExamPicker({ exams, exam, onExam, subjects, subject, setSubject, sections, section, setSection, extra }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dropdown value={exam?._id || ''} onChange={e => onExam(exams.find(x => x._id === e.target.value) || null)}
        className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 min-w-[14rem]">
        <option value="">Select exam…</option>
        {exams.map(e => <option key={e._id} value={e._id}>{e.name} — {e.class}{e.examGroup?.name ? ` (${e.examGroup.name})` : ''}</option>)}
      </Dropdown>
      {exam && subjects.length > 0 && (
        <Dropdown value={subject} onChange={e => setSubject(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 min-w-[12rem]">
          <option value="">Select subject…</option>
          {subjects.map(s => <option key={s.name} value={s.name}>{s.name}{s.group ? ` · ${s.group}` : ''}</option>)}
        </Dropdown>
      )}
      {exam && sections.length > 1 && (
        <Dropdown value={section} onChange={e => setSection(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 min-w-[9rem]">
          <option value="">All sections</option>
          {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
        </Dropdown>
      )}
      {extra}
    </div>
  );
}

// Load the configured subjects for the selected exam's class.
function useExamSubjects(exam) {
  const [subjects, setSubjects] = useState([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!exam) { setSubjects([]); setLoaded(false); return; }
    let alive = true;
    setLoaded(false);
    subjectAPI.getAll({ class: exam.class })
      .then(r => { if (alive) { setSubjects(r.data || []); setLoaded(true); } })
      .catch(() => { if (alive) { setSubjects([]); setLoaded(true); } });
    return () => { alive = false; };
  }, [exam?._id]); // eslint-disable-line
  return { subjects, loaded };
}

// Shown when the exam's class has no subjects configured yet.
function NoSubjectsNotice({ icon, exam }) {
  return (
    <Card><EmptyState icon={icon} title={`No subjects configured for ${exam.class}`}
      subtitle="Set this class's subjects once in Settings → Subjects — every exam of the class then uses them automatically." /></Card>
  );
}

// ── MARKS ENTRY ───────────────────────────────────────────────────────────────
function MarksTab({ exams, activeExam, setActiveExam }) {
  const toast = useToast();
  const [exam, setExam] = useState(activeExam || null);
  const [subject, setSubject] = useState('');
  const [section, setSection] = useState('');
  const [sheet, setSheet] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { subjects, loaded: subjectsLoaded } = useExamSubjects(exam);

  useEffect(() => { if (activeExam) { setExam(activeExam); setSubject(''); setSection(''); } }, [activeExam]);

  const pickExam = (ex) => { setExam(ex); setActiveExam?.(ex); setSubject(''); setSection(''); setSheet(null); setRows([]); };
  const ready = exam && subject;

  const load = async () => {
    if (!ready) return;
    setLoading(true);
    try {
      const r = await examAPI.getMarksheet(exam._id, subject);
      setSheet(r.data);
      setRows((r.data.students || []).map(s => ({ ...s })));
    } catch (e) { toast.error(e.message); setSheet(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [exam?._id, subject]);

  const setRow = (id, ch) => setRows(rs => rs.map(r => r.student === id ? { ...r, ...ch } : r));
  const sections = [...new Set(rows.map(r => r.section).filter(Boolean))].sort();
  const visibleRows = section ? rows.filter(r => r.section === section) : rows;

  const save = async () => {
    setSaving(true);
    try {
      const entries = rows
        .filter(r => r.isAbsent || (r.marks !== '' && r.marks !== null && r.marks !== undefined))
        .map(r => ({ student: r.student, marks: r.isAbsent ? 0 : Number(r.marks), isAbsent: !!r.isAbsent, remarks: r.remarks || '' }));
      if (!entries.length) return toast.error('Enter at least one mark.');
      const res = await examAPI.saveMarks(exam._id, { subject, entries });
      toast.success(`Saved ${res.saved} result(s)`);
      load();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const total = sheet?.totalMarks || 100;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ExamPicker exams={exams} exam={exam} onExam={pickExam} subjects={subjects} subject={subject} setSubject={setSubject}
            sections={sections} section={section} setSection={setSection} />
          {sheet && <span className="text-sm text-slate-500">Out of <b className="text-slate-700">{total}</b> · Pass <b className="text-slate-700">{sheet?.passMark ?? 40}</b></span>}
        </div>
      </Card>

      {!exam ? (
        <Card><EmptyState icon={PencilRuler} title="Select an exam" subtitle="Pick an exam, then a subject, to enter marks." /></Card>
      ) : subjectsLoaded && subjects.length === 0 ? (
        <NoSubjectsNotice icon={PencilRuler} exam={exam} />
      ) : !subject ? (
        <Card><EmptyState icon={PencilRuler} title="Select a subject" subtitle="Choose the subject to enter marks for." /></Card>
      ) : loading ? <Card><TableSkeleton rows={8} cols={4} /></Card> : (
        <Card>
          <div className="flex items-center justify-between p-4 border-b border-slate-100 flex-wrap gap-2">
            <h3 className="font-display font-bold text-slate-800">{exam.name} — {exam.class} · {subject}{section ? ` · Sec ${section}` : ''}{sheet?.group ? ` (${sheet.group})` : ''}</h3>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setRows(rs => rs.map(r => ({ ...r, isAbsent: false })))}>Clear Absent</Button>
              <Button variant="primary" size="sm" onClick={save} loading={saving}>Save Marks</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Roll</th><th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3 text-center">Marks</th><th className="px-4 py-3 text-center">Absent</th>
                  <th className="px-4 py-3 text-center">Grade</th><th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(r => (
                  <tr key={r.student} className="border-b border-slate-50 hover:bg-primary-50/30">
                    <td className="px-4 py-2 text-slate-400 text-xs">{r.rollNumber || r.studentId || '—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2"><Avatar name={r.name} size="sm" /><span className="font-medium text-slate-800">{r.name}</span></div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input type="number" min="0" max={total} disabled={r.isAbsent} value={r.isAbsent ? '' : (r.marks ?? '')}
                        onChange={e => setRow(r.student, { marks: e.target.value })}
                        className="w-20 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40" />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input type="checkbox" checked={!!r.isAbsent} onChange={e => setRow(r.student, { isAbsent: e.target.checked })} className="w-4 h-4 accent-primary-600" />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${gradeColor(r.isAbsent ? 'AB' : r.grade)}`}>{r.isAbsent ? 'AB' : (r.grade || '—')}</span>
                    </td>
                    <td className="px-4 py-2">
                      <input value={r.remarks || ''} onChange={e => setRow(r.student, { remarks: e.target.value })} placeholder="—"
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleRows.length === 0 && <EmptyState icon={PencilRuler} title="No students" subtitle="No students match this class/stream/section." />}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── EXAM ATTENDANCE ───────────────────────────────────────────────────────────
function AttendanceTab({ exams, activeExam, setActiveExam }) {
  const toast = useToast();
  const [exam, setExam] = useState(activeExam || null);
  const [subject, setSubject] = useState('');
  const [section, setSection] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState('');
  const { subjects, loaded: subjectsLoaded } = useExamSubjects(exam);

  useEffect(() => { if (activeExam) { setExam(activeExam); setSubject(''); setSection(''); } }, [activeExam]);

  const pickExam = (ex) => { setExam(ex); setActiveExam?.(ex); setSubject(''); setSection(''); setRows([]); };
  const ready = exam && subject;

  const load = async () => {
    if (!ready) return;
    setLoading(true);
    try {
      const r = await examAPI.getAttendance(exam._id, subject);
      setRows((r.data.students || []).map(s => ({ ...s })));
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [exam?._id, subject]);

  const setRow = (id, ch) => setRows(rs => rs.map(r => r.student === id ? { ...r, ...ch } : r));
  const sections = [...new Set(rows.map(r => r.section).filter(Boolean))].sort();
  const visibleRows = section ? rows.filter(r => r.section === section) : rows;
  const markAll = (status) => setRows(rs => rs.map(r => (!section || r.section === section) ? { ...r, status } : r));

  const save = async () => {
    setSaving(true);
    try {
      const entries = rows.map(r => ({ student: r.student, status: r.status || 'Present', remarks: r.remarks || '' }));
      const res = await examAPI.saveAttendance(exam._id, { subject, date: date || undefined, entries });
      toast.success(`Saved attendance for ${res.saved} student(s)`);
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ExamPicker exams={exams} exam={exam} onExam={pickExam} subjects={subjects} subject={subject} setSubject={setSubject}
            sections={sections} section={section} setSection={setSection}
            extra={<Input type="date" value={date} onChange={e => setDate(e.target.value)} />} />
        </div>
      </Card>

      {!exam ? (
        <Card><EmptyState icon={UserCheck} title="Select an exam" subtitle="Pick an exam, then a subject/paper, to mark attendance." /></Card>
      ) : subjectsLoaded && subjects.length === 0 ? (
        <NoSubjectsNotice icon={UserCheck} exam={exam} />
      ) : !subject ? (
        <Card><EmptyState icon={UserCheck} title="Select a subject" subtitle="Choose the subject/paper to mark attendance for." /></Card>
      ) : loading ? <Card><TableSkeleton rows={8} cols={3} /></Card> : (
        <Card>
          <div className="flex items-center justify-between p-4 border-b border-slate-100 flex-wrap gap-2">
            <h3 className="font-display font-bold text-slate-800">{exam.name} — {exam.class} · {subject}{section ? ` · Sec ${section}` : ''}</h3>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={CheckCircle2} onClick={() => markAll('Present')}>All Present</Button>
              <Button variant="primary" size="sm" onClick={save} loading={saving}>Save Attendance</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Roll</th><th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Status</th><th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(r => (
                  <tr key={r.student} className="border-b border-slate-50 hover:bg-primary-50/30">
                    <td className="px-4 py-2 text-slate-400 text-xs">{r.rollNumber || r.studentId || '—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2"><Avatar name={r.name} size="sm" /><span className="font-medium text-slate-800">{r.name}</span></div>
                    </td>
                    <td className="px-4 py-2">
                      <DynamicSelect optionKey="examAttendanceStatuses" fallback={ATT_STATUS_FALLBACK}
                        value={r.status} onChange={e => setRow(r.student, { status: e.target.value })} includeBlank={false}
                        className="px-2 py-1 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200 min-w-[8rem]" />
                    </td>
                    <td className="px-4 py-2">
                      <input value={r.remarks || ''} onChange={e => setRow(r.student, { remarks: e.target.value })} placeholder="—"
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleRows.length === 0 && <EmptyState icon={UserCheck} title="No students" subtitle="No students match this class/stream/section." />}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── REPORTS ───────────────────────────────────────────────────────────────────
function ReportsTab({ exams, activeExam, setActiveExam }) {
  const toast = useToast();
  const [exam, setExam] = useState(activeExam || null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (activeExam) setExam(activeExam); }, [activeExam]);

  const load = async () => {
    if (!exam) return;
    setLoading(true);
    try { const r = await examAPI.getReport(exam._id); setReport(r.data); }
    catch (e) { toast.error(e.message); setReport(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [exam?._id]);

  const subjectCols = useMemo(() => report?.subjects || [], [report]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Dropdown value={exam?._id || ''} onChange={e => { const ex = exams.find(x => x._id === e.target.value); setExam(ex || null); setActiveExam?.(ex); }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 min-w-[16rem]">
            <option value="">Select exam…</option>
            {exams.map(e => <option key={e._id} value={e._id}>{e.name} — {e.class}{e.examGroup?.name ? ` (${e.examGroup.name})` : ''}</option>)}
          </Dropdown>
          {report && <Button variant="secondary" size="sm" icon={Printer} onClick={() => window.print()}>Print</Button>}
        </div>
      </Card>

      {!exam ? (
        <Card><EmptyState icon={BarChart3} title="Select an exam" subtitle="Choose an exam to see its class result sheet and analytics." /></Card>
      ) : loading ? <Card><TableSkeleton rows={8} cols={6} /></Card> : report && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={UserCheck} label="Students" value={report.summary.totalStudents} color="blue" />
            <StatCard icon={ClipboardList} label="With Results" value={report.summary.withResults} color="teal" />
            <StatCard icon={CheckCircle2} label="Passed" value={report.summary.passed} color="green" />
            <StatCard icon={X} label="Failed" value={report.summary.failed} color="red" />
            <StatCard icon={BarChart3} label="Pass Rate" value={`${report.summary.passRate}%`} color="purple" />
            <StatCard icon={Award} label="Class Avg" value={`${report.summary.classAverage}%`} color="orange" />
          </div>

          {report.summary.topper && (
            <Card className="p-4 flex items-center gap-3 bg-gradient-to-r from-amber-50 to-white border-amber-100">
              <div className="w-11 h-11 rounded-2xl bg-amber-400 flex items-center justify-center"><Trophy size={20} className="text-white" /></div>
              <div>
                <div className="text-xs text-amber-600 font-semibold uppercase tracking-wider">Topper</div>
                <div className="font-display font-bold text-slate-800">{report.summary.topper.name}
                  <span className="text-slate-400 font-normal text-sm"> · {report.summary.topper.percentage}% · {report.summary.topper.grade}</span></div>
              </div>
            </Card>
          )}

          {report.subjectStats.length > 0 && (
            <Card>
              <div className="p-4 border-b border-slate-100"><h3 className="font-display font-bold text-slate-800">Subject Analysis</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50/50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {['Subject', 'Attempts', 'Average', 'Highest', 'Lowest', 'Pass Rate'].map(h => <th key={h} className="px-4 py-3">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {report.subjectStats.map(s => (
                      <tr key={s.subject} className="border-t border-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-700">{s.subject}</td>
                        <td className="px-4 py-2">{s.entries}</td>
                        <td className="px-4 py-2">{s.avg}</td>
                        <td className="px-4 py-2 text-emerald-600">{s.highest}</td>
                        <td className="px-4 py-2 text-red-500">{s.lowest}</td>
                        <td className="px-4 py-2">{s.passRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Card>
            <div className="p-4 border-b border-slate-100"><h3 className="font-display font-bold text-slate-800">Class Result Sheet — {report.exam.name} · {report.exam.class}</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-3 py-3">Rank</th><th className="px-3 py-3">Roll</th><th className="px-3 py-3">Student</th>
                    {subjectCols.map(c => <th key={c} className="px-3 py-3 text-center">{c}</th>)}
                    <th className="px-3 py-3 text-center">Total</th><th className="px-3 py-3 text-center">%</th>
                    <th className="px-3 py-3 text-center">Grade</th><th className="px-3 py-3 text-center">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {report.students.map(r => (
                    <tr key={r.student} className="border-t border-slate-50 hover:bg-primary-50/30">
                      <td className="px-3 py-2 font-semibold text-slate-500">{r.rank || '—'}</td>
                      <td className="px-3 py-2 text-slate-400 text-xs">{r.rollNumber || r.studentId || '—'}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{r.name}</td>
                      {subjectCols.map(c => {
                        const sm = r.subjects[c];
                        return <td key={c} className="px-3 py-2 text-center">
                          {sm ? (sm.isAbsent ? <span className="text-amber-600 text-xs font-semibold">AB</span> : <span className={sm.isPassed ? 'text-slate-700' : 'text-red-500 font-semibold'}>{sm.marks}</span>) : <span className="text-slate-300">—</span>}
                        </td>;
                      })}
                      <td className="px-3 py-2 text-center font-semibold text-slate-700">{r.hasResult ? `${r.obtained}/${r.max}` : '—'}</td>
                      <td className="px-3 py-2 text-center text-primary-600 font-semibold">{r.hasResult ? `${r.percentage}%` : '—'}</td>
                      <td className="px-3 py-2 text-center"><span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${gradeColor(r.grade)}`}>{r.grade}</span></td>
                      <td className="px-3 py-2 text-center">{r.hasResult ? <Badge variant={r.result === 'Pass' ? 'green' : 'red'}>{r.result}</Badge> : <span className="text-slate-300 text-xs">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.students.length === 0 && <EmptyState icon={BarChart3} title="No students" subtitle="This class has no students yet." />}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ── PREVIOUS REPORTS (archive) ────────────────────────────────────────────────
function ArchiveTab({ goToReport }) {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { const r = await examAPI.getArchive(); setData(r.data || []); }
      catch (e) { toast.error(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Card><TableSkeleton rows={5} cols={3} /></Card>;
  if (!data.length) return <Card><EmptyState icon={Archive} title="No exam history yet" subtitle="Past exams and their reports will appear here once created." /></Card>;

  return (
    <div className="space-y-4">
      {data.map(g => (
        <Card key={g._id || 'ungrouped'}>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-indigo-500" />
              <h3 className="font-display font-bold text-slate-800">{g.name}</h3>
              {g.type && <Badge variant="blue">{g.type}</Badge>}
              {g.session && <span className="text-xs text-slate-400">{g.session}</span>}
            </div>
            <span className="text-xs text-slate-400">{g.exams.length} exam{g.exams.length === 1 ? '' : 's'}</span>
          </div>
          {g.exams.length === 0 ? (
            <p className="text-sm text-slate-400 px-4 py-3">No exams in this group.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {g.exams.map(e => (
                <button key={e._id} onClick={() => goToReport(e)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-primary-50/40 text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0"><Award size={16} className="text-slate-500" /></div>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 truncate">{e.name} <span className="text-slate-400 font-normal">· {e.class}</span></div>
                      <div className="text-xs text-slate-400">{e.startDate?.slice(0, 10) || '—'} · {e.resultCount} result{e.resultCount === 1 ? '' : 's'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {e.resultPublished ? <Badge variant="green">Published</Badge> : <Badge variant="gray">Draft</Badge>}
                    <ChevronRight size={16} className="text-slate-300" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
