import { getMemberRole } from './graphql-admin';
import type { OrgMember, WorkflowStep, WorkflowTrigger } from './types';

// ---------------------------------------------------------------------------
// userId extraction from Hasura session_variables
// ---------------------------------------------------------------------------
export function extractUserId(
  sessionVariables: Record<string, string> | undefined | null,
): string | null {
  if (!sessionVariables) return null;
  return (
    sessionVariables['x-hasura-user-id'] ||
    sessionVariables['X-Hasura-User-Id'] ||
    null
  );
}

// For use in server-side code that receives a raw Authorization header
export function extractUserIdFromJWT(authHeader: string | null): string | null {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const payloadStr = Buffer.from(token.split('.')[1], 'base64').toString('utf-8');
    const payload = JSON.parse(payloadStr);
    return (
      payload['https://hasura.io/jwt/claims']?.['x-hasura-user-id'] ||
      payload.sub ||
      null
    );
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Membership helpers
// ---------------------------------------------------------------------------
export async function getOrgMember(
  userId: string,
  orgId: string,
): Promise<OrgMember | null> {
  return getMemberRole(userId, orgId);
}

// ---------------------------------------------------------------------------
// Layer 2 permission functions
// Each returns { allowed: boolean, role: string | null } for structured responses
// ---------------------------------------------------------------------------

/**
 * Verify the user can trigger a workflow run.
 * Requires owner or editor role.
 */
export async function verifyCanTrigger(
  userId: string,
  orgId: string,
): Promise<{ allowed: boolean; role: string | null }> {
  const member = await getOrgMember(userId, orgId);
  if (!member) return { allowed: false, role: null };
  const allowed = ['owner', 'editor'].includes(member.role);
  return { allowed, role: member.role };
}

/**
 * Verify the user can approve an approval_gate step.
 * Requires owner or editor role (viewers cannot approve).
 */
export async function verifyCanApprove(
  userId: string,
  orgId: string,
): Promise<{ allowed: boolean; role: string | null }> {
  const member = await getOrgMember(userId, orgId);
  if (!member) return { allowed: false, role: null };
  const allowed = ['owner', 'editor'].includes(member.role);
  return { allowed, role: member.role };
}

/**
 * Verify the user is an owner.
 * Only owners can perform privileged operations like db_write/notify steps.
 */
export async function verifyIsOwner(
  userId: string,
  orgId: string,
): Promise<boolean> {
  const member = await getOrgMember(userId, orgId);
  return member?.role === 'owner';
}

// ---------------------------------------------------------------------------
// Step and trigger type gating
// ---------------------------------------------------------------------------

/**
 * Returns true if the workflow contains steps that require owner-level access.
 * db_write and notify step types perform external/persistent actions that
 * editors should not be able to trigger (Layer 2 enforcement).
 */
export function hasRestrictedStepTypes(steps: WorkflowStep[]): boolean {
  return steps.some((step) => step.type === 'db_write' || step.type === 'notify');
}

/**
 * Webhook triggers are considered "restricted" because they expose an
 * external attack surface. Only owners can enable them.
 */
export function hasRestrictedTriggerTypes(triggers: WorkflowTrigger[]): boolean {
  return triggers.some((t) => t.trigger_type === 'webhook' && t.is_active);
}

// Legacy alias for compatibility
export const hasRestrictedSteps = hasRestrictedStepTypes;
