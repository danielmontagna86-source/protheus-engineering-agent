import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readFile } from 'node:fs/promises';
import { basename, isAbsolute, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { readZipArchive, writeZipArchive } from './zip.mjs';

const forbiddenArchivePatterns = [
  /(?:^|\/)\.git(?:\/|$)/i,
  /(?:^|\/)\.pea(?:\/|$)/i,
  /(?:^|\/)node_modules(?:\/|$)/i,
  /(?:^|\/)(?:\.vscode-test|coverage|dist)(?:\/|$)/i,
  /(?:^|\/)release-artifacts(?:\/|$)/i,
  /(?:^|\/)\.stryker-tmp(?:\/|$)/i,
  /(?:^|\/)\.worktrees(?:\/|$)/i,
  /(?:^|\/)work(?:\/|$)/i,
];

const NORMALIZED_ZIP_TIME = new Date('2000-01-01T00:00:00.000Z');
const PUBLIC_COMMAND_IDS = Object.freeze([
  'pea.doctor', 'pea.indexWorkspace', 'pea.openContext', 'pea.addMemoryEntry',
  'pea.addJournalEntry', 'pea.promoteJournalEntry', 'pea.expireMemory', 'pea.importSnapshot',
  'pea.searchTdn', 'pea.searchDictionary', 'pea.prepareBuild', 'pea.runBuild',
  'pea.buildStatus', 'pea.cancelBuild', 'pea.buildEvidence', 'pea.reviewActiveFile',
  'pea.reviewChanges', 'pea.refreshEngineeringCenter', 'pea.openSampleWorkspace',
]);
const STABLE_GATE_IDS = Object.freeze([
  'g0BaselineIntegrity', 'g1PremiumP0', 'g2SemanticP1', 'g3Tier0Virtualization',
  'g4OfficialAnalyzer', 'g5OfficialPostgres', 'g6LicensedAppserver',
  'g7PackageLifecycle', 'g8UxAccessibility', 'g9SecuritySupplyChain',
  'g10CompatibilitySupport', 'g11EffectivenessClaims', 'g12ExactRelease',
  'g13PublicationAuthorization',
]);

export function createReleaseEvidenceTemplate({ version, commit, artifacts, manifest }) {
  const evidence = {
    schemaVersion: 1,
    version,
    status: 'NO-GO',
    commit,
    ci: { passed: false, evidence: null },
    codeReview: { passed: false },
    securityReview: { passed: false, evidence: null },
    codeScanning: { passed: false, evidence: null },
    vscodeSmoke: { passed: false, versions: [], commands: 0, commandIds: [], isolated: true },
    freshInstall: {
      passed: false,
      versions: [],
      commands: 0,
      commandIds: [],
      isolated: true,
      vsixSha256: null,
    },
    hermesProbe: { passed: false, isolated: true },
    artifacts: artifacts.map(({ path, sha256 }) => ({ path, sha256 })),
    releaseManifest: manifest,
    approvedBy: null,
  };
  if (Number.parseInt(version.split('.')[0], 10) >= 1) {
    evidence.stableGates = Object.fromEntries(STABLE_GATE_IDS.map((id) => [id, { passed: false, evidence: null }]));
  }
  return evidence;
}

export async function normalizeZipArchive(path) {
  const entries = await readZipArchive(await readFile(path));
  await writeZipArchive(path, entries
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => ({
      ...entry,
      mtime: NORMALIZED_ZIP_TIME,
      mode: entry.isDirectory ? 0o40755 : 0o100644,
    })));
}

