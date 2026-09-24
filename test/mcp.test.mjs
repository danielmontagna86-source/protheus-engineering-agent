import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

import { InMemoryTransport, McpServer } from '@modelcontextprotocol/server';

import { createMcpHandler, createOfficialMcpServer } from '../packages/mcp/src/server.mjs';
import productManifest from '../package.json' with { type: 'json' };

test('MCP handler initializes and lists the product tools', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-'));
  const handle = createMcpHandler({ workspace });

  const initialized = await handle({
    jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' },
  });
  const listed = await handle({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });

  assert.equal(initialized.result.serverInfo.name, 'protheus-engineering-agent');
  assert.equal(initialized.result.serverInfo.version, productManifest.version);
  assert.equal(listed.result.tools.some((tool) => tool.name === 'pea_review_file'), true);
  assert.equal(listed.result.tools.some((tool) => tool.name === 'pea_review_changes'), true);
  assert.equal(listed.result.tools.some((tool) => tool.name === 'pea_write_memory'), true);
  assert.equal(listed.result.tools.some((tool) => tool.name === 'pea_promote_journal'), true);
  assert.equal(listed.result.tools.some((tool) => tool.name === 'pea_tdn_search'), true);
  assert.equal(listed.result.tools.some((tool) => tool.name === 'pea_dictionary_field'), true);
  assert.equal(listed.result.tools.some((tool) => tool.name === 'pea_bug_review'), true);
  assert.equal(listed.result.tools.some((tool) => tool.name === 'pea_subagent_run'), true);
  assert.equal(listed.result.tools.some((tool) => tool.name === 'pea_ai_task'), true);
  assert.equal(listed.result.tools.some((tool) => tool.name === 'pea_oracle_query'), true);
  assert.equal(listed.result.tools.some((tool) => tool.name === 'pea_database_query'), true);
  assert.equal(listed.result.tools.some((tool) => tool.name === 'pea_build_run'), false);
});

test('MCP exposes governed structured Memory and Journal lifecycle tools', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-context-lifecycle-'));
  const handle = createMcpHandler({ workspace, environment: 'development' });
  const invoke = async (id, name, args) => {
    const response = await handle({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });
    assert.equal(response.result.isError, false, response.result.content[0].text);
    return JSON.parse(response.result.content[0].text);
  };

  const journal = await invoke(60, 'pea_record_journal', {
    id: 'decision-1', kind: 'decision', summary: 'Keep offline review.', actor: 'reviewer',
  });
  const preview = await invoke(61, 'pea_preview_journal_promotion', { journalId: journal.id, actor: 'maintainer' });
  const promoted = await invoke(62, 'pea_promote_journal', { journalId: journal.id, actor: 'maintainer' });
  const expired = await invoke(63, 'pea_expire_memory', { at: '2027-01-01T00:00:00.000Z' });

  assert.equal(preview.status, 'ready');
  assert.equal(promoted.status, 'promoted');
  assert.equal(expired.removed, 0);
});

test('official MCP server registers tools and bounded project resources through the SDK', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-official-'));
  await writeFile(join(workspace, 'entry.prw'), 'User Function McpEntry()\nReturn\n');

  const server = createOfficialMcpServer({ workspace });

  assert.ok(server instanceof McpServer);
  assert.equal(Object.hasOwn(server._registeredTools, 'pea_review_file'), true);
  assert.equal(Object.hasOwn(server._registeredTools, 'pea_review_changes'), true);
  assert.equal(Object.hasOwn(server._registeredTools, 'pea_build_run'), false);
  assert.equal(Object.hasOwn(server._registeredResources, 'pea://project-context'), true);
  assert.equal(Object.hasOwn(server._registeredResources, 'pea://session-context'), true);
});

test('embedded MCP host advertises build execution only when it supplies an approval resolver', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-build-advertisement-'));
  const server = createOfficialMcpServer({
    workspace,
    resolveBuildApproval: async () => ({ approvedBy: 'host', approvedAt: '2026-09-09T12:00:00.000Z' }),
  });
  assert.equal(Object.hasOwn(server._registeredTools, 'pea_build_run'), true);
});

