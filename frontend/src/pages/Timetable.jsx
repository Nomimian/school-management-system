import { useState, useEffect, useCallback } from 'react';
import { Clock, Loader2, Save, Pencil, X } from 'lucide-react';
import { classAPI, teacherAPI, timetableAPI } from '../services/api';
import { SectionHeader, Card, Button, useToast } from '../components/ui';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Fixed period slots (P4 is the break). Times are display-only defaults.
const SLOTS = [
  { no: 1, start: '08:00', end: '08:45' },
  { no: 2, start: '08:45', end: '09:30' },
  { no: 3, start: '09:30', end: '10:15' },
  { no: 4, start: '10:15', end: '10:35', isBreak: true },
  { no: 5, start: '10:35', end: '11:20' },
  { no: 6, start: '11:20', end: '12:05' },
  { no: 7, start: '12:05', end: '12:50' },
  { no: 8, start: '12:50', end: '13:35' },
];

const SUBJECT_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700', 'bg-teal-100 text-teal-700', 'bg-pink-100 text-pink-700',
  'bg-lime-100 text-lime-700', 'bg-indigo-100 text-indigo-700', 'bg-rose-100 text-rose-700',
];
const colorFor = (subject) => {
  if (!subject) return 'bg-slate-50 text-slate-400';
  let h = 0; for (const c of subject) h = (h * 31 + c.charCodeAt(0)) % SUBJECT_COLORS.length;
  return SUBJECT_COLORS[h];
};

// Build an empty grid: { [day]: [{subject, teacher, room}, ...] }
const emptyGrid = () =>
  DAYS.reduce((acc, day) => ({ ...acc, [day]: SLOTS.map(() => ({ subject: '', teacher: '', room: '' })) }), {});

export default function Timetable() {
  const toast = useToast();
  const [classes, setClasses]   = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [grid, setGrid]     = useState(emptyGrid());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [editing, setEditing] = useState(false);

  // Load classes + teachers once
  useEffect(() => {
    (async () => {
      try {
        const [c, t] = await Promise.all([classAPI.getAll(), teacherAPI.getAll()]);
        const cls = c.data || [];
        setClasses(cls);
        setTeachers(t.data || []);
        if (cls.length) setSelectedClass(cls[0].name);
      } catch (e) { toast.error(e.message); }
    })();
  }, []);

  const subjects = [...new Set(teachers.map(t => t.subject).filter(Boolean))].sort();
  const teacherName = (id) => teachers.find(t => t._id === id)?.name || '';

  const loadTimetable = useCallback(async (cls) => {
    if (!cls) return;
    setLoading(true); setEditing(false);
    try {
      const res = await timetableAPI.getAll({ class: cls });
      const g = emptyGrid();
      (res.data || []).forEach(dayDoc => {
        if (!g[dayDoc.day]) return;
        (dayDoc.periods || []).forEach(p => {
          const idx = (p.periodNo || 0) - 1;
          if (idx >= 0 && idx < SLOTS.length) {
            g[dayDoc.day][idx] = {
              subject: p.subject || '',
              teacher: p.teacher?._id || p.teacher || '',
              room: p.room || '',
            };
          }
        });
      });
      setGrid(g);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (selectedClass) loadTimetable(selectedClass); }, [selectedClass, loadTimetable]);

  const setCell = (day, idx, patch) =>
    setGrid(g => ({ ...g, [day]: g[day].map((c, i) => i === idx ? { ...c, ...patch } : c) }));

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all(DAYS.map(day => {
        const periods = SLOTS.map((slot, i) => ({
          periodNo: slot.no, startTime: slot.start, endTime: slot.end,
          isBreak: !!slot.isBreak,
          subject: slot.isBreak ? 'Break' : (grid[day][i].subject || ''),
          teacher: !slot.isBreak && grid[day][i].teacher ? grid[day][i].teacher : undefined,
          room: grid[day][i].room || '',
        }));
        return timetableAPI.save({ class: selectedClass, day, periods });
      }));
      toast.success('Timetable saved');
      setEditing(false);
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Timetable" subtitle="Weekly class schedule"
        action={
          editing ? (
            <div className="flex gap-2">
              <Button variant="secondary" icon={X} onClick={() => { setEditing(false); loadTimetable(selectedClass); }}>Cancel</Button>
              <Button variant="primary" icon={Save} loading={saving} onClick={save}>Save Timetable</Button>
            </div>
          ) : (
            <Button variant="primary" icon={Pencil} onClick={() => setEditing(true)} disabled={!selectedClass}>Edit Timetable</Button>
          )
        }
      />

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} disabled={editing}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60">
            {classes.length === 0 && <option value="">No classes yet</option>}
            {classes.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mt-5">
          <Clock size={16} className="text-primary-500" />
          <span>{editing ? 'Editing mode — pick a subject & teacher for each period' : 'Period duration: 45 minutes'}</span>
        </div>
      </div>

      <Card className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={26} className="animate-spin text-primary-500" /></div>
        ) : (
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-gradient-to-r from-primary-50 to-blue-50 border-b border-blue-100">
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-28">Period</th>
                {DAYS.map(d => <th key={d} className="px-3 py-3 text-center text-xs font-bold text-primary-700 uppercase tracking-wider">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((slot, idx) => (
                <tr key={slot.no} className={`border-b border-slate-50 ${slot.isBreak ? 'bg-slate-50/60' : ''}`}>
                  <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                    <div className="font-semibold text-slate-600 text-sm">P{slot.no}</div>
                    <div className="text-slate-400 font-mono">{slot.start}–{slot.end}</div>
                  </td>
                  {DAYS.map(day => {
                    if (slot.isBreak) {
                      return <td key={day} className="px-3 py-2.5 text-center">
                        <span className="inline-block px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-400 italic w-full">Break</span>
                      </td>;
                    }
                    const cell = grid[day][idx];
                    if (editing) {
                      return (
                        <td key={day} className="px-2 py-2 align-top">
                          <select value={cell.subject} onChange={e => setCell(day, idx, { subject: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 mb-1">
                            <option value="">— free —</option>
                            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <select value={cell.teacher} onChange={e => setCell(day, idx, { teacher: e.target.value })}
                            className="w-full px-2 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                            <option value="">Teacher…</option>
                            {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                          </select>
                        </td>
                      );
                    }
                    return (
                      <td key={day} className="px-3 py-2.5 text-center">
                        {cell.subject ? (
                          <div className={`inline-block px-3 py-1.5 rounded-xl text-xs font-semibold ${colorFor(cell.subject)}`}>
                            {cell.subject}
                            {cell.teacher && <div className="text-[10px] font-normal opacity-70 mt-0.5">{teacherName(cell.teacher)}</div>}
                          </div>
                        ) : <span className="text-slate-300">–</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {classes.length === 0 && (
        <div className="text-center text-sm text-slate-400">Create a class first (Classes page) to build its timetable.</div>
      )}
    </div>
  );
}
