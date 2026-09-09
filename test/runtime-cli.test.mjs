import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

import { createRuntime } from '../packages/runtime/src/index.mjs';
import { runCli } from '../packages/runtime/src/cli.mjs';

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

test('runtime reuses unchanged CodeGraph IR and invalidates a changed source', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-runtime-incremental-'));
  const sourcePath = join(workspace, 'sample.prw');
  await writeFile(sourcePath, 'User Function Entry()\nReturn\n');
  const runtime = createRuntime({ workspace });

  const cold = await runtime.index();
  const warm = await runtime.index();
  await writeFile(sourcePath, 'User Function Entry()\n    Helper()\nReturn\n');
  const changed = await runtime.index();

  assert.deepEqual(cold.analysis.cache, { enabled: true, hits: 0, misses: 1 });
  assert.deepEqual(warm.analysis.cache, { enabled: true, hits: 1, misses: 0 });
  assert.deepEqual(changed.analysis.cache, { enabled: true, hits: 0, misses: 1 });
  assert.equal(changed.edges[0].to, 'Helper');
});

test('runtime configures read-only TDN and Dictionary snapshots without credentials', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-runtime-integrations-'));
  const tdnPath = join(workspace, 'tdn.json');
  const dictionaryPath = join(workspace, 'dictionary.json');
  await writeFile(tdnPath, JSON.stringify({
    kind: 'pea.tdn.snapshot', schemaVersion: 1,
    source: 'https://tdn.totvs.com/example', capturedAt: '2026-09-07T12:00:00.000Z',
    pages: [{ id: '1', title: 'FWExecStatement', url: 'https://tdn.totvs.com/1', body: 'Consulta segura' }],
  }));
  await writeFile(dictionaryPath, JSON.stringify({
    kind: 'pea.protheus.dictionary', schemaVersion: 1,
    source: 'customer-export:SX2/SX3', capturedAt: '2026-09-07T12:00:00.000Z',
    tables: [{ name: 'SE1', description: 'Contas a receber', fields: [] }],
  }));
  const runtime = createRuntime({ workspace, tdnSnapshotPath: tdnPath, dictionarySnapshotPath: dictionaryPath });

  const doctor = await runtime.doctor();
  const tdn = await runtime.invokeIntegration('tdn', 'search', { query: 'segura' });
  const dictionary = await runtime.invokeIntegration('dictionary', 'table', { name: 'se1' });

  assert.equal(doctor.integrations.find((item) => item.name === 'tdn').available, true);
  assert.equal(doctor.integrations.find((item) => item.name === 'dictionary').available, true);
  assert.equal(tdn.data.items[0].id, '1');
  assert.equal(dictionary.data.table.name, 'SE1');
});

test('active typed profile configures workspace-contained TDN and Dictionary snapshots', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-runtime-profile-integrations-'));
  await mkdir(join(workspace, '.pea', 'snapshots'), { recursive: true });
  await writeFile(join(workspace, '.pea', 'config.json'), JSON.stringify({
    schemaVersion: 1,
    locale: 'pt-BR',
    activeProfile: 'offline',
    profiles: {
      offline: {
        environment: 'development',
        tdnSnapshotPath: '.pea/snapshots/tdn.json',
        dictionarySnapshotPath: '.pea/snapshots/dictionary.json',
      },
    },
  }));
  await writeFile(join(workspace, '.pea', 'snapshots', 'tdn.json'), JSON.stringify({
    kind: 'pea.tdn.snapshot', schemaVersion: 1, source: 'owner-export', capturedAt: '2026-09-08T12:00:00.000Z',
    pages: [{ id: 'tdn-1', title: 'FWExecStatement', url: 'https://tdn.totvs.com/test', body: 'Consulta parametrizada' }],
  }));
  await writeFile(join(workspace, '.pea', 'snapshots', 'dictionary.json'), JSON.stringify({
    kind: 'pea.protheus.dictionary', schemaVersion: 1, source: 'owner-export', capturedAt: '2026-09-08T12:00:00.000Z',
    tables: [{ name: 'SE1', description: 'Receivables', fields: [] }],
  }));
  const runtime = createRuntime({ workspace });

  const doctor = await runtime.doctor();
  const tdn = await runtime.invokeIntegration('tdn', 'search', { query: 'parametrizada' });
  const dictionary = await runtime.invokeIntegration('dictionary', 'table', { name: 'SE1' });

  assert.deepEqual(doctor.integrations, [
    { name: 'dictionary', available: true },
    { name: 'oracle', available: false },
    { name: 'tdn', available: true },
  ]);
  assert.equal(tdn.data.items[0].id, 'tdn-1');
  assert.equal(dictionary.data.table.name, 'SE1');
});

