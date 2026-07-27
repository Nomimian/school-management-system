import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft, ShieldCheck, Check } from 'lucide-react';
import { authAPI } from '../services/api';

const APP_NAME = 'EduManage Pro';

// Lightweight password strength: length + character-class variety → 0..4.
const scorePassword = (p) => {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 6) s++;
  if (p.length >= 10) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4);
};
const STRENGTH = [
  { label: 'Too short', color: 'bg-slate-200',  text: 'text-slate-400' },
  { label: 'Weak',      color: 'bg-red-400',     text: 'text-red-500' },
  { label: 'Fair',      color: 'bg-amber-400',   text: 'text-amber-600' },
  { label: 'Good',      color: 'bg-blue-400',    text: 'text-primary-600' },
  { label: 'Strong',    color: 'bg-emerald-500', text: 'text-emerald-600' },
];

export default function ResetPassword() {
  const { token } = useParams();
  const navigate  = useNavigate();
  const [pw, setPw]           = useState({ newPassword: '', confirm: '' });
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);

  const strength = scorePassword(pw.newPassword);
  const matches  = pw.confirm.length > 0 && pw.newPassword === pw.confirm;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (pw.newPassword.length < 6) return setError('Password must be at least 6 characters.');
    if (pw.newPassword !== pw.confirm) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await authAPI.resetPassword(token, { newPassword: pw.newPassword });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full pl-11 pr-11 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 ' +
    'placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-100 ' +
    'focus:border-primary-400 bg-slate-50/70 focus:bg-white transition-all';

  return (
    <div className="min-h-screen relative auth-gradient flex items-center justify-center p-4 sm:p-6 overflow-hidden text-white">
      {/* Fine grid mesh + depth */}
      <div className="auth-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/10 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/25 to-transparent" />

      {/* Floating orbs */}
      <div className="auth-blob absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
      <div className="auth-blob absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-white/[0.07] blur-3xl" style={{ animationDelay: '-6s' }} />
      <div className="auth-spotlight absolute top-1/4 right-1/3 w-80 h-80" style={{ animationDelay: '-9s' }} />

      {/* Twinkling stars */}
      {[[16,20],[28,72],[44,12],[70,80],[82,30],[38,54]].map(([t, l], i) => (
        <span key={i} className="auth-twinkle absolute w-1.5 h-1.5 rounded-full bg-white"
          style={{ top: `${t}%`, left: `${l}%`, animationDelay: `${i * 0.45}s` }} />
      ))}

      <div className="relative w-full max-w-md">
        {/* Brand mark */}
        <div className="text-center mb-7 auth-rise">
          <div className="auth-float inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 mb-4 shadow-lg">
            <GraduationCap size={30} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-white text-3xl">{APP_NAME}</h1>
          <p className="text-white/70 text-sm mt-1">School Management System</p>
        </div>

        <div className="auth-card auth-rise auth-d1 bg-white/95 backdrop-blur-xl rounded-3xl border border-white/70 p-8 sm:p-9 text-slate-800">
          {done ? (
            <div className="text-center space-y-3 py-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center animate-rise">
                <CheckCircle2 size={40} className="text-emerald-500" />
              </div>
              <h2 className="font-display font-bold text-slate-800 text-xl">Password reset!</h2>
              <p className="text-slate-500 text-sm">You can now sign in with your new password. Redirecting…</p>
              <div className="pt-1">
                <button onClick={() => navigate('/login')} className="text-sm font-medium text-primary-600 hover:underline">Go to sign in now</button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="font-display font-bold text-slate-800 text-2xl">Set a new password</h2>
              <p className="text-slate-400 text-sm mt-1 mb-6">Choose a strong password to secure your account.</p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-5 animate-rise">
                  {error}
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">New Password</label>
                  <div className="relative group">
                    <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
                    <input type={show ? 'text' : 'password'} value={pw.newPassword} onChange={e => setPw({ ...pw, newPassword: e.target.value })}
                      placeholder="••••••••" required className={inputCls} />
                    <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                      {show ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>

                  {/* Strength meter */}
                  {pw.newPassword && (
                    <div className="mt-1.5 animate-rise">
                      <div className="flex gap-1.5">
                        {[0, 1, 2, 3].map(i => (
                          <span key={i}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${i < strength ? STRENGTH[strength].color : 'bg-slate-200'}`} />
                        ))}
                      </div>
                      <div className={`text-xs mt-1 font-medium ${STRENGTH[strength].text}`}>
                        {STRENGTH[strength].label} password
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Confirm Password</label>
                  <div className="relative group">
                    <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
                    <input type={show ? 'text' : 'password'} value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })}
                      placeholder="••••••••" required className={inputCls} />
                    {matches && (
                      <Check size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                    )}
                  </div>
                  {pw.confirm.length > 0 && !matches && (
                    <span className="text-xs text-red-500 font-medium">Passwords don't match yet</span>
                  )}
                </div>

                <button type="submit" disabled={loading}
                  className="auth-sheen w-full bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 text-white py-3.5 rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_-8px_rgba(29,78,216,0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-lg disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2">
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Resetting…</> : <>Reset Password <ShieldCheck size={16} /></>}
                </button>
                <button type="button" onClick={() => navigate('/login')} className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-primary-600">
                  <ArrowLeft size={15} /> Back to sign in
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-white/60 text-xs mt-6">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
