'use client';

import { useState } from 'react';
import { GlassCard, GlassInput } from '@/components/ui';
import GlassButton from '@/components/ui/GlassButton';
import { useUser } from '@/lib/userContext';

export default function SettingsPage() {
  const { user } = useUser();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to change password');
        return;
      }

      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-white/60">Manage your account settings.</p>
      </div>

      {/* User Info */}
      {user && (
        <GlassCard>
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-lg bg-[#0A84FF]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#0A84FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Account</h2>
                <p className="text-sm text-white/50">Your account information</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-white/60">Name</span>
              <span className="text-white">{user.name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-white/60">Email</span>
              <span className="text-white">{user.email}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-white/60">Role</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                user.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-white/10 text-white/70'
              }`}>
                {user.role}
              </span>
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-[#0A84FF]/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#0A84FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Change Password</h2>
              <p className="text-sm text-white/50">Update your login password</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <GlassInput
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter your current password"
            required
            autoComplete="current-password"
          />

          <GlassInput
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter a new password"
            required
            autoComplete="new-password"
          />

          <GlassInput
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your new password"
            required
            autoComplete="new-password"
          />

          {error && (
            <div className="bg-[#FF453A]/10 border border-[#FF453A]/20 rounded-xl px-4 py-3">
              <p className="text-[#FF453A] text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-[#30D158]/10 border border-[#30D158]/20 rounded-xl px-4 py-3">
              <p className="text-[#30D158] text-sm">{success}</p>
            </div>
          )}

          <div className="pt-2">
            <GlassButton
              type="submit"
              variant="primary"
              loading={loading}
            >
              Update Password
            </GlassButton>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
