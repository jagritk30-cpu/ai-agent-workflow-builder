# Technical Write-Up: AI Agent Workflow Builder

## Schema Design Reasoning

The schema follows a clear ownership chain: **organizations → org_members → workflows → steps/triggers → runs → step_runs**. Every data access path ultimately traces back to `org_members`, which is the trust boundary of the entire system.

### Key design decisions:

**`org_members` as the permission anchor**: Rather than storing org context in JWTs or separate permission tables, every Hasura row-level permission uses an `_exists` sub-query that joins through `org_members`. This means the database itself enforces the boundary — a query for `workflows` won't return Org B's rows even if the caller guesses a valid UUID, because the permission filter checks `org_members` and finds no matching row.

**Denormalized `org_id` on `workflow_runs`**: Runs store `org_id` directly (not just via `workflow_id → workflows.org_id`) for two reasons: (1) permission queries on runs don't need an extra join, and (2) if a workflow is deleted, the run history is still attributable to the correct org.

**`context` JSONB on `workflow_runs`**: Steps pass data to each other via a shared context object stored on the run. This avoids tight coupling between steps and lets the executor interpolate `{{context.key}}` in any step's config. The context is also the "state" that gets serialized when a run is paused at an approval gate and deserialized when it resumes.

**`step_runs` created upfront**: All step_run rows are inserted as `pending` when a run starts. This means subscribers immediately see the full expected timeline — no waiting for each step to start before it appears in the UI. The subscription fires once on creation and then as each status changes.

**`org_monthly_usage` view**: A PostgreSQL view rather than a computed field. It aggregates `COUNT` of runs this month and `AVG` of duration in one query, which Hasura can expose as a queryable type without application-layer processing.

---

## Two Permission Layers — How They're Enforced Differently

### Layer 1 — Hasura Row-Level Permissions (structural isolation)

Every table has per-role `select`, `insert`, `update`, `delete` permissions configured in the Hasura metadata YAML. Each permission filter uses an `_exists` sub-query:

```yaml
# workflows SELECT for 'editor' role
filter:
  _exists:
    _table: { name: org_members, schema: public }
    _where:
      _and:
        - user_id: { _eq: X-Hasura-User-Id }
        - org_id:  { _eq: $table.org_id }
```

This is enforced by Hasura at the query level — the generated SQL includes a `WHERE EXISTS (SELECT 1 FROM org_members WHERE ...)` clause. An Org B user cannot select, join, or aggregate Org A data regardless of how they construct their GraphQL query. **Even guessing a valid UUID returns 0 results**, because the WHERE clause eliminates the row.

For nested tables like `workflow_steps` (no direct `org_id` column), the permission traverses the relationship:
```yaml
filter:
  _exists:
    _table: { name: org_members, schema: public }
    _where:
      _and:
        - user_id: { _eq: X-Hasura-User-Id }
        - org_id:  { _eq: $table.workflow.org_id }
```

**What Layer 1 enforces**: Who can *read or write* what rows — purely structural, org-scoped isolation.

**What Layer 1 cannot enforce**: Runtime execution decisions. For example, "should this workflow run be allowed to use a `db_write` step?" is not a row-level question — it's a runtime decision based on the caller's role and the step types being used.

### Layer 2 — Action Handler Code (runtime enforcement)

The `triggerWorkflowRun` and `approveStep` Hasura Actions are backed by Next.js API routes. These handlers re-verify permissions in TypeScript code — not just trusting Hasura's session variables:

**`trigger-workflow-run/route.ts`** performs:
1. `verifyCanTrigger(userId, orgId)` — owner/editor can trigger, viewer cannot
2. Quota check: `org.quota_used >= org.quota_limit`
3. **Step-type gating**: If the workflow contains `db_write` or `notify` steps, or a `webhook` trigger, only `owner` role is allowed — not editor. This can't be a Hasura permission because it's a conditional check on the *configuration* of a related row, not a simple row-level filter.