test('typed profile snapshot paths fail closed when they escape the workspace', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-runtime-profile-escape-'));
  await mkdir(join(workspace, '.pea'));
  await writeFile(join(workspace, '.pea', 'config.json'), JSON.stringify({
    schemaVersion: 1,
    locale: 'en',
    activeProfile: 'unsafe',
    profiles: { unsafe: { environment: 'development', tdnSnapshotPath: '../outside.json' } },
  }));

  await assert.rejects(createRuntime({ workspace }).doctor(), /outside workspace/);
});

test('runtime snapshot onboarding validates, imports, configures and immediately searches an authorized local snapshot', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-runtime-snapshot-import-'));
  const source = join(workspace, 'owner-tdn.json');
  await writeFile(source, JSON.stringify({
    kind: 'pea.tdn.snapshot', schemaVersion: 1, source: 'owner-export',
    capturedAt: '2026-09-08T12:00:00.000Z', license: 'owner-authorized-local-snapshot',
    pages: [{ id: '1', title: 'TDN', url: 'https://example.invalid/1', body: 'Offline configuration data' }],
  }));
  const runtime = createRuntime({ workspace, environment: 'development' });

  const inspected = await runtime.inspectSnapshot({ integration: 'tdn', path: source });
  const imported = await runtime.importSnapshot({ integration: 'tdn', path: source, expectedSha256: inspected.sha256 });

  assert.equal(imported.operation, 'installed');
  assert.deepEqual(imported.configuration, { tdnSnapshotPath: '.pea/snapshots/tdn.json' });
  const config = JSON.parse(await readFile(join(workspace, '.pea', 'config.json'), 'utf8'));
  assert.equal(config.profiles.default.tdnSnapshotPath, '.pea/snapshots/tdn.json');
  assert.equal((await runtime.doctor()).integrations.find((item) => item.name === 'tdn').available, true);
  const search = await runtime.invokeIntegration('tdn', 'search', { query: 'configuration' });
  assert.deepEqual(search.data.items.map((item) => item.id), ['1']);
});

test('CLI exposes bounded TDN and Dictionary snapshot searches', async () => {
  const calls = [];
  const io = {
    stdout: { write(value) { io.value = String(value); } },
    stderr: { write(value) { io.error = String(value); } },
    createRuntime() {
      return {
        async invokeIntegration(name, operation, args) {
          calls.push({ name, operation, args });
          return { status: 'ok', data: { items: [] } };
        },
      };
    },
  };

  assert.equal(await runCli(['tdn-search', 'C:\\workspace', 'FWExecStatement', '7'], io), 0);
  assert.equal(await runCli(['dictionary-search', 'C:\\workspace', 'E1_PREFIXO', '3'], io), 0);
  assert.deepEqual(calls, [
    { name: 'tdn', operation: 'search', args: { query: 'FWExecStatement', limit: 7 } },
    { name: 'dictionary', operation: 'search', args: { query: 'E1_PREFIXO', limit: 3 } },
  ]);
});

test('runtime builds one traceable bug-review report from source and workspace impact', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-runtime-bug-review-'));
  const helper = join(workspace, 'helper.prw');
  await writeFile(helper, 'User Function SharedHelper()\nReturn\n');
  await writeFile(join(workspace, 'caller.prw'), 'User Function Caller()\n    SharedHelper()\nReturn\n');
  const runtime = createRuntime({ workspace });

  const report = await runtime.createBugReview({
    title: 'Shared helper investigation',
    filePath: helper,
    targetSymbol: 'SharedHelper',
    changedFiles: ['helper.prw'],
    validation: [{ name: 'unit', status: 'passed', evidence: 'green' }],
  });

  assert.equal(report.schemaVersion, 2);
  assert.deepEqual(report.impact.callers, ['Caller']);
  assert.deepEqual(report.changedFiles, [{ path: 'helper.prw', status: 'modified' }]);
});

