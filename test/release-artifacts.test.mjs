import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { spawnSync } from 'node:child_process';

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
import {
  completeProductionSbom,
  normalizeSbomDocument,
  npmCiInvocation,
  npmSbomInvocation,
  rebuildVsixFromSourceArchive,
  writeReleaseOutput,
} from '../scripts/build-release.mjs';
import { selectPackageCommit } from '../scripts/package-extension.mjs';
import { createZipBuffer, readZipArchive } from '../scripts/zip.mjs';

const version = '0.3.0';
const prefix = `protheus-engineering-agent-v${version}/`;

test('SBOM invocation uses the active npm CLI for portable Windows execution', () => {
  const invocation = npmSbomInvocation({
    platform: 'win32',
    npmExecPath: 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js',
    nodeExecutable: 'C:\\Program Files\\nodejs\\node.exe',
  });

  assert.equal(invocation.command, 'C:\\Program Files\\nodejs\\node.exe');
  assert.deepEqual(invocation.args, [
    'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js',
    'sbom',
    '--sbom-format',
    'cyclonedx',
    '--omit=dev',
  ]);
  assert.equal(invocation.shell, false);
});

test('clean rebuild installation uses the active npm CLI and the immutable lockfile', () => {
  const invocation = npmCiInvocation({
    platform: 'win32',
    npmExecPath: 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js',
    nodeExecutable: 'C:\\Program Files\\nodejs\\node.exe',
  });

  assert.equal(invocation.command, 'C:\\Program Files\\nodejs\\node.exe');
  assert.deepEqual(invocation.args, [
    'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js',
    'ci',
    '--no-audit',
    '--no-fund',
  ]);
  assert.equal(invocation.shell, false);
});

test('development packaging stamps provenance only for an exact clean commit', () => {
  const head = 'a'.repeat(40);
  assert.equal(selectPackageCommit({ status: '', head }), head);
  assert.equal(selectPackageCommit({ status: ' M source.mjs', head }), undefined);
  assert.equal(selectPackageCommit({ requestedCommit: 'b'.repeat(40), status: ' M source.mjs', head }), 'b'.repeat(40));
  assert.throws(
    () => selectPackageCommit({ requestedCommit: 'not-a-commit', status: '', head }),
    /exact lowercase Git SHA/,
  );
});

async function sourceArchive(path, extraEntries = []) {
  const entries = [
    ['README.md', '# Product\n'],
    ['LICENSE.md', 'Apache-2.0\n'],
    ['package-lock.json', '{}\n'],
    ['package.json', JSON.stringify({ version })],
    ...extraEntries,
  ].map(([name, contents]) => ({ name: `${prefix}${name}`, data: Buffer.from(contents) }));
  await writeFile(path, await createZipBuffer(entries));
}

