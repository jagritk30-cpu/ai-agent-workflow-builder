'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useOrgContext } from '@/contexts/OrganizationContext';
import { GET_ORG_WORKFLOWS } from '@/graphql/queries';
import { TRIGGER_WORKFLOW_RUN, DELETE_WORKFLOW } from '@/graphql/mutations';
import { Plus, Search, Play, Edit2, Trash2, Network, Loader2, Workflow } from 'lucide-react';
import Link from 'next/link';

export default function WorkflowsPage() {
  const { currentOrg } = useOrgContext();
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data, loading, refetch } = useQuery(GET_ORG_WORKFLOWS, {
    variables: { org_id: currentOrg?.id },
    skip: !currentOrg?.id,
  });

  const [triggerRun, { loading: triggeringId }] = useMutation(TRIGGER_WORKFLOW_RUN);
  const [deleteWorkflow, { loading: deletingId }] = useMutation(DELETE_WORKFLOW);

  const workflows = data?.workflows || [];
  const filteredWorkflows = workflows.filter((w: any) => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (w.description && w.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleRun = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await triggerRun({ variables: { workflow_id: id } });
      alert('Workflow triggered successfully!');
    } catch (err) {
      console.error('Failed to trigger workflow', err);
      alert('Failed to trigger workflow');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
      try {
        await deleteWorkflow({ variables: { id } });
        refetch();
      } catch (err) {
        console.error('Failed to delete workflow', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-white">Workflows</h1>
        <Link href="/workflows/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Workflow
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
        <input
          type="text"
          placeholder="Search workflows..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input w-full pl-10 max-w-md bg-[#12121a] border-[#2a2a35]"
        />
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#6c63ff]" />
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <div className="glass p-16 rounded-2xl flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-[#1a1a24] rounded-full flex items-center justify-center mb-6">
            <Workflow className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {searchTerm ? 'No workflows match your search' : 'No workflows yet'}
          </h3>
          <p className="text-gray-400 mb-8 max-w-md">
            {searchTerm 
              ? 'Try adjusting your search terms.' 
              : 'Create your first workflow to automate tasks, connect agents, and streamlline your operations.'}
          </p>
          {!searchTerm && (
            <Link href="/workflows/new" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create your first workflow
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredWorkflows.map((workflow: any) => (
            <Link 
              key={workflow.id} 
              href={`/workflows/${workflow.id}`}
              className="glass rounded-xl p-6 hover:border-[#6c63ff]/50 transition-all duration-300 group flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-[#1a1a24] rounded-lg group-hover:bg-[#6c63ff]/20 group-hover:text-[#6c63ff] transition-colors">
                  <Network className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${workflow.is_active ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-gray-800 text-gray-400'}`}>
                    {workflow.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#6c63ff] transition-colors line-clamp-1">
                {workflow.name}
              </h3>
              
              <p className="text-gray-400 text-sm mb-6 line-clamp-2 flex-grow">
                {workflow.description || 'No description provided.'}
              </p>
              
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#2a2a35]">
                <div className="flex items-center gap-4">
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#00d4ff]"></div>
                    {workflow.workflow_steps?.aggregate?.count || 0} steps
                  </div>
                </div>
                
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => handleRun(workflow.id, e)}
                    className="p-2 bg-[#1a1a24] hover:bg-[#00e676]/20 hover:text-[#00e676] rounded-lg transition-colors"
                    title="Run Workflow"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(workflow.id, e)}
                    className="p-2 bg-[#1a1a24] hover:bg-[#ff5252]/20 hover:text-[#ff5252] rounded-lg transition-colors"
                    title="Delete Workflow"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
