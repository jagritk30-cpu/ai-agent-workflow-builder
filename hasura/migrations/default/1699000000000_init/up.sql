-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- organizations table
CREATE TABLE public.organizations (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  quota_limit integer NOT NULL DEFAULT 1000,
  quota_used integer NOT NULL DEFAULT 0,
  quota_reset_at timestamptz NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- org_members table
CREATE TABLE public.org_members (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- workflows table
CREATE TABLE public.workflows (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- workflow_steps table
CREATE TABLE public.workflow_steps (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('llm_call', 'http_request', 'db_write', 'notify', 'conditional_branch', 'approval_gate')),
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- workflow_triggers table
CREATE TABLE public.workflow_triggers (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  trigger_type text NOT NULL CHECK (trigger_type IN ('manual', 'webhook', 'scheduled', 'db_event')),
  config jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- workflow_runs table
CREATE TABLE public.workflow_runs (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  triggered_by uuid,
  trigger_type text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error text,
  context jsonb NOT NULL DEFAULT '{}'
);

-- step_runs table
CREATE TABLE public.step_runs (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  workflow_run_id uuid NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  workflow_step_id uuid NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'awaiting_approval')),
  input jsonb,
  output jsonb,
  error text,
  attempt_count integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  approved_by uuid,
  approved_at timestamptz
);

-- workflow_results table (for db_write steps)
CREATE TABLE public.workflow_results (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  workflow_run_id uuid NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  step_run_id uuid NOT NULL REFERENCES public.step_runs(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Aggregation view: org usage
CREATE VIEW public.org_monthly_usage AS
SELECT
  o.id AS org_id,
  o.name,
  o.quota_limit,
  o.quota_used,
  COUNT(wr.id) FILTER (WHERE wr.started_at >= date_trunc('month', now())) AS runs_this_month,
  ROUND(
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (wr.completed_at - wr.started_at)))
      FILTER (WHERE wr.completed_at IS NOT NULL AND wr.started_at >= date_trunc('month', now())),
      0
    )::numeric, 2
  ) AS avg_run_duration_seconds
FROM public.organizations o
LEFT JOIN public.workflow_runs wr ON wr.org_id = o.id
GROUP BY o.id, o.name, o.quota_limit, o.quota_used;

-- Indexes for performance
CREATE INDEX idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX idx_org_members_org_id ON public.org_members(org_id);
CREATE INDEX idx_workflows_org_id ON public.workflows(org_id);
CREATE INDEX idx_workflow_steps_workflow_id ON public.workflow_steps(workflow_id);
CREATE INDEX idx_workflow_runs_workflow_id ON public.workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_org_id ON public.workflow_runs(org_id);
CREATE INDEX idx_step_runs_workflow_run_id ON public.step_runs(workflow_run_id);
CREATE INDEX idx_step_runs_workflow_step_id ON public.step_runs(workflow_step_id);
