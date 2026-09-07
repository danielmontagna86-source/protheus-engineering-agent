import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

import { createRuntime } from '../packages/runtime/src/index.mjs';

const execFileAsync = promisify(execFile);
const productRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const cliPath = join(productRoot, 'packages', 'runtime', 'src', 'cli.mjs');

test('runtime indexes and reviews a file inside the workspace', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-runtime-'));
  const sourcePath = join(workspace, 'sample.prw');
  await writeFile(sourcePath, 'User Function Entry()\n    ConOut("x")\nReturn\n');
  const runtime = createRuntime({ workspace });

  const graph = await runtime.index();
  const review = await runtime.reviewFile(sourcePath);

  assert.equal(graph.nodes[0].name, 'Entry');
  assert.equal(review.findings[0].ruleId, 'CA1004');
  await assert.rejects(
    runtime.reviewFile(join(workspace, '..', 'outside.prw')),
    /outside workspace/,
  );
});

test('runtime rejects a source whose resolved target escapes through a symlink', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-runtime-link-'));
  const linkedSource = join(workspace, 'linked.prw');
  await writeFile(linkedSource, 'User Function Linked()\nReturn\n');
  const escapedTarget = join(workspace, '..', 'outside.prw');
  const runtime = createRuntime({
    workspace,
    realpathImpl: async (path) => path === linkedSource ? escapedTarget : path,
  });

  await assert.rejects(runtime.reviewFile(linkedSource), /outside workspace/);
});

test('runtime refuses session descriptors and Hermes probes through a .pea junction', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-runtime-junction-workspace-'));
  const externalState = await mkdtemp(join(tmpdir(), 'pea-runtime-junction-target-'));
  await symlink(externalState, join(workspace, '.pea'), 'junction');
  let probes = 0;
  const runtime = createRuntime({
    workspace,
    hermesAdapter: {
      probe() { probes += 1; return { available: true }; },
      getLaunchDescriptor() { return { command: 'hermes' }; },
      getSessionMcpServerDescriptor() { return { command: 'node' }; },
    },
  });

  await assert.rejects(runtime.getSessionContext(), /state path must not be a symlink/);
  await assert.rejects(runtime.doctor({ probeHermes: true }), /state path must not be a symlink/);
  await assert.rejects(runtime.getHermesLaunchDescriptor(), /state path must not be a symlink/);
  assert.equal(probes, 0);
});

test('CLI doctor and index commands emit parseable JSON without probing Hermes by default', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-cli-'));
  await writeFile(join(workspace, 'sample.prw'), 'User Function Start()\nReturn\n');

  const doctorRun = await execFileAsync(process.execPath, [cliPath, 'doctor', workspace]);
  const indexRun = await execFileAsync(process.execPath, [cliPath, 'index', workspace]);
  const doctor = JSON.parse(doctorRun.stdout);
  const graph = JSON.parse(indexRun.stdout);

  assert.equal(doctor.ok, true);
  assert.deepEqual(doctor.hermes, { mode: 'acp', probed: false, available: null });
  assert.equal(graph.nodes.length, 1);
});

test('runtime creates a live session context with isolated Hermes and project resources', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-session-'));
  const skillDir = join(workspace, '.pea', 'skills', 'review');
  await mkdir(skillDir, { recursive: true });
  await writeFile(join(skillDir, 'SKILL.md'), '# Review\nUse evidence.', 'utf8');
  const runtime = createRuntime({ workspace, hermes: { command: 'hermes-test' } });

  assert.equal(typeof runtime.getSessionContext, 'function');
  const session = await runtime.getSessionContext();

  assert.equal(session.schemaVersion, 1);
  assert.equal(session.trust, 'untrusted-project-data');
  assert.equal(session.resources.skills[0].name, 'review');
  assert.equal(session.hermes.launch.env.HERMES_HOME, join(workspace, '.pea', 'hermes'));
  assert.equal(session.hermes.mcp.name, 'protheus-engineering-agent');
  assert.equal(session.hermes.mcp.env.find((item) => item.name === 'PEA_WORKSPACE').value, workspace);
});

test('CLI session command emits the same live integration contract', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-cli-session-'));

  const run = await execFileAsync(process.execPath, [cliPath, 'session', workspace]);
  const session = JSON.parse(run.stdout);

  assert.equal(session.schemaVersion, 1);
  assert.equal(session.hermes.launch.env.HERMES_HOME, join(workspace, '.pea', 'hermes'));
  assert.equal(session.hermes.mcp.env.find((item) => item.name === 'PEA_ENVIRONMENT').value, 'production');
});

test('CLI session accepts an explicit Hermes executable without changing profile isolation', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-cli-hermes-command-'));
  const hermesCommand = 'C:\\tools\\hermes.exe';

  const run = await execFileAsync(process.execPath, [cliPath, 'session', workspace], {
    env: { ...process.env, PEA_HERMES_COMMAND: hermesCommand },
  });
  const session = JSON.parse(run.stdout);

  assert.equal(session.hermes.launch.command, hermesCommand);
  assert.equal(session.hermes.launch.env.HERMES_HOME, join(workspace, '.pea', 'hermes'));
});

test('CLI session preserves Electron-as-Node when its MCP descriptor reuses the VS Code executable', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-cli-electron-node-'));
  const nodeCommand = 'C:\\tools\\Code.exe';

  const run = await execFileAsync(process.execPath, [cliPath, 'session', workspace], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PEA_NODE_COMMAND: nodeCommand,
    },
  });
  const session = JSON.parse(run.stdout);

  assert.equal(session.hermes.mcp.command, nodeCommand);
  assert.deepEqual(
    session.hermes.mcp.env.find((item) => item.name === 'ELECTRON_RUN_AS_NODE'),
    { name: 'ELECTRON_RUN_AS_NODE', value: '1' },
  );
});
