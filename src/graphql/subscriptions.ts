import { gql } from '@apollo/client';

// ---------------------------------------------------------------------------
// Live subscription: all step_runs for a workflow run
// Used in the Live Run View — updates in real time as steps execute
// ---------------------------------------------------------------------------
export const STEP_RUNS_SUBSCRIPTION = gql`
  subscription StepRunsSubscription($run_id: uuid!) {
    step_runs(
      where: { workflow_run_id: { _eq: $run_id } }
      order_by: { step_order: asc }
    ) {
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
      workflow_step {
        id
        name
        type
        config
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Live subscription: overall workflow run status
// Tracks the top-level status: pending → running → paused → completed/failed
// ---------------------------------------------------------------------------
export const WORKFLOW_RUN_SUBSCRIPTION = gql`
  subscription WorkflowRunSubscription($run_id: uuid!) {
    workflow_runs_by_pk(id: $run_id) {
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
