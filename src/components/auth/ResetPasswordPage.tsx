import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { logout, updatePassword } from '../../features/auth/authSlice';
import { supabase } from '../../lib/supabaseClient';

interface ResetPasswordPageProps {
  navigate: (route: string) => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ navigate }) => {
  const dispatch = useAppDispatch();
  const authStatus = useAppSelector((state) => state.auth.status);
  const authError = useAppSelector((state) => state.auth.error);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;

    const checkRecoverySession = async () => {
      if (!supabase) {
        if (active) {
          setError('Password recovery is not configured for this frontend.');
          setCheckingSession(false);
        }
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;

      if (sessionError || !data.session) {
        setError('This password reset link is invalid or has expired. Request a new link and try again.');
      } else {
        setSessionReady(true);
      }
      setCheckingSession(false);
    };

    void checkRecoverySession();
    return () => {
      active = false;
    };
  }, []);

  const loading = authStatus === 'loading' || checkingSession;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!sessionReady || loading) return;

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    try {
      await dispatch(updatePassword(password)).unwrap();
      await dispatch(logout()).unwrap();
      setSubmitted(true);
    } catch (errorResponse) {
      setError(
        typeof errorResponse === 'object' && errorResponse && 'message' in errorResponse
          ? String((errorResponse as { message: unknown }).message)
          : authError?.message || 'Unable to update your password.',
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-between py-12 px-6">
      {/* Brand Header */}
      <div className="max-w-md mx-auto w-full text-center mb-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center justify-center focus:outline-none"
        >
          <img
            src="/logo.png"
            alt="AICounts"
            className="h-14 w-auto object-contain mx-auto"
          />
        </button>
      </div>

      <div className="max-w-md mx-auto w-full bg-white border border-slate-300 p-8 rounded-xs shadow-xs">
        {!submitted ? (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-950 tracking-tight">Set a New Password</h2>
              <p className="text-xs text-slate-500 mt-1">Choose a new password for your accounting workspace.</p>
            </div>

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs">
                {error}
                {authError?.providerCode && (
                  <span className="block mt-1 font-mono text-[10px]">Code: {authError.providerCode}</span>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900 pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !sessionReady}
                className="w-full mt-2 bg-slate-950 text-white hover:bg-slate-800 disabled:opacity-50 font-semibold text-xs py-3 rounded-xs transition-colors flex items-center justify-center gap-2"
              >
                {checkingSession ? 'Checking Reset Link...' : loading ? 'Updating Password...' : 'Update Password'}
                {!loading && !checkingSession && <ArrowRight size={14} />}
              </button>
            </form>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-950">Password Updated</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Your password has been updated. Sign in again with your new password.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full mt-6 bg-slate-900 text-white hover:bg-slate-800 font-semibold text-xs py-2.5 rounded-xs"
            >
              Return to Login
            </button>
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-slate-400 font-mono">Encrypted Session Protocol</div>
    </div>
  );
};
