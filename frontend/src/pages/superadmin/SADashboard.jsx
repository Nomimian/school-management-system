import { useEffect, useState } from 'react';
import { Building2, Users, DollarSign, TrendingUp, AlertTriangle, CheckCircle, Clock, Globe, Loader2, Eye, Plus, Activity, CreditCard, Megaphone } from 'lucide-react';
import { saAPI } from '../../services/saApi.js';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#3b82f6','#10b981','#f97316','#8b5cf6','#ef4444'];

const PLAN_COLORS = { trial:'#94a3b8', basic:'#3b82f6', pro:'#8b5cf6', enterprise:'#f59e0b' };
const PLAN_LABELS = { trial:'Free Trial', basic:'Basic', pro:'Pro', enterprise:'Enterprise' };

const fmt = (n) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n||0);
const fmtRs = (n) => `Rs ${(n||0).toLocaleString()}`;

function StatCard({ icon:Icon, label, value, sub, color='blue', trend, onClick }) {
  const colors = {
    blue:   'from-blue-500 to-blue-700',
    green:  'from-emerald-500 to-emerald-700',
    orange: 'from-orange-400 to-orange-600',
    purple: 'from-purple-500 to-purple-700',
    red:    'from-red-500 to-red-600',
    slate:  'from-slate-600 to-slate-800',
  };
  return (
    <div onClick={onClick}
      className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4
        ${onClick?'cursor-pointer hover:shadow-md transition-shadow':''}`}>
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors[color]||colors.blue} flex items-center justify-center shadow-lg flex-shrink-0`}>
        <Icon size={24} className="text-white"/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold text-slate-800 leading-none">{value}</div>
        <div className="text-slate-500 text-sm mt-1">{label}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
      {trend !== undefined && (
        <div className={`text-xs font-semibold px-2 py-1 rounded-lg ${trend>=0?'bg-emerald-50 text-emerald-600':'bg-red-50 text-red-500'}`}>
          {trend>=0?'↑':'↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

export default function SADashboard() {
  const [stats, setStats]       = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading]   = useState(true);
  const navigate                = useNavigate();

  useEffect(()=>{
    Promise.all([saAPI.getStats(), saAPI.getActivity({limit:8})])
      .then(([s,a])=>{ setStats(s.data); setActivity(a.data||[]); })
      .catch(console.error)
      .finally(()=>setLoading(false));
  },[]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-blue-600"/>
    </div>
  );

  const planPieData = (stats?.planDist||[]).map(p=>({
    name: PLAN_LABELS[p._id]||p._id, value:p.count, color:PLAN_COLORS[p._id]||'#94a3b8',
  }));

  const monthlySignupData = (stats?.monthlySignups||[]).map(m=>({
    month: `${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m._id.month]} ${m._id.year}`,
    schools: m.count,
  }));

  return (
    <div className="space-y-6">

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 rounded-3xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 rounded-full bg-white/5 translate-x-20 -translate-y-20"/>
        <div className="absolute right-16 bottom-0 w-40 h-40 rounded-full bg-blue-500/10 translate-y-10"/>
        <div className="relative">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Globe size={14}/> Platform Overview
          </div>
          <h2 className="text-2xl font-bold mb-1">SuperAdmin Dashboard</h2>
          <p className="text-slate-300 text-sm">Complete control over all schools on the EduManage Pro platform</p>
          <div className="flex flex-wrap gap-3 mt-4">
            {[
              ['Active Schools', stats?.activeSchools||0],
              ['Monthly Revenue', `Rs ${((stats?.monthlyRevenue||0)/1000).toFixed(0)}K`],
              ['New This Month', stats?.newThisMonth||0],
              ['Expiring Soon', stats?.expiringSoon||0],
            ].map(([k,v])=>(
              <div key={k} className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-sm border border-white/10">
                <div className="text-slate-300 text-xs">{k}</div>
                <div className="font-bold text-white">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Total Schools"    value={fmt(stats?.totalSchools)}   sub="All time"              color="blue"   onClick={()=>navigate('/superadmin/schools')}/>
        <StatCard icon={CheckCircle} label="Active Schools" value={fmt(stats?.activeSchools)}  sub="Currently running"     color="green"/>
        <StatCard icon={DollarSign} label="Monthly Revenue" value={fmtRs(stats?.monthlyRevenue)} sub="Recurring subscription" color="purple"/>
        <StatCard icon={AlertTriangle} label="Expiring Soon" value={stats?.expiringSoon||0}   sub="Within 30 days"        color="orange"/>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* School signups trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800">New School Signups</h3>
              <p className="text-slate-400 text-xs mt-0.5">Monthly growth trend</p>
            </div>
            <button onClick={()=>navigate('/superadmin/schools')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              <Plus size={12}/> Add School
            </button>
          </div>
          {monthlySignupData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlySignupData}>
                <defs>
                  <linearGradient id="saGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{borderRadius:12,border:'none',boxShadow:'0 8px 32px rgba(0,0,0,.1)'}}/>
                <Area type="monotone" dataKey="schools" stroke="#3b82f6" strokeWidth={2.5}
                  fill="url(#saGrad)" name="New Schools"/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-300">
              No signup data yet — provision your first school!
            </div>
          )}
        </div>

        {/* Plan distribution */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-1">Plan Distribution</h3>
          <p className="text-slate-400 text-xs mb-4">Schools by subscription</p>
          {planPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={planPieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={70} innerRadius={35}
                    paddingAngle={3}>
                    {planPieData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius:12,border:'none'}}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {planPieData.map(d=>(
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{background:d.color}}/>
                      <span className="text-slate-600">{d.name}</span>
                    </div>
                    <span className="font-semibold text-slate-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-300 text-sm text-center">
              No schools yet
            </div>
          )}
        </div>
      </div>

      {/* Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={16} className="text-blue-500"/>Recent Activity</h3>
            <button onClick={()=>navigate('/superadmin/activity')} className="text-xs text-blue-600 hover:text-blue-700 font-medium">View All →</button>
          </div>
          {activity.length > 0 ? (
            <div className="space-y-2">
              {activity.map((log,i)=>(
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    log.action.includes('DELETE')||log.action.includes('DEACTIVATED') ? 'bg-red-400' :
                    log.action.includes('CREATE')||log.action.includes('ACTIVATED')  ? 'bg-emerald-400' :
                    log.action.includes('LOGIN')                                     ? 'bg-blue-400' : 'bg-orange-400'
                  }`}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700">{log.details}</div>
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{log.action}</span>
                      <span>{new Date(log.timestamp).toLocaleString('en-PK')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-300">No activity yet</div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label:'Add New School',      icon:Plus,       color:'bg-blue-600 hover:bg-blue-700',    path:'/superadmin/schools?new=1' },
              { label:'View All Schools',    icon:Building2,  color:'bg-slate-700 hover:bg-slate-800',  path:'/superadmin/schools' },
              { label:'Manage Plans',        icon:CreditCard, color:'bg-purple-600 hover:bg-purple-700',path:'/superadmin/subscriptions' },
              { label:'Send Announcement',   icon:Megaphone,  color:'bg-orange-500 hover:bg-orange-600',path:'/superadmin/announcements' },
              { label:'View Activity Log',   icon:Activity,   color:'bg-emerald-600 hover:bg-emerald-700',path:'/superadmin/activity' },
            ].map(a=>(
              <button key={a.label} onClick={()=>navigate(a.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium transition-all ${a.color}`}>
                <a.icon size={15}/> {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


