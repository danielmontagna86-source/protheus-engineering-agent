import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { assessPublication } from './publication-check.mjs';
import { packageExtension } from './package-extension.mjs';
import {
  createReleaseEvidenceTemplate,
  git,
  sha256,
  verifySbom,
  verifySourceArchive,
} from './release-artifacts.mjs';
import { assertNoLinkPath } from './path-safety.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

export function npmSbomInvocation({
  platform = process.platform,
  npmExecPath = process.env.npm_execpath,
  nodeExecutable = process.execPath,
} = {}) {
  const sbomArgs = ['sbom', '--sbom-format', 'cyclonedx'];
  if (npmExecPath) {
    return {
      command: nodeExecutable,
      args: [npmExecPath, ...sbomArgs],
      shell: false,
    };
  }
  return {
    command: platform === 'win32' ? 'npm.cmd' : 'npm',
    args: sbomArgs,
    shell: platform === 'win32',
  };
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function normalizeSbomDocument(value) {
  const document = structuredClone(value);
  delete document.serialNumber;
  if (document.metadata) delete document.metadata.timestamp;
  return canonicalize(document);
}

export async function writeReleaseOutput(productRoot, path, contents) {
  const expectedRoot = resolve(productRoot, 'release-artifacts');
  const target = resolve(path);
  const rel = relative(expectedRoot, target);
  if (!rel || rel === '..' || rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)) {
    throw new Error('release output must stay inside release-artifacts');
  }
  await assertNoLinkPath(productRoot, target);
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, contents, { encoding: 'utf8', flag: 'wx' });
  try {
    await rm(target, { force: true });
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

export async function buildRelease() {
  const dirty = git(root, ['status', '--porcelain=v1', '--untracked-files=all']);
  if (dirty) throw new Error('release artifacts require a clean tracked and untracked source tree');

  const tracked = git(root, ['ls-files']).split(/\r?\n/).filter(Boolean);
  const trackedLocalState = tracked.find((path) => path.split('/').some((part) => (
    ['.pea', '.stryker-tmp', '.vscode-test', '.worktrees', 'coverage', 'dist', 'node_modules', 'work', 'release-artifacts'].includes(part)
  )));
  if (trackedLocalState) throw new Error(`tracked local state cannot enter release: ${trackedLocalState}`);

  const publication = await assessPublication({ root, release: false, excludeLocalState: true });
  if (publication.status !== 'PASS') throw new Error('development publication audit must pass before packaging');

  const manifest = JSON.parse(await (await import('node:fs/promises')).readFile(join(root, 'package.json'), 'utf8'));
  const version = manifest.version;
  const commit = git(root, ['rev-parse', 'HEAD']);
  const artifactsRoot = join(root, 'release-artifacts');
  const source = join(artifactsRoot, `protheus-engineering-agent-v${version}-source.zip`);
  const sbom = join(artifactsRoot, `protheus-engineering-agent-v${version}.cdx.json`);
  await assertNoLinkPath(root, artifactsRoot);
  await assertNoLinkPath(root, source);
  await assertNoLinkPath(root, sbom);
  await mkdir(artifactsRoot, { recursive: true });
  await rm(source, { force: true });

  const archive = spawnSync('git', [
    'archive',
    '--format=zip',
    `--prefix=protheus-engineering-agent-v${version}/`,
    `--output=${source}`,
    commit,
  ], { cwd: root, encoding: 'utf8', windowsHide: true });
  if (archive.status !== 0) throw new Error(`git archive failed: ${String(archive.stderr).trim()}`);

  const vsix = await packageExtension();
  const firstVsixBytes = await readFile(vsix.path);
  const reproducedVsix = await packageExtension();
  if (!firstVsixBytes.equals(await readFile(reproducedVsix.path))) {
    throw new Error('VSIX packaging is not byte-reproducible from the clean source tree');
  }
  const npmInvocation = npmSbomInvocation();
  const sbomResult = spawnSync(npmInvocation.command, npmInvocation.args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true,
    shell: npmInvocation.shell,
  });
  if (sbomResult.error) throw sbomResult.error;
  if (sbomResult.status !== 0) throw new Error(`npm sbom failed: ${String(sbomResult.stderr).trim()}`);
  const sbomDocument = normalizeSbomDocument(JSON.parse(sbomResult.stdout));
  sbomDocument.metadata ??= {};
  sbomDocument.metadata.properties = [
    ...(sbomDocument.metadata.properties ?? []).filter((item) => item?.name !== 'pea:package-lock:sha256'),
    { name: 'pea:package-lock:sha256', value: await sha256(join(root, 'package-lock.json')) },
  ].sort((left, right) => left.name.localeCompare(right.name));
  await writeReleaseOutput(root, sbom, `${JSON.stringify(sbomDocument, null, 2)}\n`);
  const sourceVerification = await verifySourceArchive(source, version, { root, commit });
  if (sourceVerification.status !== 'PASS') throw new Error(sourceVerification.errors.join('; '));
  const sbomVerification = await verifySbom(sbom, version, { root });
  if (sbomVerification.status !== 'PASS') throw new Error(sbomVerification.errors.join('; '));

  const artifacts = [];
  for (const path of [source, vsix.path, sbom]) {
    artifacts.push({
      path: relative(root, path).replaceAll('\\', '/'),
      sha256: await sha256(path),
      bytes: (await (await import('node:fs/promises')).stat(path)).size,
    });
  }
  const releaseManifest = {
    schemaVersion: 1,
    version,
    commit,
    generatedAt: git(root, ['show', '-s', '--format=%cI', commit]),
    artifacts,
    verification: {
      publication: publication.status,
      sourceArchive: sourceVerification.status,
      vsix: vsix.status,
      vsixReproducible: 'PASS',
      sbom: sbomVerification.status,
      sbomLockfile: sbomVerification.status,
    },
  };
  const manifestPath = join(artifactsRoot, `release-manifest-v${version}.json`);
  await writeReleaseOutput(root, manifestPath, `${JSON.stringify(releaseManifest, null, 2)}\n`);
  const evidenceTemplatePath = join(artifactsRoot, `release-evidence-template-v${version}.json`);
  await writeReleaseOutput(root, evidenceTemplatePath, `${JSON.stringify(createReleaseEvidenceTemplate({
    version,
    commit,
    artifacts,
    manifest: {
      path: relative(root, manifestPath).replaceAll('\\', '/'),
      sha256: await sha256(manifestPath),
    },
  }), null, 2)}\n`);
  await writeReleaseOutput(
    root,
    join(artifactsRoot, 'SHA256SUMS'),
    `${artifacts.map((item) => `${item.sha256}  ${item.path.split('/').at(-1)}`).join('\n')}\n`,
  );
  return {
    status: 'PASS',
    manifest: relative(root, manifestPath).replaceAll('\\', '/'),
    evidenceTemplate: relative(root, evidenceTemplatePath).replaceAll('\\', '/'),
    ...releaseManifest,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${JSON.stringify(await buildRelease(), null, 2)}\n`);
}
