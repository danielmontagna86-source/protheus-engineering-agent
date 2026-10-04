import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMcpSession } from './mcp-session.mjs';

const productRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(productRoot, 'packages', 'runtime', 'src', 'cli.mjs');
const mcp = join(productRoot, 'packages', 'mcp', 'src', 'stdio.mjs');
import { buildExtension } from './build-extension.mjs';
const startedAt = Date.now();
const checks = [];
const workspace = await mkdtemp(join(tmpdir(), 'pea-release-smoke-'));

function runJson(label, args, options = {}) {
  const result = spawnSync(process.execPath, args, {
    encoding: 'utf8',
    timeout: 30_000,
    windowsHide: true,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} failed (${result.status}): ${result.stderr.trim()}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`${label} returned invalid JSON: ${error.message}`);
  }
}

try {
  const source = join(workspace, 'SMOKE001.prw');
  await writeFile(
    source,
    'User Function SmokeEntry()\n    SmokeHelper()\nReturn\n\nStatic Function SmokeHelper()\nReturn\n',
    'utf8',
  );

  const doctor = runJson('doctor', [cli, 'doctor', workspace]);
  if (doctor.workspace !== workspace) throw new Error('doctor did not report the isolated workspace');
  checks.push('doctor');

  const graph = runJson('index', [cli, 'index', workspace]);
  if (!graph.nodes?.some((node) => node.name === 'SmokeEntry')) {
    throw new Error('index did not discover the smoke entry point');
  }
  checks.push('index');

  const review = runJson('review', [cli, 'review', source, workspace]);
  if (review.file !== 'SMOKE001.prw') throw new Error('review did not analyze the requested workspace source');
  checks.push('review');

  const requests = [
    { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'pea_session_context', arguments: {} } },
  ];
  const built = await buildExtension();
  const mcpEntries = [
    ['mcp-source', mcp],
    ['mcp-bundled', join(built.extensionDist, 'mcp-stdio.mjs')],
  ];
  for (const [label, entrypoint] of mcpEntries) {
    for (const finiteInput of [false, true]) {
      const modeLabel = finiteInput ? `${label}-eof` : label;
      const { responseById } = await runMcpSession(entrypoint, { workspace, requests, finiteInput });
      if (responseById.get(1)?.result?.serverInfo?.name !== 'protheus-engineering-agent') {
        throw new Error(`${modeLabel} initialize returned an unexpected server identity`);
      }
      if (!responseById.get(2)?.result?.tools?.some((tool) => tool.name === 'pea_review_file')) {
        throw new Error(`${modeLabel} tools/list did not expose the review tool`);
      }
      const session = JSON.parse(responseById.get(3)?.result?.content?.[0]?.text ?? '{}');
      if (resolve(session.hermes?.mcp?.args?.[0] ?? '') !== resolve(entrypoint)) {
        throw new Error(`${modeLabel} advertised an invalid nested MCP entrypoint`);
      }
      if (!(await stat(entrypoint)).isFile()) throw new Error(`${modeLabel} entrypoint does not exist`);
      checks.push(modeLabel);
    }
  }

  process.stdout.write(`${JSON.stringify({ status: 'PASS', durationMs: Date.now() - startedAt, checks })}\n`);
} finally {
  await rm(workspace, { recursive: true, force: true });
}