export function git(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${String(result.stderr).trim()}`);
  return String(result.stdout).trim();
}

export async function sha256(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

export function artifactPath(root, repositoryPath) {
  const artifactsRoot = resolve(root, 'release-artifacts');
  const absolute = resolve(root, repositoryPath);
  const rel = relative(artifactsRoot, absolute);
  if (!rel || rel === '..' || rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(rel)) {
    throw new Error(`artifact is outside release-artifacts: ${repositoryPath}`);
  }
  return absolute;
}

export async function verifySourceArchive(path, version, { root, commit } = {}) {
  let fileState;
  try {
    fileState = await lstat(path);
  } catch (error) {
    return {
      status: 'FAIL', path: resolve(path), file: basename(path), entries: 0,
      compressedBytes: 0, errors: [`source archive is unavailable: ${error.message}`],
    };
  }
  if (!fileState.isFile() || fileState.isSymbolicLink() || fileState.size > 50 * 1024 * 1024) {
    return {
      status: 'FAIL', path: resolve(path), file: basename(path), entries: 0,
      compressedBytes: fileState.size, errors: ['source archive is unsafe or exceeds the 50 MiB compressed budget'],
    };
  }
  const bytes = await readFile(path);
  let entries;
  try {
    entries = await readZipArchive(bytes);
  } catch (error) {
    return {
      status: 'FAIL',
      path: resolve(path),
      file: basename(path),
      entries: 0,
      compressedBytes: bytes.length,
      errors: [`invalid source archive: ${error.message}`],
    };
  }
  const files = entries.filter((entry) => !entry.isDirectory);
  const names = files.map((entry) => entry.name.replaceAll('\\', '/'));
  const prefix = `protheus-engineering-agent-v${version}/`;
  const errors = [];
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length) {
    errors.push('duplicate or case-colliding source archive entries are not allowed');
  }
  for (const entry of entries) {
    if ((entry.mode & 0o170000) === 0o120000) {
      errors.push(`source archive symbolic link is not allowed: ${entry.name}`);
    }
  }
  for (const required of ['README.md', 'LICENSE.md', 'package.json', 'package-lock.json']) {
    if (!names.includes(`${prefix}${required}`)) errors.push(`source archive missing ${required}`);
  }
  for (const name of names) {
    if (!name.startsWith(prefix) || name.split('/').includes('..')) errors.push(`unsafe source archive path: ${name}`);
    if (/(?:^|\/)\.env(?:\.[^/]+)?$/i.test(name) && !name.toLowerCase().endsWith('/.env.example')) {
      errors.push(`forbidden source archive entry: ${name}`);
    }
    if (forbiddenArchivePatterns.some((pattern) => pattern.test(name))) {
      errors.push(`forbidden source archive entry: ${name}`);
    }
  }
  const packageEntry = files.find((entry) => entry.name === `${prefix}package.json`);
  if (packageEntry) {
    try {
      const manifest = JSON.parse(packageEntry.data.toString('utf8'));
      if (manifest.version !== version) errors.push(`source archive version ${manifest.version} does not match ${version}`);
    } catch (error) {
      errors.push(`invalid source archive package manifest: ${error.message}`);
    }
  }
  if (root || commit) {
    if (!root || !/^[0-9a-f]{40}$/i.test(commit ?? '')) {
      errors.push('source archive provenance requires a repository root and exact 40-character commit');
    } else {
      const reproduced = spawnSync('git', [
        'archive', '--format=zip', `--prefix=${prefix}`, commit,
      ], {
        cwd: root,
        encoding: null,
        maxBuffer: 60 * 1024 * 1024,
        windowsHide: true,
      });
      if (reproduced.error || reproduced.status !== 0) {
        errors.push('source archive could not be reproduced from the declared commit');
      } else if (!Buffer.from(reproduced.stdout).equals(bytes)) {
        errors.push('source archive does not byte-match git archive of the declared commit');
      }
    }
  }
  return {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    path: resolve(path),
    file: basename(path),
    entries: files.length,
    compressedBytes: bytes.length,
    errors,
  };
}

export async function verifySbom(path, version, { root } = {}) {
  const errors = [];
  let document;
  try {
    const fileState = await lstat(path);
    if (!fileState.isFile() || fileState.isSymbolicLink() || fileState.size > 10 * 1024 * 1024) {
      return { status: 'FAIL', path: resolve(path), errors: ['CycloneDX SBOM is unsafe or exceeds the 10 MiB input budget'] };
    }
    document = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    return { status: 'FAIL', path: resolve(path), errors: [`invalid CycloneDX SBOM: ${error.message}`] };
  }
  if (document.bomFormat !== 'CycloneDX') errors.push('SBOM format must be CycloneDX');
  if (document.specVersion !== '1.5') errors.push('SBOM spec version must be 1.5');
  if (document.metadata?.component?.name !== 'protheus-engineering-agent') {
    errors.push('SBOM product name does not match protheus-engineering-agent');
  }
  if (document.metadata?.component?.version !== version) {
    errors.push(`SBOM product version does not match ${version}`);
  }
  if (root) {
    try {
      const [manifest, lockBytes] = await Promise.all([
        readFile(resolve(root, 'package.json'), 'utf8').then(JSON.parse),
        readFile(resolve(root, 'package-lock.json')),
      ]);
      const lock = JSON.parse(lockBytes.toString('utf8'));
      const lockHash = createHash('sha256').update(lockBytes).digest('hex');
      const properties = document.metadata?.properties ?? [];
      if (!properties.some((item) => item?.name === 'pea:package-lock:sha256' && item.value === lockHash)) {
        errors.push('SBOM is not bound to the exact package-lock.json SHA-256');
      }
      if (!Array.isArray(document.components) || !Array.isArray(document.dependencies)) {
        errors.push('SBOM must declare CycloneDX components and dependency relationships');
      } else {
        const productionPackages = Object.entries(lock.packages ?? {})
          .filter(([packagePath, item]) => packagePath && item?.dev !== true && typeof item?.version === 'string')
          .map(([packagePath, item]) => ({
            packagePath,
            name: item.name ?? packagePath.slice(packagePath.lastIndexOf('node_modules/') + 13),
            version: item.version,
            dependencies: Object.keys(item.dependencies ?? {}),
          }));
        const matchedComponents = new Map();
        for (const item of productionPackages) {
          const component = document.components.find((candidate) => (
            candidate?.name === item.name && candidate.version === item.version
          ));
          if (!component || typeof component['bom-ref'] !== 'string') {
            errors.push(`SBOM does not reconcile production package ${item.name}@${item.version} with package-lock.json`);
          } else {
            matchedComponents.set(item.packagePath, component);
            const dependencyNode = document.dependencies.find((candidate) => candidate?.ref === component['bom-ref']);
            if (!dependencyNode || !Array.isArray(dependencyNode.dependsOn)) {
              errors.push(`SBOM dependency graph is missing production package ${item.name}@${item.version}`);
            }
          }
        }
        const rootRef = document.metadata?.component?.['bom-ref'];
        const rootNode = document.dependencies.find((candidate) => candidate?.ref === rootRef);
        for (const name of Object.keys(manifest.dependencies ?? {})) {
          const dependencyPath = resolveLockDependencyPath(lock.packages ?? {}, '', name);
          const component = matchedComponents.get(dependencyPath);
          if (!dependencyPath || !component || !rootNode?.dependsOn?.includes(component['bom-ref'])) {
            errors.push(`SBOM root graph does not reconcile production dependency ${name} with package-lock.json`);
          }
        }
        for (const item of productionPackages) {
          const component = matchedComponents.get(item.packagePath);
          const dependencyNode = document.dependencies.find((candidate) => candidate?.ref === component?.['bom-ref']);
          for (const dependencyName of item.dependencies) {
            const dependencyPath = resolveLockDependencyPath(lock.packages ?? {}, item.packagePath, dependencyName);
            const dependency = matchedComponents.get(dependencyPath);
            if (dependencyPath && !dependencyNode?.dependsOn?.includes(dependency?.['bom-ref'])) {
              errors.push(`SBOM graph omits ${item.name}@${item.version} dependency ${dependencyName}`);
            }
          }
        }
      }
    } catch (error) {
      errors.push(`SBOM lockfile reconciliation failed: ${error.message}`);
    }
  }
  return { status: errors.length === 0 ? 'PASS' : 'FAIL', path: resolve(path), errors };
}

export function resolveLockDependencyPath(packages, parentPath, dependencyName) {
  let current = parentPath;
  while (current) {
    const candidate = `${current}/node_modules/${dependencyName}`;
    if (packages[candidate]?.dev !== true && typeof packages[candidate]?.version === 'string') return candidate;
    const ancestor = current.lastIndexOf('/node_modules/');
    current = ancestor === -1 ? '' : current.slice(0, ancestor);
  }
  const topLevel = `node_modules/${dependencyName}`;
  return packages[topLevel]?.dev !== true && typeof packages[topLevel]?.version === 'string' ? topLevel : null;
}