test('official MCP tool forwards protocol cancellation to governed subagents', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-cancel-'));
  const observed = [];
  const server = createOfficialMcpServer({
    workspace,
    subagentAllowedTools: ['review:file'],
    subagentSupervisor: {
      async run(_spec, context) {
        observed.push(context.signal);
        return { schemaVersion: 1, status: 'cancelled' };
      },
    },
  });
  const controller = new AbortController();
  controller.abort();

  const result = await server._registeredTools.pea_subagent_run.handler({
    role: 'reviewer', tool: 'review:file', input: {}, parentId: 'root', depth: 1,
  }, { mcpReq: { signal: controller.signal } });

  assert.equal(result.isError, false);
  assert.equal(observed[0], controller.signal);
  assert.equal(observed[0].aborted, true);
});

test('official MCP wire emits progress and cancels an in-flight tool request', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-wire-cancel-'));
  let markStarted;
  const started = new Promise((resolve) => { markStarted = resolve; });
  let markCancelled;
  const cancelled = new Promise((resolve) => { markCancelled = resolve; });
  const server = createOfficialMcpServer({
    workspace,
    subagentAllowedTools: ['review:file'],
    subagentSupervisor: {
      async run(_spec, context) {
        markStarted();
        await new Promise((resolve) => context.signal.addEventListener('abort', resolve, { once: true }));
        markCancelled();
        return { schemaVersion: 1, status: 'cancelled' };
      },
    },
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const messages = [];
  const waitFor = (predicate) => new Promise((resolve) => {
    const inspect = (message) => {
      messages.push(message);
      if (predicate(message)) resolve(message);
    };
    clientTransport.onmessage = inspect;
  });
  await server.connect(serverTransport);
  await clientTransport.start();

  let responsePromise = waitFor((message) => message.id === 1);
  await clientTransport.send({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'wire-test', version: '1' } },
  });
  await responsePromise;
  await clientTransport.send({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} });

  waitFor((message) => message.id === 2);
  const callSend = clientTransport.send({
    jsonrpc: '2.0', id: 2, method: 'tools/call', params: {
      _meta: { progressToken: 'wire-progress' },
      name: 'pea_subagent_run',
      arguments: { role: 'reviewer', tool: 'review:file', input: {}, parentId: 'root', depth: 1 },
    },
  });
  await Promise.race([
    started,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`tool did not start: ${JSON.stringify(messages)}`)), 1_000)),
  ]);
  const cancelSend = clientTransport.send({
    jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 2, reason: 'test cancellation' },
  });
  await callSend;
  await cancelSend;
  await cancelled;
  const quiesced = waitFor((message) => message.id === 3);
  await clientTransport.send({ jsonrpc: '2.0', id: 3, method: 'tools/list', params: {} });
  await quiesced;

  const progress = messages.filter((message) => message.method === 'notifications/progress');
  assert.equal(progress[0].params.progressToken, 'wire-progress');
  assert.equal(progress[0].params.progress, 0);
  assert.equal(messages.some((message) => message.id === 2), false, 'cancelled requests must not emit a stale response');
  await server.close();
  await clientTransport.close();
});

test('MCP changed-files review preserves the normalized SCM scope contract', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-changes-'));
  await writeFile(join(workspace, 'changed.prw'), 'User Function Changed()\nReturn\n');
  const observed = [];
  const handle = createMcpHandler({
    workspace,
    scm: {
      async changes(request) {
        observed.push(request);
        return {
          schemaVersion: 1,
          status: 'changed',
          repository: '.',
          scope: { kind: request.scope, baseRef: request.baseRef },
          files: [{ path: 'changed.prw', status: 'modified', binary: false }],
        };
      },
    },
  });

  const response = await handle({
    jsonrpc: '2.0', id: 46, method: 'tools/call',
    params: {
      name: 'pea_review_changes',
      arguments: { scope: 'branch', baseRef: 'origin/main', repository: workspace },
    },
  });
  const report = JSON.parse(response.result.content[0].text);
  const sarifResponse = await handle({
    jsonrpc: '2.0', id: 47, method: 'tools/call',
    params: {
      name: 'pea_review_changes',
      arguments: { scope: 'branch', baseRef: 'origin/main', repository: workspace, format: 'sarif' },
    },
  });
  const sarif = JSON.parse(sarifResponse.result.content[0].text);

  assert.equal(response.result.isError, false);
  assert.equal(sarifResponse.result.isError, false);
  assert.deepEqual(observed, [
    { scope: 'branch', baseRef: 'origin/main', repository: workspace },
    { scope: 'branch', baseRef: 'origin/main', repository: workspace },
  ]);
  assert.equal(report.kind, 'change-review');
  assert.equal(report.summary.filesReviewed, 1);
  assert.equal(sarif.version, '2.1.0');
});

