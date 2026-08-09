import { NextResponse } from 'next/server';
import {
  getStepRunWithContext,
  getWorkflowWithSteps,
  updateStepRun,
  updateWorkflowRun,
} from '@/lib/graphql-admin';
import { extractUserId, verifyCanApprove } from '@/lib/permissions';
import { executeWorkflow } from '@/lib/workflow-executor';

// ---------------------------------------------------------------------------
// POST /api/actions/approve-step
// Hasura Action handler — called when an owner/editor approves an approval_gate
//
// Layer 2 enforcement: this handler checks the approver's role in CODE,
// not just DB permissions, because it's a mid-execution decision that must
// also resume the workflow run.
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { input, session_variables } = body;
    const { step_run_id } = input;
    const userId = extractUserId(session_variables);

    if (!userId) {
      return NextResponse.json(
        { message: 'Unauthorized: missing user session' },
        { status: 401 },
      );
    }

    // 1. Load the step_run (includes nested workflow_run + workflow + steps)
    const stepRun = await getStepRunWithContext(step_run_id);

    if (stepRun.status !== 'awaiting_approval') {
      return NextResponse.json(
        { message: `Step is not awaiting approval (current status: ${stepRun.status})` },
        { status: 400 },
      );
    }

    const workflowRun = (stepRun as any).workflow_run;
    if (!workflowRun) {
      return NextResponse.json({ message: 'Workflow run not found' }, { status: 404 });
    }

    // 2. Layer 2 — Verify approver is owner/editor in the CORRECT org
    //    (not just any org — must be the same org as the workflow)
    const { allowed, role } = await verifyCanApprove(userId, workflowRun.org_id);
    if (!allowed) {
      return NextResponse.json(
        {
          message:
            'Forbidden: only owners and editors can approve workflow steps. Viewers cannot approve.',
        },
        { status: 403 },
      );
    }

    // 3. Mark step as approved + completed
    await updateStepRun(step_run_id, {
      status: 'completed',
      approved_by: userId,
      approved_at: new Date().toISOString(),
      output: {
        approved: true,
        approved_by: userId,
        approved_at: new Date().toISOString(),
        approver_role: role,
      },
      completed_at: new Date().toISOString(),
    });

    // 4. Resume workflow run
    const resumedRun = await updateWorkflowRun(workflowRun.id, {
      status: 'running',
      context: workflowRun.context,
    });

    // 5. Load workflow steps and resume from next step
    const workflow = await getWorkflowWithSteps(workflowRun.workflow_id);
    const steps = workflow.workflow_steps ?? [];

    // Resume from step AFTER the approval gate
    const nextStepOrder = stepRun.step_order + 1;

    console.log(
      `[approve-step] User ${userId} (${role}) approved step ${step_run_id}. Resuming run ${workflowRun.id} from step_order ${nextStepOrder}`,
    );

    executeWorkflow(resumedRun, steps, nextStepOrder).catch((err) => {
      console.error(`[approve-step] Resume execution error for run ${workflowRun.id}:`, err);
    });

    return NextResponse.json({
      success: true,
      workflow_run_id: workflowRun.id,
      resumed_from_step_order: nextStepOrder,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[approve-step]', error);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
