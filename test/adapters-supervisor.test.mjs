import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createHermesAdapter } from '../packages/hermes-adapter/src/index.mjs';
import {
  createDictionarySnapshotAdapter,
  createIntegrationRegistry,
  createTdnSnapshotAdapter,
} from '../packages/integrations/src/index.mjs';
import {
  createBuildSupervisor,
  createProcessBuildRunner,
} from '../packages/build-supervisor/src/index.mjs';
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
  const pathKey = Object.keys(process.env).find((name) => name.toUpperCase() === 'PATH');
  assert.ok(pathKey, 'the process environment must expose a PATH entry');
  assert.equal(calls[0].options.env[pathKey], process.env[pathKey]);
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

test('TDN snapshot adapter searches bounded cited content and reuses its cache', async () => {
  let loads = 0;
  const adapter = createTdnSnapshotAdapter({
    async load() {
      loads += 1;
      return {
        kind: 'pea.tdn.snapshot',
        schemaVersion: 1,
        source: 'https://tdn.totvs.com/display/public/PROT/Exemplo',
        capturedAt: '2026-09-07T12:00:00.000Z',
        pages: [
          { id: '2', title: 'Rotina financeira', url: 'https://tdn.totvs.com/2', body: 'Baixa de títulos' },
          { id: '1', title: 'FWExecStatement', url: 'https://tdn.totvs.com/1', body: 'Consulta parametrizada' },
        ],
      };
    },
  });

  const first = await adapter.invoke('search', { query: 'consulta', limit: 5 });
  const second = await adapter.invoke('get', { id: '2' });

  assert.equal(first.ok, true);
  assert.equal(first.data.items[0].id, '1');
  assert.equal(first.evidence.integration, 'tdn');
  assert.equal(first.evidence.snapshotSchemaVersion, 1);
  assert.match(first.evidence.sha256, /^[a-f0-9]{64}$/);
  assert.equal(first.evidence.cached, false);
  assert.equal(second.data.item.title, 'Rotina financeira');
  assert.equal(second.evidence.cached, true);
  assert.equal(loads, 1);
});

test('Dictionary snapshot adapter resolves tables and fields case-insensitively', async () => {
  const adapter = createDictionarySnapshotAdapter({
    load: async () => ({
      kind: 'pea.protheus.dictionary',
      schemaVersion: 1,
      source: 'customer-export:SX2/SX3',
      capturedAt: '2026-09-07T12:00:00.000Z',
      tables: [{
        name: 'SE1',
        description: 'Contas a receber',
        fields: [{ name: 'E1_PREFIXO', type: 'C', length: 3, decimals: 0, title: 'Prefixo' }],
      }],
    }),
  });

  const table = await adapter.invoke('table', { name: 'se1' });
  const field = await adapter.invoke('field', { table: 'se1', name: 'e1_prefixo' });

  assert.equal(table.ok, true);
  assert.equal(table.data.table.name, 'SE1');
  assert.equal(field.data.field.title, 'Prefixo');
  assert.equal(field.evidence.integration, 'dictionary');
});

test('snapshot integrations fail with explicit schema, operation and timeout evidence', async () => {
  const invalid = createTdnSnapshotAdapter({
    load: async () => ({ schemaVersion: 99, pages: [] }),
  });
  const slow = createDictionarySnapshotAdapter({
    timeoutMs: 5,
    load: async () => new Promise((resolve) => setTimeout(() => resolve({}), 50)),
  });
  const registry = createIntegrationRegistry({ tdn: invalid, dictionary: slow });

  assert.equal((await registry.invoke('tdn', 'search', { query: 'x' })).error.code, 'INTEGRATION_SCHEMA_INVALID');
  assert.equal((await registry.invoke('dictionary', 'unknown', {})).error.code, 'INTEGRATION_OPERATION_DENIED');
  assert.equal((await registry.invoke('dictionary', 'table', { name: 'SE1' })).error.code, 'INTEGRATION_TIMEOUT');
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
  const plan = { mode: 'simulation', steps: [{ id: 'compile', capability: 'build:execute' }] };

  const blocked = await supervisor.runPlan(plan, { environment: 'production' });
  const completed = await supervisor.runPlan(plan, {
    environment: 'production',
    grants: ['build:execute'],
    approval: { approvedBy: 'maintainer', approvedAt: '2026-09-07T12:00:00.000Z' },
  });

  assert.equal(blocked.status, 'blocked');
  assert.equal(executed.length, 1);
  assert.equal(completed.status, 'completed');
  assert.equal(completed.steps[0].status, 'completed');
});

