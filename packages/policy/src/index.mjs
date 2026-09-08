import { randomUUID } from 'node:crypto';

const POLICIES = Object.freeze({
  local: Object.freeze({
    capabilities: Object.freeze([
      'workspace:read',
      'context:read',
      'context:write',
      'workspace:write',
      'build:execute',
      'ai:invoke',
    ]),
    approvalRequired: Object.freeze(['workspace:write', 'build:execute', 'ai:invoke']),
  }),
  development: Object.freeze({
    capabilities: Object.freeze([
      'workspace:read',
      'context:read',
      'context:write',
      'workspace:write',
      'build:execute',
      'ai:invoke',
    ]),
    approvalRequired: Object.freeze(['workspace:write', 'build:execute', 'ai:invoke']),
  }),
  test: Object.freeze({
    capabilities: Object.freeze(['workspace:read', 'context:read', 'context:write']),
    approvalRequired: Object.freeze([]),
  }),
  homologation: Object.freeze({
    capabilities: Object.freeze([
      'workspace:read',
      'context:read',
      'context:write',
      'workspace:write',
      'build:execute',
      'oracle:read',
      'ai:invoke',
    ]),
    approvalRequired: Object.freeze([
      'context:write',
      'workspace:write',
      'build:execute',
      'oracle:read',
      'ai:invoke',
    ]),
  }),
  production: Object.freeze({
    capabilities: Object.freeze([
      'workspace:read',
      'context:read',
      'context:write',
      'workspace:write',
      'build:execute',
      'oracle:read',
      'ai:invoke',
    ]),
    approvalRequired: Object.freeze([
      'context:write',
      'workspace:write',
      'build:execute',
      'oracle:read',
      'ai:invoke',
    ]),
  }),
});

export function getEnvironmentPolicy(environment) {
  const policy = POLICIES[environment];
  if (!policy) {
    return { environment, capabilities: [], approvalRequired: [] };
  }
  return {
    environment,
    capabilities: [...policy.capabilities],
    approvalRequired: [...policy.approvalRequired],
  };
}

export function decideCapability(environment, capability, options = {}) {
  const policy = POLICIES[environment];
  if (!policy || !policy.capabilities.includes(capability)) {
    return {
      allowed: false,
      reason: 'capability-not-declared',
      requiresApproval: false,
    };
  }

  const requiresApproval = policy.approvalRequired.includes(capability);
  const grants = new Set(options.grants ?? []);
  if (requiresApproval && !grants.has(capability)) {
    return {
      allowed: false,
      reason: 'explicit-grant-required',
      requiresApproval: true,
    };
  }

  return { allowed: true, reason: 'allowed', requiresApproval };
}

function denied(reason, requiresApproval = true) {
  return { allowed: false, reason, requiresApproval };
}

function validApproval(response) {
  return response?.approved === true
    && typeof response.approvedBy === 'string'
    && response.approvedBy.length > 0
    && typeof response.approvedAt === 'string'
    && !Number.isNaN(Date.parse(response.approvedAt));
}

export function createPermissionBroker(options = {}) {
  const decide = options.decideCapability ?? decideCapability;
  const requestApproval = options.requestApproval;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const idFactory = options.idFactory ?? randomUUID;
  const clock = options.clock ?? Date.now;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 5 * 60_000) {
    throw new TypeError('permission timeout must be between 1 and 300000 ms');
  }

  return {
    async authorize(environment, capability, context = {}) {
      const grants = context.grants ?? [];
      const initial = decide(environment, capability, { grants });
      if (initial.allowed || !initial.requiresApproval) return initial;
      if (typeof requestApproval !== 'function') return denied('approval-handler-unavailable');
      if (context.signal?.aborted) return denied('approval-cancelled');

      const id = idFactory();
      const requestedAt = new Date(clock()).toISOString();
      let timer;
      let abortListener;
      try {
        const races = [
          Promise.resolve().then(() => requestApproval({
            id,
            environment,
            capability,
            requestedAt,
            purpose: typeof context.purpose === 'string' ? context.purpose.slice(0, 500) : undefined,
          })),
          new Promise((resolve) => {
            timer = setTimeout(() => resolve({ brokerFailure: 'approval-timeout' }), timeoutMs);
          }),
        ];
        if (context.signal) races.push(new Promise((resolve) => {
          abortListener = () => resolve({ brokerFailure: 'approval-cancelled' });
          context.signal.addEventListener('abort', abortListener, { once: true });
        }));
        const response = await Promise.race(races);
        if (response?.brokerFailure) return denied(response.brokerFailure);
        if (response?.approved === false) return denied('approval-denied');
        if (!validApproval(response)) return denied('approval-response-invalid');
        const finalDecision = decide(environment, capability, { grants: [...grants, capability] });
        if (!finalDecision.allowed) return denied('approval-did-not-authorize');
        return {
          ...finalDecision,
          approval: {
            id,
            approvedBy: response.approvedBy,
            approvedAt: response.approvedAt,
            requestedAt,
          },
        };
      } catch {
        return denied('approval-handler-failed');
      } finally {
        clearTimeout(timer);
        if (context.signal && abortListener) context.signal.removeEventListener('abort', abortListener);
      }
    },
  };
}