test('VSIX reproducibility is checked in an isolated source-archive checkout', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pea-isolated-rebuild-test-'));
  const source = join(root, 'source.zip');
  const linkedSource = join(root, 'linked-source');
  const expectedBytes = Buffer.from('isolated rebuilt vsix');
  const expectedSha256 = (await import('node:crypto')).createHash('sha256').update(expectedBytes).digest('hex');
  await sourceArchive(source);
  await symlink(root, linkedSource, process.platform === 'win32' ? 'junction' : 'dir');

  const installDependencies = async (checkout) => {
    assert.notEqual(checkout, root);
    await mkdir(join(checkout, 'node_modules'), { recursive: true });
    await writeFile(join(checkout, 'node_modules', '.clean-install'), 'locked');
  };
  const packageProduct = async ({ productRoot, commit }) => {
    assert.equal(commit, 'a'.repeat(40));
    assert.equal(await readFile(join(productRoot, 'node_modules', '.clean-install'), 'utf8'), 'locked');
    const path = join(productRoot, 'release-artifacts', 'rebuilt.vsix');
    await mkdir(join(productRoot, 'release-artifacts'), { recursive: true });
    await writeFile(path, expectedBytes);
    return { status: 'PASS', path };
  };

  try {
    assert.deepEqual(await rebuildVsixFromSourceArchive({
      sourcePath: source,
      version,
      commit: 'a'.repeat(40),
      expectedSha256,
      installDependencies,
      packageProduct,
    }), {
      status: 'PASS',
      sha256: expectedSha256,
      isolated: true,
      lockedInstall: true,
    });
    await assert.rejects(
      rebuildVsixFromSourceArchive({
        sourcePath: source,
        version,
        commit: 'a'.repeat(40),
        expectedSha256: 'f'.repeat(64),
        installDependencies,
        packageProduct,
      }),
      /does not match/,
    );
    await assert.rejects(
      rebuildVsixFromSourceArchive({
        sourcePath: source,
        version,
        commit: 'a'.repeat(40),
        expectedSha256,
        maxCompressedBytes: 1,
        installDependencies,
        packageProduct,
      }),
      /unsafe or exceeds/,
    );
    await assert.rejects(
      rebuildVsixFromSourceArchive({
        sourcePath: linkedSource,
        version,
        commit: 'a'.repeat(40),
        expectedSha256,
        installDependencies,
        packageProduct,
      }),
      /unsafe or exceeds/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function vsixArchive(path, extraEntries = [], manifestExtras = {}, {
  readme = '# Extension\n\n## Conexões de IA e rotas\n\nSecretStorage\n\nMarketplace\n',
} = {}) {
  const entries = [
    ['[Content_Types].xml', '<Types/>'],
    ['extension.vsixmanifest', '<PackageManifest/>'],
    ['extension/package.json', JSON.stringify({ version, ...manifestExtras })],
    ['extension/extension.cjs', 'module.exports = {};'],
    ['extension/dist/runtime-cli.cjs', 'module.exports = {};'],
    ['extension/dist/runtime-cli.mjs', 'export {};'],
    ['extension/dist/mcp-stdio.mjs', 'export {};'],
    ['extension/dist/codex-app-server.cjs', 'module.exports = {};'],
    ['extension/dist/ai-connections.cjs', 'module.exports = {};'],
    ['extension/dist/ai-connection-store.cjs', 'module.exports = {};'],
    ['extension/dist/ai-providers.cjs', 'module.exports = {};'],
    ['extension/dist/ai-gateway.cjs', 'module.exports = {};'],
    ['extension/dist/policy.cjs', 'module.exports = {};'],
    ['extension/readme.md', readme],
    ['extension/license.md', 'Apache-2.0'],
    ['extension/notice', 'Protheus Engineering Agent\nCopyright 2026 Montagna\n'],
    ['extension/changelog.md', '# Changelog'],
    ['extension/third_party_notices.md', '@modelcontextprotocol/server\nZod\n'],
    ['extension/third-party-licenses/model-context-protocol.txt', 'Apache License\nMIT License\nModel Context Protocol\n'],
    ['extension/third-party-licenses/zod.txt', 'MIT License\nCopyright (c) 2025 Colin McDonnell\n'],
    ['extension/package.nls.json', '{}'],
    ['extension/package.nls.pt-br.json', '{}'],
    ['extension/l10n/bundle.l10n.pt-br.json', '{}'],
    ['extension/media/icon.png', 'fixture icon'],
    ['extension/media/activity-icon.svg', '<svg/>'],
    ['extension/sample-workspace/README.md', '# Offline sample'],
    ['extension/sample-workspace/sample-review.prw', 'User Function PEASample()\nReturn Nil\n'],
    ['extension/skills/protheus-evidence-review/SKILL.md', '# Evidence review'],
    ...extraEntries,
  ];
  await writeFile(path, await createZipBuffer(entries.map(([name, contents]) => ({
    name,
    data: Buffer.from(contents),
  }))));
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
      path: 'release-artifacts/release-manifest-v0.3.0.json',
      sha256: 'c'.repeat(64),
    },
  });

  assert.equal(evidence.status, 'NO-GO');
  assert.equal(evidence.commit, 'b'.repeat(40));
  assert.deepEqual(evidence.artifacts, [{ path: 'release-artifacts/source.zip', sha256: 'a'.repeat(64) }]);
  assert.deepEqual(evidence.releaseManifest, {
    path: 'release-artifacts/release-manifest-v0.3.0.json',
    sha256: 'c'.repeat(64),
  });
  assert.equal(evidence.freshInstall.passed, false);
  assert.equal(evidence.vscodeSmoke.commands, 0);
  assert.deepEqual(evidence.vscodeSmoke.commandIds, []);
  assert.equal(evidence.freshInstall.commands, 0);
  assert.deepEqual(evidence.freshInstall.commandIds, []);
  assert.equal(evidence.stableGates, undefined);
  assert.equal(evidence.freshInstall.vsixSha256, null);
  assert.equal(evidence.approvedBy, null);
});

