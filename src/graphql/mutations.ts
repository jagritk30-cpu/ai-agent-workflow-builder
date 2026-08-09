import { gql } from '@apollo/client';

export const CREATE_WORKFLOW = gql`
  mutation CreateWorkflow($org_id: uuid!, $name: String!, $description: String, $created_by: uuid!) {
    insert_workflows_one(object: {org_id: $org_id, name: $name, description: $description, created_by: $created_by}) {
      id name description org_id is_active created_at
    }
  }
`;

export const UPDATE_WORKFLOW = gql`
  mutation UpdateWorkflow($id: uuid!, $name: String!, $description: String) {
    update_workflows_by_pk(pk_columns: {id: $id}, _set: {name: $name, description: $description, updated_at: "now()"}) {
      id name description updated_at
    }
  }
`;

export const DELETE_WORKFLOW = gql`
  mutation DeleteWorkflow($id: uuid!) {
    delete_workflows_by_pk(id: $id) { id }
  }
`;

export const CREATE_WORKFLOW_STEP = gql`
  mutation CreateWorkflowStep($workflow_id: uuid!, $name: String!, $type: String!, $config: jsonb!, $step_order: Int!) {
    insert_workflow_steps_one(object: {workflow_id: $workflow_id, name: $name, type: $type, config: $config, step_order: $step_order}) {
      id workflow_id name type config step_order
    }
  }
`;

export const UPDATE_WORKFLOW_STEP = gql`
  mutation UpdateWorkflowStep($id: uuid!, $name: String, $config: jsonb, $step_order: Int) {
    update_workflow_steps_by_pk(pk_columns: {id: $id}, _set: {name: $name, config: $config, step_order: $step_order, updated_at: "now()"}) {
      id name config step_order
    }
  }
`;

export const DELETE_WORKFLOW_STEP = gql`
  mutation DeleteWorkflowStep($id: uuid!) {
    delete_workflow_steps_by_pk(id: $id) { id }
  }
`;

export const CREATE_WORKFLOW_TRIGGER = gql`
  mutation CreateWorkflowTrigger($workflow_id: uuid!, $trigger_type: String!, $config: jsonb!) {
    insert_workflow_triggers_one(object: {workflow_id: $workflow_id, trigger_type: $trigger_type, config: $config}) {
      id workflow_id trigger_type config is_active
    }
  }
`;

export const UPDATE_WORKFLOW_TRIGGER = gql`
  mutation UpdateWorkflowTrigger($id: uuid!, $config: jsonb, $is_active: Boolean) {
    update_workflow_triggers_by_pk(pk_columns: {id: $id}, _set: {config: $config, is_active: $is_active}) {
      id config is_active
    }
  }
`;

export const DELETE_WORKFLOW_TRIGGER = gql`
  mutation DeleteWorkflowTrigger($id: uuid!) {
    delete_workflow_triggers_by_pk(id: $id) { id }
  }
`;

export const TRIGGER_WORKFLOW_RUN = gql`
  mutation TriggerWorkflowRun($workflow_id: uuid!) {
    triggerWorkflowRun(workflow_id: $workflow_id) {
      workflow_run_id
      status
    }
  }
`;

export const APPROVE_STEP = gql`
  mutation ApproveStep($step_run_id: uuid!) {
    approveStep(step_run_id: $step_run_id) {
      success
      workflow_run_id
      resumed_from_step_order
    }
  }
`;

export const ADD_ORG_MEMBER = gql`
  mutation AddOrgMember($org_id: uuid!, $user_id: uuid!, $role: String!) {
    insert_org_members_one(object: {org_id: $org_id, user_id: $user_id, role: $role}) {
      id org_id user_id role
    }
  }
`;

export const UPDATE_ORG_MEMBER_ROLE = gql`
  mutation UpdateOrgMemberRole($id: uuid!, $role: String!) {
    update_org_members_by_pk(pk_columns: {id: $id}, _set: {role: $role}) {
      id role
    }
  }
`;

export const REMOVE_ORG_MEMBER = gql`
  mutation RemoveOrgMember($id: uuid!) {
    delete_org_members_by_pk(id: $id) { id }
  }
`;

export const CREATE_ORG = gql`
  mutation CreateOrg($name: String!, $slug: String!) {
    insert_organizations_one(object: {name: $name, slug: $slug}) {
      id name slug quota_limit quota_used
    }
  }
`;
