import { gql } from '@apollo/client';

// ---------------------------------------------------------------------------
// Workflows
// ---------------------------------------------------------------------------
export const GET_ORG_WORKFLOWS = gql`
  query GetOrgWorkflows($org_id: uuid!) {
    workflows(
      where: { org_id: { _eq: $org_id } }
      order_by: { created_at: desc }
    ) {
      id
      name
      description
      is_active
      created_at
      updated_at
      workflow_steps(order_by: { step_order: asc }) {
        id
        name
        type
        step_order
        config
      }
      workflow_triggers {
        id
        trigger_type
        config
        is_active
      }
      workflow_runs(order_by: { started_at: desc }, limit: 1) {
        id
        status
        started_at
        completed_at
        trigger_type
      }
    }
  }
`;

export const GET_WORKFLOW_DETAIL = gql`
  query GetWorkflowDetail($id: uuid!) {
    workflows_by_pk(id: $id) {
      id
      org_id
      name
      description
      is_active
      created_at
      updated_at
      created_by
      workflow_steps(order_by: { step_order: asc }) {
        id
        name
        type
        step_order
        config
        created_at
      }
      workflow_triggers {
        id
        trigger_type
        config
        is_active
        created_at
      }
      workflow_runs(order_by: { started_at: desc }, limit: 5) {
        id
        status
        started_at
        completed_at
        trigger_type
        triggered_by
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Workflow runs
// ---------------------------------------------------------------------------
export const GET_WORKFLOW_RUN = gql`
  query GetWorkflowRun($id: uuid!) {
    workflow_runs_by_pk(id: $id) {
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
      workflows {
        id
        name
        org_id
      }
      step_runs(order_by: { step_order: asc }) {
        id
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
  }
`;

export const GET_RECENT_RUNS = gql`
  query GetRecentRuns($org_id: uuid!, $limit: Int!) {
    workflow_runs(
      where: { org_id: { _eq: $org_id } }
      order_by: { started_at: desc }
      limit: $limit
    ) {
      id
      workflow_id
      status
      started_at
      completed_at
      trigger_type
      error
      workflows {
        id
        name
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Org members
// ---------------------------------------------------------------------------
export const GET_ORG_MEMBERS = gql`
  query GetOrgMembers($org_id: uuid!) {
    org_members(
      where: { org_id: { _eq: $org_id } }
      order_by: { created_at: asc }
    ) {
      id
      org_id
      user_id
      role
      created_at
    }
  }
`;

export const GET_MY_ORG_MEMBERSHIP = gql`
  query GetMyOrgMembership($user_id: uuid!) {
    org_members(
      where: { user_id: { _eq: $user_id } }
      order_by: { created_at: asc }
      limit: 1
    ) {
      id
      org_id
      user_id
      role
      organizations {
        id
        name
        slug
        quota_limit
        quota_used
        quota_reset_at
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Usage / quota (from aggregation view)
// ---------------------------------------------------------------------------
export const GET_ORG_USAGE = gql`
  query GetOrgUsage($org_id: uuid!) {
    org_monthly_usage(where: { org_id: { _eq: $org_id } }) {
      org_id
      name
      quota_limit
      quota_used
      runs_this_month
      avg_run_duration_seconds
      quota_percent_used
    }
  }
`;
