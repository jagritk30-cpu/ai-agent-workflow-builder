'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useParams, useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Brain,
  Globe,
  Database,
  Bell,
  GitBranch,
  Shield,
  Play,
  Save,
  Plus,
  Trash2,
  Settings,
  GripVertical,
  X,
  ChevronLeft,
  Loader2,
  Webhook,
  Clock,
  MousePointer,
  Zap,
  Copy,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthInterpreter } from '@nhost/react';
import { GET_WORKFLOW_DETAIL } from '@/graphql/queries';
import {
  UPDATE_WORKFLOW,
  CREATE_WORKFLOW_STEP,
  UPDATE_WORKFLOW_STEP,
  DELETE_WORKFLOW_STEP,
  TRIGGER_WORKFLOW_RUN,
  CREATE_WORKFLOW_TRIGGER,
  UPDATE_WORKFLOW_TRIGGER,
  DELETE_WORKFLOW_TRIGGER,
} from '@/graphql/mutations';

// ---------------------------------------------------------------------------
// Step type definitions
// ---------------------------------------------------------------------------
const STEP_TYPES = [
  { type: 'llm_call',          label: 'LLM Call',          icon: Brain,       color: '#6c63ff', desc: 'Call an AI language model' },
  { type: 'http_request',      label: 'HTTP Request',       icon: Globe,       color: '#00d4ff', desc: 'Call any external API' },
  { type: 'db_write',          label: 'DB Write',           icon: Database,    color: '#4caf50', desc: 'Save results to database' },
  { type: 'notify',            label: 'Notify',             icon: Bell,        color: '#ffb74d', desc: 'Send Slack/email alert' },
  { type: 'conditional_branch',label: 'Conditional Branch', icon: GitBranch,   color: '#ab47bc', desc: 'Branch on condition' },
  { type: 'approval_gate',     label: 'Approval Gate',      icon: Shield,      color: '#ff5252', desc: 'Pause for human approval' },
] as const;

type StepType = typeof STEP_TYPES[number]['type'];

const TRIGGER_TYPES = [
  { type: 'manual',    label: 'Manual',    icon: MousePointer, desc: 'Triggered by Run button' },
  { type: 'webhook',   label: 'Webhook',   icon: Webhook,      desc: 'External HTTP call' },
  { type: 'scheduled', label: 'Scheduled', icon: Clock,        desc: 'Cron schedule' },
  { type: 'db_event',  label: 'DB Event',  icon: Zap,          desc: 'Database row change' },
] as const;

// ---------------------------------------------------------------------------
// Default configs per step type
// ---------------------------------------------------------------------------
function defaultConfig(type: StepType): Record<string, any> {
  switch (type) {
    case 'llm_call':           return { prompt: 'Summarize: {{context.previousOutput}}', system_prompt: 'You are a helpful assistant.', temperature: 0.7 };
    case 'http_request':       return { url: 'https://api.example.com/endpoint', method: 'GET', headers: {}, body: null };
    case 'db_write':           return { key: 'result', extra_data: {} };
    case 'notify':             return { message: 'Workflow step completed: {{context.previousOutput}}', channel: 'slack' };
    case 'conditional_branch': return { condition: 'context.previousOutput contains success', true_label: 'Success', false_label: 'Failure' };
    case 'approval_gate':      return { message: 'Please review and approve to continue', required_role: 'editor' };
    default:                   return {};
  }
}

// ---------------------------------------------------------------------------
// Sortable step item
// ---------------------------------------------------------------------------
interface StepItem {
  id: string;
  type: StepType;
  name: string;
  config: Record<string, any>;
  step_order: number;
  isNew?: boolean;
}

