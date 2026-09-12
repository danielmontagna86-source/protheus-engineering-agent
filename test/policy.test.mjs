import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createPermissionBroker,
  decideCapability,
  getEnvironmentPolicy,
} from '../packages/policy/src/index.mjs';

function approvedResponse(request, overrides = {}) {
  return {
    id: request.id,
    environment: request.environment,
    capability: request.capability,
    approved: true,
    approvedBy: 'owner',
    approvedAt: request.requestedAt,
    ...overrides,
  };
}

test('unknown capabilities are denied by default', () => {
  const decision = decideCapability('development', 'unknown:capability');
  assert.deepEqual(decision, {
    allowed: false,
    reason: 'capability-not-declared',
    requiresApproval: false,
  });
});

test('production requires an explicit grant for mutable capabilities', () => {
  const blocked = decideCapability('production', 'workspace:write');
  const allowed = decideCapability('production', 'workspace:write', {
    grants: ['workspace:write'],
  });

  assert.deepEqual(blocked, {
    allowed: false,
    reason: 'explicit-grant-required',
    requiresApproval: true,
  });
  assert.deepEqual(allowed, {
    allowed: true,
    reason: 'allowed',
    requiresApproval: true,
  });
});

test('policy snapshots are immutable copies', () => {
  const first = getEnvironmentPolicy('development');
  first.capabilities.push('unknown:capability');
  const second = getEnvironmentPolicy('development');

  assert.equal(second.capabilities.includes('unknown:capability'), false);
});

test('environment policy exposes the exact capability boundary for every environment', () => {
  assert.deepEqual(getEnvironmentPolicy('local'), {
    environment: 'local',
    capabilities: [
      'workspace:read', 'context:read', 'context:write', 'workspace:write', 'build:execute', 'ai:invoke',
    ],
    approvalRequired: ['workspace:write', 'build:execute', 'ai:invoke'],
  });
  assert.deepEqual(getEnvironmentPolicy('development'), {
    environment: 'development',
    capabilities: [
      'workspace:read',
      'context:read',
      'context:write',
      'workspace:write',
      'build:execute',
      'ai:invoke',
    ],
    approvalRequired: ['workspace:write', 'build:execute', 'ai:invoke'],
  });
  assert.deepEqual(getEnvironmentPolicy('test'), {
    environment: 'test',
    capabilities: ['workspace:read', 'context:read', 'context:write'],
    approvalRequired: [],
  });
  assert.deepEqual(getEnvironmentPolicy('homologation'), {
    environment: 'homologation',
    capabilities: [
      'workspace:read', 'context:read', 'context:write', 'workspace:write', 'build:execute', 'oracle:read', 'ai:invoke',
    ],
    approvalRequired: ['context:write', 'workspace:write', 'build:execute', 'oracle:read', 'ai:invoke'],
  });
  assert.deepEqual(getEnvironmentPolicy('production'), {
    environment: 'production',
    capabilities: [
      'workspace:read',
      'context:read',
      'context:write',
      'workspace:write',
      'build:execute',
      'oracle:read',
      'ai:invoke',
    ],
    approvalRequired: ['context:write', 'workspace:write', 'build:execute', 'oracle:read', 'ai:invoke'],
  });
  assert.deepEqual(getEnvironmentPolicy('unknown'), {
    environment: 'unknown',
    capabilities: [],
    approvalRequired: [],
  });
});

test('permission broker correlates approved requests without broadening grants', async () => {
  const requests = [];
  const broker = createPermissionBroker({
    idFactory: () => 'approval-001',
    clock: () => Date.parse('2026-09-07T12:00:00.000Z'),
    requestApproval: async (request) => {
      requests.push(request);
      return approvedResponse(request, { approvedBy: 'release-owner' });
    },
  });

  const decision = await broker.authorize('homologation', 'oracle:read', { purpose: 'named-query' });

  assert.equal(decision.allowed, true);
  assert.equal(decision.approval.id, 'approval-001');
  assert.equal(decision.approval.approvedBy, 'release-owner');
  assert.equal(requests[0].capability, 'oracle:read');
  assert.deepEqual(decideCapability('homologation', 'workspace:write'), {
    allowed: false, reason: 'explicit-grant-required', requiresApproval: true,
  });
});

