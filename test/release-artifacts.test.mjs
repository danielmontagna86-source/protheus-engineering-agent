import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

import AdmZip from 'adm-zip';

import {
  artifactPath,
  createReleaseEvidenceTemplate,
  normalizeZipArchive,
  sha256,
  verifySbom,
  verifySourceArchive,
} from '../scripts/release-artifacts.mjs';
import { assertNoLinkPath } from '../scripts/path-safety.mjs';
import { validateReleaseManifest } from '../scripts/verify-release.mjs';
import { verifyVsix } from '../scripts/verify-vsix.mjs';

const version = '0.2.0-alpha.1';
const prefix = `protheus-engineering-agent-v${version}/`;

function sourceArchive(path, extraEntries = []) {
  const zip = new AdmZip();
  zip.addFile(`${prefix}README.md`, Buffer.from('# Product\n'));
  zip.addFile(`${prefix}LICENSE.md`, Buffer.from('Apache-2.0\n'));
  zip.addFile(`${prefix}package-lock.json`, Buffer.from('{}\n'));
  zip.addFile(`${prefix}package.json`, Buffer.from(JSON.stringify({ version })));
  for (const [name, contents] of extraEntries) zip.addFile(`${prefix}${name}`, Buffer.from(contents));
  zip.writeZip(path);
}

function vsixArchive(path, extraEntries = []) {
  const zip = new AdmZip();
  const entries = [
    ['[Content_Types].xml', '<Types/>'],
    ['extension.vsixmanifest', '<PackageManifest/>'],
    ['extension/package.json', JSON.stringify({ version })],
    ['extension/extension.cjs', 'module.exports = {};'],
    ['extension/dist/runtime-cli.mjs', 'export {};'],
    ['extension/dist/mcp-stdio.mjs', 'export {};'],
    ['extension/readme.md', '# Extension'],
    ['extension/license.md', 'Apache-2.0'],
    ['extension/changelog.md', '# Changelog'],
    ...extraEntries,
  ];
  for (const [name, contents] of entries) zip.addFile(name, Buffer.from(contents));
  zip.writeZip(path);
}

test('release artifact paths are contained under the ignored artifact directory', () => {
  const root = join(tmpdir(), 'pea-release-root');
  assert.match(artifactPath(root, 'release-artifacts/source.zip'), /release-artifacts[\\/]source\.zip$/);
  assert.throws(() => artifactPath(root, 'outside.zip'), /outside release-artifacts/);
});

test('release manifest validation fails closed without throwing on malformed artifact records', () => {
  assert.deepEqual(validateReleaseManifest(null), ['release manifest must be a JSON object']);
  assert.deepEqual(validateReleaseManifest({}), ['release manifest artifacts must be an array']);
  const errors = validateReleaseManifest({ artifacts: [null, { path: 42, bytes: -1, sha256: 'invalid' }] });
  assert.ok(errors.includes('release artifact 1 must be an object'));
  assert.ok(errors.includes('release artifact 2 path must be a non-empty string'));
  assert.ok(errors.includes('release artifact 2 bytes must be a positive safe integer'));
  assert.ok(errors.includes('release artifact 2 SHA-256 must be 64 lowercase hexadecimal characters'));
  assert.ok(errors.includes('release must contain source, VSIX, and CycloneDX SBOM artifacts'));
});

test('release evidence template is bound to the exact manifest and remains fail-closed', () => {
  const artifacts = [{ path: 'release-artifacts/source.zip', sha256: 'a'.repeat(64), bytes: 42 }];
  const evidence = createReleaseEvidenceTemplate({
    version,
    commit: 'b'.repeat(40),
    artifacts,
    manifest: {
      path: 'release-artifacts/release-manifest-v0.2.0-alpha.1.json',
      sha256: 'c'.repeat(64),
    },
  });

  assert.equal(evidence.status, 'NO-GO');
  assert.equal(evidence.commit, 'b'.repeat(40));
  assert.deepEqual(evidence.artifacts, [{ path: 'release-artifacts/source.zip', sha256: 'a'.repeat(64) }]);
  assert.deepEqual(evidence.releaseManifest, {
    path: 'release-artifacts/release-manifest-v0.2.0-alpha.1.json',
    sha256: 'c'.repeat(64),
  });
  assert.equal(evidence.freshInstall.passed, false);
  assert.equal(evidence.freshInstall.vsixSha256, null);
  assert.equal(evidence.approvedBy, null);
});

