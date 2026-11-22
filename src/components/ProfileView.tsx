import React, { useState } from 'react';
import { CheckCircle2, Save, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import { GENERATED_ASSETS } from '../data/researchData';

export const ProfileView: React.FC = () => {
  const { user, authMode, updateUserProfile, sessionRuns, historyItems } = useApp();

  const [name, setName] = useState(user?.name || '');
  const [institution, setInstitution] = useState(user?.institution || '');
  const [role, setRole] = useState(user?.role || '');
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedNotice(false);
    if (name.trim().length < 2) {
      setError('Display name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile({
        name: name.trim(),
        institution: institution.trim(),
        role: role.trim(),
      });
      setSavedNotice(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-display text-2xl font-bold text-white">Researcher Profile</h2>
        <p className="mt-1 text-xs text-slate-400">
          Manage your account details and review session authentication credentials.
        </p>
      </div>

      <div className="glass-surface rounded-xl p-6 flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-[#080D1B]">
          <img
            src={GENERATED_ASSETS.researcherAvatar}
            alt="Researcher profile portrait"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl font-bold text-white truncate">{user.name}</h3>
          <p className="text-sm text-slate-300 truncate">{user.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1 text-[#00D4FF]">
              <ShieldCheck className="h-3.5 w-3.5" />
              {authMode === 'firebase' ? 'Firebase Auth' : 'Development Auth Mode'}
            </span>
            <span aria-hidden="true">·</span>
            <span>Session Runs: {sessionRuns.length}</span>
            <span aria-hidden="true">·</span>
            <span>Saved History: {historyItems.length}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="glass-surface rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-name" className="block text-xs font-medium text-slate-300 mb-1.5">
              Full Name
            </label>
            <input
              id="profile-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-[#080D1B] px-3.5 py-2.5 text-sm text-white focus:border-[#397BFF] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="profile-role" className="block text-xs font-medium text-slate-300 mb-1.5">
              Academic / Engineering Role
            </label>
            <input
              id="profile-role"
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-[#080D1B] px-3.5 py-2.5 text-sm text-white focus:border-[#397BFF] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="profile-institution"
            className="block text-xs font-medium text-slate-300 mb-1.5"
          >
            Institution / Research Lab
          </label>
          <input
            id="profile-institution"
            type="text"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-[#080D1B] px-3.5 py-2.5 text-sm text-white focus:border-[#397BFF] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-slate-800 pt-4 text-xs text-slate-400">
          <div>
            <span className="text-slate-500">Email (Primary Identity)</span>
            <p className="mt-1 font-mono text-slate-200">{user.email}</p>
          </div>
          <div>
            <span className="text-slate-500">Account Created</span>
            <p className="mt-1 font-mono text-slate-200 tabular-nums">
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {error && <p className="text-xs text-rose-400">{error}</p>}
        {savedNotice && (
          <p className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Profile updated successfully.
          </p>
        )}

        <div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#397BFF] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#2B68E8] disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
