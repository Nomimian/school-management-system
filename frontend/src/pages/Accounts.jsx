import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2, Pencil, Wallet } from 'lucide-react';
import { accountAPI } from '../services/api';
import { SectionHeader, Card, Badge, Button, Modal, Input, TableSkeleton, EmptyState, useToast, useConfirm, Dropdown } from '../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const INCOME_CATEGORIES  = ['Student Fees','Registration Fee','Donation','Transport Fee','Library Fine','Other Income'];
const EXPENSE_CATEGORIES = ['Teacher Salary','Staff Salary','Utility Bills','Rent','Maintenance','Stationery','Equipment','Other Expense'];
const COLORS = ['#1d4ed8','#10b981','#f97316','#8b5cf6','#ef4444','#06b6d4','#84cc16','#f59e0b'];

export default function Accounts() {
  const toast = useToast();
  const confirm = useConfirm();
  const [records, setRecords] = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setType] = useState('');
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ type:'Income', category:'Student Fees', amount:'', description:'', date: new Date().toISOString().slice(0,10), reference:'' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterType) params.type = filterType;
      const [recs, st] = await Promise.all([accountAPI.getAll(params), accountAPI.getStats()]);
      setRecords(recs.data || []);
      setStats(st.data);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [filterType]);

  const openAdd = () => {
    setEditing(null);
    setForm({ type:'Income', category:'Student Fees', amount:'', description:'', date: new Date().toISOString().slice(0,10), reference:'' });
    setModal(true);
  };
  const openEdit = (r) => {
    setEditing(r._id);
    setForm({ type:r.type||'Income', category:r.category||'', amount:r.amount??'', description:r.description||'', date:r.date?.slice(0,10)||new Date().toISOString().slice(0,10), reference:r.reference||'' });
    setModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, amount:Number(form.amount) };
      if (editing) { await accountAPI.update(editing, payload); toast.success('Record updated'); }
      else { await accountAPI.create(payload); toast.success('Record added'); }
      setModal(false); fetchAll();
    }
    catch(e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!(await confirm({ title:'Delete record?', message:'This will remove the financial record.', tone:'danger', confirmText:'Delete' }))) return;
    try { await accountAPI.delete(id); fetchAll(); toast.success('Record removed'); }
    catch(e) { toast.error(e.message); }
  };

  const categories = form.type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const chartData = [
    ...(stats?.income  || []).map(i => ({name:i._id, Income:i.total, Expense:0})),
  ];
  // merge expense
  (stats?.expense||[]).forEach(e => {
    const found = chartData.find(c => c.name === e._id);
    if (found) found.Expense = e.total;
    else chartData.push({name:e._id, Income:0, Expense:e.total});
  });

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Accounts & Finance"
        subtitle="Track all school income and expenses"
        action={<Button variant="primary" size="sm" icon={Plus} onClick={openAdd}>Add Record</Button>}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center"><TrendingUp size={22} className="text-white"/></div>
          <div>
            <div className="text-2xl font-display font-bold text-emerald-700">Rs {((stats?.totalIncome||0)/1000).toFixed(0)}K</div>
            <div className="text-xs text-emerald-600 font-medium">Total Income</div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center"><TrendingDown size={22} className="text-white"/></div>
          <div>
            <div className="text-2xl font-display font-bold text-red-600">Rs {((stats?.totalExpense||0)/1000).toFixed(0)}K</div>
            <div className="text-xs text-red-500 font-medium">Total Expense</div>
          </div>
        </div>
        <div className={`border rounded-2xl p-5 flex items-center gap-4 ${(stats?.balance||0) >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${(stats?.balance||0) >= 0 ? 'bg-primary-600' : 'bg-orange-500'}`}><DollarSign size={22} className="text-white"/></div>
          <div>
            <div className={`text-2xl font-display font-bold ${(stats?.balance||0) >= 0 ? 'text-primary-700' : 'text-orange-600'}`}>Rs {Math.abs((stats?.balance||0)/1000).toFixed(0)}K</div>
            <div className="text-xs font-medium text-slate-500">{(stats?.balance||0) >= 0 ? 'Net Surplus' : 'Net Deficit'}</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <Card className="p-5">
        <h3 className="font-display font-bold text-slate-800 mb-4">Income vs Expense by Category</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} barSize={16}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
            <XAxis dataKey="name" tick={{fontSize:9,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}K`} tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
            <Tooltip formatter={v=>`Rs ${(v/1000).toFixed(0)}K`} contentStyle={{borderRadius:12,border:'none'}}/>
            <Bar dataKey="Income"  fill="#10b981" radius={[4,4,0,0]}/>
            <Bar dataKey="Expense" fill="#ef4444" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-display font-bold text-slate-800 mb-4">Income Breakdown</h3>
          {(stats?.income||[]).length === 0 ? (
            <EmptyState icon={TrendingUp} title="No income yet" subtitle="Add income records to see the breakdown." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={stats?.income||[]} dataKey="total" nameKey="_id" cx="50%" cy="50%" outerRadius={80}
                  label={({_id,percent})=>`${_id} ${(percent*100).toFixed(0)}%`} fontSize={10} labelLine={false}>
                  {(stats?.income||[]).map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Pie>
                <Tooltip formatter={v=>`Rs ${v.toLocaleString()}`} contentStyle={{borderRadius:12,border:'none'}}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="font-display font-bold text-slate-800 mb-4">Expense Breakdown</h3>
          {(stats?.expense||[]).length === 0 ? (
            <EmptyState icon={TrendingDown} title="No expenses yet" subtitle="Add expense records to see the breakdown." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={stats?.expense||[]} dataKey="total" nameKey="_id" cx="50%" cy="50%" outerRadius={80}
                  label={({_id,percent})=>`${_id} ${(percent*100).toFixed(0)}%`} fontSize={10} labelLine={false}>
                  {(stats?.expense||[]).map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Pie>
                <Tooltip formatter={v=>`Rs ${v.toLocaleString()}`} contentStyle={{borderRadius:12,border:'none'}}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Records Table */}
      <Card>
        <div className="p-4 border-b border-slate-100 flex gap-3">
          <Dropdown value={filterType} onChange={e=>setType(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
            <option value="">All Records</option>
            <option>Income</option>
            <option>Expense</option>
          </Dropdown>
        </div>
        {loading ? <TableSkeleton rows={6} cols={6} /> : records.length === 0 ? (
          <EmptyState icon={Wallet} title="No records found"
            subtitle={filterType ? `No ${filterType.toLowerCase()} records yet.` : 'Add your first financial record to get started.'}
            action={<Button variant="primary" size="sm" icon={Plus} onClick={openAdd}>Add Record</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Type','Category','Amount','Description','Date','Reference','Action'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r._id} className="border-b border-slate-50 hover:bg-blue-50/40">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${r.type==='Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {r.type==='Income' ? <TrendingUp size={10}/> : <TrendingDown size={10}/>} {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.category}</td>
                    <td className="px-4 py-3 font-bold" style={{color:r.type==='Income'?'#059669':'#dc2626'}}>Rs {r.amount?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">{r.description||'—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{r.date?.slice(0,10)}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">{r.reference||'—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={()=>openEdit(r)} className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600"><Pencil size={14}/></button>
                        <button onClick={()=>remove(r._id)} className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modal} onClose={()=>setModal(false)} title={editing ? 'Edit Financial Record' : 'Add Financial Record'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Type</label>
              <Dropdown value={form.type} onChange={e=>{const t=e.target.value; setForm(f=>({...f,type:t,category:(t==='Income'?INCOME_CATEGORIES:EXPENSE_CATEGORIES)[0]}));}}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option>Income</option><option>Expense</option>
              </Dropdown>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Category</label>
              <Dropdown value={form.category} onChange={e=>setForm({...form,category:e.target.value})}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                {categories.map(c=><option key={c}>{c}</option>)}
              </Dropdown>
            </div>
          </div>
          <Input label="Amount (Rs)" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0"/>
          <Input label="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Details…"/>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
            <Input label="Reference No." value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})} placeholder="Invoice #"/>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={()=>setModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={saving}>{editing ? 'Save Changes' : 'Add Record'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
