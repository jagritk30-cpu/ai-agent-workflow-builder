# AI Agent Workflow Builder: Architectural Write-up

This document outlines the core architectural decisions, data model reasoning, and security enforcement mechanisms that power the AI Agent Workflow Builder.

## 1. Schema Reasoning & Design

The database schema was designed with a strict hierarchical model to ensure multi-tenant isolation and a scalable execution trace for workflows.

- **Organizations & Membership (`organizations`, `org_members`):** The foundational layer. Every user belongs to one or more organizations with a specific `role` (`owner`, `editor`, `viewer`). This enables multi-tenancy.
- **Workflow Definitions (`workflows`, `workflow_steps`, `workflow_triggers`):** A workflow is essentially a template. It belongs to an organization, not a specific user, ensuring that organizational assets remain intact even if the creator leaves. Steps are ordered via a `step_order` integer and store flexible configuration in a `config` JSONB column to support diverse node types (`llm_call`, `http_request`, `conditional_branch`, etc.).
- **Execution State (`workflow_runs`, `step_runs`, `workflow_results`):** When a workflow triggers, we immediately instantiate a `workflow_run` and pre-generate `step_runs` for every step in the workflow in a `pending` state. This approach ensures that:
  1. The entire execution path is visible immediately, even before steps execute.
  2. The frontend can subscribe to the `step_runs` table via GraphQL to render real-time progress without complex polling.
  3. We have an immutable audit log of exactly what inputs, outputs, and errors occurred at every stage of the execution.

## 2. Enforcing Two Layers of Permissions

A core requirement was to implement robust, two-layered security to prevent data leakage and privilege escalation.

### Layer 1: Org + Role Scoping (Hasura RLS)
The first layer ensures that users can only interact with data belonging to their organization. This is enforced entirely at the database level using Hasura's Row-Level Security (RLS) rules.
- **Implementation:** Every `select`, `insert`, `update`, and `delete` operation on core tables (e.g., `workflows`) contains a Hasura permission filter. Instead of just checking `role: owner`, the filter traverses to `org_members` using an `_exists` constraint to verify that `X-Hasura-User-Id` matches a member in the same `org_id` as the workflow, *and* that the member has the required role.
- **Result:** An editor in Org A cannot query, guess the ID of, or modify workflows in Org B. The GraphQL API will simply return `null` or an empty array, rendering cross-org ID guessing impossible.

### Layer 2: Step-Level Gating & Mid-Execution Decisions
While Layer 1 controls access to records, Layer 2 restricts the *types* of actions users can perform, especially those reaching outside the sandbox.
- **DB-Level Restrictions:** In the Hasura metadata for `workflow_steps`, the `insert` and `update` permissions for the `editor` role explicitly exclude sensitive step types using a column constraint (`type: { _nin: ['db_write', 'notify'] }`). Webhook triggers are similarly restricted.
- **Code-Level Enforcement (Action Handlers):** When an `approval_gate` pauses a workflow, the decision to resume it cannot be easily modeled as a database row update permission because it involves evaluating organizational context and triggering a side-effect (resuming the execution engine). Therefore, the `approveStep` Hasura Action routes to a Next.js API handler (`/api/actions/approve-step`) which explicitly verifies the caller's role (`owner` or `editor`) against the workflow's specific `org_id` before allowing the step to complete.

## 3. The Approval-Gate Pause/Resume Mechanism

Implementing an asynchronous pause/resume flow within a sequential execution engine required decoupling the runner from the API request.

1. **Pausing:** When the execution engine (`executeWorkflow`) encounters an `approval_gate` step type, it immediately updates the `step_run` status to `awaiting_approval`, updates the overarching `workflow_run` status to `paused`, and **terminates the execution loop by returning**. The Node.js process does not hang or sleep; it gracefully exits, saving the exact state and `context` JSONB to the database.
2. **Subscribing:** The React frontend, listening via a Hasura GraphQL Subscription, immediately detects the `awaiting_approval` status and renders an "Approve" button to users with `owner` or `editor` roles.
3. **Resuming:** When an authorized user clicks Approve, the frontend triggers the `approveStep` GraphQL Mutation (backed by a custom Hasura Action). 
4. **Rehydration:** The Action handler verifies permissions, marks the step as `completed` (recording the approver's ID and timestamp), sets the run status back to `running`, and re-invokes the `executeWorkflow` function, passing in the preserved context and instructing it to resume iteration starting from `step_order + 1`.
