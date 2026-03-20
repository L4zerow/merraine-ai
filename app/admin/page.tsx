'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui';
import { useUser } from '@/lib/userContext';

interface UserInfo {
  id: number;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface Allocation {
  userId: number;
  allocatedCredits: number;
  userName: string;
  userEmail: string;
  userRole: string;
}

interface CreditData {
  masterBalance: number | null;
  totalAllocated: number;
  unallocated: number | null;
  allocations: Allocation[];
}

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, loading: userLoading } = useUser();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [credits, setCredits] = useState<CreditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Allocation editing
  const [editingAllocation, setEditingAllocation] = useState<number | null>(null);
  const [allocationInput, setAllocationInput] = useState('');

  // Password reset
  const [resettingPassword, setResettingPassword] = useState<number | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Transfer
  const [transferFrom, setTransferFrom] = useState<number | ''>('');
  const [transferTo, setTransferTo] = useState<number | ''>('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (!userLoading && !isAdmin) {
      router.push('/');
    }
  }, [userLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, creditsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/credits'),
      ]);
      if (usersRes.ok) setUsers((await usersRes.json()).users);
      if (creditsRes.ok) setCredits(await creditsRes.json());
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const getAllocationForUser = (userId: number): number => {
    return credits?.allocations.find(a => a.userId === userId)?.allocatedCredits ?? 0;
  };

  const handleAllocate = async (userId: number) => {
    const amount = parseInt(allocationInput);
    if (isNaN(amount) || amount < 0) {
      setError('Enter a valid non-negative number');
      return;
    }
    try {
      const res = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'allocate', userId, amount }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      showSuccess(`Set allocation to ${amount.toLocaleString()} credits`);
      setEditingAllocation(null);
      setAllocationInput('');
      loadData();
    } catch {
      setError('Failed to allocate credits');
    }
  };

  const handleTransfer = async () => {
    if (!transferFrom || !transferTo || transferFrom === transferTo) {
      setError('Select different users for From and To');
      return;
    }
    const amount = parseInt(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Enter a positive transfer amount');
      return;
    }
    setTransferring(true);
    try {
      const res = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transfer', fromUserId: transferFrom, toUserId: transferTo, amount }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      const fromName = users.find(u => u.id === transferFrom)?.name || '';
      const toName = users.find(u => u.id === transferTo)?.name || '';
      showSuccess(`Transferred ${amount.toLocaleString()} credits from ${fromName} to ${toName}`);
      setTransferAmount('');
      setTransferFrom('');
      setTransferTo('');
      loadData();
    } catch {
      setError('Failed to transfer credits');
    } finally {
      setTransferring(false);
    }
  };

  const handleResetPassword = async (userId: number) => {
    if (!newPasswordInput || newPasswordInput.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword: newPasswordInput }),
      });
      if (!res.ok) { setError((await res.json()).error); return; }
      showSuccess('Password reset successfully');
      setResettingPassword(null);
      setNewPasswordInput('');
    } catch {
      setError('Failed to reset password');
    }
  };

  if (userLoading || loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <h1 className="text-3xl font-bold text-white">Admin</h1>
        <GlassCard><div className="text-white/50 text-center py-8">Loading...</div></GlassCard>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
        <p className="text-white/60">Manage users and credit allocations.</p>
      </div>

      {error && (
        <GlassCard className="border-red-500/30 bg-red-500/10">
          <div className="flex items-center justify-between">
            <span className="text-red-300 text-sm">{error}</span>
            <button onClick={() => setError('')} className="text-red-300/50 hover:text-red-300 ml-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </GlassCard>
      )}

      {success && (
        <GlassCard className="border-green-500/30 bg-green-500/10">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-300 text-sm">{success}</span>
          </div>
        </GlassCard>
      )}

      {/* ─── Credit Pool Overview ─────────────────────────────── */}
      <GlassCard>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#0A84FF]/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#0A84FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Credit Pool</h2>
            <p className="text-sm text-white/50">Master credit balance and allocations</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/5 text-center">
            <div className="text-2xl font-bold text-white">{credits?.masterBalance?.toLocaleString() ?? '—'}</div>
            <div className="text-xs text-white/50 mt-1">Master Balance</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 text-center">
            <div className="text-2xl font-bold text-[#0A84FF]">{credits?.totalAllocated.toLocaleString() ?? '0'}</div>
            <div className="text-xs text-white/50 mt-1">Allocated</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 text-center">
            <div className="text-2xl font-bold text-[#30D158]">{credits?.unallocated?.toLocaleString() ?? '—'}</div>
            <div className="text-xs text-white/50 mt-1">Unallocated</div>
          </div>
        </div>
      </GlassCard>

      {/* ─── User Cards ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-semibold text-white">Users & Allocations</h2>
          <span className="text-xs text-white/40">Click credits to edit</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map((u) => {
            const alloc = getAllocationForUser(u.id);
            return (
              <GlassCard key={u.id}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-white font-medium">{u.name}</div>
                      <div className="text-white/50 text-sm">{u.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      u.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-white/10 text-white/60'
                    }`}>{u.role}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      u.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                    }`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>

                {/* Credits */}
                <div className="p-3 rounded-xl bg-white/5 mb-3">
                  {editingAllocation === u.id ? (
                    <div>
                      <div className="text-xs text-white/50 mb-2">Set credit allocation</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={allocationInput}
                          onChange={(e) => setAllocationInput(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0A84FF]"
                          placeholder="Credits"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAllocate(u.id);
                            if (e.key === 'Escape') setEditingAllocation(null);
                          }}
                        />
                        <button onClick={() => handleAllocate(u.id)} className="px-3 py-2 bg-[#30D158] text-white text-sm rounded-lg hover:bg-[#30D158]/80 transition-colors">
                          Save
                        </button>
                        <button onClick={() => setEditingAllocation(null)} className="px-3 py-2 bg-white/10 text-white/70 text-sm rounded-lg hover:bg-white/20 transition-colors">
                          Cancel
                        </button>
                      </div>
                      {credits?.unallocated != null && (
                        <div className="text-xs text-white/40 mt-2">
                          {credits.unallocated + alloc} credits available (current + unallocated pool)
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-white/50">Allocated Credits</div>
                      <button
                        onClick={() => {
                          setEditingAllocation(u.id);
                          setAllocationInput(String(alloc));
                          setError('');
                        }}
                        className="text-lg font-bold text-white hover:text-[#0A84FF] transition-colors cursor-pointer"
                      >
                        {alloc.toLocaleString()}
                      </button>
                    </div>
                  )}
                </div>

                {/* Password Reset */}
                {resettingPassword === u.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0A84FF]"
                      placeholder="New password"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleResetPassword(u.id);
                        if (e.key === 'Escape') setResettingPassword(null);
                      }}
                    />
                    <button onClick={() => handleResetPassword(u.id)} className="px-3 py-2 bg-[#0A84FF] text-white text-sm rounded-lg hover:bg-[#0A84FF]/80 transition-colors">
                      Reset
                    </button>
                    <button onClick={() => setResettingPassword(null)} className="px-3 py-2 bg-white/10 text-white/70 text-sm rounded-lg hover:bg-white/20 transition-colors">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setResettingPassword(u.id); setNewPasswordInput(''); setError(''); }}
                    className="text-xs text-white/40 hover:text-white/70 transition-colors"
                  >
                    Reset Password
                  </button>
                )}
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* ─── Transfer Credits ─────────────────────────────────── */}
      <GlassCard>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#FF9500]/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#FF9500]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Transfer Credits</h2>
            <p className="text-sm text-white/50">Move credits between users</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs text-white/50 mb-2">From</label>
            <select
              value={transferFrom}
              onChange={(e) => setTransferFrom(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0A84FF] appearance-none cursor-pointer"
            >
              <option value="" className="bg-[#1c1c1e]">Select user...</option>
              {users.map(u => (
                <option key={u.id} value={u.id} className="bg-[#1c1c1e]">
                  {u.name} ({getAllocationForUser(u.id).toLocaleString()} credits)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-2">To</label>
            <select
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0A84FF] appearance-none cursor-pointer"
            >
              <option value="" className="bg-[#1c1c1e]">Select user...</option>
              {users.filter(u => u.id !== transferFrom).map(u => (
                <option key={u.id} value={u.id} className="bg-[#1c1c1e]">
                  {u.name} ({getAllocationForUser(u.id).toLocaleString()} credits)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-2">Amount</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="Credits"
                className="flex-1 px-3 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0A84FF]"
                onKeyDown={(e) => { if (e.key === 'Enter') handleTransfer(); }}
              />
              <button
                onClick={handleTransfer}
                disabled={transferring || !transferFrom || !transferTo || !transferAmount}
                className="px-4 py-2.5 bg-[#FF9500] text-white text-sm font-medium rounded-lg hover:bg-[#FF9500]/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {transferring ? 'Sending...' : 'Transfer'}
              </button>
            </div>
          </div>
        </div>

        {transferFrom !== '' && (
          <div className="mt-3 text-xs text-white/40">
            {users.find(u => u.id === transferFrom)?.name} has {getAllocationForUser(transferFrom as number).toLocaleString()} credits available to transfer
          </div>
        )}
      </GlassCard>
    </div>
  );
}