function SortableStep({
  step,
  onDelete,
  onConfigure,
  isDeleting,
}: {
  step: StepItem;
  onDelete: (id: string) => void;
  onConfigure: (step: StepItem) => void;
  isDeleting: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const typeDef = STEP_TYPES.find((t) => t.type === step.type)!;
  const Icon = typeDef?.icon ?? Brain;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="glass glass-hover"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 16px',
          width: '100%',
          borderLeft: `3px solid ${typeDef?.color ?? '#6c63ff'}`,
          cursor: 'default',
          transition: 'all 150ms',
        }}
      >
        {/* Drag handle */}
        <div className="drag-handle" {...attributes} {...listeners}>
          <GripVertical size={16} />
        </div>

        {/* Step icon */}
        <div style={{
          width: 36, height: 36, borderRadius: '8px',
          background: `${typeDef?.color ?? '#6c63ff'}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={18} color={typeDef?.color ?? '#6c63ff'} />
        </div>

        {/* Step info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>
            {step.name}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: 2 }}>
            {typeDef?.label}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => onConfigure(step)}
            title="Configure"
          >
            <Settings size={14} />
          </button>
          <button
            className="btn btn-danger btn-icon"
            onClick={() => onDelete(step.id)}
            disabled={isDeleting}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step config modal
// ---------------------------------------------------------------------------
function StepConfigModal({
  step,
  onSave,
  onClose,
}: {
  step: StepItem;
  onSave: (id: string, name: string, config: Record<string, any>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(step.name);
  const [config, setConfig] = useState(() => JSON.stringify(step.config, null, 2));
  const [configError, setConfigError] = useState('');

  const typeDef = STEP_TYPES.find((t) => t.type === step.type)!;
  const Icon = typeDef?.icon ?? Brain;

  const handleSave = () => {
    try {
      const parsed = JSON.parse(config);
      setConfigError('');
      onSave(step.id, name, parsed);
      onClose();
    } catch {
      setConfigError('Invalid JSON — please fix the configuration');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '10px',
            background: `${typeDef?.color ?? '#6c63ff'}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={20} color={typeDef?.color ?? '#6c63ff'} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Configure Step</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{typeDef?.label}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ marginLeft: 'auto' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Step Name</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">
              Configuration (JSON)
              <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>
                Use {'{{context.key}}'} for dynamic values
              </span>
            </label>
            <textarea
              className="form-textarea"
              value={config}
              onChange={(e) => setConfig(e.target.value)}
              style={{ minHeight: 200, fontFamily: 'monospace', fontSize: 12 }}
            />
            {configError && (
              <div style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>{configError}</div>
            )}
          </div>

          {/* Type-specific hints */}
          <div className="code-block" style={{ fontSize: 11, color: 'var(--muted)' }}>
            {step.type === 'llm_call' && '// prompt: The text to send to Gemini\n// system_prompt: (optional) System instruction\n// temperature: 0.0-1.0 (default 0.7)'}
            {step.type === 'http_request' && '// url: Full URL to call\n// method: GET, POST, PUT, DELETE\n// headers: Object of headers\n// body: Request body (for POST/PUT)'}
            {step.type === 'conditional_branch' && '// condition: "context.KEY operator VALUE"\n// Operators: contains, equals, >, <, >=, <=, !=\n// Example: "context.llmResponse contains success"'}
            {step.type === 'approval_gate' && '// message: Shown to approver\n// required_role: "editor" or "owner"\n// Run pauses here until approved'}
            {step.type === 'notify' && '// message: Notification text\n// Use {{context.key}} for dynamic content\n// Sends to SLACK_WEBHOOK_URL if configured'}
            {step.type === 'db_write' && '// key: Label for the saved result\n// Data saved to workflow_results table\n// Accessible to org members'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={14} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trigger config panel
// ---------------------------------------------------------------------------
function TriggerConfig({
  triggers,
  workflowId,
  onCreate,
  onUpdate,
  onDelete,
}: {
  triggers: any[];
  workflowId: string;
  onCreate: (type: string, config: Record<string, any>) => void;
  onUpdate: (id: string, config: Record<string, any>) => void;
  onDelete: (id: string) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/actions/webhook-trigger`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
        Triggers
      </div>

      {triggers.map((trigger) => {
        const typeDef = TRIGGER_TYPES.find((t) => t.type === trigger.trigger_type);
        const Icon = typeDef?.icon ?? MousePointer;
        return (
          <div
            key={trigger.id}
            className="glass"
            style={{ padding: '12px 14px', borderRadius: 'var(--radius)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Icon size={14} color="var(--primary)" />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{typeDef?.label}</span>
              <button
                className="btn btn-danger btn-icon btn-sm"
                onClick={() => onDelete(trigger.id)}
                style={{ marginLeft: 'auto' }}
              >
                <X size={12} />
              </button>
            </div>

            {trigger.trigger_type === 'webhook' && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Webhook URL:</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <code style={{ fontSize: 10, background: 'var(--bg)', padding: '4px 8px', borderRadius: 4, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--secondary)' }}>
                    {webhookUrl}
                  </code>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => copyToClipboard(webhookUrl, 'url')}
                  >
                    {copied === 'url' ? <CheckCircle size={12} color="var(--success)" /> : <Copy size={12} />}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Token:</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                  <code style={{ fontSize: 10, background: 'var(--bg)', padding: '4px 8px', borderRadius: 4, flex: 1, color: 'var(--warning)' }}>
                    {trigger.config?.token ?? 'No token'}
                  </code>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => copyToClipboard(trigger.config?.token ?? '', 'token')}
                  >
                    {copied === 'token' ? <CheckCircle size={12} color="var(--success)" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            )}

            {trigger.trigger_type === 'scheduled' && (
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                Cron: <code style={{ color: 'var(--secondary)' }}>{trigger.config?.cron || '0 9 * * *'}</code>
              </div>
            )}

            {trigger.trigger_type === 'db_event' && (
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                Table: <code style={{ color: 'var(--secondary)' }}>{trigger.config?.table || 'any'}</code> on {trigger.config?.operation || 'INSERT'}
              </div>
            )}
          </div>
        );
      })}

      {/* Add trigger buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {TRIGGER_TYPES.filter((t) => !triggers.some((tr) => tr.trigger_type === t.type)).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.type}
              className="btn btn-ghost"
              onClick={() => {
                const config: Record<string, any> = t.type === 'webhook'
                  ? { token: crypto.randomUUID(), workflow_id: workflowId }
                  : t.type === 'scheduled'
                  ? { cron: '0 9 * * *', timezone: 'UTC' }
                  : t.type === 'db_event'
                  ? { table: 'workflow_results', operation: 'INSERT' }
                  : {};
                onCreate(t.type, config);
              }}
              style={{ justifyContent: 'flex-start', fontSize: 12 }}
            >
              <Plus size={12} />
              <Icon size={12} />
              Add {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Workflow Builder Page
// ---------------------------------------------------------------------------
export default function WorkflowBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  const authService = useAuthInterpreter();
  const user = authService.getSnapshot().context.user;

  const [steps, setSteps] = useState<StepItem[]>([]);
  const [workflowName, setWorkflowName] = useState('');
  const [configStep, setConfigStep] = useState<StepItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [triggers, setTriggers] = useState<any[]>([]);

  // Load workflow
  const { data, loading } = useQuery(GET_WORKFLOW_DETAIL, {
    variables: { id: workflowId },
    onCompleted: (d) => {
      if (d.workflows_by_pk && !isInitialized) {
        setWorkflowName(d.workflows_by_pk.name);
        setSteps(
          d.workflows_by_pk.workflow_steps.map((s: any) => ({
            id: s.id,
            type: s.type,
            name: s.name,
            config: s.config,
            step_order: s.step_order,
          })),
        );
        setTriggers(d.workflows_by_pk.workflow_triggers || []);
        setIsInitialized(true);
      }
    },
  });

  const [updateWorkflow]         = useMutation(UPDATE_WORKFLOW);
  const [createStep]             = useMutation(CREATE_WORKFLOW_STEP);
  const [updateStep]             = useMutation(UPDATE_WORKFLOW_STEP);
  const [deleteStep]             = useMutation(DELETE_WORKFLOW_STEP);
  const [triggerRun]             = useMutation(TRIGGER_WORKFLOW_RUN);
  const [createTrigger]          = useMutation(CREATE_WORKFLOW_TRIGGER);
  const [deleteTrigger]          = useMutation(DELETE_WORKFLOW_TRIGGER);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ---------------------------------------------------------------------------
  // Drag end — reorder steps and update DB
  // ---------------------------------------------------------------------------
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setSteps((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        // Update step_order in DB
        reordered.forEach((step, idx) => {
          if (step.step_order !== idx) {
            updateStep({ variables: { id: step.id, step_order: idx } });
          }
        });
        return reordered.map((s, idx) => ({ ...s, step_order: idx }));
      });
    },
    [updateStep],
  );

  // ---------------------------------------------------------------------------
  // Add step from palette
  // ---------------------------------------------------------------------------
  const handleAddStep = async (type: StepType) => {
    const typeDef = STEP_TYPES.find((t) => t.type === type)!;
    const newOrder = steps.length;
    const config   = defaultConfig(type);
    const name     = `${typeDef.label} ${newOrder + 1}`;

    const { data: result } = await createStep({
      variables: { workflow_id: workflowId, name, type, config, step_order: newOrder },
    });

    if (result?.insert_workflow_steps_one) {
      const s = result.insert_workflow_steps_one;
      setSteps((prev) => [...prev, { id: s.id, type: s.type, name: s.name, config: s.config, step_order: s.step_order }]);
    }
  };

  // ---------------------------------------------------------------------------
  // Delete step
  // ---------------------------------------------------------------------------
  const handleDeleteStep = async (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
    await deleteStep({ variables: { id } });
  };

  // ---------------------------------------------------------------------------
  // Save config for a step
  // ---------------------------------------------------------------------------
  const handleSaveConfig = async (id: string, name: string, config: Record<string, any>) => {
    setSteps((prev) => prev.map((s) => s.id === id ? { ...s, name, config } : s));
    await updateStep({ variables: { id, name, config } });
  };

  // ---------------------------------------------------------------------------
  // Save workflow name
  // ---------------------------------------------------------------------------
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateWorkflow({ variables: { id: workflowId, name: workflowName } });
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Run workflow
  // ---------------------------------------------------------------------------
  const handleRun = async () => {
    setRunning(true);
    try {
      const { data: runData } = await triggerRun({ variables: { workflow_id: workflowId } });
      const runId = runData?.triggerWorkflowRun?.workflow_run_id;
      if (runId) {
        router.push(`/workflows/${workflowId}/runs/${runId}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to trigger run');
    } finally {
      setRunning(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Trigger management
  // ---------------------------------------------------------------------------
  const handleCreateTrigger = async (type: string, config: Record<string, any>) => {
    const { data: result } = await createTrigger({
      variables: { workflow_id: workflowId, trigger_type: type, config },
    });
    if (result?.insert_workflow_triggers_one) {
      setTriggers((prev) => [...prev, result.insert_workflow_triggers_one]);
    }
  };

  const handleDeleteTrigger = async (id: string) => {
    setTriggers((prev) => prev.filter((t) => t.id !== id));
    await deleteTrigger({ variables: { id } });
  };

  if (loading && !isInitialized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
        <Loader2 size={20} className="animate-spin" color="var(--primary)" />
        <span style={{ color: 'var(--muted)' }}>Loading workflow...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ------------------------------------------------------------------- */}
      {/* Toolbar */}
      {/* ------------------------------------------------------------------- */}
      <div
        className="glass"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 20px',
          borderRadius: 0,
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: 'none',
          flexShrink: 0,
        }}
      >
        <Link href="/workflows" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 13 }}>
          <ChevronLeft size={16} />
          Workflows
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

        <input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text)',
            minWidth: 200,
            flex: 1,
          }}
          placeholder="Workflow name..."
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saveMsg && (
            <span style={{ fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={12} /> {saveMsg}
            </span>
          )}
          <button className="btn btn-secondary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
          <button className="btn btn-primary" onClick={handleRun} disabled={running}>
            {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Run Workflow
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Three-panel layout */}
      {/* ------------------------------------------------------------------- */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* LEFT: Step palette */}
        <div
          className="scroll-area"
          style={{
            width: 220,
            padding: '20px 14px',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
            Step Palette
          </div>
          {STEP_TYPES.map(({ type, label, icon: Icon, color, desc }) => (
            <button
              key={type}
              onClick={() => handleAddStep(type)}
              className="glass-hover"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 150ms',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: `${color}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={14} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{desc}</div>
              </div>
              <Plus size={12} style={{ marginLeft: 'auto', color: 'var(--muted)', flexShrink: 0 }} />
            </button>
          ))}
        </div>

        {/* CENTER: Workflow canvas */}
        <div
          className="scroll-area"
          style={{
            flex: 1,
            padding: '24px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {steps.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 80 }}>
              <div className="empty-state-icon">
                <Zap size={28} color="var(--primary)" />
              </div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>No steps yet</div>
              <div style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 300 }}>
                Click a step type from the palette on the left to start building your workflow
              </div>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {steps.map((step, idx) => (
                    <div key={step.id}>
                      <SortableStep
                        step={step}
                        onDelete={handleDeleteStep}
                        onConfigure={setConfigStep}
                        isDeleting={false}
                      />
                      {idx < steps.length - 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <div className="step-connector" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* RIGHT: Trigger configuration */}
        <div
          className="scroll-area"
          style={{
            width: 260,
            padding: '20px 16px',
            borderLeft: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <TriggerConfig
            triggers={triggers}
            workflowId={workflowId}
            onCreate={handleCreateTrigger}
            onUpdate={() => {}}
            onDelete={handleDeleteTrigger}
          />

          {/* Recent runs quick access */}
          {data?.workflows_by_pk?.workflow_runs?.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                Recent Runs
              </div>
              {data.workflows_by_pk.workflow_runs.slice(0, 3).map((run: any) => (
                <Link
                  key={run.id}
                  href={`/workflows/${workflowId}/runs/${run.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    marginBottom: 4,
                    transition: 'background 150ms',
                  }}
                  className="glass-hover"
                >
                  <span>Run #{run.id.slice(0, 6)}</span>
                  <span className={`badge badge-${run.status}`}>{run.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Config modal */}
      {configStep && (
        <StepConfigModal
          step={configStep}
          onSave={handleSaveConfig}
          onClose={() => setConfigStep(null)}
        />
      )}
    </div>
  );
}
