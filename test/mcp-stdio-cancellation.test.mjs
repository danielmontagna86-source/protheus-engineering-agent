import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const sdk = pathToFileURL(require.resolve('@modelcontextprotocol/server/stdio')).href;
const serverModule = new URL('../packages/mcp/src/server.mjs', import.meta.url).href;
const transportModule = new URL('../packages/mcp/src/draining-stdio.mjs', import.meta.url).href;
const encode = (message) => `${JSON.stringify(message)}\n`;

for (const mode of ['cancelled', 'deadline']) {
  test(`real MCP stdio ${mode} aborts an in-flight tool and suppresses stale responses`, { timeout: 10_000 }, async (t) => {
    const workspace = await mkdtemp(join(tmpdir(), 'pea-mcp-process-cancel-'));
    const fixture = join(workspace, 'server.mjs');
    await writeFile(fixture, `
import { serveStdio } from ${JSON.stringify(sdk)};
import { createOfficialMcpServer } from ${JSON.stringify(serverModule)};
import { createEofDrainingTransport } from ${JSON.stringify(transportModule)};
const server = createOfficialMcpServer({
  workspace: ${JSON.stringify(workspace)}, subagentAllowedTools: ['review:file'],
  subagentSupervisor: { async run(_spec, context) {
    process.stderr.write('STARTED\\n');
    await new Promise(resolve => context.signal.addEventListener('abort', resolve, { once: true }));
    process.stderr.write('ABORTED:' + context.signal.aborted + '\\n');
    return { schemaVersion: 1, status: 'cancelled' };
  } },
});
serveStdio(() => server, {
  legacy: 'serve', transport: createEofDrainingTransport({ drainTimeoutMs: 100 }),
  onerror(error) { process.stderr.write(String(error.message) + '\\n'); },
});
`);
    const child = spawn(process.execPath, [fixture], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let buffer = '';
    let stderr = '';
    let resolveStarted;
    const started = new Promise((resolve) => { resolveStarted = resolve; });
    const messages = [];
    const waiting = new Map();
    const closed = new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (code) => {
        for (const rejectResponse of waiting.values()) rejectResponse.reject(new Error(`process exited before response (${code}): ${stderr}`));
        waiting.clear();
        resolve(code);
      });
    });
    const deadline = setTimeout(() => child.kill(), 8_000);
    t.after(async () => {
      clearTimeout(deadline);
      child.kill();
      await closed.catch(() => {});
      await rm(workspace, { recursive: true, force: true });
    });
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { stderr += chunk; if (stderr.includes('STARTED\n')) resolveStarted(); });
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const message = JSON.parse(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        messages.push(message);
        waiting.get(message.id)?.resolve(message);
        waiting.delete(message.id);
      }
    });
    const wait = (id) => new Promise((resolve, reject) => { waiting.set(id, { resolve, reject }); });
    const ready = wait(1);
    child.stdin.write(encode({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
      protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'pea-cancel-test', version: '1' },
    } }));
    await ready;
    child.stdin.write(encode({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }));
    child.stdin.write(encode({ jsonrpc: '2.0', id: 0, method: 'tools/call', params: {
      name: 'pea_subagent_run', arguments: { role: 'reviewer', tool: 'review:file', input: {}, parentId: 'root', depth: 1 },
      _meta: { progressToken: 'process-progress' },
    } }));
    await Promise.race([started, closed.then(() => { throw new Error(`tool never started: ${stderr}`); })]);
    if (mode === 'cancelled') {
      child.stdin.write(encode({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 0, reason: 'client cancelled' } }));
      const quiesced = wait(3);
      child.stdin.write(encode({ jsonrpc: '2.0', id: 3, method: 'tools/list', params: {} }));
      await quiesced;
    }
    child.stdin.end();
    assert.equal(await closed, 0, stderr);
    assert.match(stderr, /ABORTED:true/);
    assert.equal(messages.some((message) => message.id === 0), false, 'aborted requests must not emit stale responses');
    assert.equal(messages.find((message) => message.method === 'notifications/progress').params.progressToken, 'process-progress');
    if (mode === 'deadline') assert.match(stderr, /MCP_EOF_DRAIN_TIMEOUT/);
    else assert.doesNotMatch(stderr, /MCP_EOF_DRAIN_TIMEOUT/);
  });
}
