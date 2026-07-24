import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ChevronRight, Bell, CalendarCheck, Wallet, GraduationCap } from 'lucide-react';
import { Card, Badge } from '../../components/ui';
import { portalAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth.jsx';

const money = (n) => 'Rs ' + (Number(n) || 0).toLocaleString();
const PRIORITY = { High: 'red', Medium: 'orange', Low: 'gray' };

export default function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    portalAPI.overview()
      .then(r => setData(r.data))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={30} className="animate-spin text-primary-600"/></div>;
  if (err) return <Card className="p-6 text-red-600">{err}</Card>;

  const children = data?.children || [];
  const notices  = data?.notices  || [];

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <h1 className="font-display font-bold text-slate-800 text-2xl">Welcome, {user?.name?.split(' ')[0] || 'Parent'} 👋</h1>
        <p className="text-slate-500 text-sm mt-1">Here's an overview of your {children.length === 1 ? 'child' : 'children'}.</p>
      </div>

      {children.length === 0 ? (
        <Card className="p-10 text-center text-slate-400">
          <GraduationCap size={30} className="mx-auto mb-3 text-slate-300"/>
          No children are linked to your account yet. Please contact the school office.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {children.map(({ student, attendancePct, feeBalance }) => (
            <button key={student._id} onClick={() => navigate(`/parent/child/${student._id}`)}
              className="text-left group">
              <Card hover className="p-5 h-full">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600 to-blue-500 flex items-center justify-center text-white text-xl font-display font-bold flex-shrink-0">
                    {student.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-bold text-slate-800 truncate">{student.name}</div>
                    <div className="text-sm text-slate-400">Class {student.class}{student.section ? `-${student.section}` : ''} · Roll {student.rollNumber || '—'}</div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-primary-600 transition-colors"/>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Stat icon={CalendarCheck} label="Attendance" value={attendancePct != null ? `${attendancePct}%` : '—'}
                    tone={attendancePct == null ? 'gray' : attendancePct >= 75 ? 'green' : 'red'}/>
                  <Stat icon={Wallet} label="Fee balance" value={money(feeBalance)}
                    tone={feeBalance > 0 ? 'red' : 'green'}/>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* Notices */}
      <div>
        <h2 className="font-display font-bold text-slate-800 text-lg flex items-center gap-2 mb-3"><Bell size={18}/> School Notices</h2>
        {notices.length === 0 ? (
          <Card className="p-6 text-center text-slate-400 text-sm">No notices at the moment.</Card>
        ) : (
          <div className="space-y-2">
            {notices.map(n => (
              <Card key={n._id} className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{n.title}</span>
                    <Badge variant={PRIORITY[n.priority] || 'gray'}>{n.priority}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">{n.content}</p>
                  <div className="text-xs text-slate-400 mt-1.5">{new Date(n.createdAt).toLocaleDateString()} · {n.author || 'Admin'}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  const tones = { green: 'text-emerald-600 bg-emerald-50', red: 'text-red-500 bg-red-50', gray: 'text-slate-500 bg-slate-100' };
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-400"><Icon size={13}/> {label}</div>
      <div className={`mt-1 text-sm font-bold px-2 py-0.5 rounded-lg inline-block ${tones[tone] || tones.gray}`}>{value}</div>
    </div>
  );
}