**`approve-step/route.ts`** performs:
1. Confirms the step_run is actually `awaiting_approval` (not already approved)
2. `verifyCanApprove(userId, orgId)` — checks `org_members` directly via admin GraphQL
3. Verifies the approver belongs to **the same org as the workflow** (not just any org)
4. Only then marks the step as approved and resumes the run

The `verifyCanApprove` call uses the admin secret to query `org_members` directly — it cannot be spoofed by manipulating client-side headers.

**Why this separation matters**: Layer 1 prevents data leakage at rest. Layer 2 controls what actions can be performed at runtime. An attacker who has editor-level access to Org A still cannot:
- Trigger a workflow containing `db_write` steps (Layer 2 rejects it)
- Approve a paused run if they're a viewer (Layer 2 rejects it)
- Approve Org B's paused run even if they correctly guess the `step_run_id` (Layer 2 checks org membership)

---

## Approval Gate Pause/Resume Implementation

The `approval_gate` step type is the most architecturally interesting piece. Here's exactly how it works:

### Pause (during execution)

In `workflow-executor.ts`, the `executeWorkflow` function iterates through pending step_runs in order. When it reaches an `approval_gate` step:

```typescript
if (step.type === 'approval_gate') {
  // 1. Mark the step_run as awaiting approval
  await updateStepRun(stepRun.id, { status: 'awaiting_approval', input: context });
  
  // 2. Mark the workflow_run as paused (subscribers see this immediately)
  await updateWorkflowRun(run.id, { status: 'paused', context });
  
  // 3. Return 'paused' — execution loop ends here
  return 'paused';
}
```

The `context` object (containing all previous step outputs) is persisted on the `workflow_run` row. The execution function then returns — the Node.js process moves on, holding no state in memory for this run.

The GraphQL subscription on `step_runs` immediately reflects the `awaiting_approval` status, and the subscription on `workflow_runs` shows `paused`. The frontend renders the approval banner.

### Resume (after approval)

When an approver clicks Approve, the `approveStep` Action handler:

```typescript
// 1. Layer 2 permission check in code
const { allowed, role } = await verifyCanApprove(userId, workflowRun.org_id);
if (!allowed) return 403;

// 2. Mark the step as completed with approval metadata
await updateStepRun(step_run_id, {
  status: 'completed',
  approved_by: userId,
  approved_at: new Date().toISOString(),
});

// 3. Resume the run
await updateWorkflowRun(workflowRun.id, { status: 'running' });

// 4. Re-call executeWorkflow from the NEXT step order
executeWorkflow(resumedRun, steps, stepRun.step_order + 1);
```

The `executeWorkflow` call queries `step_runs` where `status = 'pending' AND step_order >= nextStepOrder`. Since the approval_gate step_run was just marked `completed`, it's excluded. The remaining pending steps pick up with the persisted context from the `workflow_run.context` field.

This design means the pause/resume is **stateless from the server's perspective** — no in-memory state, no queues, no external state store. Everything is in PostgreSQL. If the server restarts between pause and resume, the resume still works correctly.

---

## Retry and Failure Handling

Each step is attempted up to 3 times with exponential backoff (1s, 2s delays between attempts). The `attempt_count` is updated live on the step_run row so subscribers can see retry progress. After 3 failures, the step_run and workflow_run are marked `failed` with the error message from the last attempt.

The LLM client (`llm.ts`) also has its own 2-retry logic specifically for API-level failures (rate limits, transient errors), separate from the executor's retry logic.

---

## Quota Enforcement

Quota is incremented at the end of a successful run in `executeWorkflow`. The check happens at trigger time (before the run is created) so a quota-exceeded org never starts a run it can't complete. This is enforced in the Action handler code, not in Hasura permissions, because it requires reading `organizations.quota_used` and comparing it to `quota_limit` — a runtime decision that can't be expressed as a row-level filter.
