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
