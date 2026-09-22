import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { login } from '../../features/auth/authSlice';

interface LoginPageProps {
  navigate: (route: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ navigate }) => {
  const dispatch = useAppDispatch();
  const authStatus = useAppSelector((state) => state.auth.status);
  const authError = useAppSelector((state) => state.auth.error);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const loading = authStatus === 'loading';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setError('');

    try {
      await dispatch(login({ email, password })).unwrap();
      navigate('/dashboard');
    } catch (error) {
      setError(
        typeof error === 'object' && error && 'message' in error
          ? String((error as { message: unknown }).message)
          : authError?.message || 'Unable to sign in. Please check your credentials.',
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

      {/* Main Login Card */}
      <div className="max-w-md mx-auto w-full bg-white border border-slate-300 p-8 rounded-xs shadow-xs">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-950 tracking-tight">
            Sign In to Accounting Workspace
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Access your multi-tenant financial ledgers & GST compliance hub
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.in"
                className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900 font-sans"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-[11px] text-slate-600 hover:text-slate-900 underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900 pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded-xs border-slate-300 text-slate-900 focus:ring-0"
              />
              <span>Remember session (JWT)</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            id="login-submit-btn"
            className="w-full mt-2 bg-slate-950 text-white hover:bg-slate-800 font-semibold text-xs py-3 rounded-xs transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          New to AI Accounting?{' '}
          <button
            onClick={() => navigate('/signup')}
            className="font-semibold text-slate-900 hover:underline"
          >
            Create an account
          </button>
        </div>
      </div>

      {/* Footer info */}
      <div className="text-center text-[11px] text-slate-400 font-mono">
        Secured with bcrypt & stateless JWT authorization • India Statutory Standard
      </div>
    </div>
  );
};