test('stable evidence template starts with every stable-only gate closed', () => {
  const evidence = createReleaseEvidenceTemplate({
    version: '1.0.0',
    commit: 'b'.repeat(40),
    artifacts: [],
    manifest: { path: 'release-artifacts/release-manifest-v1.0.0.json', sha256: 'c'.repeat(64) },
  });
  assert.deepEqual(Object.keys(evidence.stableGates), [
    'g0BaselineIntegrity', 'g1PremiumP0', 'g2SemanticP1', 'g3Tier0Virtualization',
    'g4OfficialAnalyzer', 'g5OfficialPostgres', 'g6LicensedAppserver',
    'g7PackageLifecycle', 'g8UxAccessibility', 'g9SecuritySupplyChain',
    'g10CompatibilitySupport', 'g11EffectivenessClaims', 'g12ExactRelease',
    'g13PublicationAuthorization',
  ]);
  assert.equal(Object.values(evidence.stableGates).every((gate) => gate.passed === false && gate.evidence === null), true);
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
    verification: {
      publication: 'PASS', sourceArchive: 'PASS', vsix: 'PASS', vsixReproducible: 'PASS',
      vsixSourceCommit: 'PASS', vsixSourceRebuild: 'PASS',
      sbom: 'PASS', sbomLockfile: 'PASS',
    },
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

test('CycloneDX SBOM reconciles production dependencies with the exact lockfile', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pea-release-sbom-lock-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const lockPath = join(root, 'package-lock.json');
  await writeFile(join(root, 'package.json'), JSON.stringify({
    name: 'protheus-engineering-agent', version, dependencies: { '@example/runtime': '1.2.3' },
  }));
  await writeFile(lockPath, JSON.stringify({
    lockfileVersion: 3,
    packages: {
      '': { dependencies: { '@example/runtime': '1.2.3' } },
      'node_modules/@example/runtime': { version: '1.2.3', dependencies: { '@example/transitive': '4.5.6' } },
      'node_modules/@example/transitive': { version: '4.5.6' },
      'node_modules/@example/dev-only': { version: '9.9.9', dev: true },
    },
  }));
  const path = join(root, 'product.cdx.json');
  const document = {
    bomFormat: 'CycloneDX', specVersion: '1.5',
    metadata: {
      component: { 'bom-ref': `protheus-engineering-agent@${version}`, name: 'protheus-engineering-agent', version },
      properties: [{ name: 'pea:package-lock:sha256', value: await sha256(lockPath) }],
    },
    components: [
      { 'bom-ref': '@example/runtime@1.2.3', name: '@example/runtime', version: '1.2.3' },
      { 'bom-ref': '@example/transitive@4.5.6', name: '@example/transitive', version: '4.5.6' },
    ],
    dependencies: [
      { ref: `protheus-engineering-agent@${version}`, dependsOn: ['@example/runtime@1.2.3'] },
      { ref: '@example/runtime@1.2.3', dependsOn: ['@example/transitive@4.5.6'] },
      { ref: '@example/transitive@4.5.6', dependsOn: [] },
    ],
  };
  await writeFile(path, JSON.stringify(document));
  assert.equal((await verifySbom(path, version, { root })).status, 'PASS');
  document.components.splice(1, 1);
  await writeFile(path, JSON.stringify(document));
  assert.equal((await verifySbom(path, version, { root })).status, 'FAIL');
});

test('SBOM completion adds every production lock package and excludes dev-only packages', () => {
  const document = {
    bomFormat: 'CycloneDX', specVersion: '1.5',
    metadata: { component: { 'bom-ref': `protheus-engineering-agent@${version}`, name: 'protheus-engineering-agent', version } },
    components: [], dependencies: [],
  };
  const completed = completeProductionSbom(document, {
    packages: {
      '': { dependencies: { runtime: '1.0.0' } },
      'node_modules/runtime': { version: '1.0.0', dependencies: { transitive: '2.0.0' } },
      'node_modules/transitive': { version: '2.0.0' },
      'node_modules/dev-only': { version: '3.0.0', dev: true },
    },
  });

  assert.deepEqual(completed.components.map((item) => item.name), ['runtime', 'transitive']);
  assert.deepEqual(
    completed.dependencies.find((item) => item.ref === 'runtime@1.0.0').dependsOn,
    ['transitive@2.0.0'],
  );
  assert.deepEqual(
    completed.dependencies.find((item) => item.ref === `protheus-engineering-agent@${version}`).dependsOn,
    ['runtime@1.0.0'],
  );
});

test('SBOM dependency edges follow npm nested resolution when package versions coexist', () => {
  const completed = completeProductionSbom({
    bomFormat: 'CycloneDX', specVersion: '1.5',
    metadata: { component: { 'bom-ref': `protheus-engineering-agent@${version}`, name: 'protheus-engineering-agent', version } },
    components: [], dependencies: [],
  }, {
    packages: {
      '': { dependencies: { parent: '1.0.0', shared: '1.0.0' } },
      'node_modules/parent': { version: '1.0.0', dependencies: { shared: '2.0.0' } },
      'node_modules/shared': { version: '1.0.0' },
      'node_modules/parent/node_modules/shared': { version: '2.0.0' },
    },
  });

  assert.deepEqual(
    completed.dependencies.find((item) => item.ref === 'parent@1.0.0').dependsOn,
    ['shared@2.0.0'],
  );
  assert.deepEqual(
    completed.dependencies.find((item) => item.ref === `protheus-engineering-agent@${version}`).dependsOn,
    ['parent@1.0.0', 'shared@1.0.0'],
  );
});

test('source archive allows the public env template and rejects nested Git metadata', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pea-release-archive-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const clean = join(root, 'clean.zip');
  const poisoned = join(root, 'poisoned.zip');
  await sourceArchive(clean, [['.env.example', 'PEA_ENVIRONMENT=development\n']]);
  await sourceArchive(poisoned, [['recovered/.git/config', '[core]\n']]);
  const ignoredButTracked = join(root, 'ignored-but-tracked.zip');
  await sourceArchive(ignoredButTracked, [['dist/private.txt', 'must not ship']]);

  assert.equal((await verifySourceArchive(clean, version)).status, 'PASS');
  const report = await verifySourceArchive(poisoned, version);
  assert.equal(report.status, 'FAIL');
  assert.ok(report.errors.some((error) => error.includes('recovered/.git/config')));
  assert.equal((await verifySourceArchive(ignoredButTracked, version)).status, 'FAIL');
});

