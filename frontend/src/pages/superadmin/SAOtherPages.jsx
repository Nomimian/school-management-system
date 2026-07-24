import { useState, useEffect } from 'react';
import { useToast, useConfirm, Dropdown } from '../../components/ui';
import { Activity, Loader2, Send, Bell, RefreshCw, Shield, Key, Globe, Save, CheckCircle } from 'lucide-react';
import { saAPI } from '../../services/saApi.js';

// ─── ACTIVITY LOG ────────────────────────────────────────────────────────────
export function SAActivity() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');

  const fetch = async () => {
    setLoading(true);
    try { const res = await saAPI.getActivity({ limit:100 }); setLogs(res.data||[]); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(()=>{ fetch(); },[]);

  const ACTION_COLORS = {
    LOGIN:                'bg-blue-100 text-blue-700',
    SCHOOL_CREATED:       'bg-emerald-100 text-emerald-700',
    SCHOOL_UPDATED:       'bg-orange-100 text-orange-700',
    SCHOOL_DELETED:       'bg-red-100 text-red-600',
    SCHOOL_ACTIVATED:     'bg-emerald-100 text-emerald-700',
    SCHOOL_DEACTIVATED:   'bg-red-100 text-red-600',
    PASSWORD_RESET:       'bg-amber-100 text-amber-700',
    IMPERSONATE:          'bg-purple-100 text-purple-700',
    PLAN_ASSIGNED:        'bg-blue-100 text-blue-700',
    ANNOUNCEMENT:         'bg-teal-100 text-teal-700',
  };

  const filtered = filter
    ? logs.filter(l => `${l.action} ${l.details}`.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Activity Log</h2>
          <p className="text-slate-400 text-sm mt-0.5">All superadmin actions recorded here</p>
        </div>
        <button onClick={fetch} className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600">
          <RefreshCw size={14}/> Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="relative max-w-xs">
          <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter by action or detail…"
            className="w-full pl-4 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200"/>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['#','Action','Details','Performed By','Timestamp'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log,i)=>(
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">{i+1}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ACTION_COLORS[log.action]||'bg-slate-100 text-slate-600'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{log.details}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono">{log.adminEmail}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-PK')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <Activity size={36} className="mx-auto text-slate-200 mb-3"/>
                <p className="text-slate-400">No activity logs yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────────
export function SAAnnouncements() {
  const toast = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [form, setForm] = useState({ title:'', body:'', audience:'All', type:'Info', priority:'Normal' });
  const [sent, setSent] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try { const res = await saAPI.getAnnouncements(); setAnnouncements(res.data||[]); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(()=>{ fetch(); },[]);

  const send = async () => {
    if (!form.title || !form.body) { toast.error('Title and body are required.'); return; }
    setSaving(true);
    try {
      await saAPI.sendAnnouncement(form);
      toast.success('Announcement sent');
      setSent(true); setTimeout(()=>setSent(false), 3000);
      setForm({ title:'', body:'', audience:'All', type:'Info', priority:'Normal' });
      fetch();
    } catch(e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const TYPE_COLORS = { Info:'bg-blue-100 text-blue-700', Warning:'bg-amber-100 text-amber-700', Update:'bg-emerald-100 text-emerald-700', Maintenance:'bg-red-100 text-red-600' };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Announcements</h2>
        <p className="text-slate-400 text-sm mt-0.5">Broadcast messages to all school admins on the platform</p>
      </div>

      {/* Compose */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Send size={16} className="text-blue-500"/>Compose Announcement</h3>
        {sent && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm mb-4">
            <CheckCircle size={16}/> Announcement sent successfully!
          </div>
        )}
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Title *</label>
            <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}
              placeholder="e.g. Scheduled Maintenance – June 15"
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50 focus:bg-white"/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Message *</label>
            <textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})}
              rows={4} placeholder="Write your announcement here…"
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50 focus:bg-white resize-none"/>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Audience</label>
              <Dropdown value={form.audience} onChange={e=>setForm({...form,audience:e.target.value})}
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50">
                {['All','Pro Schools','Basic Schools','Trial Schools'].map(a=><option key={a}>{a}</option>)}
              </Dropdown>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Type</label>
              <Dropdown value={form.type} onChange={e=>setForm({...form,type:e.target.value})}
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50">
                {['Info','Update','Warning','Maintenance'].map(t=><option key={t}>{t}</option>)}
              </Dropdown>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Priority</label>
              <Dropdown value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50">
                {['Normal','High','Urgent'].map(p=><option key={p}>{p}</option>)}
              </Dropdown>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={send} disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
              {saving?<><Loader2 size={14} className="animate-spin"/>Sending…</>:<><Send size={14}/>Send Announcement</>}
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Announcement History</h3>
          <button onClick={fetch} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"><RefreshCw size={12}/>Refresh</button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 size={24} className="animate-spin text-blue-500"/></div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-10 text-slate-300">
            <Bell size={32} className="mx-auto mb-2"/>No announcements sent yet
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {announcements.map((ann,i)=>(
              <div key={i} className="p-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${TYPE_COLORS[ann.type]||'bg-blue-100 text-blue-700'}`}>
                    {ann.type?.[0]||'I'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800">{ann.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${TYPE_COLORS[ann.type]||'bg-blue-100 text-blue-700'}`}>{ann.type}</span>
                      {ann.priority !== 'Normal' && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ann.priority==='Urgent'?'bg-red-100 text-red-600':'bg-orange-100 text-orange-700'}`}>{ann.priority}</span>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm">{ann.body}</p>
                    <div className="text-xs text-slate-400 mt-1 flex gap-3">
                      <span>To: {ann.audience}</span>
                      <span>By: {ann.sentBy}</span>
                      <span>{new Date(ann.sentAt).toLocaleString('en-PK')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SUPERADMIN SETTINGS ──────────────────────────────────────────────────────
export function SASettings() {
  const toast = useToast();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm]   = useState({
    platformName: 'EduManage Pro',
    supportEmail: 'support@edumanage.pro',
    defaultPlan:  'trial',
    trialDays:    30,
    autoExpire:   true,
    maintenanceMode: false,
    newSignups:   true,
  });

  useEffect(() => {
    saAPI.getSettings()
      .then(r => { if (r.data) { const { _id, key, __v, createdAt, updatedAt, ...s } = r.data; setForm(f => ({ ...f, ...s })); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await saAPI.updateSettings(form);
      setSaved(true); setTimeout(()=>setSaved(false), 2500);
      toast.success('Settings saved');
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">SuperAdmin Settings</h2>
        <p className="text-slate-400 text-sm mt-0.5">Platform-wide configuration</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
          <CheckCircle size={16}/> Settings saved successfully!
        </div>
      )}

      {/* Platform settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Globe size={16} className="text-blue-500"/>Platform Configuration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Platform Name</label>
            <input value={form.platformName} onChange={e=>setForm({...form,platformName:e.target.value})}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50"/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Support Email</label>
            <input type="email" value={form.supportEmail} onChange={e=>setForm({...form,supportEmail:e.target.value})}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50"/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Default Plan for New Schools</label>
            <Dropdown value={form.defaultPlan} onChange={e=>setForm({...form,defaultPlan:e.target.value})}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50">
              {['trial','basic','pro','enterprise'].map(p=><option key={p} value={p} className="capitalize">{p}</option>)}
            </Dropdown>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Trial Duration (days)</label>
            <input type="number" value={form.trialDays} onChange={e=>setForm({...form,trialDays:Number(e.target.value)})}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50"/>
          </div>
        </div>
      </div>

      {/* Toggle settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-bold text-slate-800 mb-4">Platform Controls</h3>
        <div className="space-y-3">
          {[
            { key:'autoExpire',      label:'Auto-expire licenses',    desc:'Automatically deactivate schools when license expires' },
            { key:'newSignups',      label:'Allow new school signups', desc:'Enable/disable new school provisioning' },
            { key:'maintenanceMode', label:'Maintenance Mode',        desc:'Block all school logins — show maintenance message', danger:true },
          ].map(item=>(
            <div key={item.key} className={`flex items-center justify-between p-4 rounded-2xl border ${item.danger&&form[item.key]?'bg-red-50 border-red-200':'bg-slate-50 border-slate-100'}`}>
              <div>
                <div className={`font-semibold text-sm ${item.danger?'text-red-700':'text-slate-700'}`}>{item.label}</div>
                <div className="text-slate-400 text-xs mt-0.5">{item.desc}</div>
              </div>
              <button onClick={()=>setForm(f=>({...f,[item.key]:!f[item.key]}))}
                className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${form[item.key]?(item.danger?'bg-red-500':'bg-blue-600'):'bg-slate-300'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form[item.key]?'translate-x-7':'translate-x-1'}`}/>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Key size={16} className="text-amber-500"/>SuperAdmin Credentials</h3>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 mb-4">
          ⚠️ SuperAdmin credentials are set in the server <code className="bg-amber-100 px-1 rounded">.env</code> file:
          <div className="font-mono text-xs mt-2 space-y-1">
            <div>SA_EMAIL=superadmin@edumanage.pro</div>
            <div>SA_PASSWORD=SuperAdmin@123</div>
          </div>
          Change these values in <code className="bg-amber-100 px-1 rounded">school-backend/.env</code> and restart the server.
        </div>
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
          <div className="font-semibold mb-2 flex items-center gap-2"><Shield size={14} className="text-blue-500"/>Security Recommendations</div>
          <ul className="space-y-1 text-xs text-slate-500">
            <li>• Use a strong unique password with 16+ characters</li>
            <li>• Never share superadmin credentials with school staff</li>
            <li>• Use impersonation feature instead of sharing the SA password</li>
            <li>• Monitor the Activity Log regularly for unauthorized access</li>
            <li>• Change the default password immediately after deployment</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving || loading}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
          {saving ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : <><Save size={14}/> Save Settings</>}
        </button>
      </div>
    </div>
  );
}
