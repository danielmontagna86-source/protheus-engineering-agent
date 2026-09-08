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
  assert.equal((await absent.authorize('production', 'oracle:read')).reason, 'approval-handler-unavailable');

  const malformed = createPermissionBroker({ requestApproval: async () => ({ approved: 'yes' }) });
  assert.equal((await malformed.authorize('production', 'oracle:read')).reason, 'approval-response-invalid');

  const timedOut = createPermissionBroker({
    timeoutMs: 5,
    requestApproval: async () => new Promise(() => {}),
  });
  assert.equal((await timedOut.authorize('production', 'oracle:read')).reason, 'approval-timeout');

  const controller = new AbortController();
  controller.abort();
  const cancelled = createPermissionBroker({ requestApproval: async () => ({ approved: true }) });
  assert.equal((await cancelled.authorize('production', 'oracle:read', { signal: controller.signal })).reason, 'approval-cancelled');
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
