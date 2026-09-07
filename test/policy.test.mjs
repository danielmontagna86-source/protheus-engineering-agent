import test from 'node:test';
import assert from 'node:assert/strict';

import { decideCapability, getEnvironmentPolicy } from '../packages/policy/src/index.mjs';

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
  assert.deepEqual(getEnvironmentPolicy('development'), {
    environment: 'development',
    capabilities: [
      'workspace:read',
      'context:read',
      'context:write',
      'workspace:write',
      'build:execute',
    ],
    approvalRequired: ['workspace:write', 'build:execute'],
  });
  assert.deepEqual(getEnvironmentPolicy('test'), {
    environment: 'test',
    capabilities: ['workspace:read', 'context:read', 'context:write'],
    approvalRequired: [],
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
    ],
    approvalRequired: ['context:write', 'workspace:write', 'build:execute', 'oracle:read'],
  });
  assert.deepEqual(getEnvironmentPolicy('unknown'), {
    environment: 'unknown',
    capabilities: [],
    approvalRequired: [],
  });
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
