import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createPermissionBroker,
  decideCapability,
  getEnvironmentPolicy,
} from '../packages/policy/src/index.mjs';

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
      return { approved: true, approvedBy: 'release-owner', approvedAt: '2026-09-07T12:00:01.000Z' };
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
