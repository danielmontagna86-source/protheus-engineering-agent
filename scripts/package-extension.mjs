import { mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildExtension } from './build-extension.mjs';
import { git, normalizeZipArchive } from './release-artifacts.mjs';
import { verifyVsix } from './verify-vsix.mjs';
import { assertNoLinkPath } from './path-safety.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

export function selectPackageCommit({ requestedCommit, status, head }) {
  if (requestedCommit !== undefined) {
    if (!/^[0-9a-f]{40}$/.test(requestedCommit)) throw new Error('requested package commit must be an exact lowercase Git SHA');
    return requestedCommit;
  }
  return status === '' && /^[0-9a-f]{40}$/.test(head ?? '') ? head : undefined;
}

export async function packageExtension({ commit, outputPath, productRoot = root } = {}) {
  const packageRoot = resolve(productRoot);
  const selectedCommit = selectPackageCommit({
    requestedCommit: commit,
    status: git(packageRoot, ['status', '--porcelain=v1', '--untracked-files=all']),
    head: git(packageRoot, ['rev-parse', 'HEAD']),
  });
  const build = await buildExtension({ releaseCommit: selectedCommit, productRoot: packageRoot });
  const artifacts = join(packageRoot, 'release-artifacts');
  const artifact = outputPath ? resolve(outputPath) : join(artifacts, `protheus-engineering-agent-v${build.version}.vsix`);
  if (dirname(artifact) !== artifacts) throw new Error('refusing artifact outside release-artifacts');
  await assertNoLinkPath(packageRoot, artifacts);
  await assertNoLinkPath(packageRoot, artifact);
  await mkdir(artifacts, { recursive: true });
  await rm(artifact, { force: true });

  const vsce = join(packageRoot, 'node_modules', '@vscode', 'vsce', 'vsce');
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

  const verification = await verifyVsix(artifact, build.version, { commit: selectedCommit });
  if (verification.status !== 'PASS') throw new Error(verification.errors.join('; '));
  return verification;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${JSON.stringify(await packageExtension(), null, 2)}\n`);
}
