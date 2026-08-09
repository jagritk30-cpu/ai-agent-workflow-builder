import {
  Organization,
  OrgMember,
  StepRun,
  Workflow,
  WorkflowRun,
  WorkflowStep,
  WorkflowTrigger,
} from './types';

const HASURA_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT || '';
const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET || '';

// ---------------------------------------------------------------------------
// Core fetch helper — uses admin secret, never exposes to client
// ---------------------------------------------------------------------------
async function fetchGraphQL<T = any>(
  query: string,
  variables?: Record<string, any>,
  operationName?: string,
): Promise<T> {
  if (!HASURA_ENDPOINT) throw new Error('HASURA_GRAPHQL_ENDPOINT is not set');

  const response = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hasura-Admin-Secret': ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables, operationName }),
  });

  if (!response.ok) {
    throw new Error(`Hasura HTTP error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (result.errors?.length) {
    console.error('[graphql-admin] GraphQL errors:', JSON.stringify(result.errors, null, 2));
    throw new Error(result.errors[0].message);
  }

  return result.data as T;
}

// ---------------------------------------------------------------------------
// Workflows
// ---------------------------------------------------------------------------
export async function getWorkflowWithSteps(workflowId: string): Promise<
  Workflow & { workflow_steps: WorkflowStep[]; org_id: string }
> {
  const query = `
    query GetWorkflow($id: uuid!) {
      workflows_by_pk(id: $id) {
        id
        org_id
        name
        description
        is_active
        created_by
        workflow_steps(order_by: { step_order: asc }) {
          id
          workflow_id
          step_order
          name
          type
          config
        }
        workflow_triggers(where: { is_active: { _eq: true } }) {
          id
          trigger_type
          config
          is_active
        }
      }
    }
  `;
  const data = await fetchGraphQL(query, { id: workflowId });
  if (!data.workflows_by_pk) throw new Error(`Workflow not found: ${workflowId}`);
  return data.workflows_by_pk;
}

// ---------------------------------------------------------------------------
// Org members / permissions
// ---------------------------------------------------------------------------
export async function getMemberRole(
  userId: string,
  orgId: string,
): Promise<OrgMember | null> {
  const query = `
    query GetMemberRole($user_id: uuid!, $org_id: uuid!) {
      org_members(
        where: { user_id: { _eq: $user_id }, org_id: { _eq: $org_id } }
        limit: 1
      ) {
        id
        org_id
        user_id
        role
      }
    }
  `;
  const data = await fetchGraphQL(query, { user_id: userId, org_id: orgId });
  return (data.org_members?.[0] as OrgMember) ?? null;
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------
export async function getOrganization(orgId: string): Promise<Organization> {
  const query = `
    query GetOrganization($id: uuid!) {
      organizations_by_pk(id: $id) {
        id
        name
        slug
        quota_limit
        quota_used
        quota_reset_at
      }
    }
  `;
  const data = await fetchGraphQL(query, { id: orgId });
  if (!data.organizations_by_pk) throw new Error(`Organization not found: ${orgId}`);
  return data.organizations_by_pk as Organization;
}

// ---------------------------------------------------------------------------
// Workflow runs
// ---------------------------------------------------------------------------
export async function createWorkflowRun(
  input: Partial<WorkflowRun>,
): Promise<WorkflowRun> {
  const query = `
    mutation CreateWorkflowRun($object: workflow_runs_insert_input!) {
      insert_workflow_runs_one(object: $object) {
        id
        workflow_id
        org_id
        triggered_by
        trigger_type
        status
        started_at
        completed_at
        error
        context
      }
    }
  `;
  const data = await fetchGraphQL(query, { object: input });
  return data.insert_workflow_runs_one as WorkflowRun;
}

export async function updateWorkflowRun(
  id: string,
  updateData: Partial<WorkflowRun>,
): Promise<WorkflowRun> {
  const query = `
    mutation UpdateWorkflowRun($id: uuid!, $set: workflow_runs_set_input!) {
      update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: $set) {
        id
        workflow_id
        org_id
        triggered_by
        trigger_type
        status
        started_at
        completed_at
        error
        context
      }
    }
  `;
  const data = await fetchGraphQL(query, { id, set: updateData });
  return data.update_workflow_runs_by_pk as WorkflowRun;
}

// ---------------------------------------------------------------------------
// Step runs
// ---------------------------------------------------------------------------
export async function createStepRun(input: Partial<StepRun>): Promise<StepRun> {
  const query = `
    mutation CreateStepRun($object: step_runs_insert_input!) {
      insert_step_runs_one(object: $object) {
        id
        workflow_run_id
        workflow_step_id
        step_order
        status
        input
        output
        error
        attempt_count
        started_at
        completed_at
        approved_by
        approved_at
      }
    }
  `;
  const data = await fetchGraphQL(query, { object: input });
  return data.insert_step_runs_one as StepRun;
}

export async function createManyStepRuns(
  inputs: Partial<StepRun>[],
): Promise<StepRun[]> {
  const query = `
    mutation CreateManyStepRuns($objects: [step_runs_insert_input!]!) {
      insert_step_runs(objects: $objects) {
        returning {
          id
          workflow_run_id
          workflow_step_id
          step_order
          status
          attempt_count
        }
      }
    }
  `;
  const data = await fetchGraphQL(query, { objects: inputs });
  return data.insert_step_runs.returning as StepRun[];
}

export async function updateStepRun(
  id: string,
  updateData: Partial<StepRun>,
): Promise<StepRun> {
  const query = `
    mutation UpdateStepRun($id: uuid!, $set: step_runs_set_input!) {
      update_step_runs_by_pk(pk_columns: { id: $id }, _set: $set) {
        id
        workflow_run_id
        workflow_step_id
        step_order
        status
        input
        output
        error
        attempt_count
        started_at
        completed_at
        approved_by
        approved_at
      }
    }
  `;
  const data = await fetchGraphQL(query, { id, set: updateData });
  return data.update_step_runs_by_pk as StepRun;
}

export async function getStepRunWithContext(stepRunId: string): Promise<
  StepRun & {
    workflow_run: WorkflowRun & {
      workflows: Workflow & { workflow_steps: WorkflowStep[] };
    };
  }
> {
  const query = `
    query GetStepRunWithContext($id: uuid!) {
      step_runs_by_pk(id: $id) {
        id
        workflow_run_id
        workflow_step_id
        step_order
        status
        input
        output
        error
        attempt_count
        workflow_run {
          id
          workflow_id
          org_id
          triggered_by
          trigger_type
          status
          context
          workflows {
            id
            org_id
            name
            workflow_steps(order_by: { step_order: asc }) {
              id
              workflow_id
              step_order
              name
              type
              config
            }
          }
        }
      }
    }
  `;
  const data = await fetchGraphQL(query, { id: stepRunId });
  if (!data.step_runs_by_pk) throw new Error(`Step run not found: ${stepRunId}`);
  return data.step_runs_by_pk;
}

export async function getPendingStepRuns(
  runId: string,
  fromOrder: number,
): Promise<(StepRun & { workflow_step: WorkflowStep })[]> {
  const query = `
    query GetPendingStepRuns($run_id: uuid!, $from_order: Int!) {
      step_runs(
        where: {
          workflow_run_id: { _eq: $run_id }
          step_order: { _gte: $from_order }
          status: { _eq: "pending" }
        }
        order_by: { step_order: asc }
      ) {
        id
        workflow_run_id
        workflow_step_id
        step_order
        status
        attempt_count
        workflow_step {
          id
          name
          type
          config
          step_order
        }
      }
    }
  `;
  const data = await fetchGraphQL(query, { run_id: runId, from_order: fromOrder });
  return data.step_runs;
}

// ---------------------------------------------------------------------------
// Quota
// ---------------------------------------------------------------------------
export async function incrementOrgQuota(orgId: string): Promise<void> {
  const query = `
    mutation IncrementQuota($id: uuid!) {
      update_organizations_by_pk(pk_columns: { id: $id }, _inc: { quota_used: 1 }) {
        id
        quota_used
      }
    }
  `;
  await fetchGraphQL(query, { id: orgId });
}

// ---------------------------------------------------------------------------
// Workflow results (db_write step)
// ---------------------------------------------------------------------------
export async function saveWorkflowResult(inputData: {
  workflow_run_id: string;
  step_run_id: string;
  org_id: string;
  key?: string;
  data: Record<string, any>;
}): Promise<{ id: string }> {
  const query = `
    mutation SaveWorkflowResult($object: workflow_results_insert_input!) {
      insert_workflow_results_one(object: $object) {
        id
      }
    }
  `;
  const data = await fetchGraphQL(query, { object: inputData });
  return data.insert_workflow_results_one;
}

// ---------------------------------------------------------------------------
// Triggers
// ---------------------------------------------------------------------------
export async function getWorkflowTriggers(
  workflowId: string,
): Promise<WorkflowTrigger[]> {
  const query = `
    query GetWorkflowTriggers($workflow_id: uuid!) {
      workflow_triggers(
        where: { workflow_id: { _eq: $workflow_id }, is_active: { _eq: true } }
      ) {
        id
        workflow_id
        trigger_type
        config
        is_active
      }
    }
  `;
  const data = await fetchGraphQL(query, { workflow_id: workflowId });
  return data.workflow_triggers as WorkflowTrigger[];
}

export async function getScheduledTriggers(): Promise<WorkflowTrigger[]> {
  const query = `
    query GetScheduledTriggers {
      workflow_triggers(
        where: { trigger_type: { _eq: "scheduled" }, is_active: { _eq: true } }
      ) {
        id
        workflow_id
        trigger_type
        config
        is_active
      }
    }
  `;
  const data = await fetchGraphQL(query, {});
  return data.workflow_triggers as WorkflowTrigger[];
}

export async function updateTriggerConfig(
  id: string,
  config: Record<string, any>,
): Promise<void> {
  const query = `
    mutation UpdateTriggerConfig($id: uuid!, $config: jsonb!) {
      update_workflow_triggers_by_pk(pk_columns: { id: $id }, _set: { config: $config }) {
        id
      }
    }
  `;
  await fetchGraphQL(query, { id, config });
}
