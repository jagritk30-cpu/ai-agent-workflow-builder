'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { useOrgContext } from '@/contexts/OrgContext';
import { useUserData } from '@nhost/react';
import { CREATE_WORKFLOW } from '@/graphql/mutations';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function NewWorkflowPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { currentOrg } = useOrgContext();
  const user = useUserData();
  const router = useRouter();

  const [createWorkflow, { loading, error }] = useMutation(CREATE_WORKFLOW);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg?.id || !user?.id) return;

    try {
      const { data } = await createWorkflow({
        variables: {
          org_id: currentOrg.id,
          name,
          description,
          created_by: user.id
        }
      });

      if (data?.insert_workflows_one?.id) {
        router.push(`/workflows/${data.insert_workflows_one.id}`);
      }
    } catch (err) {
      console.error('Error creating workflow:', err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Link href="/workflows" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Workflows
      </Link>

      <div className="glass p-8 md:p-10 rounded-2xl border border-[#2a2a35]">
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-[#2a2a35]">
          <div className="p-3 bg-gradient-to-br from-[#6c63ff]/20 to-[#00d4ff]/20 rounded-xl text-[#6c63ff]">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Create New Workflow</h1>
            <p className="text-gray-400 text-sm mt-1">Define the foundation for your new autonomous agent pipeline.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Workflow Name <span className="text-[#ff5252]">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Lead Qualification Agent"
              className="form-input w-full bg-[#0a0a0f] border-[#2a2a35] text-lg py-3"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Description <span className="text-gray-500">(Optional)</span>
            </label>
            <textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this workflow do?"
              className="form-input w-full bg-[#0a0a0f] border-[#2a2a35] resize-none"
            />
          </div>

          {error && (
            <div className="p-4 bg-[#ff5252]/10 border border-[#ff5252]/30 rounded-xl text-[#ff5252] text-sm">
              {error.message || 'An error occurred while creating the workflow.'}
            </div>
          )}

          <div className="pt-6 flex items-center justify-end gap-4 border-t border-[#2a2a35] mt-8">
            <Link href="/workflows" className="btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="btn-primary flex items-center gap-2 px-8"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Workflow
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
