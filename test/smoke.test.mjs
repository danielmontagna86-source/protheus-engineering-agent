import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('release smoke exercises the CLI and MCP critical path in under five minutes', () => {
  const script = fileURLToPath(new URL('../scripts/smoke.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    timeout: 300_000,
    windowsHide: true,
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'PASS');
  assert.deepEqual(report.checks, ['doctor', 'index', 'review', 'mcp-source', 'mcp-bundled']);
  assert.ok(report.durationMs < 300_000);
});
