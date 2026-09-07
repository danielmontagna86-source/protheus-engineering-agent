import { mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildExtension } from './build-extension.mjs';
import { normalizeZipArchive } from './release-artifacts.mjs';
import { verifyVsix } from './verify-vsix.mjs';
import { assertNoLinkPath } from './path-safety.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

export async function packageExtension() {
  const build = await buildExtension();
  const artifacts = join(root, 'release-artifacts');
  const artifact = join(artifacts, `protheus-engineering-agent-v${build.version}.vsix`);
  if (dirname(artifact) !== artifacts) throw new Error('refusing artifact outside release-artifacts');
  await assertNoLinkPath(root, artifacts);
  await assertNoLinkPath(root, artifact);
  await mkdir(artifacts, { recursive: true });
  await rm(artifact, { force: true });

  const vsce = join(root, 'node_modules', '@vscode', 'vsce', 'vsce');
  const result = spawnSync(process.execPath, [
    vsce,
    'package',
    '--out', artifact,
    '--no-dependencies',
  ], { cwd: build.stageRoot, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) {
    throw new Error(`vsce package failed: ${String(result.stderr || result.stdout).trim()}`);
  }
  await normalizeZipArchive(artifact);

  const verification = await verifyVsix(artifact, build.version);
  if (verification.status !== 'PASS') throw new Error(verification.errors.join('; '));
  return verification;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${JSON.stringify(await packageExtension(), null, 2)}\n`);
}