test('MCP exposes only configured Oracle named-query adapters', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-oracle-'));
  const handle = createMcpHandler({
    workspace,
    oracleAdapter: {
      async invoke(operation, args) {
        return { ok: true, integration: 'oracle', operation, data: { name: args.name, rows: [] } };
      },
    },
  });
  const response = await handle({
    jsonrpc: '2.0', id: 45, method: 'tools/call',
    params: { name: 'pea_oracle_query', arguments: { name: 'receivable', binds: { customer: '1' } } },
  });
  const result = JSON.parse(response.result.content[0].text);
  assert.equal(result.ok, true);
  assert.equal(result.data.name, 'receivable');
});

test('MCP exposes a host-injected provider-neutral database named-query adapter', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-database-'));
  const calls = [];
  const handle = createMcpHandler({
    workspace,
    databaseAdapter: {
      async invoke(operation, args, context) {
        calls.push({ operation, args, signal: context.signal });
        return { ok: true, integration: 'postgres', operation, data: { rows: [{ table_name: 'sys_usr' }] } };
      },
    },
  });
  const response = await handle({
    jsonrpc: '2.0', id: 145, method: 'tools/call',
    params: { name: 'pea_database_query', arguments: { name: 'catalog', binds: { schema: 'public' } } },
  });
  const result = JSON.parse(response.result.content[0].text);

  assert.equal(response.result.isError, false);
  assert.equal(result.integration, 'postgres');
  assert.deepEqual(calls[0].args, { name: 'catalog', binds: { schema: 'public' } });

  const rawSql = await handle({
    jsonrpc: '2.0', id: 146, method: 'tools/call',
    params: { name: 'pea_database_query', arguments: { name: 'catalog', binds: {}, sql: 'SELECT secret FROM customer' } },
  });
  assert.equal(rawSql.result.isError, true);
  assert.match(rawSql.result.content[0].text, /unexpected argument: sql/);
});

test('MCP uses an injected provider-neutral AI gateway without making it a core dependency', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-ai-'));
  const handle = createMcpHandler({
    workspace,
    aiGateway: {
      async run(request, context) {
        return { schemaVersion: 1, status: 'completed', instruction: request.instruction, environment: context.environment };
      },
    },
  });
  const response = await handle({
    jsonrpc: '2.0', id: 44, method: 'tools/call',
    params: { name: 'pea_ai_task', arguments: { instruction: 'Summarize', context: { source: 'data' } } },
  });
  const result = JSON.parse(response.result.content[0].text);
  assert.equal(result.status, 'completed');
  assert.equal(result.environment, 'production');
});

test('MCP fails closed when a tool response exceeds the protocol output budget', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-output-limit-'));
  const handle = createMcpHandler({
    workspace,
    aiGateway: { async run() { return { text: 'x'.repeat((1024 * 1024) + 1) }; } },
  });
  const response = await handle({
    jsonrpc: '2.0', id: 47, method: 'tools/call',
    params: { name: 'pea_ai_task', arguments: { instruction: 'large', context: {} } },
  });
  assert.equal(response.result.isError, true);
  assert.match(response.result.content[0].text, /MCP_RESPONSE_TOO_LARGE/);
});

