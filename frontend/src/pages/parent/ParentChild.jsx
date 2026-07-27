import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2, ArrowLeft, CalendarCheck, Wallet, Award, BookMarked,
} from 'lucide-react';
import { Card, Badge } from '../../components/ui';
import { portalAPI } from '../../services/api';

const money = (n) => 'Rs ' + (Number(n) || 0).toLocaleString();
const STATUS_TONE = { Present: 'green', Absent: 'red', Late: 'orange', Leave: 'gray', Paid: 'green', Pending: 'orange', Overdue: 'red', Partial: 'purple' };

const TABS = [
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'fees',       label: 'Fees',       icon: Wallet },
  { id: 'results',    label: 'Results',    icon: Award },
  { id: 'homework',   label: 'Homework',   icon: BookMarked },
];

export default function ParentChild() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('attendance');

  useEffect(() => {
    setLoading(true);
    portalAPI.child(id)
      .then(r => setData(r.data))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={30} className="animate-spin text-primary-600"/></div>;
  if (err) return (
    <div className="space-y-4">
      <button onClick={() => navigate('/parent')} className="text-sm text-primary-600 flex items-center gap-1"><ArrowLeft size={15}/> Back</button>
      <Card className="p-6 text-red-600">{err}</Card>
    </div>
  );

  const { student, attendance = [], fees = [], results = [], homework = [], summary = {} } = data;

  return (
    <div className="space-y-5 animate-rise">
      <button onClick={() => navigate('/parent')} className="text-sm text-primary-600 flex items-center gap-1 hover:underline"><ArrowLeft size={15}/> Back to overview</button>

      {/* Header */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center text-white text-2xl font-display font-bold flex-shrink-0">
            {student.name.charAt(0)}
          </div>
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

      {tab === 'attendance' && (
        <TableCard empty={!attendance.length} emptyText="No attendance records yet."
          head={['Date', 'Status', 'Remarks']}
          rows={attendance.map(a => [
            new Date(a.date).toLocaleDateString(),
            <Badge variant={STATUS_TONE[a.status] || 'gray'}>{a.status}</Badge>,
            a.remarks || '—',
          ])}/>
      )}

      {tab === 'fees' && (
        <TableCard empty={!fees.length} emptyText="No fee records yet."
          head={['Month', 'Amount', 'Paid', 'Balance', 'Status']}
          rows={fees.map(f => [
            `${f.month} ${f.year}`,
            money(f.amount),
            money(f.paid),
            money((f.amount || 0) - (f.paid || 0)),
            <Badge variant={STATUS_TONE[f.status] || 'gray'}>{f.status}</Badge>,
          ])}/>
      )}

      {tab === 'results' && (
        <TableCard empty={!results.length} emptyText="No results published yet."
          head={['Exam', 'Subject', 'Marks', 'Grade', 'Result']}
          rows={results.map(r => [
            r.exam?.name || '—',
            r.exam?.subject || '—',
            `${r.marks} / ${r.exam?.totalMarks || 100}`,
            <Badge variant="blue">{r.grade || '—'}</Badge>,
            <span className={r.isPassed ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>{r.isPassed ? 'Pass' : 'Fail'}</span>,
          ])}/>
      )}

      {tab === 'homework' && (
        <TableCard empty={!homework.length} emptyText="No homework assigned."
          head={['Title', 'Subject', 'Due date', 'Status']}
          rows={homework.map(h => [
            h.title,
            h.subject,
            h.dueDate ? new Date(h.dueDate).toLocaleDateString() : '—',
            <Badge variant={h.status === 'Active' ? 'green' : 'gray'}>{h.status}</Badge>,
          ])}/>
      )}
    </div>
  );
}

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
      {empty ? (
        <div className="text-center py-12 text-slate-400 text-sm">{emptyText}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-left">
                {head.map(h => <th key={h} className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
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
