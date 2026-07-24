import { useEffect, useState } from 'react';
import { GraduationCap, Users, DollarSign, ClipboardCheck, TrendingUp, Loader2 } from 'lucide-react';
import { StatCard, Card, Badge, Button } from '../components/ui';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardAPI, feeAPI, attendanceAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useSchool } from '../hooks/useSchool.jsx';

const feeStatusColors = { Paid:'green', Pending:'orange', Overdue:'red', Partial:'purple' };
const CURRENT_YEAR = new Date().getFullYear();
const MONTH_ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const sortByMonth = (arr) => [...(arr||[])].sort((a,b)=>MONTH_ORDER.indexOf(a._id)-MONTH_ORDER.indexOf(b._id));

export default function Dashboard() {
  const [stats, setStats]         = useState(null);
  const [feeStats, setFeeStats]   = useState(null);
  const [atTrend, setAtTrend]     = useState([]);
  const [feeTrend, setFeeTrend]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const navigate = useNavigate();
  const { school } = useSchool();

  useEffect(() => {
    // Each call is independently fault-tolerant: a role without access to a
    // given module (e.g. a teacher and fees) gets a 403 for that one call only,
    // and the rest of the dashboard still renders what they ARE allowed to see.
    const safe = (p) => p.then(r => r).catch(() => null);
    Promise.all([
      safe(dashboardAPI.getStats()),
      safe(feeAPI.getStats({ year: CURRENT_YEAR })),
      safe(attendanceAPI.getTrend()),
    ]).then(([dash, fee, att]) => {
      if (dash) setStats(dash.data);
      if (fee)  { setFeeStats(fee.data); setFeeTrend(sortByMonth(fee.data?.monthly)); }
      if (att)  setAtTrend(att.data || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-primary-600" />
    </div>
  );

  const totalCollected = stats?.feeStats?.totalCollected || 0;
  const presentToday   = stats?.todayAttendance?.find(a => a._id === 'Present')?.count || 0;
  const totalStudents  = stats?.counts?.students || 0;
  const attendancePct  = totalStudents > 0 ? ((presentToday / totalStudents) * 100).toFixed(1) : '—';

  // Normalise attendance trend into a plotable present-% series (real data)
  const attendanceSeries = (atTrend || []).map(d => {
    const total = d.total ?? ((d.present || 0) + (d.absent || 0));
    return { label: d._id, pct: total ? Math.round(((d.present || 0) / total) * 100) : 0, present: d.present || 0 };
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-blue-500 rounded-3xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-6 top-0 w-48 h-48 rounded-full bg-white/5 -translate-y-12 translate-x-8" />
        <div className="absolute right-20 bottom-0 w-32 h-32 rounded-full bg-white/5 translate-y-8" />
        <div className="relative">
          <div className="text-blue-200 text-sm font-medium mb-1">Welcome back,</div>
          <h2 className="font-display font-bold text-2xl">{school?.name || 'School Dashboard'} 👋</h2>
          <p className="text-blue-100 mt-1 text-sm">Here's what's happening in your school today.</p>
          <div className="flex flex-wrap gap-3 mt-4">
            {[
              ['Academic Year', school?.academicYear || '—'],
              ['Term', school?.currentTerm || '—'],
              ['Today', new Date().toLocaleDateString('en-PK',{month:'short',day:'numeric'})],
            ].map(([k,v]) => (
              <div key={k} className="bg-white/15 rounded-xl px-4 py-2 text-sm backdrop-blur-sm">
                <span className="text-blue-200 text-xs block">{k}</span>
                <span className="font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={GraduationCap} label="Total Students"     value={totalStudents}                            sub={`${stats?.counts?.teachers || 0} teachers`}  color="blue" />
        <StatCard icon={Users}          label="Teaching Staff"     value={stats?.counts?.teachers||0}               sub="Active teachers"                              color="purple" />
        <StatCard icon={DollarSign}     label="Fee Collected"      value={`Rs ${(totalCollected/1000).toFixed(0)}K`} sub="All time"                                    color="green" />
        <StatCard icon={ClipboardCheck} label="Today's Attendance" value={`${attendancePct}%`}                       sub={`${presentToday} present today`}             color="orange" />
      </div>

      {/* Attendance (recent) mini chart — real data from attendanceAPI.getTrend() */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-bold text-slate-800">Attendance (recent)</h3>
            <p className="text-slate-400 text-xs mt-0.5">Present rate over recorded days</p>
          </div>
          <Badge variant="green" dot>Live</Badge>
        </div>
        {attendanceSeries.length === 0 ? (
          <div className="h-[90px] flex items-center justify-center text-sm text-slate-400">No attendance recorded yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={90}>
            <AreaChart data={attendanceSeries} margin={{ top:5, right:8, left:0, bottom:0 }}>
              <defs>
                <linearGradient id="gAtt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} hide/>
              <YAxis domain={[0,100]} hide/>
              <Tooltip formatter={v=>`${v}% present`} contentStyle={{borderRadius:12,border:'none',boxShadow:'0 8px 32px rgba(0,0,0,.1)'}}/>
              <Area type="monotone" dataKey="pct" stroke="#10b981" strokeWidth={2.5} fill="url(#gAtt)" name="Present %"/>
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-bold text-slate-800">Fee Collection Trend</h3>
              <p className="text-slate-400 text-xs mt-0.5">Monthly collected vs expected</p>
            </div>
            <Badge variant="green">{CURRENT_YEAR}</Badge>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={feeTrend}>
              <defs>
                <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1d4ed8" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="_id" tick={{fontSize:12,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}K`} tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <Tooltip formatter={v=>`Rs ${(v/1000).toFixed(0)}K`} contentStyle={{borderRadius:12,border:'none',boxShadow:'0 8px 32px rgba(0,0,0,.1)'}}/>
              <Area type="monotone" dataKey="expected"  stroke="#10b981" strokeWidth={2} fill="none" strokeDasharray="5 5" name="Expected"/>
              <Area type="monotone" dataKey="collected" stroke="#1d4ed8" strokeWidth={2.5} fill="url(#gc)" name="Collected"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Fee Summary */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-slate-800 mb-1">Fee Summary</h3>
          <p className="text-slate-400 text-xs mb-4">All time breakdown</p>
          <div className="space-y-3">
            {(feeStats?.summary || []).map(s => (
              <div key={s._id} className={`rounded-xl p-3 flex items-center justify-between border ${
                s._id==='Paid' ? 'bg-emerald-50 border-emerald-200' :
                s._id==='Pending' ? 'bg-orange-50 border-orange-200' :
                s._id==='Overdue' ? 'bg-red-50 border-red-200' :
                'bg-purple-50 border-purple-200'}`}>
                <div>
                  <div className={`font-bold text-lg ${
                    s._id==='Paid' ? 'text-emerald-700' :
                    s._id==='Pending' ? 'text-orange-700' :
                    s._id==='Overdue' ? 'text-red-600' : 'text-purple-700'}`}>{s.count}</div>
                  <div className="text-xs font-medium text-slate-500">{s._id}</div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>Rs {((s.totalPaid||0)/1000).toFixed(0)}K paid</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-4 flex items-center gap-3">
            <TrendingUp size={20} className="text-primary-600"/>
            <div>
              <div className="text-xs text-slate-500">Total Collected</div>
              <div className="font-display font-bold text-primary-700 text-xl">Rs {(totalCollected/1000).toFixed(0)}K</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent students & Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-slate-800">Recent Students</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/students')}>View All</Button>
          </div>
          <ul className="space-y-2">
            {(stats?.recentStudents || []).map(s => (
              <li key={s._id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">{s.name}</div>
                  <div className="text-xs text-slate-400">{s.class} · {s.rollNumber}</div>
                </div>
                <Badge variant={feeStatusColors[s.feeStatus]||'gray'}>{s.feeStatus}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-slate-800">Latest Notices</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/notices')}>View All</Button>
          </div>
          <ul className="space-y-3">
            {(stats?.recentNotices || []).map(n => (
              <li key={n._id} onClick={() => navigate('/notices')}
                className="flex gap-3 items-start group cursor-pointer rounded-lg -mx-2 px-2 py-1 hover:bg-slate-50 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.priority==='High' ? 'bg-red-400' : n.priority==='Medium' ? 'bg-orange-400' : 'bg-blue-400'}`}/>
                <div>
                  <div className="text-sm font-medium text-slate-700 group-hover:text-primary-600 leading-snug">{n.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{new Date(n.createdAt).toLocaleDateString()} · {n.author}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
