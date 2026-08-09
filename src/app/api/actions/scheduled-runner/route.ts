import { NextResponse } from 'next/server';
import { 
  getScheduledTriggers, 
  getWorkflowWithSteps, 
  getOrganization,
  createWorkflowRun,
  createStepRun,
  incrementOrgQuota,
  updateTriggerConfig
} from '@/lib/graphql-admin';
import { executeWorkflow } from '@/lib/workflow-executor';
import cronParser from 'cron-parser';

export async function POST(req: Request) {
  try {
    const triggers = await getScheduledTriggers();
    let triggeredCount = 0;
    const now = new Date();

    for (const trigger of triggers) {
      const config = trigger.config;
      const cronExpr = config.cron; // e.g. "*/5 * * * *"
      
      if (!cronExpr) continue;

      let shouldRun = false;
      const lastRunAt = config.last_run_at ? new Date(config.last_run_at) : new Date(0);

      try {
        const interval = cronParser.parseExpression(cronExpr, { currentDate: lastRunAt });
        const nextDate = interval.next().toDate();
        if (now >= nextDate) {
          shouldRun = true;
        }
      } catch (err) {
        console.error(`Invalid cron expression for trigger ${trigger.id}: ${cronExpr}`);
        continue;
      }

      if (shouldRun) {
        try {
          const workflow = await getWorkflowWithSteps(trigger.workflow_id);
          const org = await getOrganization(workflow.org_id);

          if (org.quota_used < org.quota_limit) {
            const workflowRun = await createWorkflowRun({
              workflow_id: workflow.id,
              org_id: org.id,
              trigger_type: 'scheduled',
              status: 'running',
              started_at: now.toISOString(),
              context: {}
            });

            const stepRuns = [];
            for (const step of workflow.steps) {
              const sr = await createStepRun({
                workflow_run_id: workflowRun.id,
                workflow_step_id: step.id,
                step_order: step.step_order,
                status: 'pending',
                attempt_count: 0
              });
              stepRuns.push(sr);
            }

            await incrementOrgQuota(org.id);

            executeWorkflow(workflowRun, workflow.steps, Math.min(...workflow.steps.map(s => s.step_order)))
              .catch(console.error);

            // Update trigger config
            const nextInterval = cronParser.parseExpression(cronExpr, { currentDate: now });
            await updateTriggerConfig(trigger.id, {
              ...config,
              last_run_at: now.toISOString(),
              next_run_at: nextInterval.next().toDate().toISOString()
            });

            triggeredCount++;
          }
        } catch (innerErr) {
          console.error(`Failed to execute scheduled workflow ${trigger.workflow_id}:`, innerErr);
        }
      }
    }

    return NextResponse.json({ triggered: triggeredCount });
  } catch (error: any) {
    console.error('Scheduled runner error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
