import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

import { createMcpHandler } from '../packages/mcp/src/server.mjs';
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
  assert.equal(listed.result.tools.some((tool) => tool.name === 'pea_write_memory'), true);
  assert.equal(listed.result.tools.some((tool) => tool.name === 'pea_tdn_search'), true);
  assert.equal(listed.result.tools.some((tool) => tool.name === 'pea_dictionary_field'), true);
  assert.equal(listed.result.tools.some((tool) => tool.name === 'pea_bug_review'), true);
  assert.equal(listed.result.tools.some((tool) => tool.name === 'pea_subagent_run'), true);
  assert.equal(listed.result.tools.some((tool) => tool.name === 'pea_ai_task'), true);
  assert.equal(listed.result.tools.some((tool) => tool.name === 'pea_oracle_query'), true);
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
    JSON.stringify({ jsonrpc: '2.0', id: 20, method: 'initialize', params: { protocolVersion: '2025-06-18' } }),
    JSON.stringify({ jsonrpc: '2.0', id: 21, method: 'tools/list', params: {} }),
    '',
  ].join('\n'));

  const [code] = await once(child, 'close');
  assert.equal(code, 0, stderr);
  const responses = stdout.trim().split(/\r?\n/).map((line) => JSON.parse(line));
  assert.equal(responses[0].result.serverInfo.version, productManifest.version);
  assert.ok(responses[1].result.tools.some((tool) => tool.name === 'pea_session_context'));
});

test('MCP stdio rejects an oversized request and continues with the next bounded request', async () => {
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
  assert.equal(code, 0, stderr);
  const responses = stdout.trim().split(/\r?\n/).map((line) => JSON.parse(line));
  assert.equal(responses[0].error.code, -32600);
  assert.match(responses[0].error.message, /exceeds 1048576 bytes/);
  assert.ok(responses[1].result.tools.some((tool) => tool.name === 'pea_doctor'));
});
