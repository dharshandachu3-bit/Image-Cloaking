import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Lock, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../context/AuthContext';

interface AuthModalProps {
  initialMode?: 'login' | 'register' | 'forgot';
  onClose?: () => void;
  onSuccess: () => void;
  embedded?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialMode = 'login',
  onClose,
  onSuccess,
  embedded = false,
}) => {
  const { authMode, login, register, forgotPassword } = useApp();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('AI & ML Research Lab');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        if (!password) {
          setError('Please enter your password.');
          setLoading(false);
          return;
        }
        await login(cleanEmail, password);
        onSuccess();
      } else if (mode === 'register') {
        if (name.trim().length < 2) {
          setError('Please enter your full name (at least 2 characters).');
          setLoading(false);
          return;
        }
        if (password.length < 8) {
          setError('Password must be at least 8 characters long.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        await register(name.trim(), cleanEmail, password, institution.trim());
        onSuccess();
      } else {
        const msg = await forgotPassword(cleanEmail);
        setInfoMessage(msg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const card = (
    <div className="relative w-full max-w-md rounded-2xl border border-slate-700/70 bg-[#101A2E] p-7 shadow-2xl">
      {onClose && !embedded && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close authentication dialog"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex items-center gap-2 text-xs font-medium text-[#00D4FF]">
        <ShieldCheck className="h-4 w-4" />
        <span>
          {authMode === 'firebase'
            ? 'Firebase Authentication Active'
            : 'Development Auth Mode (Server scrypt + Bearer Token)'}
        </span>
      </div>

      <h2 className="mt-3 font-display text-2xl font-bold text-white">
        {mode === 'login' && 'Sign in to CloakVision'}
        {mode === 'register' && 'Create researcher account'}
        {mode === 'forgot' && 'Reset account password'}
      </h2>

      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
        {mode === 'login' &&
          'Authenticate to access the protected Cloaking Studio, Analytics, and opt-in History.'}
        {mode === 'register' &&
          (authMode === 'firebase'
            ? 'Your account will be registered securely via Firebase Authentication.'
            : 'Firebase credentials are not configured in .env. Registering creates a server-hashed (scrypt) session account for this development environment.')}
        {mode === 'forgot' && 'Enter the email address associated with your account.'}
      </p>

      {/* Segmented mode switch */}
      {mode !== 'forgot' && (
        <div className="mt-5 flex rounded-lg border border-slate-800 bg-[#080D1B] p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setInfoMessage(null);
            }}
            className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
              mode === 'login' ? 'bg-[#397BFF] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
              setInfoMessage(null);
            }}
            className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
              mode === 'register' ? 'bg-[#397BFF] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {infoMessage && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <span>{infoMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {mode === 'register' && (
          <>
            <div>
              <label htmlFor="auth-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                id="auth-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. A. Sharma"
                className="w-full rounded-lg border border-slate-700 bg-[#080D1B] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#397BFF] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="auth-institution"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Department / Institution
              </label>
              <input
                id="auth-institution"
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="AI & ML Engineering Department"
                className="w-full rounded-lg border border-slate-700 bg-[#080D1B] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#397BFF] focus:outline-none"
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="auth-email" className="block text-xs font-medium text-slate-300 mb-1.5">
            Email Address
          </label>
          <input
            id="auth-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="researcher@university.edu"
            className="w-full rounded-lg border border-slate-700 bg-[#080D1B] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#397BFF] focus:outline-none"
          />
        </div>

        {mode !== 'forgot' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="auth-password" className="block text-xs font-medium text-slate-300">
                Password
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className="text-xs text-[#00D4FF] hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="auth-password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full rounded-lg border border-slate-700 bg-[#080D1B] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#397BFF] focus:outline-none"
            />
          </div>
        )}

        {mode === 'register' && (
          <div>
            <label
              htmlFor="auth-confirm-password"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              Confirm Password
            </label>
            <input
              id="auth-confirm-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className="w-full rounded-lg border border-slate-700 bg-[#080D1B] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#397BFF] focus:outline-none"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#397BFF] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2B68E8] disabled:opacity-60"
        >
          <Lock className="h-4 w-4" />
          {loading
            ? 'Verifying...'
            : mode === 'login'
            ? 'Sign In'
            : mode === 'register'
            ? 'Create Account & Enter Workspace'
            : 'Send Recovery Request'}
        </button>

        {mode === 'forgot' && (
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setInfoMessage(null);
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white py-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </button>
        )}
      </form>

      <p className="mt-5 border-t border-slate-800 pt-4 text-[11px] leading-relaxed text-slate-500">
        {authMode === 'firebase'
          ? 'Authenticated via Firebase Auth. No passwords are stored on this frontend.'
          : 'Development Auth Mode: Credentials are verified server-side with salted scrypt hashes and in-memory Bearer tokens (never written to localStorage). Configure VITE_FIREBASE_* env vars to enable Firebase Auth.'}
      </p>
    </div>
  );

  if (embedded) {
    return (
      <div className="min-h-screen bg-[#080D1B] flex flex-col items-center justify-center px-4 py-12">
        {card}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4 py-8 overflow-y-auto">
      {card}
    </div>
  );
};
