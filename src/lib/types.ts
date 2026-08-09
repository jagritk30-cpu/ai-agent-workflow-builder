export type StepType = 'llm_call' | 'http_request' | 'db_write' | 'notify' | 'conditional_branch' | 'approval_gate';
export type TriggerType = 'manual' | 'webhook' | 'scheduled' | 'db_event';
export type RunStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'awaiting_approval';
export type OrgRole = 'owner' | 'editor' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  quota_limit: number;
  quota_used: number;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
}

export interface Workflow {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_order: number;
  name: string;
  type: StepType;
  config: Record<string, any>;
}

export interface WorkflowTrigger {
  id: string;
  workflow_id: string;
  trigger_type: TriggerType;
  config: Record<string, any>;
  is_active: boolean;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  org_id: string;
  triggered_by?: string;
  trigger_type: string;
  status: RunStatus;
  started_at: string;
  completed_at?: string;
  error?: string;
  context: Record<string, any>;
}

export interface StepRun {
  id: string;
  workflow_run_id: string;
  workflow_step_id: string;
  step_order: number;
  status: StepStatus;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  attempt_count: number;
  workflow_run?: WorkflowRun;
}
