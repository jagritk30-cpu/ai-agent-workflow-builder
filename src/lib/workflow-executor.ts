// ---------------------------------------------------------------------------
// Workflow Execution Engine
// Runs steps sequentially, handles retries, updates step_runs in real-time
// so GraphQL subscriptions reflect live progress.
// ---------------------------------------------------------------------------
import { callGemini } from './llm';
import {
  createManyStepRuns,
  getPendingStepRuns,
  incrementOrgQuota,
  saveWorkflowResult,
  updateStepRun,
  updateWorkflowRun,
} from './graphql-admin';
import type { StepRun, WorkflowRun, WorkflowStep } from './types';

// ---------------------------------------------------------------------------
// Generic retry with exponential backoff
// ---------------------------------------------------------------------------
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(
          `[executor] Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Interpolate {{context.key}} placeholders in config strings
// ---------------------------------------------------------------------------
export function interpolateConfig(
  value: unknown,
  context: Record<string, any>,
): unknown {
  if (typeof value === 'string') {
    return value.replace(/\{\{context\.([^}]+)\}\}/g, (_, key) => {
      const resolved = key
        .split('.')
        .reduce((obj: any, k: string) => obj?.[k], context);
      return resolved !== undefined ? String(resolved) : `{{context.${key}}}`;
    });
  }
  if (Array.isArray(value)) {
    return value.map((v) => interpolateConfig(v, context));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        interpolateConfig(v, context),
      ]),
    );
  }
  return value;
}

// ---------------------------------------------------------------------------
// Evaluate conditional_branch condition
// Supports simple expressions against context values — no eval() for security
// ---------------------------------------------------------------------------
export function evaluateCondition(
  condition: string,
  context: Record<string, any>,
): boolean {
  try {
    const parts = condition.trim().split(/\s+/);
    if (parts.length < 3) return false;

    const [path, operator, ...valueParts] = parts;
    const expectedValue = valueParts.join(' ');
    const contextKey = path.replace('context.', '');
    const actualValue = contextKey
      .split('.')
      .reduce((obj: any, k: string) => obj?.[k], context);

    const actual = String(actualValue ?? '').toLowerCase();
    const expected = expectedValue.toLowerCase();

    switch (operator.toLowerCase()) {
      case 'contains': return actual.includes(expected);
      case 'equals': case '==': return actual === expected;
      case 'startswith': return actual.startsWith(expected);
      case 'endswith': return actual.endsWith(expected);
      case '>': return Number(actualValue) > Number(expectedValue);
      case '<': return Number(actualValue) < Number(expectedValue);
      case '>=': return Number(actualValue) >= Number(expectedValue);
      case '<=': return Number(actualValue) <= Number(expectedValue);
      case '!=': return actual !== expected;
      default: return false;
    }
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Execute a single step — returns output or throws on failure
// ---------------------------------------------------------------------------
async function executeStep(
  step: WorkflowStep,
  stepRun: StepRun,
  context: Record<string, any>,
): Promise<{ output: Record<string, any>; contextUpdate?: Record<string, any> }> {
  const config = interpolateConfig(step.config, context) as Record<string, any>;

  switch (step.type) {
    case 'llm_call': {
      const prompt = config.prompt || 'Summarize the context.';
      const response = await retryWithBackoff(
        () => callGemini(prompt, config.system_prompt, { temperature: config.temperature }),
        2, 1000,
      );
      return {
        output: { response, model: 'gemini-1.5-flash' },
        contextUpdate: { previousOutput: response, llmResponse: response },
      };
    }

    case 'http_request': {
      const { url, method = 'GET', headers = {}, body } = config;
      if (!url) throw new Error('http_request step missing required config: url');
      const response = await retryWithBackoff(async () => {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const ct = res.headers.get('content-type') || '';
        return ct.includes('application/json') ? res.json() : res.text();
      }, 2, 1000);
      return {
        output: { response, status: 'ok' },
        contextUpdate: { previousOutput: JSON.stringify(response), httpResponse: response },
      };
    }

    case 'db_write': {
      const result = await saveWorkflowResult({
        workflow_run_id: stepRun.workflow_run_id,
        step_run_id: stepRun.id,
        org_id: context.org_id,
        key: config.key || 'result',
        data: { ...context, ...config.extra_data },
      });
      return {
        output: { saved: true, result_id: result.id },
        contextUpdate: { dbWriteId: result.id },
      };
    }

    case 'notify': {
      const message = config.message || 'Workflow step completed';
      const slackWebhook = process.env.SLACK_WEBHOOK_URL;
      if (slackWebhook) {
        await retryWithBackoff(() =>
          fetch(slackWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `*Workflow Notification*\n${message}\nRun: \`${stepRun.workflow_run_id}\``,
            }),
          }).then((r) => { if (!r.ok) throw new Error(`Slack ${r.status}`); }),
          2, 1000,
        );
      } else {
        console.log(`[notify] ${message} (no SLACK_WEBHOOK_URL configured)`);
      }
      return { output: { notified: true, message } };
    }

    case 'conditional_branch': {
      const result = evaluateCondition(config.condition || '', context);
      const branch = result ? 'true' : 'false';
      const label = result ? (config.true_label || 'true') : (config.false_label || 'false');
      console.log(`[executor] conditional_branch: "${config.condition}" → ${branch} (${label})`);
      return {
        output: { condition: config.condition, result, branch, label },
        contextUpdate: { branch, conditionalResult: result, previousOutput: `Branch: ${label}` },
      };
    }

    case 'approval_gate':
      // Handled in executeWorkflow before calling this function
      return { output: { requires_approval: true } };

    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
}

