'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock, Play } from 'lucide-react';
import { useSubscription, useMutation } from '@apollo/client';
import { STEP_RUNS_SUBSCRIPTION, WORKFLOW_RUN_SUBSCRIPTION } from '@/graphql/subscriptions';
import { APPROVE_STEP } from '@/graphql/mutations';
import { useAuth } from '@/contexts/AuthContext';
import { StepRunCard } from '@/components/run/StepRunCard';

export default function RunPage({ params }: { params: { id: string, runId: string } }) {
  const { user } = useAuth();
  const role = 'owner';
  const canEdit = role === 'owner' || role === 'editor';
  
  const [approveStep, { loading: approving }] = useMutation(APPROVE_STEP);

  const { data: runData, loading: runLoading } = useSubscription(WORKFLOW_RUN_SUBSCRIPTION, {
    variables: { id: params.runId }
  });

  const { data: stepsData } = useSubscription(STEP_RUNS_SUBSCRIPTION, {
    variables: { runId: params.runId }
  });

  const run = runData?.workflow_runs_by_pk;
  const stepRuns = stepsData?.step_runs || [];
  
  const sortedStepRuns = [...stepRuns].sort((a, b) => a.step_order - b.step_order);
  const awaitingApprovalStep = sortedStepRuns.find(sr => sr.status === 'awaiting_approval');

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'running': return 'bg-primary/10 text-primary border-primary/20 animate-pulse';
      case 'completed': return 'bg-success/10 text-success border-success/20';
      case 'failed': return 'bg-error/10 text-error border-error/20';
      case 'paused': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-surface text-muted border-surface';
    }
  };

  if (runLoading && !run) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!run) {
    return <div className="p-8 text-center text-muted">Run not found</div>;
  }

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Header Bar */}
      <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-surface bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link 
            href={`/workflows/${params.id}`}
            className="p-2 rounded-lg hover:bg-surface transition-colors text-muted hover:text-text"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-text flex items-center gap-3">
            Run: {params.runId.substring(0, 8)}
            {run.status === 'running' && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
            )}
          </h1>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border uppercase tracking-wider ${getStatusBadgeClass(run.status)}`}>
          {run.status}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-4xl mx-auto pb-12">
          {/* Approval Banner */}
          {run.status === 'paused' && awaitingApprovalStep && (
            <div className="mb-8 rounded-xl bg-gradient-to-r from-primary/20 to-surface/50 border border-primary/30 p-6 flex items-center justify-between shadow-[0_0_30px_rgba(108,99,255,0.1)]">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-full">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text mb-1">Waiting for Approval</h2>
                  <p className="text-sm text-muted">A workflow step requires approval before continuing.</p>
                </div>
              </div>
              {canEdit && (
                <button 
                  onClick={() => approveStep({ variables: { stepRunId: awaitingApprovalStep.id } })}
                  disabled={approving}
                  className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {approving ? 'Approving...' : 'Approve & Continue'}
                </button>
              )}
            </div>
          )}

          {/* Timeline */}
          <div className="py-4 pl-2">
            {sortedStepRuns.map((stepRun: any) => (
              <StepRunCard 
                key={stepRun.id} 
                stepRun={stepRun} 
                canApprove={canEdit} 
              />
            ))}
            
            {sortedStepRuns.length === 0 && (
              <div className="text-center py-12 text-muted">
                No steps executed yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metadata Footer */}
      <footer className="flex-shrink-0 border-t border-surface bg-surface/30 backdrop-blur p-4 text-xs text-muted flex justify-between items-center z-20">
        <div className="flex gap-6">
          <span>Trigger: {run.trigger_type || 'Manual'}</span>
          <span>Started by: {run.started_by || 'System'}</span>
        </div>
        <div className="flex gap-6">
          <span>Started: {new Date(run.created_at).toLocaleString()}</span>
          {run.ended_at && <span>Ended: {new Date(run.ended_at).toLocaleString()}</span>}
        </div>
      </footer>
    </div>
  );
}
