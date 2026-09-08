import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, isAbsolute, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import AdmZip from 'adm-zip';

const forbiddenArchivePatterns = [
  /(?:^|\/)\.git(?:\/|$)/i,
  /(?:^|\/)\.pea(?:\/|$)/i,
  /(?:^|\/)node_modules(?:\/|$)/i,
  /(?:^|\/)release-artifacts(?:\/|$)/i,
  /(?:^|\/)\.stryker-tmp(?:\/|$)/i,
  /(?:^|\/)\.worktrees(?:\/|$)/i,
  /(?:^|\/)work(?:\/|$)/i,
];

const NORMALIZED_ZIP_TIME = new Date('2000-01-01T00:00:00.000Z');

export function createReleaseEvidenceTemplate({ version, commit, artifacts, manifest }) {
  return {
    schemaVersion: 1,
    version,
    status: 'NO-GO',
    commit,
    ci: { passed: false, url: null },
    codeReview: { passed: false },
    securityReview: { passed: false },
    vscodeSmoke: { passed: false, versions: [], commands: 4, isolated: true },
    freshInstall: {
      passed: false,
      versions: [],
      commands: 4,
      isolated: true,
      vsixSha256: null,
    },
    hermesProbe: { passed: false, isolated: true },
    artifacts: artifacts.map(({ path, sha256 }) => ({ path, sha256 })),
    releaseManifest: manifest,
    approvedBy: null,
  };
}

export async function normalizeZipArchive(path) {
  const source = new AdmZip(await readFile(path));
  const normalized = new AdmZip();
  const entries = source.getEntries().sort((left, right) => left.entryName.localeCompare(right.entryName));
  for (const entry of entries) {
    normalized.addFile(entry.entryName, entry.getData(), entry.comment, entry.isDirectory ? 0o755 : 0o644);
    normalized.getEntry(entry.entryName).header.time = NORMALIZED_ZIP_TIME;
  }
  normalized.writeZip(path);
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

export async function verifySourceArchive(path, version) {
  const bytes = await readFile(path);
  let zip;
  try {
    zip = new AdmZip(bytes);
    zip.getEntries();
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
  const entries = zip.getEntries().filter((entry) => !entry.isDirectory);
  const names = entries.map((entry) => entry.entryName.replaceAll('\\', '/'));
  const prefix = `protheus-engineering-agent-v${version}/`;
  const errors = [];
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
  const packageEntry = zip.getEntry(`${prefix}package.json`);
  if (packageEntry) {
    try {
      const manifest = JSON.parse(packageEntry.getData().toString('utf8'));
      if (manifest.version !== version) errors.push(`source archive version ${manifest.version} does not match ${version}`);
    } catch (error) {
      errors.push(`invalid source archive package manifest: ${error.message}`);
    }
  }
  return {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    path: resolve(path),
    file: basename(path),
    entries: entries.length,
    compressedBytes: bytes.length,
    errors,
  };
}

export async function verifySbom(path, version) {
  const errors = [];
  let document;
  try {
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
  return { status: errors.length === 0 ? 'PASS' : 'FAIL', path: resolve(path), errors };
}