test('runtime exposes one build prepare, run, status, cancel and evidence port', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-runtime-build-'));
  const calls = [];
  const buildService = {
    prepare(request) { calls.push(['prepare', request]); return { status: 'prepared', requestId: 'one' }; },
    run(request, context) { calls.push(['run', request, context]); return { status: 'completed', requestId: 'one' }; },
    status(requestId) { calls.push(['status', requestId]); return { status: 'completed', requestId }; },
    cancel(requestId) { calls.push(['cancel', requestId]); return { status: 'cancelled', requestId }; },
    evidence(requestId) { calls.push(['evidence', requestId]); return { status: 'completed', requestId }; },
  };
  const runtime = createRuntime({ workspace, environment: 'development', grants: ['build:execute'], buildService });

  assert.equal((await runtime.prepareBuild({ planId: 'verify' })).status, 'prepared');
  assert.equal((await runtime.runBuild({ requestId: 'one' }, {
    approval: { approvedBy: 'developer', approvedAt: '2026-09-08T12:00:00.000Z' },
  })).status, 'completed');
  assert.equal(runtime.buildStatus('one').status, 'completed');
  assert.equal(runtime.cancelBuild('one').status, 'cancelled');
  assert.equal(runtime.buildEvidence('one').status, 'completed');
  assert.equal(calls[1][2].environment, 'development');
  assert.deepEqual(calls[1][2].grants, ['build:execute']);
});

test('runtime reports build unavailable instead of inventing compiler evidence', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-runtime-build-unavailable-'));
  const runtime = createRuntime({ workspace });

  assert.deepEqual(await runtime.prepareBuild({ planId: 'verify' }), {
    schemaVersion: 1,
    status: 'unavailable',
    error: { code: 'BUILD_UNAVAILABLE', message: 'No supervised build adapter is configured' },
  });
});

test('runtime exposes governed Project Memory and Journal lifecycle operations', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-runtime-context-lifecycle-'));
  const runtime = createRuntime({ workspace, environment: 'development' });

  await runtime.recordJournal({ id: 'decision-1', kind: 'decision', summary: 'Keep deterministic review.' });
  const preview = await runtime.previewJournalPromotion('decision-1', { actor: 'maintainer' });
  const promoted = await runtime.promoteJournal('decision-1', { actor: 'maintainer' });
  const expired = await runtime.expireMemory('2027-01-01T00:00:00.000Z');

  assert.equal(preview.status, 'ready');
  assert.equal(promoted.status, 'promoted');
  assert.equal(expired.removed, 0);
  assert.equal((await runtime.readContext()).memoryEntries.length, 1);
});

test('runtime reviews one normalized SCM change set and excludes deleted or binary sources', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-runtime-changes-'));
  await writeFile(join(workspace, 'changed.prw'), 'User Function Changed()\n    Iif(.T., 1, 0)\nReturn\n');
  const runtime = createRuntime({
    workspace,
    scm: {
      async changes(request) {
        assert.deepEqual(request, { scope: 'unstaged', baseRef: undefined, repository: undefined });
        return {
          schemaVersion: 1,
          status: 'changed',
          repository: '.',
          scope: { kind: 'unstaged', baseRef: null },
          files: [
            { path: 'changed.prw', status: 'modified', binary: false },
            { path: 'binary.tlpp', status: 'modified', binary: true },
            { path: 'deleted.prw', status: 'deleted', binary: false },
            { path: 'notes.md', status: 'modified', binary: false },
          ],
        };
      },
    },
  });

  const report = await runtime.reviewChanges({ scope: 'unstaged' });
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.kind, 'change-review');
  assert.equal(report.summary.filesChanged, 4);
  assert.equal(report.summary.filesReviewed, 1);
  assert.equal(report.summary.findings, 1);
  assert.deepEqual(report.excluded, [
    { path: 'binary.tlpp', reason: 'binary' },
    { path: 'deleted.prw', reason: 'deleted' },
    { path: 'notes.md', reason: 'unsupported-extension' },
  ]);
  assert.equal(report.reviews[0].findings[0].ruleId, 'CA4000');
  assert.equal(report.reviews[0].findings[0].evidence.symbol, 'Changed');
  assert.match(report.reviews[0].findings[0].fingerprint, /^[a-f0-9]{64}$/);
  assert.equal('excerpt' in report.reviews[0].findings[0].evidence, false);
  assert.equal(report.evidence[0].type, 'scm-change-set');
});

