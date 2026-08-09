import { NextResponse } from 'next/server';
import {
  createManyStepRuns,
  getOrganization,
  getWorkflowWithSteps,
  createWorkflowRun,
} from '@/lib/graphql-admin';
import {
  extractUserId,
  hasRestrictedStepTypes,
  hasRestrictedTriggerTypes,
  verifyCanTrigger,
  verifyIsOwner,
} from '@/lib/permissions';
import {
  executeWorkflow,
} from '@/lib/workflow-executor';

// ---------------------------------------------------------------------------
// POST /api/actions/trigger-workflow-run
// Hasura Action handler — called when user clicks "Run Workflow"
// Body: { input: { workflow_id }, session_variables: { x-hasura-user-id, x-hasura-role } }
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { input, session_variables } = body;
    const { workflow_id } = input;
    const userId = extractUserId(session_variables);

    if (!userId) {
      return NextResponse.json(
        { message: 'Unauthorized: missing user session' },
        { status: 401 },
      );
    }

    // 1. Load workflow + steps
    const workflow = await getWorkflowWithSteps(workflow_id);

    // 2. Layer 1 — Verify caller is in the workflow's org with owner/editor role
    const { allowed, role } = await verifyCanTrigger(userId, workflow.org_id);
    if (!allowed) {
      return NextResponse.json(
        { message: 'Forbidden: you must be an owner or editor in this organization' },
        { status: 403 },
      );
    }

    // 3. Quota check
    const org = await getOrganization(workflow.org_id);
    if (org.quota_used >= org.quota_limit) {
      return NextResponse.json(
        { message: `Quota exceeded: ${org.quota_used}/${org.quota_limit} calls used this period` },
        { status: 429 },
      );
    }

    // 4. Layer 2 — Step-type gating: db_write and notify require owner role
    const steps = workflow.workflow_steps ?? [];
    const triggers = (workflow as any).workflow_triggers ?? [];

    if (hasRestrictedStepTypes(steps) || hasRestrictedTriggerTypes(triggers)) {
      const isOwner = await verifyIsOwner(userId, workflow.org_id);
      if (!isOwner) {
        return NextResponse.json(
          {
            message:
              'Forbidden: db_write, notify steps, and webhook triggers require owner role',
          },
          { status: 403 },
        );
      }
    }

    // 5. Create the workflow_run record
    const workflowRun = await createWorkflowRun({
      workflow_id,
      org_id: workflow.org_id,
      triggered_by: userId,
      trigger_type: 'manual',
      status: 'running',
      started_at: new Date().toISOString(),
      context: {},
    });

    // 6. Create all step_run records upfront (subscribers see them immediately as 'pending')
    if (steps.length > 0) {
      await createManyStepRuns(
        steps.map((step) => ({
          workflow_run_id: workflowRun.id,
          workflow_step_id: step.id,
          step_order: step.step_order,
          status: 'pending' as const,
          attempt_count: 0,
        })),
      );
    }

    // 7. Execute workflow asynchronously — response returns immediately,
    //    subscriptions show live step-by-step progress
    executeWorkflow(workflowRun, steps, 0).catch((err) => {
      console.error(`[trigger-workflow-run] Execution error for run ${workflowRun.id}:`, err);
    });

    return NextResponse.json({
      workflow_run_id: workflowRun.id,
      status: 'running',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[trigger-workflow-run]', error);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