test('source archive rejects duplicate, case-colliding and Unix symlink entries', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pea-release-archive-ambiguity-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const duplicate = join(root, 'duplicate.zip');
  const symlinkMode = join(root, 'symlink-mode.zip');
  await sourceArchive(duplicate, [['readme.md', '# Collision\n']]);
  await writeFile(symlinkMode, await createZipBuffer([
    { name: `${prefix}README.md`, data: Buffer.from('# Product\n') },
    { name: `${prefix}LICENSE.md`, data: Buffer.from('Apache-2.0\n') },
    { name: `${prefix}package-lock.json`, data: Buffer.from('{}\n') },
    { name: `${prefix}package.json`, data: Buffer.from(JSON.stringify({ version })) },
    { name: `${prefix}linked.txt`, data: Buffer.from('target'), mode: 0o120777 },
  ]));

  assert.equal((await verifySourceArchive(duplicate, version)).status, 'FAIL');
  assert.equal((await verifySourceArchive(symlinkMode, version)).status, 'FAIL');
});

test('source archive provenance byte-matches a normalized archive of the exact declared Git commit', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pea-release-source-origin-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await Promise.all([
    writeFile(join(root, 'README.md'), '# Product\n'),
    writeFile(join(root, 'LICENSE.md'), 'Apache-2.0\n'),
    writeFile(join(root, 'package.json'), JSON.stringify({ version })),
    writeFile(join(root, 'package-lock.json'), '{}\n'),
  ]);
  for (const args of [
    ['init', '-b', 'main'], ['add', '.'],
    ['-c', 'user.name=PEA Tests', '-c', 'user.email=pea@example.invalid', 'commit', '-m', 'fixture'],
  ]) {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
  }
  const commit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
  const archive = join(root, 'source.zip');
  const created = spawnSync('git', [
    'archive', '--format=zip', `--prefix=${prefix}`, `--output=${archive}`, commit,
  ], { cwd: root, encoding: 'utf8', windowsHide: true });
  assert.equal(created.status, 0, created.stderr);
  await normalizeZipArchive(archive);
  assert.equal((await verifySourceArchive(archive, version, { root, commit })).status, 'PASS');
  const tampered = await readFile(archive);
  tampered[tampered.length - 1] ^= 1;
  await writeFile(archive, tampered);
  assert.equal((await verifySourceArchive(archive, version, { root, commit })).status, 'FAIL');
});