test('runtime reviews the exact staged and unstaged source versions when the index diverges from disk', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-runtime-scope-content-'));
  const source = join(workspace, 'changed.prw');
  await execFileAsync('git', ['init', workspace]);
  await writeFile(source, 'User Function Changed()\nReturn\n', 'utf8');
  await execFileAsync('git', ['-C', workspace, 'add', 'changed.prw']);
  await execFileAsync('git', [
    '-C', workspace, '-c', 'user.name=PEA Tests', '-c', 'user.email=pea@example.invalid',
    'commit', '-m', 'baseline',
  ]);
  await writeFile(source, 'User Function Changed()\n    ConOut("staged")\nReturn\n', 'utf8');
  await execFileAsync('git', ['-C', workspace, 'add', 'changed.prw']);
  await writeFile(source, 'User Function Changed()\n    Iif(.T., 1, 0)\nReturn\n', 'utf8');

  const runtime = createRuntime({ workspace });
  const staged = await runtime.reviewChanges({ scope: 'staged' });
  const unstaged = await runtime.reviewChanges({ scope: 'unstaged' });

  assert.deepEqual(staged.reviews[0].findings.map((finding) => finding.ruleId), ['CA1004']);
  assert.deepEqual(unstaged.reviews[0].findings.map((finding) => finding.ruleId), ['CA4000']);
});

test('runtime file and changed-file review enforce bounded source input', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-runtime-limits-'));
  const source = join(workspace, 'large.prw');
  await writeFile(source, 'User Function Large()\n' + ' '.repeat(100) + '\nReturn\n');
  const runtime = createRuntime({
    workspace,
    sourceLimits: { maxSourceBytes: 64, maxReviewTotalBytes: 64 },
    scm: {
      async changes() {
        return {
          schemaVersion: 1,
          status: 'changed',
          repository: '.',
          scope: { kind: 'working-tree', baseRef: null },
          files: [{ path: 'large.prw', status: 'modified', binary: false }],
        };
      },
      async readSource() { return Buffer.alloc(65, 32); },
    },
  });

  await assert.rejects(runtime.reviewFile(source), /per-file source byte limit/);
  await assert.rejects(runtime.reviewChanges(), /changed-source byte limit/);
});

test('runtime change review propagates cancellation through SCM discovery and source reads', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-runtime-scm-cancel-'));
  const waitForAbort = (signal, markStarted) => new Promise((resolve) => {
    markStarted();
    signal.addEventListener('abort', () => resolve(), { once: true });
  });

  let markChangesStarted;
  const changesStarted = new Promise((resolve) => { markChangesStarted = resolve; });
  const changesController = new AbortController();
  const changesRuntime = createRuntime({
    workspace,
    scm: {
      changes({ signal }) { return waitForAbort(signal, markChangesStarted); },
    },
  });
  const changesReview = changesRuntime.reviewChanges({ signal: changesController.signal });
  await changesStarted;
  changesController.abort();
  await assert.rejects(changesReview, (error) => error.code === 'RUNTIME_CANCELLED');

  let markReadStarted;
  const readStarted = new Promise((resolve) => { markReadStarted = resolve; });
  const readController = new AbortController();
  const readRuntime = createRuntime({
    workspace,
    scm: {
      async changes({ signal }) {
        assert.equal(signal, readController.signal);
        return {
          schemaVersion: 1, status: 'changed', repository: '.',
          scope: { kind: 'working-tree', baseRef: null },
          files: [{ path: 'pending.prw', status: 'modified', binary: false }],
        };
      },
      readSource({ signal }) { return waitForAbort(signal, markReadStarted); },
    },
  });
  const readReview = readRuntime.reviewChanges({ signal: readController.signal });
  await readStarted;
  readController.abort();
  await assert.rejects(readReview, (error) => error.code === 'RUNTIME_CANCELLED');
});

