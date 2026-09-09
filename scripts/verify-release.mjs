import { lstat, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { artifactPath, git, sha256, verifySbom, verifySourceArchive } from './release-artifacts.mjs';
import { verifyVsix } from './verify-vsix.mjs';
import { rebuildVsixFromSourceArchive } from './build-release.mjs';
import { assertNoLinkPath } from './path-safety.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

export function validateReleaseManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return ['release manifest must be a JSON object'];
  }
  if (!Array.isArray(manifest.artifacts)) {
    return ['release manifest artifacts must be an array'];
  }
  if (manifest.schemaVersion !== 1) errors.push('release manifest schema version must be 1');
  if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
    errors.push('release manifest version must be a non-empty string');
  }
  if (!/^[a-f0-9]{40}$/.test(manifest.commit ?? '')) {
    errors.push('release manifest commit must be a 40-character lowercase SHA');
  }
  if (typeof manifest.generatedAt !== 'string' || Number.isNaN(Date.parse(manifest.generatedAt))) {
    errors.push('release manifest generatedAt must be an ISO timestamp');
  }
  if (manifest.artifacts.length !== 3) errors.push('release must contain source, VSIX, and CycloneDX SBOM artifacts');
  for (const [index, artifact] of manifest.artifacts.entries()) {
    if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) {
      errors.push(`release artifact ${index + 1} must be an object`);
      continue;
    }
    if (typeof artifact.path !== 'string' || artifact.path.length === 0) {
      errors.push(`release artifact ${index + 1} path must be a non-empty string`);
    } else if (!/^release-artifacts\/[A-Za-z0-9._-]+$/.test(artifact.path)) {
      errors.push(`release artifact ${index + 1} path must be inside release-artifacts`);
    }
    if (!Number.isSafeInteger(artifact.bytes) || artifact.bytes <= 0) {
      errors.push(`release artifact ${index + 1} bytes must be a positive safe integer`);
    }
    if (typeof artifact.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(artifact.sha256)) {
      errors.push(`release artifact ${index + 1} SHA-256 must be 64 lowercase hexadecimal characters`);
    }
  }
  const paths = manifest.artifacts.map((artifact) => artifact?.path).filter((path) => typeof path === 'string');
  if (new Set(paths).size !== paths.length) errors.push('release artifact paths must be unique');
  if (!paths.some((path) => path.endsWith('-source.zip'))) errors.push('source archive is missing from release manifest');
  if (!paths.some((path) => path.endsWith('.vsix'))) errors.push('VSIX is missing from release manifest');
  if (!paths.some((path) => path.endsWith('.cdx.json'))) errors.push('CycloneDX SBOM is missing from release manifest');
  for (const key of ['publication', 'sourceArchive', 'vsix', 'vsixReproducible', 'vsixSourceCommit', 'vsixSourceRebuild', 'sbom', 'sbomLockfile']) {
    if (manifest.verification?.[key] !== 'PASS') {
      errors.push(`release manifest verification ${key} must be PASS`);
    }
  }
  return errors;
}

export async function verifyRelease() {
  const product = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const path = join(root, 'release-artifacts', `release-manifest-v${product.version}.json`);
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  const errors = validateReleaseManifest(manifest);
  const head = git(root, ['rev-parse', 'HEAD']);
  if (manifest.version !== product.version) errors.push('release manifest version does not match the product');
  if (manifest.commit !== head) errors.push('release manifest commit does not match HEAD');
  if (git(root, ['status', '--porcelain=v1', '--untracked-files=all'])) errors.push('source tree is not clean');

  const artifacts = Array.isArray(manifest.artifacts)
    ? manifest.artifacts.filter((artifact) => artifact && typeof artifact === 'object' && typeof artifact.path === 'string')
    : [];
  for (const artifact of artifacts) {
    try {
      const absolute = artifactPath(root, artifact.path);
      await assertNoLinkPath(root, absolute);
      const info = await lstat(absolute);
      if (!info.isFile() || info.isSymbolicLink()) errors.push(`${artifact.path} is not a regular file`);
      if (info.size !== artifact.bytes) errors.push(`${artifact.path} size does not match manifest`);
      if (await sha256(absolute) !== artifact.sha256) errors.push(`${artifact.path} SHA-256 does not match manifest`);
    } catch (error) {
      errors.push(String(error.message ?? error));
    }
  }
  const source = artifacts.find((item) => item.path.endsWith('-source.zip'));
  const vsix = artifacts.find((item) => item.path.endsWith('.vsix'));
  const sbom = artifacts.find((item) => item.path.endsWith('.cdx.json'));
  let sourceVerified = false;
  if (source) {
    const report = await verifySourceArchive(artifactPath(root, source.path), product.version, {
      root,
      commit: manifest.commit,
    });
    errors.push(...report.errors);
    sourceVerified = report.status === 'PASS';
  } else {
    errors.push('source archive is missing');
  }
  if (vsix) {
    const originalPath = artifactPath(root, vsix.path);
    const report = await verifyVsix(originalPath, product.version, { commit: manifest.commit });
    errors.push(...report.errors);
    try {
      if (!sourceVerified) throw new Error('source archive did not pass provenance and safety verification');
      await rebuildVsixFromSourceArchive({
        sourcePath: artifactPath(root, source.path),
        version: product.version,
        commit: manifest.commit,
        expectedSha256: vsix.sha256,
      });
    } catch (error) {
      errors.push(`VSIX source rebuild failed: ${error.message}`);
    }
  } else {
    errors.push('VSIX artifact is missing');
  }
  if (sbom) {
    const report = await verifySbom(artifactPath(root, sbom.path), product.version, { root });
    errors.push(...report.errors);
  } else {
    errors.push('CycloneDX SBOM artifact is missing');
  }

  return { status: errors.length === 0 ? 'PASS' : 'FAIL', version: product.version, commit: head, errors };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await verifyRelease();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status !== 'PASS') process.exitCode = 1;
}