test('permission broker rejects approvals replayed for another request, environment, capability or time', async () => {
  const fixedClock = () => Date.parse('2026-09-07T12:00:00.000Z');
  for (const overrides of [
    { id: 'stale-request' },
    { environment: 'production' },
    { capability: 'workspace:write' },
    { approvedAt: '2026-09-07T11:59:59.999Z' },
  ]) {
    const broker = createPermissionBroker({
      clock: fixedClock,
      idFactory: () => 'request-001',
      requestApproval: async (request) => approvedResponse(request, overrides),
    });
    assert.deepEqual(await broker.authorize('homologation', 'oracle:read'), {
      allowed: false, reason: 'approval-response-invalid', requiresApproval: true,
    });
  }
});

test('permission broker fails closed on missing, malformed, timed-out and cancelled approval', async () => {
  const absent = createPermissionBroker();
  assert.deepEqual(await absent.authorize('production', 'oracle:read'), {
    allowed: false, reason: 'approval-handler-unavailable', requiresApproval: true,
  });

  const malformed = createPermissionBroker({ requestApproval: async () => ({ approved: 'yes' }) });
  assert.deepEqual(await malformed.authorize('production', 'oracle:read'), {
    allowed: false, reason: 'approval-response-invalid', requiresApproval: true,
  });

  const timedOut = createPermissionBroker({
    timeoutMs: 5,
    requestApproval: async () => new Promise(() => {}),
  });
  assert.deepEqual(await timedOut.authorize('production', 'oracle:read'), {
    allowed: false, reason: 'approval-timeout', requiresApproval: true,
  });

  const controller = new AbortController();
  controller.abort();
  const cancelled = createPermissionBroker({ requestApproval: async () => ({ approved: true }) });
  assert.deepEqual(await cancelled.authorize('production', 'oracle:read', { signal: controller.signal }), {
    allowed: false, reason: 'approval-cancelled', requiresApproval: true,
  });
});

test('permission broker validates configuration, denial evidence and handler failures', async () => {
  for (const timeoutMs of [0, 300_001, 1.5]) {
    assert.throws(() => createPermissionBroker({ timeoutMs }), /between 1 and 300000/);
  }
  const denied = createPermissionBroker({ requestApproval: async () => ({ approved: false }) });
  assert.deepEqual(await denied.authorize('production', 'oracle:read'), {
    allowed: false, reason: 'approval-denied', requiresApproval: true,
  });
  const failed = createPermissionBroker({ requestApproval: async () => { throw new Error('private detail'); } });
  assert.deepEqual(await failed.authorize('production', 'oracle:read'), {
    allowed: false, reason: 'approval-handler-failed', requiresApproval: true,
  });
  for (const response of [
    { approved: true, approvedBy: '', approvedAt: '2026-09-07T12:00:00.000Z' },
    { approved: true, approvedBy: 'owner', approvedAt: '' },
    { approved: true, approvedBy: 'owner', approvedAt: 'invalid' },
  ]) {
    const invalid = createPermissionBroker({ requestApproval: async () => response });
    assert.equal((await invalid.authorize('production', 'oracle:read')).reason, 'approval-response-invalid');
  }
});

test('permission broker bounds purpose and observes cancellation after request starts', async () => {
  let observed;
  let release;
  const broker = createPermissionBroker({
    requestApproval: async (request) => {
      observed = request;
      return new Promise((resolve) => { release = resolve; });
    },
  });
  const controller = new AbortController();
  const pending = broker.authorize('production', 'ai:invoke', {
    signal: controller.signal, purpose: 'x'.repeat(700),
  });
  await new Promise((resolve) => setImmediate(resolve));
  controller.abort();
  assert.equal((await pending).reason, 'approval-cancelled');
  assert.equal(observed.purpose.length, 500);
  release({ approved: false });
});

