import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, Loader2, Globe } from 'lucide-react';
import { useSA } from '../../hooks/useSA.jsx';

export default function SALogin() {
  const { login }       = useSA();
  const navigate        = useNavigate();
  const [form, setForm] = useState({ email:'superadmin@edumanage.pro', password:'SuperAdmin@123' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(form.email, form.password);
      navigate('/superadmin');
    } catch(err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          {Array.from({length:20}).map((_,i)=>(
            <div key={i} className="absolute rounded-full border border-white"
              style={{width:(i+1)*60,height:(i+1)*60,top:'50%',left:'50%',transform:'translate(-50%,-50%)'}}/>
          ))}
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <Globe size={20} className="text-white"/>
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-none">EduManage Pro</div>
              <div className="text-slate-400 text-xs">School Management Platform</div>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Manage All Your<br/>
            <span className="text-blue-400">School Clients</span><br/>
            From One Place
          </h1>
          <p className="text-slate-400 text-lg">
            One powerful platform. Unlimited schools.<br/>
            Full control in your hands.
          </p>
        </div>

        {/* Stats */}
        <div className="relative grid grid-cols-3 gap-4">
          {[
            {label:'Schools Managed', val:'∞'},
            {label:'Uptime',          val:'99.9%'},
            {label:'Data Isolated',   val:'100%'},
          ].map(s=>(
            <div key={s.label} className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="text-2xl font-bold text-blue-400">{s.val}</div>
              <div className="text-slate-400 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-full text-sm font-semibold">
              <Shield size={14}/> SuperAdmin Portal
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-1">Welcome, SuperAdmin</h2>
            <p className="text-slate-400 text-sm mb-6">Sign in to manage all schools on the platform</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-5">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input type="email" value={form.email}
                    onChange={e=>setForm({...form,email:e.target.value})}
                    required placeholder="superadmin@edumanage.pro"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50 focus:bg-white"/>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input type={showPw?'text':'password'} value={form.password}
                    onChange={e=>setForm({...form,password:e.target.value})}
                    required placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50 focus:bg-white"/>
                  <button type="button" onClick={()=>setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw?<EyeOff size={15}/>:<Eye size={15}/>}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-slate-800 to-slate-700 text-white py-3 rounded-xl font-semibold text-sm hover:from-slate-900 hover:to-slate-800 transition-all shadow-lg disabled:opacity-70 flex items-center justify-center gap-2 mt-2">
                {loading ? <><Loader2 size={16} className="animate-spin"/>Signing in…</> : <><Shield size={16}/>Sign In as SuperAdmin</>}
              </button>
            </form>

            <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              <div className="font-semibold mb-1">⚠️ Restricted Access</div>
              This portal is for platform administrators only. Unauthorized access is prohibited.
            </div>
          </div>

          <div className="text-center mt-6 text-slate-400 text-xs">
            <a href="/login" className="hover:text-slate-600 transition-colors">← Back to School Login</a>
          </div>
        </div>
      </div>
    </div>
  );
}
