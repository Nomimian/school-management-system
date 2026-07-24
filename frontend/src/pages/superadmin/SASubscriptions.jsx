import { useState, useEffect } from 'react';
import { CreditCard, Check, Loader2, TrendingUp, Users, Building2, Star } from 'lucide-react';
import { saAPI } from '../../services/saApi.js';

const PLAN_COLORS = {
  trial:      { bg:'bg-slate-50',     border:'border-slate-200',  btn:'bg-slate-600 hover:bg-slate-700',     badge:'bg-slate-100 text-slate-600',     icon:'text-slate-500' },
  basic:      { bg:'bg-blue-50',      border:'border-blue-200',   btn:'bg-blue-600 hover:bg-blue-700',       badge:'bg-blue-100 text-blue-700',       icon:'text-blue-500' },
  pro:        { bg:'bg-purple-50',    border:'border-purple-200', btn:'bg-purple-600 hover:bg-purple-700',   badge:'bg-purple-100 text-purple-700',   icon:'text-purple-500' },
  enterprise: { bg:'bg-amber-50',     border:'border-amber-200',  btn:'bg-amber-600 hover:bg-amber-700',     badge:'bg-amber-100 text-amber-700',     icon:'text-amber-500' },
};

export default function SASubscriptions() {
  const [plans, setPlans]   = useState([]);
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    Promise.all([saAPI.getPlans(), saAPI.getStats()])
      .then(([p,s])=>{ setPlans(p.data||[]); setStats(s.data); })
      .catch(console.error)
      .finally(()=>setLoading(false));
  },[]);

  const planPrices = { trial:0, basic:2999, pro:5999, enterprise:14999 };
  const getPlanCount = (planId) => (stats?.planDist||[]).find(p=>p._id===planId)?.count || 0;
  const getPlanRevenue = (planId) => {
    const count = getPlanCount(planId);
    return count * (planPrices[planId]||0);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={28} className="animate-spin text-blue-500"/></div>;

  const totalRevenue = plans.reduce((s,p) => s + getPlanRevenue(p.id), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Subscriptions & Plans</h2>
        <p className="text-slate-400 text-sm mt-0.5">Manage pricing plans and view subscription analytics</p>
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp size={20} className="text-blue-200"/>
            <span className="text-blue-200 text-sm font-medium">Annual Revenue</span>
          </div>
          <div className="text-3xl font-bold">Rs {(totalRevenue/1000).toFixed(0)}K</div>
          <div className="text-blue-200 text-xs mt-1">From {stats?.activeSchools||0} active schools</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Building2 size={20} className="text-slate-400"/>
            <span className="text-slate-500 text-sm font-medium">Total Schools</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{stats?.totalSchools||0}</div>
          <div className="text-slate-400 text-xs mt-1">{stats?.newThisMonth||0} new this month</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Star size={20} className="text-amber-400"/>
            <span className="text-slate-500 text-sm font-medium">Monthly Recurring</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">Rs {((stats?.monthlyRevenue||0)/1000).toFixed(1)}K</div>
          <div className="text-slate-400 text-xs mt-1">Average per month</div>
        </div>
      </div>

      {/* Plans grid */}
      <div>
        <h3 className="font-bold text-slate-700 mb-4">Available Plans</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(plan => {
            const clr   = PLAN_COLORS[plan.id] || PLAN_COLORS.basic;
            const count = getPlanCount(plan.id);
            const rev   = getPlanRevenue(plan.id);

            return (
              <div key={plan.id} className={`rounded-2xl border-2 p-5 ${clr.bg} ${clr.border} relative overflow-hidden`}>
                {plan.id === 'pro' && (
                  <div className="absolute top-3 right-3 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">POPULAR</div>
                )}
                <div className="mb-4">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${clr.badge}`}>{plan.name}</span>
                </div>
                <div className="mb-3">
                  <div className="text-2xl font-bold text-slate-800">
                    {plan.price === 0 ? 'Free' : `Rs ${plan.price.toLocaleString()}`}
                  </div>
                  {plan.price > 0 && <div className="text-slate-400 text-xs">per year</div>}
                </div>

                {/* Usage stats */}
                <div className="bg-white/70 rounded-xl p-3 mb-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5"><Building2 size={11}/>Schools</span>
                    <span className="font-bold text-slate-700">{count}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5"><Users size={11}/>Max Students</span>
                    <span className="font-bold text-slate-700">{plan.maxStudents.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5"><TrendingUp size={11}/>Revenue</span>
                    <span className="font-bold text-slate-700">Rs {(rev/1000).toFixed(1)}K</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-1.5 mb-4">
                  {plan.features.map(f=>(
                    <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
                      <Check size={12} className={`mt-0.5 flex-shrink-0 ${clr.icon}`}/>{f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan assignment table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Plan Distribution</h3>
          <p className="text-slate-400 text-xs mt-0.5">Schools per plan</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {['Plan','Price/Year','Active Schools','Monthly Revenue','Annual Revenue','Max Students'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plans.map(plan=>{
                const clr   = PLAN_COLORS[plan.id]||PLAN_COLORS.basic;
                const count = getPlanCount(plan.id);
                const rev   = getPlanRevenue(plan.id);
                return (
                  <tr key={plan.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${clr.badge}`}>{plan.name}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{plan.price===0?'Free':`Rs ${plan.price.toLocaleString()}`}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 text-center">{count}</td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">Rs {Math.round((rev/12)||0).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">Rs {rev.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-500">{plan.maxStudents.toLocaleString()}</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-50 font-semibold">
                <td className="px-4 py-3 text-slate-700">TOTAL</td>
                <td className="px-4 py-3">—</td>
                <td className="px-4 py-3 text-slate-800 font-bold text-center">{stats?.totalSchools||0}</td>
                <td className="px-4 py-3 text-emerald-600 font-bold">Rs {Math.round((totalRevenue/12)||0).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-800 font-bold">Rs {totalRevenue.toLocaleString()}</td>
                <td className="px-4 py-3">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