test('MCP exposes the complete supervised build lifecycle through the runtime port', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-build-'));
  const calls = [];
  const buildService = {
    prepare(request) { calls.push(['prepare', request]); return { status: 'prepared', requestId: 'build-one' }; },
    run(request, context) { calls.push(['run', request, context]); return { status: 'completed', requestId: request.requestId }; },
    status(requestId) { return { status: 'completed', requestId }; },
    cancel(requestId) { return { status: 'cancelled', requestId }; },
    evidence(requestId) { return { status: 'completed', requestId, evidenceLevel: 'simulation' }; },
  };
  const handle = createMcpHandler({
    workspace,
    buildService,
    environment: 'development',
    grants: ['build:execute'],
    async resolveBuildApproval({ requestId, approvalToken }) {
      assert.equal(requestId, 'build-one');
      assert.equal(approvalToken, 'host-issued-token');
      return { approvedBy: 'developer', approvedAt: '2026-09-08T12:00:00.000Z' };
    },
  });

  const invoke = async (id, name, args) => {
    const response = await handle({
      jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args },
    });
    assert.equal(response.result.isError, false, response.result.content[0].text);
    return JSON.parse(response.result.content[0].text);
  };
  const prepared = await invoke(50, 'pea_build_prepare', { planId: 'verify' });
  const completed = await invoke(51, 'pea_build_run', {
    requestId: prepared.requestId,
    approvalToken: 'host-issued-token',
  });
  assert.equal((await invoke(52, 'pea_build_status', { requestId: prepared.requestId })).status, 'completed');
  assert.equal((await invoke(53, 'pea_build_cancel', { requestId: prepared.requestId })).status, 'cancelled');
  assert.equal((await invoke(54, 'pea_build_evidence', { requestId: prepared.requestId })).evidenceLevel, 'simulation');
  assert.equal(completed.status, 'completed');
  assert.equal(calls[1][2].environment, 'development');
});

test('MCP build execution fails closed without a host approval resolver', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-build-approval-'));
  const handle = createMcpHandler({
    workspace,
    buildService: { run() { throw new Error('must not run'); } },
    environment: 'development',
    grants: ['build:execute'],
  });
  const response = await handle({
    jsonrpc: '2.0', id: 55, method: 'tools/call',
    params: { name: 'pea_build_run', arguments: { requestId: 'build-one', approvalToken: 'forged' } },
  });

  assert.equal(response.result.isError, true);
  assert.match(response.result.content[0].text, /tool is not advertised by this host/);
});

test('MCP runs only host-configured bounded subagent tools', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-subagent-'));
  const observed = [];
  const handle = createMcpHandler({
    workspace,
    subagentAllowedTools: ['review:file'],
    subagentSupervisor: {
      async run(spec, context) {
        observed.push({ spec, context });
        return { schemaVersion: 1, status: 'completed', parentId: context.parentId, tool: spec.tool };
      },
    },
  });
  const response = await handle({
    jsonrpc: '2.0', id: 43, method: 'tools/call',
    params: {
      name: 'pea_subagent_run',
      arguments: { role: 'reviewer', tool: 'review:file', input: { path: 'a.prw' }, parentId: 'root', depth: 1 },
    },
  });
  const result = JSON.parse(response.result.content[0].text);

  assert.equal(response.result.isError, false);
  assert.equal(result.status, 'completed');
  assert.deepEqual(observed[0].context.allowedTools, ['review:file']);
  assert.equal('mutating' in observed[0].spec, false);
});

test('MCP does not accept caller-controlled subagent mutability', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-subagent-policy-'));
  const handle = createMcpHandler({ workspace });
  const response = await handle({
    jsonrpc: '2.0', id: 46, method: 'tools/call',
    params: {
      name: 'pea_subagent_run',
      arguments: { role: 'fixer', tool: 'workspace:patch', input: {}, parentId: 'root', depth: 1, mutating: false },
    },
  });
  assert.equal(response.result.isError, true);
  assert.match(response.result.content[0].text, /unexpected argument: mutating/);
});

test('MCP bug review returns source, impact and residual-risk evidence', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-bug-review-'));
  const target = join(workspace, 'target.prw');
  await writeFile(target, 'User Function Target()\nReturn\n');
  await writeFile(join(workspace, 'caller.prw'), 'User Function Caller()\n    Target()\nReturn\n');
  const handle = createMcpHandler({ workspace });

  const response = await handle({
    jsonrpc: '2.0', id: 42, method: 'tools/call',
    params: {
      name: 'pea_bug_review',
      arguments: { title: 'Target regression', path: target, targetSymbol: 'Target' },
    },
  });
  const report = JSON.parse(response.result.content[0].text);

  assert.equal(response.result.isError, false);
  assert.equal(report.schemaVersion, 2);
  assert.deepEqual(report.impact.callers, ['Caller']);
  assert.ok(report.residualRisks.some((risk) => risk.code === 'BUILD_NOT_VERIFIED'));
});

