import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Mail, ArrowRight } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { resetPassword } from '../../features/auth/authSlice';

interface ForgotPasswordPageProps {
  navigate: (route: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ navigate }) => {
  const dispatch = useAppDispatch();
  const authStatus = useAppSelector((state) => state.auth.status);
  const authError = useAppSelector((state) => state.auth.error);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const loading = authStatus === 'loading';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError('');

    try {
      await dispatch(resetPassword(email)).unwrap();
      setSubmitted(true);
    } catch (errorResponse) {
      setError(
        typeof errorResponse === 'object' && errorResponse && 'message' in errorResponse
          ? String((errorResponse as { message: unknown }).message)
          : authError?.message || 'Unable to send password reset instructions.',
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
              <h2 className="text-xl font-bold text-slate-950 tracking-tight">
                Reset Password
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your registered work email. We will send a secure tokenized reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs">
                  <div>{error}</div>
                  {authError?.providerCode && (
                    <div className="mt-1 font-mono text-[10px]">Code: {authError.providerCode}</div>
                  )}
                  {authError?.providerStatus && (
                    <div className="font-mono text-[10px]">Status: {authError.providerStatus}</div>
                  )}
                  {authError?.providerMessage && authError.providerMessage !== error && (
                    <div className="mt-1 text-[10px]">Supabase: {authError.providerMessage}</div>
                  )}
                  {authError?.providerErrorId && (
                    <div className="font-mono text-[10px]">Error ID: {authError.providerErrorId}</div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.in"
                  className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-slate-950 text-white hover:bg-slate-800 font-semibold text-xs py-3 rounded-xs transition-colors flex items-center justify-center gap-2"
              >
                {loading ? 'Sending Reset Instructions...' : 'Send Reset Link'}
              </button>
            </form>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-950">
              Reset Link Dispatched
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed font-sans">
              If an account exists for <span className="font-mono font-semibold text-slate-900">{email}</span>, a secure password recovery instruction email has been sent.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-slate-900 text-white hover:bg-slate-800 font-semibold text-xs py-2.5 rounded-xs"
              >
                Return to Login
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-xs text-slate-600 hover:text-slate-950 font-medium inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={13} />
            <span>Back to Login</span>
          </button>
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-400 font-mono">
        Encrypted Session Protocol
      </div>
    </div>
  );
};
