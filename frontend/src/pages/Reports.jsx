import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { SectionHeader, Card } from '../components/ui';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { feeAPI, attendanceAPI, studentAPI, teacherAPI, reportsAPI } from '../services/api';

const COLORS = ['#1d4ed8','#3b82f6','#10b981','#f97316','#a855f7','#ef4444'];
const MONTH_ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const sortByMonth = (arr) => [...(arr||[])].sort((a,b)=>MONTH_ORDER.indexOf(a._id)-MONTH_ORDER.indexOf(b._id));

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [feeTrend, setFeeTrend] = useState([]);
  const [feeSummary, setFeeSummary] = useState([]);
  const [atTrend, setAtTrend] = useState([]);
  const [genderData, setGenderData] = useState([]);
  const [subjectPerformance, setSubjectPerformance] = useState([]);
  const [kpis, setKpis] = useState({ students:0, teachers:0, collectionRate:0, avgAttendance:0 });

  useEffect(() => {
    // Each call is independently fault-tolerant so a role that lacks one module
    // (e.g. an accountant can't read Teachers) still sees every other chart.
    const safe = (p) => p.then(r => r).catch(() => null);
    Promise.all([
      safe(feeAPI.getStats({ year: new Date().getFullYear() })),
      safe(attendanceAPI.getTrend()),
      safe(studentAPI.getStats()),
      safe(teacherAPI.getAll()),
      safe(reportsAPI.subjectPerformance()),
    ]).then(([feeRes, attRes, stuRes, tchRes, subRes]) => {
      setFeeTrend(sortByMonth(feeRes?.data?.monthly));
      setFeeSummary(feeRes?.data?.summary || []);
      const trend = attRes?.data || [];
      setAtTrend(trend);
      setSubjectPerformance(subRes?.data || []);

      const total = stuRes?.data?.total || 0;
      const male  = stuRes?.data?.male  || 0;
      const female= stuRes?.data?.female|| 0;
      setGenderData([{ name:'Male', value:male }, { name:'Female', value:female }]);

      const collected = feeRes?.data?.summary?.reduce((s,x)=>s+(x.totalPaid||0),0)||0;
      const expected  = feeRes?.data?.summary?.reduce((s,x)=>s+(x.totalAmount||0),0)||0;
      const avgAtt = trend.length
        ? Math.round(trend.reduce((s,d)=>{ const t=d.total||((d.present||0)+(d.absent||0)); return s + (t?((d.present||0)/t)*100:0); },0) / trend.length)
        : 0;
      setKpis({
        students: total,
        teachers: (tchRes?.data||[]).filter(t=>t.status==='Active').length,
        collectionRate: expected ? Math.round((collected/expected)*100) : 0,
        avgAttendance: avgAtt,
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-primary-600"/></div>
  );

  return (
    <div className="space-y-6">
      <SectionHeader title="Reports & Analytics" subtitle="Data-driven insights for your school"/>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Total Students',    val:kpis.students,          delta:'Currently enrolled', color:'text-blue-600',   bg:'bg-blue-50 border-blue-200' },
          { label:'Active Teachers',   val:kpis.teachers,          delta:'Active teachers',    color:'text-purple-600', bg:'bg-purple-50 border-purple-200' },
          { label:'Fee Recovery',      val:`${kpis.collectionRate}%`, delta:'This year',       color:'text-emerald-600', bg:'bg-emerald-50 border-emerald-200' },
          { label:'Avg Attendance',    val:`${kpis.avgAttendance}%`, delta:'Recorded days',    color:'text-orange-600', bg:'bg-orange-50 border-orange-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-4 ${k.bg}`}>
            <div className={`text-2xl font-display font-bold ${k.color}`}>{k.val}</div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">{k.label}</div>
            <div className="text-xs text-slate-400 font-medium mt-1">{k.delta}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-display font-bold text-slate-800 mb-1">Fee Collection Trend</h3>
          <p className="text-slate-400 text-xs mb-4">Monthly collected vs expected</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={feeTrend}>
              <defs>
                <linearGradient id="gc2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1d4ed8" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="_id" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}K`} tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <Tooltip formatter={v=>`Rs ${(v/1000).toFixed(0)}K`} contentStyle={{borderRadius:12,border:'none',boxShadow:'0 8px 32px rgba(0,0,0,.1)'}}/>
              <Area type="monotone" dataKey="expected"  stroke="#10b981" strokeWidth={2} fill="none" strokeDasharray="5 5" name="Expected"/>
              <Area type="monotone" dataKey="collected" stroke="#1d4ed8" strokeWidth={2.5} fill="url(#gc2)" name="Collected"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-bold text-slate-800 mb-1">Subject-wise Performance</h3>
          <p className="text-slate-400 text-xs mb-4">Average % score across all recorded exam results</p>
          {subjectPerformance.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">No exam results recorded yet</div>
          ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={subjectPerformance} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
              <XAxis dataKey="subject" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,100]} tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{borderRadius:12,border:'none'}}/>
              <Bar dataKey="avg" name="Avg Score" radius={[6,6,0,0]}>
                {subjectPerformance.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <h3 className="font-display font-bold text-slate-800 mb-1">Fee Status Breakdown</h3>
          <p className="text-slate-400 text-xs mb-4">By payment status</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={feeSummary} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={80}
                label={({_id,percent})=>`${_id} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                {feeSummary.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Pie>
              <Tooltip contentStyle={{borderRadius:12,border:'none'}}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-bold text-slate-800 mb-1">Gender Ratio</h3>
          <p className="text-slate-400 text-xs mb-4">Male vs Female enrollment</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                <Cell fill="#1d4ed8"/><Cell fill="#ec4899"/>
              </Pie>
              <Tooltip contentStyle={{borderRadius:12,border:'none'}}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-bold text-slate-800 mb-1">Attendance Trend</h3>
          <p className="text-slate-400 text-xs mb-4">Weekly present % from DB</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={atTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="_id" tick={{fontSize:9,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{borderRadius:12,border:'none'}}/>
              <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2.5} dot={{fill:'#10b981',r:4}} name="Present"/>
              <Line type="monotone" dataKey="absent"  stroke="#ef4444" strokeWidth={2}   dot={{fill:'#ef4444',r:3}} name="Absent"/>
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
