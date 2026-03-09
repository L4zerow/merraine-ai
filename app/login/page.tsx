'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassInput } from '@/components/ui/GlassInput';
import GlassButton from '@/components/ui/GlassButton';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);

  // Reset form state
  const [masterPassword, setMasterPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError('Invalid username or password');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetSuccess(true);
        setMasterPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f]">
      <div className="w-full max-w-md animate-fade-in">
        <div className="glass-card p-8 rounded-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#0A84FF] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Merraine AI</h1>
            <p className="text-white/50 mt-1">
              {showReset ? 'Reset your password' : 'Sign in to continue'}
            </p>
          </div>

          {!showReset ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-6">
                <GlassInput
                  label="Username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                />

                <GlassInput
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />

                {error && (
                  <div className="bg-[#FF453A]/10 border border-[#FF453A]/20 rounded-xl px-4 py-3">
                    <p className="text-[#FF453A] text-sm">{error}</p>
                  </div>
                )}

                <GlassButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  className="w-full"
                >
                  Sign In
                </GlassButton>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => { setShowReset(true); setError(''); setResetSuccess(false); }}
                  className="text-sm text-[#0A84FF] hover:text-[#0A84FF]/80 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            </>
          ) : (
            <>
              {resetSuccess ? (
                <div className="space-y-6">
                  <div className="bg-[#30D158]/10 border border-[#30D158]/20 rounded-xl px-4 py-3">
                    <p className="text-[#30D158] text-sm">Password reset successfully! You can now sign in with your new password.</p>
                  </div>
                  <GlassButton
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={() => { setShowReset(false); setResetSuccess(false); setError(''); }}
                  >
                    Back to Sign In
                  </GlassButton>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-6">
                  <GlassInput
                    label="Original Password"
                    type="password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Enter the original password"
                    required
                  />

                  <GlassInput
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                  />

                  <GlassInput
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                  />

                  {error && (
                    <div className="bg-[#FF453A]/10 border border-[#FF453A]/20 rounded-xl px-4 py-3">
                      <p className="text-[#FF453A] text-sm">{error}</p>
                    </div>
                  )}

                  <GlassButton
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    className="w-full"
                  >
                    Reset Password
                  </GlassButton>
                </form>
              )}

              {!resetSuccess && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => { setShowReset(false); setError(''); }}
                    className="text-sm text-white/50 hover:text-white/80 transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