// ---------------------------------------------------------------------------
// Create all step_runs for a workflow run upfront (status: pending)
// ---------------------------------------------------------------------------
export async function initializeStepRuns(
  runId: string,
  steps: WorkflowStep[],
): Promise<StepRun[]> {
  const inputs = steps.map((step) => ({
    workflow_run_id: runId,
    workflow_step_id: step.id,
    step_order: step.step_order,
    status: 'pending' as const,
    attempt_count: 0,
  }));
  return createManyStepRuns(inputs);
}

// ---------------------------------------------------------------------------
// Main execution loop — call this to run a workflow or resume after approval
// Returns: 'completed' | 'paused' | 'failed'
// ---------------------------------------------------------------------------
export async function executeWorkflow(
  run: WorkflowRun,
  steps: WorkflowStep[],
  fromOrder: number = 0,
): Promise<'completed' | 'paused' | 'failed'> {
  let context: Record<string, any> = {
    ...run.context,
    org_id: run.org_id,
    workflow_id: run.workflow_id,
    run_id: run.id,
  };

  const pendingStepRuns = await getPendingStepRuns(run.id, fromOrder);

  for (const stepRun of pendingStepRuns) {
    const step = (stepRun as any).workflow_step as WorkflowStep;
    if (!step) continue;

    console.log(`[executor] Step ${step.step_order}: ${step.name} (${step.type})`);

    // Mark running
    await updateStepRun(stepRun.id, {
      status: 'running',
      started_at: new Date().toISOString(),
      input: context,
      attempt_count: (stepRun.attempt_count ?? 0) + 1,
    });

    // -----------------------------------------------------------------------
    // Approval gate — pause the entire run
    // -----------------------------------------------------------------------
    if (step.type === 'approval_gate') {
      await updateStepRun(stepRun.id, { status: 'awaiting_approval', input: context });
      await updateWorkflowRun(run.id, { status: 'paused', context });
      console.log(`[executor] Run ${run.id} PAUSED — awaiting approval at "${step.name}"`);
      return 'paused';
    }

    // -----------------------------------------------------------------------
    // Execute with retry
    // -----------------------------------------------------------------------
    let success = false;
    let lastError = '';
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (attempt > 1) {
          await updateStepRun(stepRun.id, { attempt_count: attempt, status: 'running' });
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 2)));
        }

        const { output, contextUpdate } = await executeStep(step, stepRun, context);
        if (contextUpdate) context = { ...context, ...contextUpdate };

        await updateStepRun(stepRun.id, {
          status: 'completed',
          output,
          attempt_count: attempt,
          completed_at: new Date().toISOString(),
        });

        success = true;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error(`[executor] Step "${step.name}" attempt ${attempt} failed: ${lastError}`);
      }
    }

    if (!success) {
      await updateStepRun(stepRun.id, {
        status: 'failed',
        error: lastError,
        completed_at: new Date().toISOString(),
      });
      await updateWorkflowRun(run.id, {
        status: 'failed',
        error: `Step "${step.name}" failed: ${lastError}`,
        completed_at: new Date().toISOString(),
        context,
      });
      return 'failed';
    }
  }

  // All steps completed
  await updateWorkflowRun(run.id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    context,
  });
  await incrementOrgQuota(run.org_id);
  console.log(`[executor] Run ${run.id} COMPLETED`);
  return 'completed';
}