test('release manifest validator requires exact provenance and verification fields', () => {
  const artifact = (path, marker) => ({ path, bytes: 42, sha256: marker.repeat(64) });
  const manifest = {
    schemaVersion: 1,
    version,
    commit: 'a'.repeat(40),
    generatedAt: '2026-09-07T20:00:00.000Z',
    artifacts: [
      artifact('release-artifacts/product-source.zip', 'a'),
      artifact('release-artifacts/product.vsix', 'b'),
      artifact('release-artifacts/product.cdx.json', 'c'),
    ],
    verification: { publication: 'PASS', sourceArchive: 'PASS', vsix: 'PASS', sbom: 'PASS' },
  };

  assert.deepEqual(validateReleaseManifest(manifest), []);
  manifest.verification.vsix = 'FAIL';
  assert.ok(validateReleaseManifest(manifest).includes('release manifest verification vsix must be PASS'));
});

test('CycloneDX SBOM verification requires the product identity and version', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pea-release-sbom-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const valid = join(root, 'valid.cdx.json');
  const invalid = join(root, 'invalid.cdx.json');
  await writeFile(valid, JSON.stringify({
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    metadata: { component: { name: 'protheus-engineering-agent', version } },
  }), 'utf8');
  await writeFile(invalid, JSON.stringify({
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    metadata: { component: { name: 'other-product', version: '0.0.0' } },
  }), 'utf8');

  assert.equal((await verifySbom(valid, version)).status, 'PASS');
  assert.equal((await verifySbom(invalid, version)).status, 'FAIL');
});

test('source archive allows the public env template and rejects nested Git metadata', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pea-release-archive-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const clean = join(root, 'clean.zip');
  const poisoned = join(root, 'poisoned.zip');
  sourceArchive(clean, [['.env.example', 'PEA_ENVIRONMENT=development\n']]);
  sourceArchive(poisoned, [['recovered/.git/config', '[core]\n']]);

  assert.equal((await verifySourceArchive(clean, version)).status, 'PASS');
  const report = await verifySourceArchive(poisoned, version);
  assert.equal(report.status, 'FAIL');
  assert.ok(report.errors.some((error) => error.includes('recovered/.git/config')));
});

test('archive verifiers report malformed files as failures instead of throwing', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pea-release-malformed-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, 'source.zip');
  const vsix = join(root, 'extension.vsix');
  await Promise.all([
    writeFile(source, 'not a ZIP archive', 'utf8'),
    writeFile(vsix, 'not a VSIX archive', 'utf8'),
  ]);

  assert.equal((await verifySourceArchive(source, version)).status, 'FAIL');
  assert.equal((await verifyVsix(vsix, version)).status, 'FAIL');
});

test('VSIX verifier enforces an exact content allow-list', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pea-release-vsix-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const valid = join(root, 'valid.vsix');
  const unexpected = join(root, 'unexpected.vsix');
  vsixArchive(valid);
  vsixArchive(unexpected, [['extension/extra.txt', 'not allowed']]);

  assert.equal((await verifyVsix(valid, version)).status, 'PASS');
  const report = await verifyVsix(unexpected, version);
  assert.equal(report.status, 'FAIL');
  assert.ok(report.errors.includes('unexpected VSIX entry: extension/extra.txt'));
});

test('ZIP normalization produces a reproducible byte stream', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pea-release-reproducible-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const first = join(root, 'first.zip');
  const second = join(root, 'second.zip');
  const makeArchive = (path, date) => {
    const zip = new AdmZip();
    zip.addFile('extension/package.json', Buffer.from('{}\n'));
    zip.getEntry('extension/package.json').header.time = date;
    zip.writeZip(path);
  };
  makeArchive(first, new Date('2020-01-01T00:00:00Z'));
  makeArchive(second, new Date('2026-09-07T12:34:56Z'));

  await normalizeZipArchive(first);
  await normalizeZipArchive(second);

  assert.equal(await sha256(first), await sha256(second));
  const normalizedEntry = new AdmZip(first).getEntry('extension/package.json');
  assert.equal((normalizedEntry.attr >>> 16) & 0xfff, 0o644);
});

test('release build paths reject a junction before writing outside the repository', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pea-release-root-'));
  const external = await mkdtemp(join(tmpdir(), 'pea-release-external-'));
  t.after(() => Promise.all([
    rm(root, { recursive: true, force: true }),
    rm(external, { recursive: true, force: true }),
  ]));
  await mkdir(join(root, 'safe'), { recursive: true });
  await symlink(external, join(root, 'safe', 'release-artifacts'), 'junction');

  await assert.rejects(
    assertNoLinkPath(root, join(root, 'safe', 'release-artifacts', 'candidate.vsix')),
    /symbolic link or junction/,
  );
});