test('MCP exposes configured read-only TDN and Dictionary evidence', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-integrations-'));
  const tdnPath = join(workspace, 'tdn.json');
  const dictionaryPath = join(workspace, 'dictionary.json');
  await writeFile(tdnPath, JSON.stringify({
    kind: 'pea.tdn.snapshot', schemaVersion: 1,
    source: 'https://tdn.totvs.com/example', capturedAt: '2026-09-07T12:00:00.000Z',
    pages: [{ id: '1', title: 'Build', url: 'https://tdn.totvs.com/1', body: 'Compilação' }],
  }));
  await writeFile(dictionaryPath, JSON.stringify({
    kind: 'pea.protheus.dictionary', schemaVersion: 1,
    source: 'customer-export:SX2/SX3', capturedAt: '2026-09-07T12:00:00.000Z',
    tables: [{ name: 'SE1', description: 'Contas a receber', fields: [
      { name: 'E1_PREFIXO', type: 'C', title: 'Prefixo' },
    ] }],
  }));
  const handle = createMcpHandler({ workspace, tdnSnapshotPath: tdnPath, dictionarySnapshotPath: dictionaryPath });

  const tdnResponse = await handle({
    jsonrpc: '2.0', id: 40, method: 'tools/call',
    params: { name: 'pea_tdn_search', arguments: { query: 'compila', limit: 3 } },
  });
  const dictionaryResponse = await handle({
    jsonrpc: '2.0', id: 41, method: 'tools/call',
    params: { name: 'pea_dictionary_field', arguments: { table: 'se1', name: 'e1_prefixo' } },
  });
  const tdn = JSON.parse(tdnResponse.result.content[0].text);
  const dictionary = JSON.parse(dictionaryResponse.result.content[0].text);

  assert.equal(tdn.ok, true);
  assert.equal(tdn.data.items[0].id, '1');
  assert.equal(dictionary.data.field.name, 'E1_PREFIXO');
  assert.equal(dictionary.evidence.mode, 'read-only-snapshot');
});

test('MCP tool call executes the real workspace index and returns JSON text', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-index-'));
  await writeFile(join(workspace, 'entry.prw'), 'User Function McpEntry()\nReturn\n');
  const handle = createMcpHandler({ workspace });

  const response = await handle({
    jsonrpc: '2.0', id: 3, method: 'tools/call',
    params: { name: 'pea_index_workspace', arguments: {} },
  });
  const graph = JSON.parse(response.result.content[0].text);

  assert.equal(response.result.isError, false);
  assert.equal(graph.nodes[0].name, 'McpEntry');
});

test('MCP unknown method produces a JSON-RPC method-not-found error', async () => {
  const handle = createMcpHandler({ workspace: process.cwd() });
  const response = await handle({ jsonrpc: '2.0', id: 9, method: 'unknown/method' });

  assert.deepEqual(response, {
    jsonrpc: '2.0', id: 9,
    error: { code: -32601, message: 'Method not found: unknown/method' },
  });
});

test('MCP rejects undeclared tool arguments instead of silently accepting them', async () => {
  const handle = createMcpHandler({ workspace: process.cwd() });
  const response = await handle({
    jsonrpc: '2.0', id: 12, method: 'tools/call',
    params: { name: 'pea_doctor', arguments: { unexpected: true } },
  });

  assert.equal(response.result.isError, true);
  assert.match(response.result.content[0].text, /unexpected argument/);
});