test('build supervisor captures approval, command identity, bounded logs and compiler artifacts', async () => {
  const supervisor = createBuildSupervisor({
    decideCapability,
    idFactory: () => 'build-001',
    clock: (() => {
      let now = 1_000;
      return () => (now += 10);
    })(),
    runner: async () => ({
      exitCode: 0,
      stdout: 'compiled',
      stderr: '',
      compiler: { identity: 'tds-cli@2.0.16', version: '2.0.16' },
      artifacts: [{ path: 'build/sample.ptm', sha256: 'a'.repeat(64) }],
    }),
  });

  const run = await supervisor.runPlan({
    mode: 'compiler',
    steps: [{
      id: 'compile',
      capability: 'build:execute',
      command: { executable: 'tds-cli', args: ['compile', 'sample.prw'] },
      timeoutMs: 1_000,
    }],
  }, {
    environment: 'production',
    grants: ['build:execute'],
    approval: { approvedBy: 'maintainer', approvedAt: '2026-09-07T12:00:00.000Z' },
  });

  assert.equal(run.id, 'build-001');
  assert.equal(run.status, 'completed');
  assert.equal(run.evidenceLevel, 'compiler-verified');
  assert.equal(run.steps[0].decision.allowed, true);
  assert.deepEqual(run.steps[0].command, { executable: 'tds-cli', args: ['compile', 'sample.prw'] });
  assert.equal(run.steps[0].logs.stdout, 'compiled');
  assert.equal(run.steps[0].result.compiler.identity, 'tds-cli@2.0.16');
  assert.equal(run.steps[0].result.artifacts[0].sha256, 'a'.repeat(64));
  assert.ok(run.durationMs >= 0);
});

test('build supervisor refuses unproved success and malformed runner output', async () => {
  const unproved = createBuildSupervisor({
    decideCapability,
    runner: async () => ({ exitCode: 0, stdout: 'done' }),
  });
  const malformed = createBuildSupervisor({
    decideCapability,
    runner: async () => ({ exitCode: 'zero', stdout: { secret: true } }),
  });
  const plan = {
    mode: 'compiler',
    steps: [{ id: 'compile', capability: 'build:execute', command: { executable: 'compiler', args: [] } }],
  };
  const context = {
    environment: 'production', grants: ['build:execute'],
    approval: { approvedBy: 'maintainer', approvedAt: '2026-09-07T12:00:00.000Z' },
  };

  assert.equal((await unproved.runPlan(plan, context)).status, 'unverified');
  const malformedRun = await malformed.runPlan(plan, context);
  assert.equal(malformedRun.status, 'failed');
  assert.equal(malformedRun.steps[0].error.code, 'BUILD_RESULT_INVALID');
});

test('build supervisor times out and cancels without claiming completion', async () => {
  const supervisor = createBuildSupervisor({
    decideCapability,
    runner: async () => new Promise((resolve) => setTimeout(() => resolve({ exitCode: 0 }), 100)),
  });
  const plan = {
    mode: 'simulation',
    steps: [{ id: 'compile', capability: 'build:execute', timeoutMs: 5 }],
  };
  const timedOut = await supervisor.runPlan(plan, {
    environment: 'development', grants: ['build:execute'],
    approval: { approvedBy: 'maintainer', approvedAt: '2026-09-07T12:00:00.000Z' },
  });
  const controller = new AbortController();
  controller.abort();
  const cancelled = await supervisor.runPlan(plan, {
    environment: 'development', grants: ['build:execute'], signal: controller.signal,
  });

  assert.equal(timedOut.status, 'timed-out');
  assert.equal(timedOut.steps[0].status, 'timed-out');
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.steps.length, 0);
});

test('process build runner executes without a shell and hashes declared workspace artifacts', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-build-runner-'));
  await writeFile(join(workspace, 'compiled.ptm'), 'verified artifact');
  const runner = createProcessBuildRunner();

  const result = await runner({
    command: { executable: process.execPath, args: ['-e', 'process.stdout.write("compiler ok")'], identity: 'synthetic-node' },
    artifacts: ['compiled.ptm'],
  }, { workspace });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, 'compiler ok');
  assert.equal(result.compiler.identity, 'synthetic-node');
  assert.match(result.artifacts[0].sha256, /^[a-f0-9]{64}$/);
  assert.equal(result.artifacts[0].path, 'compiled.ptm');
});