test('configured production profile governs mutable runtime operations', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-runtime-production-profile-'));
  await mkdir(join(workspace, '.pea'));
  await writeFile(join(workspace, '.pea', 'config.json'), JSON.stringify({
    schemaVersion: 1,
    locale: 'pt-BR',
    activeProfile: 'release',
    profiles: { release: { environment: 'production' } },
  }));
  const runtime = createRuntime({ workspace });

  await assert.rejects(runtime.writeMemory('must require a grant'), /explicit-grant-required/);
  await assert.rejects(runtime.recordJournal({ kind: 'review' }), /explicit-grant-required/);
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
  assert.equal(doctor.configuration.source, 'default');
  assert.equal(doctor.configuration.activeProfile, 'default');
  assert.equal(doctor.configuration.environment, 'development');
  assert.deepEqual(doctor.hermes, { mode: 'acp', probed: false, available: null });
  assert.equal(graph.nodes.length, 1);
});

test('in-process CLI cache preserves one runtime and its incremental parser per workspace', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-cli-cache-'));
  const runtimeCache = new Map();
  let creations = 0;
  const graph = { schemaVersion: 1, files: [], nodes: [], edges: [], analysis: { cache: { hits: 0, misses: 0 } } };
  const invoke = () => runCli(['index', workspace], {
    stdout: { write() {} }, stderr: { write() {} }, runtimeCache,
    createRuntime() { creations += 1; return { index: async () => graph }; },
  });

  assert.equal(await invoke(), 0);
  assert.equal(await invoke(), 0);
  assert.equal(creations, 1);
  assert.equal(runtimeCache.size, 1);
});

test('cached CLI runtime uses the signal from each operation instead of retaining a cancelled one', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-cli-cache-signal-'));
  const runtimeCache = new Map();
  let creations = 0;
  const runtime = {
    async index({ signal } = {}) {
      if (signal?.aborted) throw new Error('operation cancelled');
      return { schemaVersion: 1, files: [], nodes: [], edges: [], analysis: { cache: { hits: 0, misses: 0 } } };
    },
  };
  const invoke = (signal) => runCli(['index', workspace], {
    stdout: { write() {} }, stderr: { write() {} }, runtimeCache, signal,
    createRuntime() { creations += 1; return runtime; },
  });
  const cancelled = new AbortController();
  cancelled.abort();

  assert.equal(await invoke(new AbortController().signal), 0);
  assert.equal(await invoke(cancelled.signal), 1);
  assert.equal(await invoke(new AbortController().signal), 0);
  assert.equal(creations, 1);
});

test('CLI exposes supervised build prepare, run, status, cancel and evidence commands', async () => {
  const calls = [];
  const controller = new AbortController();
  const runtime = {
    prepareBuild(request) { calls.push(['prepare', request]); return { status: 'prepared', requestId: 'one' }; },
    runBuild(request, context) { calls.push(['run', request, context]); return { status: 'completed', requestId: 'one' }; },
    buildStatus(requestId) { calls.push(['status', requestId]); return { status: 'completed', requestId }; },
    cancelBuild(requestId) { calls.push(['cancel', requestId]); return { status: 'cancelled', requestId }; },
    buildEvidence(requestId) { calls.push(['evidence', requestId]); return { status: 'completed', requestId }; },
  };
  const invoke = async (argv) => {
    let output = '';
    let error = '';
    const code = await runCli(argv, {
      stdout: { write(value) { output += value; } },
      stderr: { write(value) { error += value; } },
      createRuntime() { return runtime; },
      signal: controller.signal,
      async resolveBuildApproval({ requestId, approvalToken }) {
        assert.equal(requestId, 'one');
        assert.equal(approvalToken, 'host-token');
        return { approvedBy: 'developer', approvedAt: '2026-09-08T12:00:00.000Z' };
      },
    });
    assert.equal(code, 0, error);
    return JSON.parse(output);
  };

  assert.equal((await invoke(['build-prepare', 'C:\\workspace', 'verify'])).status, 'prepared');
  assert.equal((await invoke(['build-run', 'C:\\workspace', 'one', 'host-token'])).status, 'completed');
  assert.equal((await invoke(['build-status', 'C:\\workspace', 'one'])).status, 'completed');
  assert.equal((await invoke(['build-cancel', 'C:\\workspace', 'one'])).status, 'cancelled');
  assert.equal((await invoke(['build-evidence', 'C:\\workspace', 'one'])).status, 'completed');
  assert.deepEqual(calls[1][2].approval, {
    approvedBy: 'developer', approvedAt: '2026-09-08T12:00:00.000Z',
  });
  assert.equal(calls[1][2].signal, controller.signal);
});

