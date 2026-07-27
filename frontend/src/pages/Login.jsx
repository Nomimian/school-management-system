import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2,
  Users, CalendarCheck, Wallet, ShieldCheck, Sparkles, ArrowRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { authAPI, schoolAPI } from '../services/api';
import { applyBrandTheme } from '../config/theme.js';

const APP_NAME = 'EduManage Pro';
const APP_TAGLINE = 'School Management System';

const FEATURES = [
  { icon: Users,        title: 'Students & Staff',   desc: 'Every record, one place' },
  { icon: CalendarCheck,title: 'Smart Attendance',   desc: 'Daily tracking in a tap' },
  { icon: Wallet,       title: 'Fees & Finance',     desc: 'Invoices, dues & reports' },
  { icon: ShieldCheck,  title: 'Role-based Access',  desc: 'Secure, per-user control' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [mode, setMode]       = useState('login'); // 'login' | 'forgot'
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]  = useState(false);
  const [error, setError]      = useState('');
  const [sent, setSent]        = useState(null); // { message, devResetLink }

  // Honour the school's saved theme colour on the sign-in page — before anyone
  // is authenticated. main.jsx already restored the last-used accent from
  // localStorage (so a refresh keeps the colour); this refines it from the
  // server in case it changed on another device.
  useEffect(() => {
    let alive = true;
    schoolAPI.public()
      .then(res => {
        if (alive && res?.data?.primaryColor) applyBrandTheme(res.data.primaryColor);
      })
      .catch(() => { /* keep the locally-restored accent */ });
    return () => { alive = false; };
  }, []);

  const schoolName = APP_NAME;
  const tagline    = APP_TAGLINE;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await authAPI.forgotPassword({ email: form.email });
      setSent({ message: res.message, devResetLink: res.devResetLink });
    } catch (err) {
      setError(err.message || 'Could not send reset link');
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = () => { setMode('login'); setSent(null); setError(''); };

  const inputCls =
    'w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 ' +
    'placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-100 ' +
    'focus:border-primary-400 bg-slate-50/70 focus:bg-white transition-all';

  return (
    <div className="min-h-screen flex bg-slate-50 overflow-hidden">
      {/* ───────────────── Left: animated brand panel ───────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative auth-gradient text-white flex-col justify-between p-12 xl:p-16 overflow-hidden">
        {/* Fine grid mesh */}
        <div className="auth-grid pointer-events-none absolute inset-0" />
        {/* Top-edge sheen + bottom vignette for depth */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/10 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/25 to-transparent" />
        {/* Floating orbs */}
        <div className="auth-blob absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="auth-blob absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-white/[0.06] blur-3xl" style={{ animationDelay: '-6s' }} />
        <div className="auth-spotlight absolute top-1/4 right-1/4 w-80 h-80" style={{ animationDelay: '-11s' }} />

        {/* Concentric rotating rings */}
        <div className="pointer-events-none absolute -right-40 -bottom-40 opacity-[0.12]">
          <div className="auth-spin-slow">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="absolute rounded-full border border-white"
                style={{ width: (i + 1) * 120, height: (i + 1) * 120, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
            ))}
          </div>
        </div>

        {/* Twinkling stars */}
        {[[12,22],[24,68],[40,14],[62,40],[78,72],[88,28],[52,84],[33,50]].map(([t, l], i) => (
          <span key={i} className="auth-twinkle absolute w-1.5 h-1.5 rounded-full bg-white"
            style={{ top: `${t}%`, left: `${l}%`, animationDelay: `${i * 0.4}s` }} />
        ))}

        {/* Brand mark */}
        <div className="relative auth-rise-l">
          <div className="flex items-center gap-3">
            <div className="auth-float w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg">
              <GraduationCap size={30} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-display font-bold text-xl leading-tight truncate">{schoolName}</div>
              <div className="text-white/70 text-xs mt-0.5">{tagline}</div>
            </div>
          </div>
        </div>

        {/* Headline + features */}
        <div className="relative">
          <div className="auth-rise-l auth-d1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-white/90 mb-6">
            <Sparkles size={13} className="text-amber-300" /> Welcome back to your portal
          </div>
          <h1 className="auth-rise-l auth-d2 font-display font-bold text-4xl xl:text-5xl leading-[1.1] tracking-tight">
            Sign in to<br />
            <span className="bg-gradient-to-r from-white via-white to-blue-100 bg-clip-text text-transparent">{schoolName}</span>
          </h1>
          <p className="auth-rise-l auth-d3 text-white/75 text-lg mt-5 max-w-md">
            Students, staff, attendance, exams and fees — unified, elegant and effortless.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-10 max-w-lg">
            {FEATURES.map((f, i) => (
              <div key={f.title}
                className={`auth-rise-l auth-d${i + 3} group flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.07] border border-white/10 backdrop-blur-sm hover:bg-white/[0.13] transition-all`}>
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <f.icon size={17} className="text-white" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">{f.title}</div>
                  <div className="text-white/70 text-xs">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative auth-rise-l auth-d5 flex items-center gap-2 text-white/70 text-xs">
          <span className="auth-pulse inline-flex w-2 h-2 rounded-full text-emerald-400 bg-emerald-400" />
          <span>All systems operational · © {new Date().getFullYear()} {schoolName}</span>
        </div>
      </div>

      {/* ───────────────── Right: form panel ───────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
        {/* subtle backdrop for small screens where the brand panel is hidden */}
        <div className="lg:hidden absolute inset-0 auth-gradient" />
        <div className="lg:hidden absolute inset-0 bg-slate-900/10" />

        <div className="relative w-full max-w-md">
          {/* Mobile brand mark */}
          <div className="lg:hidden flex flex-col items-center text-center mb-6 auth-rise">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center mb-3">
              <GraduationCap size={28} className="text-white" />
            </div>
            <h1 className="font-display font-bold text-white text-2xl">{schoolName}</h1>
            <p className="text-white/80 text-sm">{tagline}</p>
          </div>

          <div className="auth-card auth-rise auth-d1 bg-white/95 backdrop-blur-xl rounded-3xl border border-white/70 p-8 sm:p-9">
            <div className="mb-6">
              <h2 className="font-display font-bold text-slate-800 text-2xl">
                {mode === 'forgot' ? 'Reset your password' : 'Welcome back 👋'}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                {mode === 'forgot'
                  ? "Enter your email and we'll send you a reset link"
                  : <>Sign in to continue to <span className="font-medium text-slate-600">{schoolName}</span></>}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-5 animate-rise">
                {error}
              </div>
            )}

            {mode === 'login' ? (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Email Address</label>
                    <div className="relative group">
                      <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="you@school.edu"
                        required
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">Password</label>
                      <button type="button" onClick={() => { setMode('forgot'); setError(''); }}
                        className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline">Forgot password?</button>
                    </div>
                    <div className="relative group">
                      <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        placeholder="••••••••"
                        required
                        className={inputCls + ' !pr-11'}
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                        {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="auth-sheen group w-full bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 text-white py-3.5 rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_-8px_rgba(29,78,216,0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-lg disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                  >
                    {loading
                      ? <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                      : <>Sign In <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></>}
                  </button>
                </form>

                <div className="mt-6 flex items-center gap-2.5 text-xs text-slate-400">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200" />
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <ShieldCheck size={13} className="text-emerald-500" /> Encrypted &amp; secure sign-in
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200" />
                </div>
              </>
            ) : sent ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 animate-rise">
                  <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
                  <span>{sent.message}</span>
                </div>
                {sent.devResetLink && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                    <div className="font-semibold mb-1">Dev mode (email not configured):</div>
                    <a href={sent.devResetLink} className="text-primary-600 underline break-all">{sent.devResetLink}</a>
                  </div>
                )}
                <button onClick={backToLogin} className="w-full flex items-center justify-center gap-2 text-sm font-medium text-primary-600 hover:underline">
                  <ArrowLeft size={15} /> Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Email Address</label>
                  <div className="relative group">
                    <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="you@school.edu" required className={inputCls} />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="auth-sheen w-full bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 text-white py-3.5 rounded-xl font-semibold text-sm hover:-translate-y-0.5 transition-all shadow-lg disabled:opacity-70 flex items-center justify-center gap-2">
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : 'Send reset link'}
                </button>
                <button type="button" onClick={backToLogin} className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-primary-600">
                  <ArrowLeft size={15} /> Back to sign in
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-slate-400 text-xs mt-6">
            © {new Date().getFullYear()} {schoolName}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