test('SBOM normalization removes volatile identity while preserving deterministic content', () => {
  const first = normalizeSbomDocument({
    bomFormat: 'CycloneDX', serialNumber: 'urn:uuid:first',
    metadata: {
      timestamp: '2026-09-09T01:00:00Z',
      tools: [{ vendor: 'npm', name: 'cli', version: '12.0.1' }],
      component: { type: 'application', name: 'product', version: '1.0.0', properties: [{ name: 'cdx:path', value: '' }] },
    },
    components: [{
      type: 'library', name: 'dependency', version: '2.0.0', 'bom-ref': 'dependency@2.0.0',
      author: 'Different CLI author rendering',
      externalReferences: [{ type: 'website', url: 'https://example.invalid' }],
      properties: [{ name: 'cdx:path', value: 'node_modules/dependency' }],
    }],
  });
  const second = normalizeSbomDocument({
    bomFormat: 'CycloneDX', serialNumber: 'urn:uuid:second',
    metadata: {
      timestamp: '2026-09-09T02:00:00Z',
      tools: [{ vendor: 'npm', name: 'cli', version: '10.9.8' }],
      component: { type: 'application', name: 'product', version: '1.0.0', properties: [] },
    },
    components: [{
      type: 'library', name: 'dependency', version: '2.0.0', 'bom-ref': 'dependency@2.0.0',
      author: 'Another CLI author rendering',
      externalReferences: [{ type: 'issue-tracker', url: 'https://example.invalid/issues' }],
      properties: [],
    }],
  });
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal('serialNumber' in first, false);
  assert.equal('timestamp' in first.metadata, false);
});

test('SBOM verifier rejects files beyond its compressed input budget', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pea-release-sbom-limit-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const oversized = join(root, 'oversized.cdx.json');
  await writeFile(oversized, Buffer.alloc(11 * 1024 * 1024, 32));

  const report = await verifySbom(oversized, version);

  assert.equal(report.status, 'FAIL');
  assert.match(report.errors[0], /10 MiB/);
});

test('release metadata output atomically replaces a hardlink without overwriting its target', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pea-release-output-root-'));
  const outside = join(await mkdtemp(join(tmpdir(), 'pea-release-output-outside-')), 'outside.json');
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'release-artifacts'));
  await writeFile(outside, 'preserve', 'utf8');
  const target = join(root, 'release-artifacts', 'release-manifest-v0.3.0.json');
  await (await import('node:fs/promises')).link(outside, target);

  await writeReleaseOutput(root, target, '{"safe":true}\n');

  assert.equal(await readFile(outside, 'utf8'), 'preserve');
  assert.equal(await readFile(target, 'utf8'), '{"safe":true}\n');
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

test('ZIP reader rejects excessive entry counts and declared expansion before extraction', async () => {
  const manyEntries = await createZipBuffer([
    { name: 'one.txt', data: Buffer.from('one') },
    { name: 'two.txt', data: Buffer.from('two') },
  ]);
  const oversizedEntry = await createZipBuffer([
    { name: 'large.txt', data: Buffer.alloc(32, 1) },
  ]);

  await assert.rejects(readZipArchive(manyEntries, { maxEntries: 1 }), /exceeds 1 entries/);
  await assert.rejects(readZipArchive(oversizedEntry, { maxEntryBytes: 16 }), /exceeds 16 bytes/);
  await assert.rejects(readZipArchive(oversizedEntry, { maxUncompressedBytes: 16 }), /exceeds 16 uncompressed bytes/);
});

