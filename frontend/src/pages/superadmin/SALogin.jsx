import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, Loader2, Globe, ArrowRight, ArrowLeft } from 'lucide-react';
import { useSA } from '../../hooks/useSA.jsx';

const STATS = [
  { label: 'Schools Managed', val: '∞' },
  { label: 'Uptime',          val: '99.9%' },
  { label: 'Data Isolated',   val: '100%' },
];

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

  const inputCls =
    'w-full pl-11 pr-4 py-3 border border-slate-700 rounded-xl text-sm text-slate-100 ' +
    'placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 ' +
    'focus:border-blue-500 bg-slate-800/60 focus:bg-slate-800 transition-all';

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 overflow-hidden">
      {/* ───────────── Left branding panel ───────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 xl:p-16 overflow-hidden
                      bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Animated aurora glows */}
        <div className="auth-blob absolute -top-32 -left-20 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="auth-blob absolute bottom-0 right-0 w-[30rem] h-[30rem] rounded-full bg-indigo-600/10 blur-3xl" style={{ animationDelay: '-7s' }} />

        {/* Concentric rotating rings */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] flex items-center justify-center">
          <div className="auth-spin-slow relative">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="absolute rounded-full border border-blue-300"
                style={{ width: (i + 1) * 110, height: (i + 1) * 110, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
            ))}
          </div>
        </div>

        {/* Twinkling nodes */}
        {[[16,30],[28,72],[44,18],[66,44],[80,68],[36,54]].map(([t, l], i) => (
          <span key={i} className="auth-twinkle absolute w-1.5 h-1.5 rounded-full bg-blue-300"
            style={{ top: `${t}%`, left: `${l}%`, animationDelay: `${i * 0.5}s` }} />
        ))}

        {/* Brand */}
        <div className="relative auth-rise-l flex items-center gap-3">
          <div className="auth-float w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Globe size={22} className="text-white"/>
          </div>
          <div>
            <div className="text-white font-display font-bold text-lg leading-none">EduManage Pro</div>
            <div className="text-slate-400 text-xs mt-1">School Management Platform</div>
          </div>
        </div>

        {/* Headline */}
        <div className="relative">
          <div className="auth-rise-l auth-d1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-300 mb-6">
            <Shield size={13} /> Platform Control Center
          </div>
          <h1 className="auth-rise-l auth-d2 font-display text-4xl xl:text-5xl font-bold text-white leading-[1.1] tracking-tight">
            Manage all your<br/>
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">school clients</span><br/>
            from one place.
          </h1>
          <p className="auth-rise-l auth-d3 text-slate-400 text-lg mt-5 max-w-md">
            One powerful platform. Unlimited schools. Full control in your hands.
          </p>

          <div className="auth-rise-l auth-d4 grid grid-cols-3 gap-4 mt-10 max-w-lg">
            {STATS.map(s => (
              <div key={s.label} className="rounded-2xl p-4 bg-white/[0.04] border border-white/10 backdrop-blur-sm hover:bg-white/[0.08] transition-all">
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-sky-300 bg-clip-text text-transparent">{s.val}</div>
                <div className="text-slate-400 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer status */}
        <div className="relative auth-rise-l auth-d5 flex items-center gap-2 text-slate-500 text-xs">
          <span className="auth-pulse inline-flex w-2 h-2 rounded-full text-emerald-400 bg-emerald-400" />
          Secure connection · © {new Date().getFullYear()} EduManage Pro
        </div>
      </div>

      {/* ───────────── Right login panel ───────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative bg-slate-950">
        {/* faint glow behind card */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative w-full max-w-md">
          <div className="flex justify-center mb-6 auth-rise">
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 text-red-300 px-4 py-2 rounded-full text-sm font-semibold">
              <Shield size={14}/> SuperAdmin Portal
            </div>
          </div>

          <div className="auth-rise auth-d1 rounded-3xl border border-slate-800 bg-slate-900/70 backdrop-blur-xl p-8 sm:p-9 shadow-2xl shadow-black/40">
            <h2 className="font-display text-2xl font-bold text-white mb-1">Welcome, SuperAdmin</h2>
            <p className="text-slate-400 text-sm mb-6">Sign in to manage all schools on the platform</p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/25 text-red-300 rounded-xl px-4 py-3 text-sm mb-5 animate-rise">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-300">Email Address</label>
                <div className="relative group">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors"/>
                  <input type="email" value={form.email}
                    onChange={e=>setForm({...form,email:e.target.value})}
                    required placeholder="superadmin@edumanage.pro"
                    className={inputCls}/>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-300">Password</label>
                <div className="relative group">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors"/>
                  <input type={showPw?'text':'password'} value={form.password}
                    onChange={e=>setForm({...form,password:e.target.value})}
                    required placeholder="••••••••"
                    className={inputCls + ' !pr-11'}/>
                  <button type="button" onClick={()=>setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1">
                    {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="auth-sheen w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_-8px_rgba(37,99,235,0.7)] hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-lg disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2 mt-2">
                {loading
                  ? <><Loader2 size={16} className="animate-spin"/>Signing in…</>
                  : <><Shield size={16}/>Sign In as SuperAdmin <ArrowRight size={15}/></>}
              </button>
            </form>

            <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-300/90">
              <div className="font-semibold mb-1 flex items-center gap-1.5"><Shield size={12}/> Restricted Access</div>
              This portal is for platform administrators only. Unauthorized access is prohibited.
            </div>
          </div>

          <div className="text-center mt-6 text-slate-500 text-xs">
            <a href="/login" className="inline-flex items-center gap-1.5 hover:text-slate-300 transition-colors">
              <ArrowLeft size={13}/> Back to School Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