test('CLI build execution refuses caller-authored approval evidence', async () => {
  let error = '';
  const code = await runCli(['build-run', 'C:\\workspace', 'one', 'developer', '2026-09-08T12:00:00.000Z'], {
    stderr: { write(value) { error += value; } },
    createRuntime() { return { runBuild() { throw new Error('must not run'); } }; },
  });
  assert.equal(code, 1);
  assert.match(error, /host approval resolver is unavailable|requires workspace, request id and host approval token/);
});

test('CLI exposes append, preview, promote and expire context operations', async () => {
  const calls = [];
  const runtime = {
    appendMemory(entry) { calls.push(['append', entry]); return { id: 'memory-1' }; },
    recordJournal(entry) { calls.push(['journal', entry]); return { id: 'journal-1' }; },
    previewJournalPromotion(id, attribution) { calls.push(['preview', id, attribution]); return { status: 'ready' }; },
    promoteJournal(id, attribution) { calls.push(['promote', id, attribution]); return { status: 'promoted' }; },
    expireMemory(at) { calls.push(['expire', at]); return { removed: 1 }; },
  };
  const invoke = async (argv) => {
    let output = '';
    let error = '';
    const code = await runCli(argv, {
      stdout: { write(value) { output += value; } },
      stderr: { write(value) { error += value; } },
      createRuntime() { return runtime; },
    });
    assert.equal(code, 0, error);
    return JSON.parse(output);
  };

  assert.equal((await invoke(['memory-append', 'C:\\workspace', 'maintainer', 'Keep', 'offline'])).id, 'memory-1');
  assert.equal((await invoke(['journal-add', 'C:\\workspace', 'review', 'reviewer', 'Verified', 'change'])).id, 'journal-1');
  assert.equal((await invoke(['journal-preview', 'C:\\workspace', 'journal-1', 'maintainer'])).status, 'ready');
  assert.equal((await invoke(['journal-promote', 'C:\\workspace', 'journal-1', 'maintainer'])).status, 'promoted');
  assert.equal((await invoke(['memory-expire', 'C:\\workspace', '2027-01-01T00:00:00.000Z'])).removed, 1);
  assert.deepEqual(calls[0], ['append', { summary: 'Keep offline', attribution: { actor: 'maintainer', source: 'cli' } }]);
});

test('CLI changed-files review uses the same normalized SCM report', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-cli-changes-'));
  const source = join(workspace, 'changed.prw');
  await writeFile(source, 'User Function Changed()\nReturn\n');
  await execFileAsync('git', ['init', workspace]);
  await execFileAsync('git', ['-C', workspace, 'add', 'changed.prw']);
  await execFileAsync('git', [
    '-C', workspace,
    '-c', 'user.name=PEA Tests',
    '-c', 'user.email=pea@example.invalid',
    'commit', '-m', 'fixture',
  ]);
  await writeFile(source, 'User Function Changed()\n    Iif(.T., 1, 0)\nReturn\n');

  const run = await execFileAsync(process.execPath, [cliPath, 'review-changes', workspace, 'unstaged']);
  const report = JSON.parse(run.stdout);
  const sarifRun = await execFileAsync(process.execPath, [
    cliPath, 'review-changes', workspace, 'unstaged', '--format=sarif',
  ]);
  const sarif = JSON.parse(sarifRun.stdout);

  assert.equal(report.kind, 'change-review');
  assert.deepEqual(report.scope, { kind: 'unstaged', baseRef: null });
  assert.equal(report.summary.filesReviewed, 1);
  assert.equal(report.reviews[0].findings[0].ruleId, 'CA4000');
  assert.equal(sarif.version, '2.1.0');
  assert.equal(sarif.runs[0].results[0].ruleId, 'CA4000');
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
