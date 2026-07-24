import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { authAPI } from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [mode, setMode]       = useState('login'); // 'login' | 'forgot'
  const [form, setForm]       = useState({ email: 'admin@school.edu', password: 'admin123' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]  = useState(false);
  const [error, setError]      = useState('');
  const [sent, setSent]        = useState(null); // { message, devResetLink }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2356] via-[#1e3a8a] to-[#1d4ed8] flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm mb-4 border border-white/20">
            <BookOpen size={28} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-white text-3xl">EduManage Pro</h1>
          <p className="text-blue-200 mt-1">School Management System</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-3xl shadow-float p-8">
          <h2 className="font-display font-bold text-slate-800 text-xl mb-1">
            {mode === 'forgot' ? 'Reset password' : 'Welcome back'}
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            {mode === 'forgot' ? "Enter your email and we'll send a reset link" : 'Sign in to your account to continue'}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-5">
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="admin@school.edu"
                      required
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Password</label>
                    <button type="button" onClick={() => { setMode('forgot'); setError(''); }}
                      className="text-xs font-medium text-primary-600 hover:underline">Forgot password?</button>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 bg-slate-50 focus:bg-white"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary-700 to-primary-500 text-white py-3 rounded-xl font-semibold text-sm hover:from-primary-800 hover:to-primary-600 transition-all shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : 'Sign In'}
                </button>
              </form>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl text-xs text-blue-600 space-y-1">
                <div className="font-semibold mb-1">Demo Credentials:</div>
                <div>📧 admin@school.edu</div>
                <div>🔑 admin123</div>
              </div>
            </>
          ) : sent ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
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
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="you@school.edu" required
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 bg-slate-50 focus:bg-white" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-primary-700 to-primary-500 text-white py-3 rounded-xl font-semibold text-sm hover:from-primary-800 hover:to-primary-600 transition-all shadow-lg disabled:opacity-70 flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : 'Send reset link'}
              </button>
              <button type="button" onClick={backToLogin} className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-primary-600">
                <ArrowLeft size={15} /> Back to sign in
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-blue-200/60 text-xs mt-6">
          © {new Date().getFullYear()} EduManage Pro. All rights reserved.
        </p>
      </div>
    </div>
  );
}
