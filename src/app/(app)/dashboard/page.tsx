'use client';

import { useQuery } from '@apollo/client';
import { useUserData } from '@nhost/react';
import { useOrgContext } from '@/contexts/OrgContext';
import { GET_ORG_WORKFLOWS } from '@/graphql/queries';
import { Activity, Clock, PlayCircle, Plus, Network } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const user = useUserData();
  const { currentOrg } = useOrgContext();

  const { data, loading } = useQuery(GET_ORG_WORKFLOWS, {
    variables: { org_id: currentOrg?.id },
    skip: !currentOrg?.id,
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const workflows = data?.workflows || [];
  
  // Calculate mock stats from workflows
  const activeTriggers = workflows.filter((w: any) => w.is_active).length;
  // In a real app, these would come from an aggregate query
  const totalRuns = 124;
  const avgDuration = '1.2s';
  
  const quotaUsed = currentOrg?.quota_used || 0;
  const quotaLimit = currentOrg?.quota_limit || 1000;
  const quotaPercentage = Math.min(100, Math.max(0, (quotaUsed / quotaLimit) * 100));
  
  const quotaColor = quotaPercentage > 90 ? 'bg-[#ff5252]' : quotaPercentage > 75 ? 'bg-[#ffb74d]' : 'bg-[#00e676]';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">
          {getGreeting()}, {user?.displayName || 'Builder'}!
        </h1>
        <p className="text-gray-400">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Quota Bar */}
      <div className="glass p-6 rounded-xl">
        <div className="flex justify-between mb-2">
          <h3 className="font-semibold text-lg">API Usage</h3>
          <span className="font-mono text-sm text-gray-400">
            {quotaUsed.toLocaleString()} / {quotaLimit.toLocaleString()} calls
          </span>
        </div>
        <div className="w-full h-3 bg-[#1a1a24] rounded-full overflow-hidden mb-2">
          <div 
            className={`h-full ${quotaColor} transition-all duration-1000`} 
            style={{ width: `${quotaPercentage}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500">Resets on {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass p-6 rounded-xl flex items-start justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1">Total Workflows</p>
            <p className="text-3xl font-bold text-white">{workflows.length}</p>
          </div>
          <div className="p-3 bg-[#6c63ff]/10 rounded-lg text-[#6c63ff]">
            <Network className="w-6 h-6" />
          </div>
        </div>
        <div className="glass p-6 rounded-xl flex items-start justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1">Runs Today</p>
            <p className="text-3xl font-bold text-white">{totalRuns}</p>
          </div>
          <div className="p-3 bg-[#00d4ff]/10 rounded-lg text-[#00d4ff]">
            <Activity className="w-6 h-6" />
          </div>
        </div>
        <div className="glass p-6 rounded-xl flex items-start justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1">Avg Duration</p>
            <p className="text-3xl font-bold text-white">{avgDuration}</p>
          </div>
          <div className="p-3 bg-[#00e676]/10 rounded-lg text-[#00e676]">
            <Clock className="w-6 h-6" />
          </div>
        </div>
        <div className="glass p-6 rounded-xl flex items-start justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1">Active Triggers</p>
            <p className="text-3xl font-bold text-white">{activeTriggers}</p>
          </div>
          <div className="p-3 bg-[#ffb74d]/10 rounded-lg text-[#ffb74d]">
            <PlayCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent Runs Table or CTA */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-6 border-b border-[#2a2a35] flex justify-between items-center">
          <h2 className="text-xl font-bold">Recent Runs</h2>
          {workflows.length > 0 && (
            <Link href="/workflows" className="text-sm text-[#6c63ff] hover:text-[#00d4ff] transition-colors">
              View all
            </Link>
          )}
        </div>
        
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#6c63ff]"></div>
          </div>
        ) : workflows.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-[#1a1a24] rounded-full flex items-center justify-center mb-4">
              <Network className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No workflows found</h3>
            <p className="text-gray-400 mb-6 max-w-md">Get started by creating your first AI agent workflow to automate your tasks.</p>
            <Link href="/workflows/new" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Workflow
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#12121a]">
                  <th className="p-4 font-medium text-gray-400 text-sm border-b border-[#2a2a35]">Workflow Name</th>
                  <th className="p-4 font-medium text-gray-400 text-sm border-b border-[#2a2a35]">Status</th>
                  <th className="p-4 font-medium text-gray-400 text-sm border-b border-[#2a2a35]">Trigger Type</th>
                  <th className="p-4 font-medium text-gray-400 text-sm border-b border-[#2a2a35]">Started</th>
                  <th className="p-4 font-medium text-gray-400 text-sm border-b border-[#2a2a35]">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a35]">
                {/* Mock data for now, as we don't have a runs query yet */}
                <tr className="hover:bg-[#1a1a24] transition-colors cursor-pointer">
                  <td className="p-4 text-white">Lead Generation Agent</td>
                  <td className="p-4"><span className="badge-success">Completed</span></td>
                  <td className="p-4 text-gray-300">Schedule</td>
                  <td className="p-4 text-gray-400">2 mins ago</td>
                  <td className="p-4 font-mono text-sm text-gray-300">1.4s</td>
                </tr>
                <tr className="hover:bg-[#1a1a24] transition-colors cursor-pointer">
                  <td className="p-4 text-white">Customer Support Router</td>
                  <td className="p-4"><span className="badge-error">Failed</span></td>
                  <td className="p-4 text-gray-300">Webhook</td>
                  <td className="p-4 text-gray-400">15 mins ago</td>
                  <td className="p-4 font-mono text-sm text-gray-300">0.8s</td>
                </tr>
                <tr className="hover:bg-[#1a1a24] transition-colors cursor-pointer">
                  <td className="p-4 text-white">Data Extraction</td>
                  <td className="p-4"><span className="badge-warning text-xs px-2 py-1 bg-[#ffb74d]/10 text-[#ffb74d] rounded-full">Running</span></td>
                  <td className="p-4 text-gray-300">Manual</td>
                  <td className="p-4 text-gray-400">Just now</td>
                  <td className="p-4 font-mono text-sm text-gray-300">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
