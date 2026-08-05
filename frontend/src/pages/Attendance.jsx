import { useState, useEffect } from 'react';
import { CheckCircle2, Save, Users, ClipboardList, Check, X, Clock, Plane, Fingerprint, PenLine } from 'lucide-react';
import { studentAPI, attendanceAPI } from '../services/api';
import { SectionHeader, Card, Button, Badge, EmptyState, TableSkeleton, useToast, Dropdown } from '../components/ui';
import { useClasses } from '../hooks/useClasses';

const today = new Date().toISOString().slice(0,10);

// Single source of truth for the four attendance states. Distinct ICONS (not
// letters) so Late and Leave — which both start with "L" — can never be
// confused, and everything stays legible in light AND dark themes.
const STATUSES = [
  { key: 'Present', label: 'Present', Icon: Check, solid: 'bg-emerald-500', tint: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { key: 'Absent',  label: 'Absent',  Icon: X,     solid: 'bg-red-500',     tint: 'bg-red-100 text-red-600 border-red-300' },
  { key: 'Late',    label: 'Late',    Icon: Clock, solid: 'bg-orange-500',  tint: 'bg-orange-100 text-orange-700 border-orange-300' },
  { key: 'Leave',   label: 'Leave',   Icon: Plane, solid: 'bg-purple-500',  tint: 'bg-purple-100 text-purple-700 border-purple-300' },
];
const STATUS_TINT = Object.fromEntries(STATUSES.map(s => [s.key, s.tint]));

export default function Attendance() {
  const toast = useToast();
  const { names: classes, loading: classesLoading } = useClasses();
  const [date, setDate]                   = useState(today);
  const [selectedClass, setClass]         = useState('');
  const [classStudents, setClassStudents] = useState([]);
  const [attendance, setAttendance]       = useState({});
  const [loading, setLoading]             = useState(false);
  const [saving, setSaving]               = useState(false);
  const [saved, setSaved]                 = useState(false);
  // Capture source. 'manual' today; 'biometric' is wired end-to-end but gated
  // until device sync ships, so records already carry provenance for later.
  const [source, setSource]               = useState('manual');

  // Default the selected class to the first real class once loaded
  useEffect(() => {
    if (!selectedClass && classes.length) setClass(classes[0]);
  }, [classes, selectedClass]);

  useEffect(() => {
    if (!selectedClass) { setClassStudents([]); setAttendance({}); return; }
    setLoading(true);
    studentAPI.getAll({ class: selectedClass, limit: 100 })
      .then(res => {
        const s = res.data || [];
        setClassStudents(s);
        // Load existing attendance for this date/class
        attendanceAPI.getAll({ class: selectedClass, date })
          .then(attRes => {
            const map = {};
            s.forEach(st => { map[st._id] = 'Present'; }); // default
            (attRes.data || []).forEach(a => { map[a.student?._id || a.student] = a.status; });
            setAttendance(map);
          })
          .catch(() => {
            const map = {};
            s.forEach(st => { map[st._id] = 'Present'; });
            setAttendance(map);
          });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedClass, date]);

  const setStatus = (id, status) => { setAttendance(a => ({...a, [id]: status})); setSaved(false); };
  const markAll   = (status) => {
    const updated = {};
    classStudents.forEach(s => { updated[s._id] = status; });
    setAttendance(updated);
    setSaved(false);
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const method = source === 'biometric' ? 'Biometric' : 'Manual';
      const records = classStudents.map(s => ({ student: s._id, status: attendance[s._id] || 'Present' }));
      await attendanceAPI.markBulk({ records, date, class: selectedClass, method });
      setSaved(true);
      toast.success('Attendance saved');
      setTimeout(() => setSaved(false), 3000);
    } catch(e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const presentCount = classStudents.filter(s => attendance[s._id] === 'Present').length;
  const absentCount  = classStudents.filter(s => attendance[s._id] === 'Absent').length;
  const lateCount    = classStudents.filter(s => attendance[s._id] === 'Late').length;
  const leaveCount   = classStudents.filter(s => attendance[s._id] === 'Leave').length;

  return (
    <div className="space-y-5">
      <SectionHeader title="Attendance Management" subtitle="Mark and track daily student attendance"/>

      {!classesLoading && classes.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No classes yet"
            subtitle="Create a class first, then come back to mark daily attendance for its students."
          />
        </Card>
      ) : (
      <>
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} max={today}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200"/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Class</label>
            <Dropdown value={selectedClass} onChange={e => setClass(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
              {classes.map(c => <option key={c}>{c}</option>)}
            </Dropdown>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</label>
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-sm">
              <button type="button" onClick={() => setSource('manual')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors
                  ${source === 'manual' ? 'bg-white text-primary-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                <PenLine size={14}/> Manual
              </button>
              <button type="button" disabled title="Biometric device sync — coming soon"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-slate-400 cursor-not-allowed">
                <Fingerprint size={14}/> Biometric
                <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500">Soon</span>
              </button>
            </div>
          </div>
          <div className="flex gap-2 sm:ml-auto flex-wrap">
            <Button variant="success" size="sm" onClick={() => markAll('Present')}>Mark All Present</Button>
            <Button variant="danger"  size="sm" onClick={() => markAll('Absent')}>Mark All Absent</Button>
            <Button variant="primary" size="sm" icon={Save} loading={saving} onClick={saveAttendance}>
              {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Attendance'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <div className="text-3xl font-display font-bold text-emerald-700">{presentCount}</div>
          <div className="text-xs font-semibold text-emerald-600 mt-1">Present</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <div className="text-3xl font-display font-bold text-red-600">{absentCount}</div>
          <div className="text-xs font-semibold text-red-500 mt-1">Absent</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center">
          <div className="text-3xl font-display font-bold text-orange-600">{lateCount}</div>
          <div className="text-xs font-semibold text-orange-500 mt-1">Late</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
          <div className="text-3xl font-display font-bold text-purple-700">{leaveCount}</div>
          <div className="text-xs font-semibold text-purple-600 mt-1">Leave</div>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-display font-bold text-slate-800">{selectedClass} – {date}</h3>
          <Badge variant="blue" dot>{classStudents.length} students</Badge>
        </div>
        {/* Legend — spells out what each icon means so Late vs Leave is unambiguous */}
        <div className="px-4 py-2.5 border-b border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Legend</span>
          {STATUSES.map(({ key, label, Icon, solid }) => (
            <span key={key} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <span className={`w-5 h-5 rounded-md ${solid} text-white flex items-center justify-center`}>
                <Icon size={11} strokeWidth={3}/>
              </span>
              {label}
            </span>
          ))}
        </div>
        {loading ? (
          <TableSkeleton rows={6} cols={3}/>
        ) : classStudents.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students in this class"
            subtitle="Add students to this class to start marking attendance."
          />
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {classStudents.map((s, i) => {
              const status = attendance[s._id] || 'Present';
              return (
                <div key={s._id} className={`border rounded-2xl p-3 flex items-center gap-3 ${STATUS_TINT[status]}`}>
                  <div className="w-9 h-9 rounded-full bg-white/80 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-white font-bold text-sm flex-shrink-0">{i+1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm leading-tight">{s.name}</div>
                    <div className="text-xs opacity-70 mt-0.5">{s.rollNumber}</div>
                  </div>
                  {/* Icon segmented control — one distinct icon per state, filled + white
                      when active, muted-but-legible (both themes) when not. */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-white/70 dark:bg-slate-950/40 ring-1 ring-black/5 dark:ring-white/10 flex-shrink-0">
                    {STATUSES.map(({ key, label, Icon, solid }) => {
                      const active = status === key;
                      return (
                        <button key={key} onClick={() => setStatus(s._id, key)}
                          title={label} aria-label={label} aria-pressed={active}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all
                            ${active
                              ? `${solid} text-white shadow-sm scale-105`
                              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'}`}>
                          <Icon size={15} strokeWidth={2.5}/>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      </>
      )}

      {saved && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-float flex items-center gap-2 text-sm font-medium z-50">
          <CheckCircle2 size={16}/> Attendance saved successfully!
        </div>
      )}
    </div>
  );
}