test('MCP exposes live project skills and isolated Hermes session configuration', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-session-'));
  const skillDir = join(workspace, '.pea', 'skills', 'diagnosis');
  await mkdir(skillDir, { recursive: true });
  await writeFile(join(skillDir, 'SKILL.md'), '# Diagnosis\nTrace before changing.', 'utf8');
  const handle = createMcpHandler({ workspace });

  const listed = await handle({ jsonrpc: '2.0', id: 10, method: 'tools/list', params: {} });
  const response = await handle({
    jsonrpc: '2.0', id: 11, method: 'tools/call',
    params: { name: 'pea_session_context', arguments: {} },
  });
  const session = JSON.parse(response.result.content[0].text);

  assert.equal(listed.result.tools.some((tool) => tool.name === 'pea_session_context'), true);
  assert.equal(response.result.isError, false);
  assert.equal(session.resources.skills[0].name, 'diagnosis');
  assert.equal(session.hermes.mcp.name, 'protheus-engineering-agent');
});

test('MCP stdio process accepts newline-delimited initialize and tools/list requests', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-stdio-'));
  const serverPath = fileURLToPath(new URL('../packages/mcp/src/stdio.mjs', import.meta.url));
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, PEA_WORKSPACE: workspace, PEA_ENVIRONMENT: 'production' },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.stdin.end([
    JSON.stringify({
      jsonrpc: '2.0', id: 20, method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'pea-test', version: '1' } },
    }),
    JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }),
    JSON.stringify({ jsonrpc: '2.0', id: 21, method: 'tools/list', params: {} }),
    JSON.stringify({ jsonrpc: '2.0', id: 22, method: 'resources/list', params: {} }),
    JSON.stringify({ jsonrpc: '2.0', id: 23, method: 'resources/read', params: { uri: 'pea://project-context' } }),
    JSON.stringify({ jsonrpc: '2.0', id: 24, method: 'tools/call', params: { name: 'pea_review_file', arguments: {} } }),
    JSON.stringify({ jsonrpc: '2.0', id: 25, method: 'tools/call', params: { name: 'pea_unknown', arguments: {} } }),
    JSON.stringify({ jsonrpc: '2.0', id: 26, method: 'tools/call', params: { name: 'pea_session_context', arguments: {} } }),
    '',
  ].join('\n'));

  const [code] = await once(child, 'close');
  assert.equal(code, 0, stderr);
  const responses = stdout.trim().split(/\r?\n/).map((line) => JSON.parse(line));
  const responseById = new Map(responses.map((response) => [response.id, response]));
  assert.equal(responseById.get(20).result.serverInfo.version, productManifest.version);
  assert.ok(responseById.get(21).result.tools.some((tool) => tool.name === 'pea_session_context'));
  assert.equal(responseById.get(21).result.tools.some((tool) => tool.name === 'pea_build_run'), false);
  assert.ok(responseById.get(22).result.resources.some((resource) => resource.uri === 'pea://project-context'));
  assert.equal(JSON.parse(responseById.get(23).result.contents[0].text).workspace, workspace);
  assert.equal(responseById.get(24).result.isError, true);
  assert.match(responseById.get(24).result.content[0].text, /required property 'path'/);
  assert.equal(responseById.get(25).error.code, -32602);
  const session = JSON.parse(responseById.get(26).result.content[0].text);
  assert.equal(session.hermes.mcp.args[0], serverPath);
});

test('MCP stdio entrypoint delegates protocol framing to the official SDK', async () => {
  const serverPath = fileURLToPath(new URL('../packages/mcp/src/stdio.mjs', import.meta.url));
  const source = await readFile(serverPath, 'utf8');

  assert.match(source, /@modelcontextprotocol\/server\/stdio/);
  assert.match(source, /serveStdio/);
  assert.doesNotMatch(source, /for await \(const chunkValue of process\.stdin\)/);
});

test('MCP stdio fails closed when an inbound request exceeds one MiB', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-stdio-limit-'));
  const serverPath = fileURLToPath(new URL('../packages/mcp/src/stdio.mjs', import.meta.url));
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, PEA_WORKSPACE: workspace, PEA_ENVIRONMENT: 'production' },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.stdin.end(`${'x'.repeat((1024 * 1024) + 1)}\n${JSON.stringify({ jsonrpc: '2.0', id: 31, method: 'tools/list', params: {} })}\n`);

  const [code] = await once(child, 'close');
  assert.equal(code, 0);
  assert.equal(stdout, '');
  assert.match(stderr, /exceeded maximum size of 1048576 bytes/);
});
