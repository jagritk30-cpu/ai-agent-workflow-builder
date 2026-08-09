DROP INDEX IF EXISTS idx_step_runs_workflow_step_id;
DROP INDEX IF EXISTS idx_step_runs_workflow_run_id;
DROP INDEX IF EXISTS idx_workflow_runs_org_id;
DROP INDEX IF EXISTS idx_workflow_runs_workflow_id;
DROP INDEX IF EXISTS idx_workflow_steps_workflow_id;
DROP INDEX IF EXISTS idx_workflows_org_id;
DROP INDEX IF EXISTS idx_org_members_org_id;
DROP INDEX IF EXISTS idx_org_members_user_id;

DROP VIEW IF EXISTS public.org_monthly_usage;

DROP TABLE IF EXISTS public.workflow_results;
DROP TABLE IF EXISTS public.step_runs;
DROP TABLE IF EXISTS public.workflow_runs;
DROP TABLE IF EXISTS public.workflow_triggers;
DROP TABLE IF EXISTS public.workflow_steps;
DROP TABLE IF EXISTS public.workflows;
DROP TABLE IF EXISTS public.org_members;
DROP TABLE IF EXISTS public.organizations;

DROP EXTENSION IF EXISTS "uuid-ossp";
