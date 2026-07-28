import { useState, useEffect, useRef } from 'react';
import { SERVER_URL } from '../config/env.js';
import {
  Save, School, Bell, Shield, Palette, Upload,
  Loader2, Eye, EyeOff, CheckCircle, Stamp, Users, DollarSign, Layers
} from 'lucide-react';
import { SectionHeader, Card, Button, Input, Switch, useToast, Dropdown } from '../components/ui';
import { useAuth } from '../hooks/useAuth.jsx';
import { useSchool } from '../hooks/useSchool.jsx';
import { authAPI, schoolAPI } from '../services/api';
import { SchoolStamp } from '../components/print/PrintComponents.jsx';
import UsersPanel from '../components/UsersPanel.jsx';
import FeeConfigPanel from '../components/FeeConfigPanel.jsx';
import EnrollmentGroupsPanel from '../components/EnrollmentGroupsPanel.jsx';

const API_BASE = SERVER_URL;

const tabs = [
  { id:'school',        label:'School Profile',  icon:School   },
  { id:'stamp',         label:'Logo & Stamp',    icon:Stamp    },
  { id:'team',          label:'Team & Users',    icon:Users, module:'users' },
  { id:'fees',          label:'Fee Configuration', icon:DollarSign, module:'fees' },
  { id:'groups',        label:'Groups & Categories', icon:Layers, module:'students' },
  { id:'notifications', label:'Notifications',   icon:Bell     },
  { id:'security',      label:'Security',        icon:Shield   },
  { id:'appearance',    label:'Appearance',      icon:Palette  },
];

