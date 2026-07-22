import { useState, useEffect } from 'react';
import { CheckCircle2, Save, Users, ClipboardList } from 'lucide-react';
import { studentAPI, attendanceAPI } from '../services/api';
import { SectionHeader, Card, Button, Badge, EmptyState, TableSkeleton, useToast } from '../components/ui';
import { useClasses } from '../hooks/useClasses';

const today = new Date().toISOString().slice(0,10);

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
      const records = classStudents.map(s => ({ student: s._id, status: attendance[s._id] || 'Present' }));
      await attendanceAPI.markBulk({ records, date, class: selectedClass });
      setSaved(true);
      toast.success('Attendance saved');
      setTimeout(() => setSaved(false), 3000);
    } catch(e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const presentCount = classStudents.filter(s => attendance[s._id] === 'Present').length;
  const absentCount  = classStudents.filter(s => attendance[s._id] === 'Absent').length;
  const lateCount    = classStudents.filter(s => attendance[s._id] === 'Late').length;

  const statusConfig = {
    Present: { color:'bg-emerald-100 text-emerald-700 border-emerald-300', dot:'bg-emerald-500' },
    Absent:  { color:'bg-red-100 text-red-600 border-red-300',             dot:'bg-red-500'     },
    Late:    { color:'bg-orange-100 text-orange-700 border-orange-300',    dot:'bg-orange-500'  },
    Leave:   { color:'bg-purple-100 text-purple-700 border-purple-300',    dot:'bg-purple-500'  },
  };

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
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Class</label>
            <select value={selectedClass} onChange={e => setClass(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
              {classes.map(c => <option key={c}>{c}</option>)}
            </select>
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

      <div className="grid grid-cols-3 gap-3">
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
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-display font-bold text-slate-800">{selectedClass} – {date}</h3>
          <Badge variant="blue" dot>{classStudents.length} students</Badge>
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
              const cfg = statusConfig[status];
              return (
                <div key={s._id} className={`border rounded-2xl p-4 flex items-center gap-3 ${cfg.color}`}>
                  <div className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center text-slate-700 font-bold text-sm flex-shrink-0">{i+1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm leading-tight">{s.name}</div>
                    <div className="text-xs opacity-70 mt-0.5">{s.rollNumber}</div>
                  </div>
                  <div className="flex gap-1">
                    {['Present','Absent','Late','Leave'].map(st => (
                      <button key={st} onClick={() => setStatus(s._id, st)} title={st}
                        className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center text-[10px] font-bold
                          ${status===st ? `${statusConfig[st].dot} border-transparent text-white scale-110` : 'border-current/30 opacity-40 hover:opacity-70 bg-white/50'}`}>
                        {st[0]}
                      </button>
                    ))}
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
