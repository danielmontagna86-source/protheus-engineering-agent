import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { stageVerifiedSdk } from '../scripts/sdk-artifact.mjs';

test('source rebuild fails closed when the local SDK is missing or has different bytes', async (t) => {
  const sourceRoot = await mkdtemp(join(tmpdir(), 'pea-sdk-seed-'));
  t.after(() => rm(sourceRoot, { recursive: true, force: true }));
  const checkout = join(sourceRoot, 'checkout');
  const localSdk = 'release-artifacts/mcp-sdk/modelcontextprotocol-server-2.4.0-verified.tgz';
  await mkdir(checkout);
  await writeFile(join(checkout, 'package.json'), JSON.stringify({
    dependencies: { '@modelcontextprotocol/server': `file:${localSdk}` },
  }));
  await assert.rejects(stageVerifiedSdk({ sourceRoot, checkout }), /Missing verified MCP SDK/);
  await mkdir(join(sourceRoot, 'release-artifacts/mcp-sdk'), { recursive: true });
  await writeFile(join(sourceRoot, localSdk), 'different synthetic bytes');
  await assert.rejects(stageVerifiedSdk({ sourceRoot, checkout }), /failed SHA-256 verification/);
  assert.deepEqual(await readdir(checkout), ['package.json']);
});