export default function Settings() {
  const { user, can }       = useAuth();
  const { school, refresh } = useSchool();
  const toast               = useToast();
  const visibleTabs         = tabs.filter(t => !t.module || can(t.module));
  const [activeTab, setTab] = useState('school');
  const [accent, setAccent] = useState('#1d4ed8');
  const [fontSize, setFontSize] = useState('medium');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [msg, setMsg]       = useState('');
  const [err, setErr]       = useState('');

  const [sf, setSf] = useState({
    name:'',shortName:'',address:'',city:'',phone:'',phone2:'',
    email:'',website:'',principal:'',vicePrincipal:'',established:'',
    board:'',affiliation:'',registrationNo:'',academicYear:'2024-2025',
    currentTerm:'Spring Term',currency:'PKR',currencySymbol:'Rs',
    feeDay:10,lateFine:200,tagline:'',stampText:'',stampShape:'circle',
    showStampOnFee:true,showStampOnAdmission:true,
    showStampOnResult:true,showStampOnCert:true,
  });

  const [notifs, setNotifs] = useState({
    feeReminder:true,attendanceSMS:true,examSchedule:true,
    noticePush:false,monthlyReport:true,parentPortal:true,
  });

  const [pw, setPw]     = useState({ currentPassword:'',newPassword:'',confirmPassword:'' });
  const [showPw, setShowPw] = useState(false);
  const [pwErr, setPwErr]   = useState('');

  const logoRef  = useRef();
  const stampRef = useRef();
  const [logoUp,  setLogoUp]  = useState(false);
  const [stampUp, setStampUp] = useState(false);

  useEffect(() => {
    if (school) setSf({
      name:school.name||'',shortName:school.shortName||'',address:school.address||'',
      city:school.city||'',phone:school.phone||'',phone2:school.phone2||'',
      email:school.email||'',website:school.website||'',principal:school.principal||'',
      vicePrincipal:school.vicePrincipal||'',established:school.established||'',
      board:school.board||'',affiliation:school.affiliation||'',
      registrationNo:school.registrationNo||'',academicYear:school.academicYear||'2024-2025',
      currentTerm:school.currentTerm||'Spring Term',currency:school.currency||'PKR',
      currencySymbol:school.currencySymbol||'Rs',feeDay:school.feeDay||10,
      lateFine:school.lateFine||200,tagline:school.tagline||'',stampText:school.stampText||'',
      stampShape:school.stampShape||'circle',
      showStampOnFee:school.showStampOnFee!==false,
      showStampOnAdmission:school.showStampOnAdmission!==false,
      showStampOnResult:school.showStampOnResult!==false,
      showStampOnCert:school.showStampOnCert!==false,
    });
    if (school.notifications) setNotifs(n => ({ ...n, ...school.notifications }));
    setAccent(school.primaryColor || '#1d4ed8');
    setFontSize(school.fontSize || 'medium');
  }, [school]);

  const flash = () => { setSaved(true); setTimeout(()=>setSaved(false),2500); };

  const saveSchool = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      if (school?._id) await schoolAPI.update(sf);
      else await schoolAPI.create(sf);
      await refresh(); flash(); toast.success('School information saved');
    } catch(e) { setErr(e.message); toast.error(e.message); }
    finally { setSaving(false); }
  };

  const saveNotifications = async () => {
    setSaving(true);
    try { await schoolAPI.update({ notifications: notifs }); await refresh(); toast.success('Notification preferences saved'); }
    catch(e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const saveAppearance = async () => {
    setSaving(true);
    try { await schoolAPI.update({ primaryColor: accent, fontSize }); await refresh(); toast.success('Appearance updated'); }
    catch(e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setLogoUp(true);
    try {
      const fd = new FormData(); fd.append('logo', file);
      const res = await schoolAPI.uploadLogo(fd);
      if (res.success) { await refresh(); setMsg('Logo uploaded!'); }
      else setErr(res.message);
    } catch(e2) { setErr(e2.message); } finally { setLogoUp(false); }
  };

  const handleStampUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setStampUp(true);
    try {
      const fd = new FormData(); fd.append('stamp', file);
      const res = await schoolAPI.uploadStamp(fd);
      if (res.success) { await refresh(); setMsg('Stamp uploaded!'); }
      else setErr(res.message);
    } catch(e2) { setErr(e2.message); } finally { setStampUp(false); }
  };

  const changePassword = async () => {
    setPwErr(''); setMsg('');
    if (!pw.currentPassword) { setPwErr('Enter your current password.'); return; }
    if (pw.newPassword.length < 6) { setPwErr('Minimum 6 characters.'); return; }
    if (pw.newPassword !== pw.confirmPassword) { setPwErr('Passwords do not match.'); return; }
    setSaving(true);
    try {
      await authAPI.changePassword({ currentPassword:pw.currentPassword, newPassword:pw.newPassword });
      setMsg('Password changed successfully!');
      setPw({ currentPassword:'',newPassword:'',confirmPassword:'' });
    } catch(e) { setPwErr(e.message); } finally { setSaving(false); }
  };

  const logoUrl  = school?.logo  ? `${API_BASE}${school.logo}`  : null;

  return (
    <div className="space-y-5">
      <SectionHeader title="Settings" subtitle="Configure your school management system"/>

      <div className="flex gap-2 flex-wrap">
        {visibleTabs.map(t => (
          <button key={t.id} onClick={()=>{setTab(t.id);setMsg('');setErr('');setSaved(false);}}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${activeTab===t.id?'bg-primary-600 text-white shadow-md':'bg-white text-slate-600 hover:bg-primary-50 border border-slate-200'}`}>
            <t.icon size={15}/>{t.label}
          </button>
        ))}
      </div>

      {msg   && <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm"><CheckCircle size={16}/>{msg}</div>}
      {err   && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{err}</div>}
      {saved && <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm"><CheckCircle size={16}/>Saved successfully!</div>}

      {/* ── SCHOOL PROFILE ─────────────────────────────────────────────────── */}
      {activeTab==='school' && (
        <Card className="p-6">
          <h3 className="font-display font-bold text-slate-800 text-lg mb-5">School Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Input label="School Full Name *" value={sf.name} onChange={e=>setSf({...sf,name:e.target.value})} placeholder="e.g. Pakistan Model School"/></div>
            <Input label="Short Name (e.g. PMS)" value={sf.shortName} onChange={e=>setSf({...sf,shortName:e.target.value})}/>
            <Input label="Tagline" value={sf.tagline} onChange={e=>setSf({...sf,tagline:e.target.value})} placeholder="Excellence in Education"/>
            <Input label="Principal" value={sf.principal} onChange={e=>setSf({...sf,principal:e.target.value})}/>
            <Input label="Vice Principal" value={sf.vicePrincipal} onChange={e=>setSf({...sf,vicePrincipal:e.target.value})}/>
            <Input label="Phone" value={sf.phone} onChange={e=>setSf({...sf,phone:e.target.value})} placeholder="042-XXXXXXXX"/>
            <Input label="Phone 2" value={sf.phone2} onChange={e=>setSf({...sf,phone2:e.target.value})}/>
            <Input label="Email" type="email" value={sf.email} onChange={e=>setSf({...sf,email:e.target.value})}/>
            <Input label="Website" value={sf.website} onChange={e=>setSf({...sf,website:e.target.value})} placeholder="www.school.edu.pk"/>
            <Input label="City" value={sf.city} onChange={e=>setSf({...sf,city:e.target.value})}/>
            <div className="sm:col-span-2"><Input label="Full Address" value={sf.address} onChange={e=>setSf({...sf,address:e.target.value})}/></div>
            <Input label="Established Year" value={sf.established} onChange={e=>setSf({...sf,established:e.target.value})} placeholder="1995"/>
            <Input label="Registration No." value={sf.registrationNo} onChange={e=>setSf({...sf,registrationNo:e.target.value})}/>
            <div className="sm:col-span-2"><Input label="Board / Affiliation" value={sf.board} onChange={e=>setSf({...sf,board:e.target.value})} placeholder="Punjab Board of Secondary Education"/></div>
            <Input label="Academic Year" value={sf.academicYear} onChange={e=>setSf({...sf,academicYear:e.target.value})} placeholder="2024-2025"/>
            <Input label="Current Term" value={sf.currentTerm} onChange={e=>setSf({...sf,currentTerm:e.target.value})} placeholder="Spring Term"/>
            <Input label="Fee Due Day (of month)" type="number" value={sf.feeDay} onChange={e=>setSf({...sf,feeDay:Number(e.target.value)})}/>
            <Input label="Late Fine (Rs)" type="number" value={sf.lateFine} onChange={e=>setSf({...sf,lateFine:Number(e.target.value)})}/>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Currency</label>
              <Dropdown value={sf.currency} onChange={e=>setSf({...sf,currency:e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
                {['PKR','USD','GBP','AED','SAR'].map(c=><option key={c}>{c}</option>)}
              </Dropdown>
            </div>
            <Input label="Currency Symbol" value={sf.currencySymbol} onChange={e=>setSf({...sf,currencySymbol:e.target.value})} placeholder="Rs"/>
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="primary" icon={saving?Loader2:Save} onClick={saveSchool} disabled={saving}>
              {saving?'Saving…':saved?'Saved ✓':'Save School Info'}
            </Button>
          </div>
        </Card>
      )}

      {/* ── LOGO & STAMP ──────────────────────────────────────────────────── */}
      {activeTab==='stamp' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Logo card */}
            <Card className="p-6">
              <h3 className="font-display font-bold text-slate-800 mb-1">School Logo</h3>
              <p className="text-slate-400 text-sm mb-4">Used on all printed documents and dashboard. PNG with transparent background recommended.</p>
              <div className="flex items-center gap-5 mb-4">
                {logoUrl
                  ? <img src={logoUrl} alt="Logo" className="w-20 h-20 rounded-2xl object-contain border border-slate-200 bg-white p-1"/>
                  : <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center text-white text-3xl font-bold">
                      {sf.shortName?.charAt(0)||sf.name?.charAt(0)||'S'}
                    </div>
                }
                <div>
                  <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload}/>
                  <Button variant="secondary" icon={Upload} onClick={()=>logoRef.current?.click()} disabled={logoUp}>
                    {logoUp?'Uploading…':'Upload Logo'}
                  </Button>
                  <div className="text-xs text-slate-400 mt-2">JPG/PNG · Max 5MB</div>
                </div>
              </div>
            </Card>

            {/* Stamp card */}
            <Card className="p-6">
              <h3 className="font-display font-bold text-slate-800 mb-1">Official Stamp</h3>
              <p className="text-slate-400 text-sm mb-4">Shown on fee receipts, admissions, results & certificates. Upload your own or use the auto-generated seal below.</p>
              <div className="flex items-center gap-5 mb-4">
                <div className="flex-shrink-0"><SchoolStamp size={92}/></div>
                <div>
                  <input ref={stampRef} type="file" accept="image/*" className="hidden" onChange={handleStampUpload}/>
                  <Button variant="secondary" icon={Upload} onClick={()=>stampRef.current?.click()} disabled={stampUp}>
                    {stampUp?'Uploading…':'Upload Custom Stamp'}
                  </Button>
                  <div className="text-xs text-slate-400 mt-2">Transparent PNG · Max 5MB<br/>Leave empty to use auto-generated</div>
                </div>
              </div>

              <Input label="Stamp Text (school name inside the seal)" value={sf.stampText} onChange={e=>setSf({...sf,stampText:e.target.value})} placeholder="e.g. Pakistan Model School"/>
              <div className="mt-4 flex justify-end">
                <Button variant="primary" icon={saving?Loader2:Save} onClick={saveSchool} disabled={saving}>
                  {saving?'Saving…':'Save Stamp'}
                </Button>
              </div>
            </Card>
          </div>

          {/* Stamp toggle settings */}
          <Card className="p-6">
            <h3 className="font-display font-bold text-slate-800 mb-4">Show Stamp On Printed Documents</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {key:'showStampOnFee',label:'Fee Receipts'},
                {key:'showStampOnAdmission',label:'Admission Forms'},
                {key:'showStampOnResult',label:'Result Cards'},
                {key:'showStampOnCert',label:'Certificates'},
              ].map(item=>(
                <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  <Switch checked={!!sf[item.key]} onChange={v=>setSf(f=>({...f,[item.key]:v}))} size="sm"/>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="primary" icon={saving?Loader2:Save} onClick={saveSchool} disabled={saving}>
                {saving?'Saving…':'Save Stamp Settings'}
              </Button>
            </div>
          </Card>

          {/* Preview */}
          <Card className="p-6">
            <h3 className="font-display font-bold text-slate-800 mb-1">Live Preview</h3>
            <p className="text-slate-400 text-sm mb-4">How the official circular stamp appears at different sizes on your printed documents.</p>
            <div className="flex flex-wrap gap-8 items-center justify-center py-8 bg-slate-50 rounded-2xl">
              {[70,100,140].map(s=>(
                <div key={s} className="text-center">
                  <SchoolStamp size={s}/>
                  <div className="text-xs text-slate-400 mt-2">{s}px</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── TEAM & USERS ──────────────────────────────────────────────────── */}
      {activeTab==='team' && can('users') && <UsersPanel/>}

      {activeTab==='fees' && can('fees') && <FeeConfigPanel/>}

      {activeTab==='groups' && <EnrollmentGroupsPanel/>}

      {/* ── NOTIFICATIONS ─────────────────────────────────────────────────── */}
      {activeTab==='notifications' && (
        <Card className="p-6">
          <h3 className="font-display font-bold text-slate-800 mb-5">Notification Preferences</h3>
          <div className="space-y-3">
            {[
              {key:'feeReminder',label:'Fee Payment Reminders',desc:'Send reminders before fee due date'},
              {key:'attendanceSMS',label:'Attendance SMS to Parents',desc:'Notify parents when student is absent'},
              {key:'examSchedule',label:'Exam Schedule Notifications',desc:'Alert students about upcoming exams'},
              {key:'noticePush',label:'Push Notifications',desc:'Send push for new announcements'},
              {key:'monthlyReport',label:'Monthly Progress Reports',desc:'Auto-generate monthly reports'},
              {key:'parentPortal',label:'Parent Portal Alerts',desc:'Real-time updates on parent portal'},
            ].map(item=>(
              <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="font-medium text-slate-700">{item.label}</div>
                  <div className="text-sm text-slate-400 mt-0.5">{item.desc}</div>
                </div>
                <Switch checked={!!notifs[item.key]} onChange={v=>setNotifs(n=>({...n,[item.key]:v}))}/>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="primary" icon={Save} loading={saving} onClick={saveNotifications}>Save Preferences</Button>
          </div>
        </Card>
      )}

      {/* ── SECURITY ──────────────────────────────────────────────────────── */}
      {activeTab==='security' && (
        <Card className="p-6">
          <h3 className="font-display font-bold text-slate-800 mb-1">Change Password</h3>
          <p className="text-slate-400 text-sm mb-5">Signed in as: <strong className="text-slate-600">{user?.email}</strong></p>
          {pwErr && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">{pwErr}</div>}
          <div className="space-y-4 max-w-sm">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Current Password</label>
              <div className="relative">
                <input type={showPw?'text':'password'} value={pw.currentPassword}
                  onChange={e=>setPw({...pw,currentPassword:e.target.value})} placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200"/>
                <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPw?<EyeOff size={15}/>:<Eye size={15}/>}
                </button>
              </div>
            </div>
            <Input label="New Password" type="password" value={pw.newPassword} onChange={e=>setPw({...pw,newPassword:e.target.value})} placeholder="••••••••"/>
            <Input label="Confirm New Password" type="password" value={pw.confirmPassword} onChange={e=>setPw({...pw,confirmPassword:e.target.value})} placeholder="••••••••"/>
            <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700">Minimum 6 characters. Use letters, numbers and symbols for a strong password.</div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="primary" icon={Shield} onClick={changePassword} disabled={saving}>{saving?'Updating…':'Update Password'}</Button>
          </div>
        </Card>
      )}

      {/* ── APPEARANCE ────────────────────────────────────────────────────── */}
      {activeTab==='appearance' && (
        <Card className="p-6">
          <h3 className="font-display font-bold text-slate-800 mb-5">Appearance</h3>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Accent Color</label>
              <p className="text-xs text-slate-400 mb-3">Recolors the sidebar, buttons, headers and accents across the whole site.</p>
              <div className="flex gap-3 flex-wrap items-center">
                {['#1d4ed8','#7c3aed','#059669','#dc2626','#d97706','#0891b2','#be185d','#0f766e'].map(c=>(
                  <button key={c} onClick={()=>setAccent(c)} style={{background:c}} title={c}
                    className={`w-10 h-10 rounded-full shadow-md hover:scale-110 transition-transform ${accent===c?'ring-2 ring-offset-2 ring-slate-400 border-4 border-white':'border-4 border-white'}`}/>
                ))}
                <label title="Custom color"
                  className="relative w-10 h-10 rounded-full shadow-md border-4 border-white overflow-hidden cursor-pointer hover:scale-110 transition-transform flex items-center justify-center bg-gradient-to-br from-fuchsia-500 via-amber-400 to-emerald-500">
                  <span className="text-white text-xs font-bold drop-shadow">+</span>
                  <input type="color" value={accent} onChange={e=>setAccent(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"/>
                </label>
                <span className="text-xs font-mono text-slate-400 ml-1">{accent}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-3">Font Size</label>
              <div className="flex gap-2">
                {[['small','Small'],['medium','Medium (Default)'],['large','Large']].map(([val,label])=>(
                  <button key={val} onClick={()=>setFontSize(val)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${fontSize===val?'bg-primary-600 text-white border-primary-600':'bg-white text-slate-600 border-slate-200 hover:bg-primary-50'}`}>{label}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50">
              <span className="text-sm text-slate-500">Preview:</span>
              <span style={{background:accent}} className="px-3 py-1.5 rounded-lg text-white text-sm font-semibold">Primary Button</span>
              <span style={{color:accent}} className="text-sm font-semibold">Accent text</span>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="primary" icon={Save} loading={saving} onClick={saveAppearance}>Apply</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
