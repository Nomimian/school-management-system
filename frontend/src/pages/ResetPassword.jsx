import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, Lock, Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { authAPI } from '../services/api';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate  = useNavigate();
  const [pw, setPw]           = useState({ newPassword: '', confirm: '' });
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2356] via-[#1e3a8a] to-[#1d4ed8] flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm mb-4 border border-white/20">
            <BookOpen size={28} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-white text-3xl">EduManage Pro</h1>
        </div>

        <div className="bg-white rounded-3xl shadow-float p-8">
          {done ? (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
              <h2 className="font-display font-bold text-slate-800 text-xl">Password reset!</h2>
              <p className="text-slate-500 text-sm">You can now sign in with your new password. Redirecting…</p>
            </div>
          ) : (
            <>
              <h2 className="font-display font-bold text-slate-800 text-xl mb-1">Set a new password</h2>
              <p className="text-slate-400 text-sm mb-6">Choose a strong password for your account.</p>

              {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-5">{error}</div>}

              <form onSubmit={submit} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={show ? 'text' : 'password'} value={pw.newPassword} onChange={e => setPw({ ...pw, newPassword: e.target.value })}
                      placeholder="••••••••" required
                      className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 bg-slate-50 focus:bg-white" />
                    <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Confirm Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={show ? 'text' : 'password'} value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })}
                      placeholder="••••••••" required
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 bg-slate-50 focus:bg-white" />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-primary-700 to-primary-500 text-white py-3 rounded-xl font-semibold text-sm hover:from-primary-800 hover:to-primary-600 transition-all shadow-lg disabled:opacity-70 flex items-center justify-center gap-2">
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Resetting…</> : 'Reset Password'}
                </button>
                <button type="button" onClick={() => navigate('/login')} className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-primary-600">
                  <ArrowLeft size={15} /> Back to sign in
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
