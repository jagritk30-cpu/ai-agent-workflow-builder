import { NextResponse } from 'next/server';
import {
  createManyStepRuns,
  getOrganization,
  getWorkflowTriggers,
  getWorkflowWithSteps,
  createWorkflowRun,
} from '@/lib/graphql-admin';
import { executeWorkflow } from '@/lib/workflow-executor';

// ---------------------------------------------------------------------------
// POST /api/actions/webhook-trigger
// Hasura Action handler — inbound webhook for external systems
// No user auth header — validated by token stored in workflow_triggers config
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Support both direct call and Hasura Action format
    const input = body.input || body;
    const { workflow_id, token, payload } = input;

    if (!workflow_id || !token) {
      return NextResponse.json(
        { message: 'Missing required fields: workflow_id, token' },
        { status: 400 },
      );
    }

    // 1. Find the webhook trigger and validate token
    const triggers = await getWorkflowTriggers(workflow_id);
    const webhookTrigger = triggers.find(
      (t) =>
        t.trigger_type === 'webhook' &&
        t.config?.token === token &&
        t.is_active,
    );

    if (!webhookTrigger) {
      return NextResponse.json(
        { message: 'Unauthorized: invalid or inactive webhook token' },
        { status: 401 },
      );
    }

    // 2. Load workflow and check quota
    const workflow = await getWorkflowWithSteps(workflow_id);
    const org = await getOrganization(workflow.org_id);

    if (org.quota_used >= org.quota_limit) {
      return NextResponse.json(
        { message: `Quota exceeded: ${org.quota_used}/${org.quota_limit}` },
        { status: 429 },
      );
    }

    // 3. Create run with webhook context
    const workflowRun = await createWorkflowRun({
      workflow_id,
      org_id: workflow.org_id,
      triggered_by: undefined, // webhook — no user
      trigger_type: 'webhook',
      status: 'running',
      started_at: new Date().toISOString(),
      context: { webhookPayload: payload || {}, trigger_id: webhookTrigger.id },
    });

    // 4. Create step_runs
    const steps = workflow.workflow_steps ?? [];
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

    // 5. Execute asynchronously
    executeWorkflow(workflowRun, steps, 0).catch((err) => {
      console.error(`[webhook-trigger] Execution error for run ${workflowRun.id}:`, err);
    });

    return NextResponse.json({
      workflow_run_id: workflowRun.id,
      status: 'running',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[webhook-trigger]', error);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