test('permission broker never prompts for undeclared capabilities or already granted access', async () => {
  let prompts = 0;
  const broker = createPermissionBroker({ requestApproval: async () => { prompts += 1; return { approved: true }; } });
  assert.equal((await broker.authorize('test', 'oracle:read')).reason, 'capability-not-declared');
  assert.equal((await broker.authorize('production', 'oracle:read', { grants: ['oracle:read'] })).allowed, true);
  assert.equal(prompts, 0);
});

test('read capabilities are allowed without grants and undeclared writes stay denied', () => {
  assert.deepEqual(decideCapability('development', 'workspace:read'), {
    allowed: true,
    reason: 'allowed',
    requiresApproval: false,
  });
  assert.deepEqual(decideCapability('test', 'context:write'), {
    allowed: true,
    reason: 'allowed',
    requiresApproval: false,
  });
  assert.deepEqual(decideCapability('test', 'workspace:write', { grants: ['workspace:write'] }), {
    allowed: false,
    reason: 'capability-not-declared',
    requiresApproval: false,
  });
});

test('production Oracle access requires the matching grant, not an unrelated grant', () => {
  assert.deepEqual(decideCapability('production', 'oracle:read', { grants: ['context:write'] }), {
    allowed: false,
    reason: 'explicit-grant-required',
    requiresApproval: true,
  });
  assert.deepEqual(decideCapability('production', 'oracle:read', { grants: ['oracle:read'] }), {
    allowed: true,
    reason: 'allowed',
    requiresApproval: true,
  });
});

test('permission broker validates exact timeout boundaries and every approval field type', async () => {
  for (const timeoutMs of [1, 300_000]) {
    const broker = createPermissionBroker({
      timeoutMs,
      requestApproval: async (request) => approvedResponse(request),
    });
    assert.equal((await broker.authorize('production', 'oracle:read')).allowed, true);
  }
  for (const response of [
    undefined,
    null,
    { approved: null, approvedBy: 'owner', approvedAt: '2026-09-07T12:00:00.000Z' },
    { approved: true, approvedBy: 7, approvedAt: '2026-09-07T12:00:00.000Z' },
    { approved: true, approvedBy: { length: 5 }, approvedAt: '2026-09-07T12:00:00.000Z' },
    { approved: true, approvedBy: 'owner', approvedAt: 7 },
  ]) {
    const broker = createPermissionBroker({ requestApproval: async () => response });
    assert.deepEqual(await broker.authorize('production', 'oracle:read'), {
      allowed: false, reason: 'approval-response-invalid', requiresApproval: true,
    });
  }
});

test('permission broker re-authorizes after approval and fails closed if policy still denies', async () => {
  const grantSnapshots = [];
  const broker = createPermissionBroker({
    decideCapability: (_environment, capability, context) => {
      grantSnapshots.push([...context.grants]);
      return { allowed: false, reason: `blocked-${capability}`, requiresApproval: true };
    },
    requestApproval: async (request) => approvedResponse(request),
  });

  assert.deepEqual(await broker.authorize('production', 'oracle:read'), {
    allowed: false, reason: 'approval-did-not-authorize', requiresApproval: true,
  });
  assert.deepEqual(grantSnapshots, [[], ['oracle:read']]);
});

test('permission broker registers one-shot cancellation and always removes its listener', async () => {
  const calls = [];
  const signal = {
    aborted: false,
    addEventListener(name, listener, options) {
      calls.push(['add', name, options]);
      this.listener = listener;
    },
    removeEventListener(name, listener) {
      calls.push(['remove', name, listener === this.listener]);
    },
  };
  const broker = createPermissionBroker({
    requestApproval: async (request) => approvedResponse(request),
  });

  assert.equal((await broker.authorize('production', 'oracle:read', { signal })).allowed, true);
  assert.deepEqual(calls, [
    ['add', 'abort', { once: true }],
    ['remove', 'abort', true],
  ]);
});
