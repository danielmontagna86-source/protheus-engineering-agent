import { mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildExtension } from './build-extension.mjs';
import { git } from './release-artifacts.mjs';
import { requiredExtensionEntries, verifyVsix } from './verify-vsix.mjs';
import { assertNoLinkPath } from './path-safety.mjs';
import { writeVsix } from './write-vsix.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const stagedCase = {
  'license.md': 'LICENSE.md',
  'notice': 'NOTICE',
  'third_party_notices.md': 'THIRD_PARTY_NOTICES.md',
  'sample-workspace/readme.md': 'sample-workspace/README.md',
  'skills/protheus-evidence-review/skill.md': 'skills/protheus-evidence-review/SKILL.md',
};
const inventory = requiredExtensionEntries.map((entry) => {
  const name = entry.slice('extension/'.length);
  const source = name === 'changelog.md' ? 'CHANGELOG.md' : name === 'readme.md' ? 'README.md' : stagedCase[name] ?? name;
  return [source, stagedCase[name] ? `extension/${stagedCase[name]}` : entry];
});

export function selectPackageCommit({ requestedCommit, status, head }) {
  if (requestedCommit !== undefined) {
    if (!/^[0-9a-f]{40}$/.test(requestedCommit)) throw new Error('requested package commit must be an exact lowercase Git SHA');
    return requestedCommit;
  }
  return status === '' && /^[0-9a-f]{40}$/.test(head ?? '') ? head : undefined;
}

export async function packageExtension({ commit, outputPath, productRoot = root, collectMcpInputs = false } = {}) {
  const packageRoot = resolve(productRoot);
  const selectedCommit = commit === undefined
    ? selectPackageCommit({
      status: git(packageRoot, ['status', '--porcelain=v1', '--untracked-files=all']),
      head: git(packageRoot, ['rev-parse', 'HEAD']),
    })
    : selectPackageCommit({ requestedCommit: commit });
  const build = await buildExtension({ releaseCommit: selectedCommit, productRoot: packageRoot, collectMcpInputs });
  const artifacts = join(packageRoot, 'release-artifacts');
  const artifact = outputPath ? resolve(outputPath) : join(artifacts, `protheus-engineering-agent-v${build.version}.vsix`);
  if (dirname(artifact) !== artifacts) throw new Error('refusing artifact outside release-artifacts');
  await assertNoLinkPath(packageRoot, artifacts);
  await assertNoLinkPath(packageRoot, artifact);
  await mkdir(artifacts, { recursive: true });
  await rm(artifact, { force: true });

  await writeVsix({ root: build.stageRoot, outputPath: artifact, inventory });

  const verification = await verifyVsix(artifact, build.version, { commit: selectedCommit });
  if (verification.status !== 'PASS') throw new Error(verification.errors.join('; '));
  return collectMcpInputs ? { ...verification, mcpInputs: build.mcpInputs } : verification;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${JSON.stringify(await packageExtension(), null, 2)}\n`);
}
