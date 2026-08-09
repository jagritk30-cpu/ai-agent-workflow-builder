'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { QuotaBar } from '@/components/ui/QuotaBar';
import { Trash2, Plus, Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const role = 'owner'; // default to owner for demo
  const router = useRouter();
  
  const [orgName, setOrgName] = useState('My Organization');
  const [saving, setSaving] = useState(false);
  
  React.useEffect(() => {
    if (role && role !== 'owner') {
      router.push('/dashboard');
    }
  }, [role, router]);

  const [members, setMembers] = useState([
    { id: '1', name: 'Alice Owner', email: 'alice@example.com', role: 'owner' },
    { id: '2', name: 'Bob Editor', email: 'bob@example.com', role: 'editor' },
  ]);

  if (role !== 'owner') {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-muted">Loading settings...</div>
      </div>
    );
  }

  const handleSaveOrg = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 500);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold text-text">Organization Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Org Info */}
        <div className="bg-surface/30 border border-surface rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-text">Organization Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Organization Name</label>
              <input 
                type="text" 
                className="w-full bg-[#0a0a0f] border border-surface focus:border-primary text-text px-3 py-2 rounded-md transition-colors outline-none"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Slug</label>
              <input 
                type="text" 
                className="w-full bg-[#0a0a0f]/50 border border-surface text-muted px-3 py-2 rounded-md cursor-not-allowed outline-none"
                value="my-organization"
                readOnly
              />
            </div>
            <button 
              className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md w-full transition-colors"
              onClick={handleSaveOrg}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Quota & Usage */}
        <div className="bg-surface/30 border border-surface rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-text">Usage & Quota</h2>
          <div className="space-y-6">
            <QuotaBar 
              used={8500} 
              limit={10000} 
              resetAt={new Date(Date.now() + 10 * 86400000).toISOString()} 
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0a0a0f] p-4 rounded-lg border border-surface text-center flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-text">1,245</div>
                <div className="text-xs text-muted mt-1">Runs this month</div>
              </div>
              <div className="bg-[#0a0a0f] p-4 rounded-lg border border-surface text-center flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-text">4.2s</div>
                <div className="text-xs text-muted mt-1">Avg run duration</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-surface/30 border border-surface rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-text">Team Members</h2>
          <button className="border border-surface text-text hover:bg-surface flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors">
            <Plus className="w-4 h-4" /> Add Member
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface text-sm text-muted">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Role</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr key={member.id} className="border-b border-surface/50 last:border-0 hover:bg-surface/20 transition-colors">
                  <td className="py-4 text-text font-medium">{member.name}</td>
                  <td className="py-4 text-muted">{member.email}</td>
                  <td className="py-4">
                    <select 
                      className="bg-[#0a0a0f] border border-surface text-text text-sm rounded focus:ring-primary focus:border-primary px-2 py-1 outline-none"
                      value={member.role}
                      disabled={member.id === '1'}
                      onChange={(e) => {
                        const newMembers = [...members];
                        const index = newMembers.findIndex(m => m.id === member.id);
                        newMembers[index].role = e.target.value;
                        setMembers(newMembers);
                      }}
                    >
                      <option value="owner">Owner</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </td>
                  <td className="py-4 text-right">
                    <button 
                      className="p-2 text-muted hover:text-error hover:bg-error/10 rounded-md transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted"
                      disabled={member.id === '1'}
                      title={member.id === '1' ? "Cannot remove yourself" : "Remove member"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
