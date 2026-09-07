import test from 'node:test';
import assert from 'node:assert/strict';

import { createHermesAdapter } from '../packages/hermes-adapter/src/index.mjs';
import { createIntegrationRegistry } from '../packages/integrations/src/index.mjs';
import { createBuildSupervisor } from '../packages/build-supervisor/src/index.mjs';
import { decideCapability } from '../packages/policy/src/index.mjs';

test('Hermes adapter exposes ACP launch and probes without mutating configuration', () => {
  const calls = [];
  const adapter = createHermesAdapter({
    command: 'hermes-test',
    spawnSyncImpl(command, args, options) {
      calls.push({ command, args, options });
      return { status: 0, stdout: 'Hermes ACP check OK\n', stderr: '' };
    },
  });

  const descriptor = adapter.getLaunchDescriptor('C:\\work\\project');
  const probe = adapter.probe();

  assert.deepEqual(descriptor, {
    transport: 'stdio',
    command: 'hermes-test',
    args: ['acp'],
    cwd: 'C:\\work\\project',
  });
  assert.equal(probe.available, true);
  assert.deepEqual(calls[0].args, ['acp', '--check']);
  assert.equal(calls[0].options.input, undefined);
});

test('Hermes adapter isolates ACP state and exposes the product MCP to the session', () => {
  const calls = [];
  const hermesHome = 'C:\\work\\project\\.pea\\hermes';
  const adapter = createHermesAdapter({
    command: 'hermes-test',
    hermesHome,
    nodeCommand: 'node-test',
    mcpServerPath: 'C:\\product\\packages\\mcp\\src\\stdio.mjs',
    spawnSyncImpl(command, args, options) {
      calls.push({ command, args, options });
      return { status: 0, stdout: 'Hermes ACP check OK\n', stderr: '' };
    },
  });

  assert.deepEqual(adapter.getLaunchDescriptor('C:\\work\\project'), {
    transport: 'stdio',
    command: 'hermes-test',
    args: ['acp'],
    cwd: 'C:\\work\\project',
    env: { HERMES_HOME: hermesHome },
  });
  assert.deepEqual(adapter.getSessionMcpServerDescriptor('C:\\work\\project'), {
    name: 'protheus-engineering-agent',
    command: 'node-test',
    args: ['C:\\product\\packages\\mcp\\src\\stdio.mjs'],
    env: [
      { name: 'PEA_ENVIRONMENT', value: 'production' },
      { name: 'PEA_WORKSPACE', value: 'C:\\work\\project' },
    ],
  });

  adapter.probe();
  assert.equal(calls[0].options.env.HERMES_HOME, hermesHome);
  assert.equal(calls[0].options.env.PATH, process.env.PATH);
});

test('external integrations are fail-closed when no adapter is configured', async () => {
  const registry = createIntegrationRegistry();

  assert.deepEqual(registry.status(), [
    { name: 'dictionary', available: false },
    { name: 'oracle', available: false },
    { name: 'tdn', available: false },
  ]);
  assert.deepEqual(await registry.invoke('oracle', 'query', {}), {
    ok: false,
    error: { code: 'INTEGRATION_UNAVAILABLE', integration: 'oracle' },
  });
});

test('build supervisor blocks execution until the environment grant exists', async () => {
  const executed = [];
  const supervisor = createBuildSupervisor({
    decideCapability,
    runner: async (step) => {
      executed.push(step.id);
      return { exitCode: 0, output: 'ok' };
    },
  });
  const plan = { steps: [{ id: 'compile', capability: 'build:execute' }] };

  const blocked = await supervisor.runPlan(plan, { environment: 'production' });
  const completed = await supervisor.runPlan(plan, {
    environment: 'production',
    grants: ['build:execute'],
  });

  assert.equal(blocked.status, 'blocked');
  assert.equal(executed.length, 1);
  assert.equal(completed.status, 'completed');
  assert.equal(completed.steps[0].status, 'completed');
});