test('ZIP reader verifies each entry CRC instead of trusting only the central directory', async () => {
  const archive = Buffer.from(await createZipBuffer([{
    name: 'evidence.json',
    data: Buffer.from('{"ok":true}\n'),
  }]));
  const centralDirectory = archive.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  assert.notEqual(centralDirectory, -1);
  archive.writeUInt32LE((archive.readUInt32LE(centralDirectory + 16) + 1) >>> 0, centralDirectory + 16);

  await assert.rejects(readZipArchive(archive), /CRC mismatch/);
});

test('VSIX verifier enforces an exact content allow-list', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pea-release-vsix-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const valid = join(root, 'valid.vsix');
  const unexpected = join(root, 'unexpected.vsix');
  await vsixArchive(valid);
  await vsixArchive(unexpected, [['extension/extra.txt', 'not allowed']]);

  assert.equal((await verifyVsix(valid, version)).status, 'PASS');
  const report = await verifyVsix(unexpected, version);
  assert.equal(report.status, 'FAIL');
  assert.ok(report.errors.includes('unexpected VSIX entry: extension/extra.txt'));
});

test('VSIX verifier requires installed README guidance for governed AI connections', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pea-release-vsix-readme-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, 'missing-ai-guidance.vsix');
  await vsixArchive(path, [], {}, { readme: '# Extension\n' });

  const report = await verifyVsix(path, version);

  assert.equal(report.status, 'FAIL');
  assert.ok(report.errors.includes('installed VSIX README is missing governed AI connection guidance'));
});

test('VSIX verifier binds the packaged manifest to the exact source commit', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pea-release-vsix-commit-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, 'candidate.vsix');
  const commit = 'a'.repeat(40);
  await vsixArchive(path, [], { peaRelease: { commit } });

  assert.equal((await verifyVsix(path, version, { commit })).status, 'PASS');
  assert.equal((await verifyVsix(path, version, { commit: 'b'.repeat(40) })).status, 'FAIL');
});

test('ZIP normalization produces a reproducible byte stream', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pea-release-reproducible-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const first = join(root, 'first.zip');
  const second = join(root, 'second.zip');
  const makeArchive = async (path, date) => writeFile(path, await createZipBuffer([{
    name: 'extension/package.json',
    data: Buffer.from('{}\n'),
    mtime: date,
  }]));
  await makeArchive(first, new Date('2020-01-01T00:00:00Z'));
  await makeArchive(second, new Date('2026-09-07T12:34:56Z'));

  await normalizeZipArchive(first);
  await normalizeZipArchive(second);

  assert.equal(await sha256(first), await sha256(second));
  const normalizedEntry = (await readZipArchive(await readFile(first)))
    .find((entry) => entry.name === 'extension/package.json');
  assert.equal(normalizedEntry.mode & 0xfff, 0o644);
});

test('ZIP normalization writes stored entries to avoid platform-specific Deflate output', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pea-release-stored-zip-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const archive = join(root, 'candidate.zip');
  await writeFile(archive, await createZipBuffer([{
    name: 'extension/runtime.json',
    data: Buffer.from('{"repeat":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}\n'),
  }]));

  await normalizeZipArchive(archive);

  const bytes = await readFile(archive);
  assert.equal(bytes.readUInt32LE(0), 0x04034b50);
  assert.equal(bytes.readUInt16LE(8), 0, 'normalized archive must use ZIP stored entries');
  assert.equal(bytes.readUInt16LE(10), 0, 'normalized archive must use midnight in the DOS timestamp');
  assert.equal(bytes.readUInt16LE(12), 0x2821, 'normalized archive must use 2000-01-01 in the DOS timestamp');
  assert.equal(
    bytes.includes(Buffer.from([0x55, 0x54, 0x05, 0x00, 0x03])),
    false,
    'normalized archive must omit timezone-dependent extended UNIX timestamps',
  );
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
