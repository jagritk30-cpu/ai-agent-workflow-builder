import React, { useState } from 'react';
import { 
  Clock, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  ChevronRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useMutation } from '@apollo/client';
import { APPROVE_STEP } from '@/graphql/mutations';

export interface StepRunCardProps {
  stepRun: any;
  canApprove: boolean;
}

export function StepRunCard({ stepRun, canApprove }: StepRunCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [approveStep, { loading: approving }] = useMutation(APPROVE_STEP);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5 text-muted" />;
      case 'running': return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'failed': return <XCircle className="w-5 h-5 text-error" />;
      case 'awaiting_approval': return <Lock className="w-5 h-5 text-primary animate-pulse" />;
      case 'skipped': return <ChevronRight className="w-5 h-5 text-muted" />;
      default: return <Clock className="w-5 h-5 text-muted" />;
    }
  };

  const getStatusBorder = (status: string) => {
    switch (status) {
      case 'running': return 'border-primary shadow-[0_0_10px_rgba(108,99,255,0.2)]';
      case 'failed': return 'border-error';
      case 'awaiting_approval': return 'border-primary border-dashed';
      case 'completed': return 'border-surface';
      default: return 'border-surface opacity-60';
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--:--';
    return new Date(isoString).toLocaleTimeString();
  };
  
  const getDuration = () => {
    if (!stepRun.started_at || !stepRun.ended_at) return null;
    const start = new Date(stepRun.started_at).getTime();
    const end = new Date(stepRun.ended_at).getTime();
    return `${((end - start) / 1000).toFixed(1)}s`;
  };

  const handleApprove = async () => {
    try {
      await approveStep({ variables: { stepRunId: stepRun.id } });
    } catch (err) {
      console.error("Failed to approve step:", err);
    }
  };

  return (
    <div className="flex gap-4 relative">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-surface border-2 ${getStatusBorder(stepRun.status)} z-10`}>
          {getStatusIcon(stepRun.status)}
        </div>
        <div className="w-0.5 flex-1 bg-surface my-2 min-h-[20px]" />
      </div>

      <div className={`flex-1 bg-surface/50 border ${getStatusBorder(stepRun.status)} rounded-xl p-4 mb-4 backdrop-blur-sm transition-all duration-300 hover:bg-surface`}>
        <div className="flex justify-between items-start cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-text">{stepRun.workflow_step?.name || `Step ${stepRun.step_order}`}</h3>
              {stepRun.workflow_step?.type && (
                <span className="text-xs px-2 py-0.5 rounded bg-surface border border-surface text-muted">
                  {stepRun.workflow_step.type}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted">
              <span>{formatTime(stepRun.started_at)}</span>
              {getDuration() && <span>Duration: {getDuration()}</span>}
              {stepRun.attempt_count > 1 && (
                <span className="text-warning">Retry {stepRun.attempt_count}</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {stepRun.status === 'awaiting_approval' && canApprove && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleApprove(); }}
                disabled={approving}
                className="btn btn-primary text-xs py-1 px-3 h-auto"
              >
                {approving ? 'Approving...' : 'Approve'}
              </button>
            )}
            {expanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-surface/50 text-sm">
            {stepRun.error_message && (
              <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-md text-error break-words">
                <span className="font-semibold block mb-1">Error:</span>
                {stepRun.error_message}
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              <span className="font-medium text-muted text-xs uppercase tracking-wider">Output</span>
              <pre className="bg-[#0a0a0f] p-3 rounded-md overflow-x-auto text-xs text-text/80 font-mono border border-surface/50">
                {stepRun.output_data 
                  ? JSON.stringify(stepRun.output_data, null, 2) 
                  : <span className="text-muted italic">No output data</span>
                }
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
