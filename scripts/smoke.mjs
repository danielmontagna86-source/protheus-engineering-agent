import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const productRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(productRoot, 'packages', 'runtime', 'src', 'cli.mjs');
const mcp = join(productRoot, 'packages', 'mcp', 'src', 'stdio.mjs');
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
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } },
    { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
  ];
  const mcpResult = spawnSync(process.execPath, [mcp], {
    cwd: workspace,
    encoding: 'utf8',
    env: { ...process.env, PEA_WORKSPACE: workspace, PEA_ENVIRONMENT: 'production' },
    input: `${requests.map((request) => JSON.stringify(request)).join('\n')}\n`,
    timeout: 30_000,
    windowsHide: true,
  });
  if (mcpResult.error) throw mcpResult.error;
  if (mcpResult.status !== 0) {
    throw new Error(`mcp failed (${mcpResult.status}): ${mcpResult.stderr.trim()}`);
  }
  const responses = mcpResult.stdout.trim().split(/\r?\n/).map((line) => JSON.parse(line));
  if (responses[0]?.result?.serverInfo?.name !== 'protheus-engineering-agent') {
    throw new Error('MCP initialize returned an unexpected server identity');
  }
  if (!responses[1]?.result?.tools?.some((tool) => tool.name === 'pea_review_file')) {
    throw new Error('MCP tools/list did not expose the review tool');
  }
  checks.push('mcp');

  process.stdout.write(`${JSON.stringify({ status: 'PASS', durationMs: Date.now() - startedAt, checks })}\n`);
} finally {
  await rm(workspace, { recursive: true, force: true });
}
