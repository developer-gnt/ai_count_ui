import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight, CheckCircle2, Shield } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { signup } from '../../features/auth/authSlice';

interface SignupPageProps {
  navigate: (route: string) => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ navigate }) => {
  const dispatch = useAppDispatch();
  const authStatus = useAppSelector((state) => state.auth.status);
  const authError = useAppSelector((state) => state.auth.error);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const loading = authStatus === 'loading';

  // Simple password strength calculation
  const getPasswordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;
    return score;
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please provide a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setSuccessMessage('');

    try {
      const result = await dispatch(signup({ name, email, password })).unwrap();
      if (result.requiresEmailConfirmation) {
        setSuccessMessage(`Account created. Check ${email} to confirm your email before signing in.`);
      } else {
        navigate('/create-organization');
      }
    } catch (errorResponse) {
      setError(
        typeof errorResponse === 'object' && errorResponse && 'message' in errorResponse
          ? String((errorResponse as { message: unknown }).message)
          : authError?.message || 'Unable to create the account.',
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

      {/* Main Signup Box */}
      <div className="max-w-md mx-auto w-full bg-white border border-slate-300 p-8 rounded-xs shadow-xs">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-950 tracking-tight">
            Create Master User Account
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Sign up to establish your primary organization and receive the Owner role.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xs">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Full Legal Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rajesh Kulkarni"
              className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Work Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rajesh@enterprise.in"
              className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Password (min 8 characters)
            </label>
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

            {/* Password Strength Indicator */}
            {password && (
              <div className="mt-2 space-y-1">
                <div className="h-1 w-full bg-slate-100 rounded-xs overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      strength < 50
                        ? 'bg-red-500 w-1/4'
                        : strength < 75
                        ? 'bg-amber-500 w-2/4'
                        : 'bg-emerald-600 w-full'
                    }`}
                  />
                </div>
                <div className="text-[10px] text-slate-400 font-mono text-right">
                  {strength < 50 ? 'Weak' : strength < 75 ? 'Moderate' : 'Strong Password'}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            id="signup-submit-btn"
            className="w-full mt-2 bg-slate-950 text-white hover:bg-slate-800 font-semibold text-xs py-3 rounded-xs transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Creating Account...</span>
            ) : (
              <>
                <span>Create Master Account & Proceed</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Already registered?{' '}
          <button
            onClick={() => navigate('/login')}
            className="font-semibold text-slate-900 hover:underline"
          >
            Log in to existing workspace
          </button>
        </div>
      </div>

      {/* Trust */}
      <div className="text-center text-[11px] text-slate-400 font-mono">
        Multi-Tenant Row-Level Security • 100% Data Isolation
      </div>
    </div>
  );
};
