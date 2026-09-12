import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { assessPublication, completeReleaseEvidence } from '../scripts/publication-check.mjs';
import { createZipBuffer } from '../scripts/zip.mjs';

const execFileAsync = promisify(execFile);
const publicCommandIds = [
  'pea.doctor', 'pea.indexWorkspace', 'pea.openContext', 'pea.addMemoryEntry',
  'pea.addJournalEntry', 'pea.promoteJournalEntry', 'pea.expireMemory', 'pea.importSnapshot',
  'pea.searchTdn', 'pea.searchDictionary', 'pea.prepareBuild', 'pea.runBuild',
  'pea.buildStatus', 'pea.cancelBuild', 'pea.buildEvidence', 'pea.reviewActiveFile',
  'pea.reviewChanges', 'pea.refreshEngineeringCenter', 'pea.openSampleWorkspace',
  'pea.connectChatGpt', 'pea.askCodex',
];

const requiredFiles = [
  'README.md',
  'README.en.md',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'GOVERNANCE.md',
  'SUPPORT.md',
  'CHANGELOG.md',
  'CITATION.cff',
  'NOTICE',
  'THIRD_PARTY_NOTICES.md',
  'docs/brand-positioning.md',
  'docs/public-launch-operations.md',
  'media/social-preview.png',
  'docs/code-review-production-readiness.md',
  'docs/qa-test-quality-review.md',
  'docs/security/dependency-license-review.md',
  'docs/security/owasp-coverage.md',
  '.github/workflows/ci.yml',
  '.github/workflows/security.yml',
  '.github/workflows/codeql.yml',
  '.github/workflows/dependency-review.yml',
  '.github/workflows/secret-scan.yml',
  '.github/workflows/provenance.yml',
  '.github/dependabot.yml',
  '.github/CODEOWNERS',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.specs/project/PROJECT.md',
  '.specs/features/public-github-release/spec.md',
  '.specs/features/production-readiness/spec.md',
  '.specs/features/vscode-first-product/spec.md',
  '.specs/features/premium-product-leadership/spec.md',
  '.agents/skills/planning-protheus-engineering/SKILL.md',
  '.agents/skills/protheus-evidence-review/SKILL.md',
  'config/skill-providers.json',
  'docs/skills.md',
];

async function fixture({ license = 'Apache-2.0', repository = true } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'pea-publication-'));
  const manifest = {
    name: 'protheus-engineering-agent',
    version: '0.3.0',
    private: true,
    license,
    ...(repository
      ? { repository: { type: 'git', url: 'https://github.com/example/protheus-engineering-agent.git' } }
      : {}),
  };
  await mkdir(join(root, 'apps', 'vscode-extension'), { recursive: true });
  await writeFile(join(root, 'package.json'), JSON.stringify(manifest), 'utf8');
  await writeFile(
    join(root, 'apps', 'vscode-extension', 'package.json'),
    JSON.stringify({
      ...manifest,
      name: 'protheus-engineering-agent-vscode',
      preview: true,
      pricing: 'Free',
      qna: 'marketplace',
      galleryBanner: { color: '#08131F', theme: 'dark' },
      icon: 'media/icon.png',
      contributes: {
        walkthroughs: [{ steps: [{}, {}, {}] }],
      },
    }),
    'utf8',
  );
  await mkdir(join(root, 'apps', 'vscode-extension', 'media'), { recursive: true });
  await writeFile(join(root, 'apps', 'vscode-extension', 'media', 'icon.png'), 'fixture icon', 'utf8');
  for (const relativePath of requiredFiles) {
    await mkdir(join(root, relativePath, '..'), { recursive: true });
    await writeFile(join(root, relativePath), '# Public product\n', 'utf8');
  }
  await writeFile(
    join(root, '.specs', 'features', 'public-github-release', 'spec.md'),
    '**Target:** `v0.3.0`\n',
    'utf8',
  );
  await writeFile(
    join(root, 'LICENSE.md'),
    license === 'UNLICENSED'
      ? '# UNLICENSED\n'
      : `SPDX-License-Identifier: ${license}\nApache License\nVersion 2.0\nhttp://www.apache.org/licenses/\n`,
    'utf8',
  );
  await mkdir(join(root, 'release-evidence'), { recursive: true });
  await mkdir(join(root, 'release-artifacts'), { recursive: true });
  await writeFile(join(root, '.gitignore'), 'release-artifacts/\nrelease-evidence/\n', 'utf8');
  await execFileAsync('git', ['init', root]);
  await execFileAsync('git', ['-C', root, 'add', '.']);
  await execFileAsync('git', [
    '-C', root, '-c', 'user.name=PEA Tests', '-c', 'user.email=pea@example.invalid',
    'commit', '-m', 'release fixture',
  ]);
  const { stdout: commitOutput } = await execFileAsync('git', ['-C', root, 'rev-parse', 'HEAD']);
  const releaseCommit = commitOutput.trim();
  const sourceArtifactPath = join(root, 'release-artifacts', 'protheus-engineering-agent-source.zip');
  const vsixArtifactPath = join(root, 'release-artifacts', 'protheus-engineering-agent.vsix');
  const sbomArtifactPath = join(root, 'release-artifacts', 'protheus-engineering-agent.cdx.json');
  const fixtureLockContents = `${JSON.stringify({
    name: manifest.name,
    version: manifest.version,
    lockfileVersion: 3,
    requires: true,
    packages: { '': { name: manifest.name, version: manifest.version } },
  })}\n`;
  await writeFile(join(root, 'package-lock.json'), fixtureLockContents, 'utf8');
  await execFileAsync('git', ['-C', root, 'add', 'package-lock.json']);
  await execFileAsync('git', [
    '-C', root, '-c', 'user.name=PEA Tests', '-c', 'user.email=pea@example.invalid',
    'commit', '--amend', '--no-edit',
  ]);
  const { stdout: amendedCommitOutput } = await execFileAsync('git', ['-C', root, 'rev-parse', 'HEAD']);
  const exactReleaseCommit = amendedCommitOutput.trim();
  await execFileAsync('git', [
    '-C', root, 'archive', '--format=zip', '--prefix=protheus-engineering-agent-v0.3.0/',
    `--output=${sourceArtifactPath}`, exactReleaseCommit,
  ]);
  const sourceContents = await readFile(sourceArtifactPath);
  const vsixEntries = [
    ['[Content_Types].xml', '<Types/>'], ['extension.vsixmanifest', '<PackageManifest/>'],
    ['extension/package.json', JSON.stringify({ version: '0.3.0', peaRelease: { commit: exactReleaseCommit } })],
    ['extension/extension.cjs', 'module.exports = {};'], ['extension/dist/runtime-cli.cjs', 'module.exports = {};'],
    ['extension/dist/runtime-cli.mjs', 'export {};'], ['extension/dist/mcp-stdio.mjs', 'export {};'],
    ['extension/dist/codex-app-server.cjs', 'module.exports = {};'],
    ['extension/dist/ai-connections.cjs', 'module.exports = {};'],
    ['extension/dist/ai-connection-store.cjs', 'module.exports = {};'],
    ['extension/dist/ai-providers.cjs', 'module.exports = {};'],
    ['extension/dist/ai-gateway.cjs', 'module.exports = {};'], ['extension/dist/policy.cjs', 'module.exports = {};'],
    ['extension/readme.md', '# Extension\n\n## Conexões de IA e rotas\n\nSecretStorage\n\nMarketplace\n'], ['extension/license.md', 'Apache-2.0'],
    ['extension/notice', 'Protheus Engineering Agent\nCopyright 2026 Montagna\n'],
    ['extension/changelog.md', '# Changelog'],
    ['extension/third_party_notices.md', '@modelcontextprotocol/server\nZod\n'],
    ['extension/third-party-licenses/model-context-protocol.txt', 'Apache License\nMIT License\nModel Context Protocol\n'],
    ['extension/third-party-licenses/zod.txt', 'MIT License\nCopyright (c) 2025 Colin McDonnell\n'],
    ['extension/package.nls.json', '{}'], ['extension/package.nls.pt-br.json', '{}'],
    ['extension/l10n/bundle.l10n.pt-br.json', '{}'], ['extension/media/icon.png', 'fixture icon'],
    ['extension/media/activity-icon.svg', '<svg/>'], ['extension/sample-workspace/README.md', '# Sample'],
    ['extension/sample-workspace/sample-review.prw', 'User Function Sample()\nReturn Nil\n'],
    ['extension/skills/protheus-evidence-review/SKILL.md', '# Skill'],
  ];
  const vsixContents = await createZipBuffer(vsixEntries.map(([name, data]) => ({ name, data: Buffer.from(data) })));
  const sbomContents = Buffer.from(JSON.stringify({
    bomFormat: 'CycloneDX', specVersion: '1.5',
    metadata: {
      component: { name: 'protheus-engineering-agent', version: '0.3.0' },
      properties: [{
        name: 'pea:package-lock:sha256',
        value: createHash('sha256').update(fixtureLockContents).digest('hex'),
      }],
    },
    components: [],
    dependencies: [],
  }));
  const artifacts = [
    {
      path: 'release-artifacts/protheus-engineering-agent-source.zip',
      sha256: createHash('sha256').update(sourceContents).digest('hex'),
    },
    {
      path: 'release-artifacts/protheus-engineering-agent.vsix',
      sha256: createHash('sha256').update(vsixContents).digest('hex'),
    },
    {
      path: 'release-artifacts/protheus-engineering-agent.cdx.json',
      sha256: createHash('sha256').update(sbomContents).digest('hex'),
    },
  ];
  await writeFile(vsixArtifactPath, vsixContents);
  await writeFile(sbomArtifactPath, sbomContents);
  const releaseManifestPath = 'release-artifacts/release-manifest-v0.3.0.json';
  const releaseManifestContents = `${JSON.stringify({
    schemaVersion: 1,
    version: '0.3.0',
    commit: exactReleaseCommit,
    artifacts,
    verification: {
      publication: 'PASS', sourceArchive: 'PASS', vsix: 'PASS', vsixReproducible: 'PASS',
      vsixSourceCommit: 'PASS', vsixSourceRebuild: 'PASS',
      sbom: 'PASS', sbomLockfile: 'PASS',
    },
  })}\n`;
  await writeFile(join(root, releaseManifestPath), releaseManifestContents, 'utf8');
  const releaseManifestSha256 = createHash('sha256').update(releaseManifestContents).digest('hex');
  const receipt = async (name, document) => {
    const path = `release-artifacts/${name}.json`;
    const contents = `${JSON.stringify({
      schemaVersion: 1,
      status: 'PASS',
      commit: exactReleaseCommit,
      repository: 'https://github.com/example/protheus-engineering-agent',
      releaseManifestSha256,
      capturedAt: '2026-09-09T12:00:00.000Z',
      ...document,
    })}\n`;
    await writeFile(join(root, path), contents, 'utf8');
    return `${path}#sha256=${createHash('sha256').update(contents).digest('hex')}`;
  };
  const ciReceipt = await receipt('ci-receipt', {
    kind: 'github-actions-receipt',
    source: 'github-api',
    headSha: exactReleaseCommit,
    conclusion: 'success',
    workflowPath: '.github/workflows/ci.yml',
    runAttempt: 1,
    url: 'https://github.com/example/protheus-engineering-agent/actions/runs/1',
  });
  const codeScanningReceipt = await receipt('code-scanning-receipt', {
    kind: 'github-code-scanning-receipt',
    source: 'github-api',
    headSha: exactReleaseCommit,
    conclusion: 'success',
    toolName: 'CodeQL',
    analysisId: 1,
    sarifResults: true,
    url: 'https://github.com/example/protheus-engineering-agent/security/code-scanning',
  });
  const securityReceipt = await receipt('security-review-receipt', {
    kind: 'security-review-receipt',
    controls: Object.entries({
      codeql: '.github/workflows/codeql.yml',
      'dependency-review': '.github/workflows/dependency-review.yml',
      osv: '.github/workflows/security.yml',
      provenance: '.github/workflows/provenance.yml',
      'secret-scan': '.github/workflows/secret-scan.yml',
    }).map(([id, workflowPath], index) => ({
      id,
      status: 'PASS',
      evidence: {
        source: 'github-api',
        headSha: exactReleaseCommit,
        conclusion: 'success',
        workflowPath,
        runId: index + 10,
        runAttempt: 1,
        url: `https://github.com/example/protheus-engineering-agent/actions/runs/${index + 10}`,
      },
    })),
  });
  await writeFile(
    join(root, 'release-evidence', 'v0.3.0.json'),
    JSON.stringify({
      schemaVersion: 1,
      version: '0.3.0',
      status: 'GO',
      commit: exactReleaseCommit,
      ci: { passed: true, evidence: ciReceipt },
      codeReview: { passed: true },
      securityReview: { passed: true, evidence: securityReceipt },
      codeScanning: { passed: true, evidence: codeScanningReceipt },
      vscodeSmoke: {
        passed: true, versions: ['1.95.3', '1.133.0'], commands: publicCommandIds.length,
        commandIds: publicCommandIds, isolated: true,
      },
      freshInstall: {
        passed: true,
        versions: ['1.95.3', '1.133.0'],
        commands: publicCommandIds.length,
        commandIds: publicCommandIds,
        isolated: true,
        vsixSha256: artifacts[1].sha256,
      },
      hermesProbe: { passed: true, isolated: true },
      artifacts,
      releaseManifest: {
        path: releaseManifestPath,
        sha256: releaseManifestSha256,
      },
      approvedBy: 'maintainer',
    }),
    'utf8',
  );
  return root;
}

async function rebindReleaseReceipts(root, evidence) {
  for (const key of ['ci', 'codeScanning', 'securityReview']) {
    const reference = evidence[key].evidence;
    const path = reference.slice(0, reference.indexOf('#sha256='));
    const document = JSON.parse(await readFile(join(root, path), 'utf8'));
    document.commit = evidence.commit;
    document.releaseManifestSha256 = evidence.releaseManifest.sha256;
    if ('headSha' in document) document.headSha = evidence.commit;
    for (const control of document.controls ?? []) {
      if (control?.evidence && typeof control.evidence === 'object' && 'headSha' in control.evidence) {
        control.evidence.headSha = evidence.commit;
      }
    }
    const contents = `${JSON.stringify(document)}\n`;
    await writeFile(join(root, path), contents, 'utf8');
    evidence[key].evidence = `${path}#sha256=${createHash('sha256').update(contents).digest('hex')}`;
  }
}

const stableEvidenceKinds = {
  g0BaselineIntegrity: 'baseline-validation',
  g1PremiumP0: 'premium-p0-journey',
  g2SemanticP1: 'semantic-validation',
  g3Tier0Virtualization: 'tier0-virtualization',
  g4OfficialAnalyzer: 'official-analyzer',
  g5OfficialPostgres: 'official-postgres',
  g6LicensedAppserver: 'licensed-appserver',
  g7PackageLifecycle: 'package-lifecycle',
  g8UxAccessibility: 'ux-accessibility-uat',
  g9SecuritySupplyChain: 'security-supply-chain',
  g10CompatibilitySupport: 'compatibility-support',
  g11EffectivenessClaims: 'representative-pilot',
  g12ExactRelease: 'exact-release-attestation',
  g13PublicationAuthorization: 'publication-authorization',
};

async function stableControlEvidence(root, evidence, gateId) {
  const path = `release-artifacts/receipt-${gateId}.json`;
  const results = {
    g0BaselineIntegrity: { testsPassed: 293, testsFailed: 0, testsSkipped: 0, mutationScore: 95.4, diffCheck: true },
    g1PremiumP0: { publicCommandsRegistered: 21, coreJourneysPassed: true, offline: true },
    g2SemanticP1: { corpusPassed: true, performancePassed: true, compilerEquivalentClaim: false },
    g3Tier0Virtualization: { networkRequired: false, successFailureMatrix: true },
    g4OfficialAnalyzer: {
      imageDigest: `sha256:${'a'.repeat(64)}`, cleanCase: 'PASS', failingCase: 'EXPECTED_FAIL',
      cancellation: 'PASS', timeout: 'PASS',
    },
    g5OfficialPostgres: {
      imageDigest: `sha256:${'b'.repeat(64)}`, readOnly: true, namedQueriesPassed: true,
      writeDenied: true, teardownPassed: true,
    },
    g6LicensedAppserver: {
      lawfulInputs: true, compilerIdentity: 'compiler-1', appserverIdentity: 'appserver-1',
      rpoSha256: 'c'.repeat(64), compileSuccess: true, compileFailureCaptured: true,
    },
    g7PackageLifecycle: {
      versions: ['1.95.3', '1.136.2'], install: 'PASS', upgrade: 'PASS', uninstall: 'PASS',
      reinstall: 'PASS', rollback: 'PASS',
    },
    g8UxAccessibility: {
      participants: 3, keyboard: 'PASS', screenReader: 'PASS', highContrast: 'PASS', zoom: 'PASS',
      medianFirstValueSeconds: 240,
    },
    g9SecuritySupplyChain: {
      dependencyReview: 'PASS', secretScan: 'PASS', osv: 'PASS', npmAudit: 'PASS', codeql: 'PASS',
      attestationVerified: true,
    },
    g10CompatibilitySupport: { windows: true, linux: true, remote: true, supportDrill: 'PASS' },
    g11EffectivenessClaims: {
      participants: 3,
      preregistered: true,
      preregistrationUrl: 'https://github.com/example/protheus-engineering-agent/commit/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      acceptedTasks: { withProduct: 3, baseline: 3 },
      anonymizedDataset: true,
      rawObservationsPublished: true,
      datasetUrl: 'https://github.com/example/protheus-engineering-agent/commit/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      analysisCodePublished: true,
      analysisUrl: 'https://github.com/example/protheus-engineering-agent/commit/cccccccccccccccccccccccccccccccccccccccc',
      analysisReviewedBy: 'independent-reviewer',
      licensingReviewed: true,
      companyAuthorizationReviewed: true,
      confidenceIntervals: [{ metric: 'accepted-result-seconds', lower: -20, upper: 40, confidenceLevel: 0.95 }],
      claimDecision: 'APPROVED',
    },
    g12ExactRelease: {
      attestationVerified: true,
      verificationTool: 'gh attestation verify',
      attestationUrl: 'https://github.com/example/protheus-engineering-agent/attestations/1',
      downloadedArtifactsVerified: true,
      artifactCount: 3,
      downloadedArtifacts: evidence.artifacts,
      verifiedSubjects: [
        ...evidence.artifacts,
        { path: `release-artifacts/release-manifest-v${evidence.version}.json`, sha256: evidence.releaseManifest.sha256 },
        { path: 'release-artifacts/SHA256SUMS', sha256: 'd'.repeat(64) },
      ],
    },
    g13PublicationAuthorization: { legalApproved: true, publisherReady: true, ownerAuthorized: true },
  };
  const result = results[gateId];
  const contents = `${JSON.stringify({
    schemaVersion: 1,
    kind: stableEvidenceKinds[gateId],
    gateId,
    status: 'PASS',
    commit: evidence.commit,
    releaseManifestSha256: evidence.releaseManifest.sha256,
    capturedAt: '2026-09-09T12:00:00.000Z',
    validatedBy: 'release-reviewer',
    result,
  })}\n`;
  await writeFile(join(root, path), contents, 'utf8');
  return {
    kind: stableEvidenceKinds[gateId],
    receipt: `${path}#sha256=${createHash('sha256').update(contents).digest('hex')}`,
  };
}

test('development audit accepts a complete portable tree that is still unlicensed', async () => {
  const root = await fixture({ license: 'UNLICENSED', repository: false });
  await writeFile(join(root, '.env.example'), 'PEA_ENVIRONMENT=development\n', 'utf8');
  const report = await assessPublication({ root, release: false });

  assert.equal(report.status, 'PASS');
  assert.deepEqual(report.blockers, []);
});

test('release audit blocks an unlicensed product without repository metadata', async () => {
  const root = await fixture({ license: 'UNLICENSED', repository: false });
  const report = await assessPublication({ root, release: true });

  assert.equal(report.status, 'BLOCKED');
  assert.deepEqual(
    report.blockers.map((finding) => finding.code).sort(),
    ['LICENSE_NOT_SELECTED', 'RELEASE_EVIDENCE_INCOMPLETE', 'REPOSITORY_NOT_CONFIGURED'],
  );
});

test('audit rejects version and license metadata inconsistencies', async () => {
  const root = await fixture();
  const extensionPath = join(root, 'apps', 'vscode-extension', 'package.json');
  const extension = JSON.parse(await (await import('node:fs/promises')).readFile(extensionPath, 'utf8'));
  extension.version = '9.9.9';
  extension.license = 'MIT';
  await writeFile(extensionPath, JSON.stringify(extension), 'utf8');

  const report = await assessPublication({ root, release: true });

  assert.equal(report.status, 'FAIL');
  assert.ok(report.errors.some((finding) => finding.code === 'VERSION_MISMATCH'));
  assert.ok(report.errors.some((finding) => finding.code === 'LICENSE_MISMATCH'));
});

test('audit rejects personal paths, secret files and missing governance files', async () => {
  const root = await fixture();
  const personalPath = ['C:', 'Users', 'alice', 'private-workspace'].join('/');
  await writeFile(join(root, 'NOTICE'), `Run from ${personalPath}\n`, 'utf8');
  await writeFile(join(root, '.env'), 'TOKEN=secret\n', 'utf8');
  await mkdir(join(root, '.pea'), { recursive: true });
  await writeFile(join(root, '.pea', 'journal.json'), '{}\n', 'utf8');
  await mkdir(join(root, '.worktrees'), { recursive: true });
  const privateKeyMarker = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ');
  await writeFile(join(root, 'notes.md'), `${privateKeyMarker}\n`, 'utf8');
  await (await import('node:fs/promises')).unlink(join(root, 'SECURITY.md'));

  const report = await assessPublication({ root, release: false });

  assert.equal(report.status, 'FAIL');
  assert.ok(report.errors.some((finding) => finding.code === 'PERSONAL_PATH'));
  assert.ok(report.errors.some((finding) => finding.code === 'SECRET_FILE'));
  assert.ok(report.errors.some((finding) => finding.code === 'LOCAL_STATE_DIRECTORY'));
  assert.ok(report.errors.some((finding) => finding.code === 'SECRET_CONTENT'));
  assert.ok(report.errors.some((finding) => finding.code === 'REQUIRED_FILE_MISSING'));
});

test('audit rejects undeclared binary payloads in the public source tree', async () => {
  const root = await fixture();
  await writeFile(join(root, 'customer.sqlite'), Buffer.from([0, 1, 2, 3]));

  const report = await assessPublication({ root, release: false });

  assert.equal(report.status, 'FAIL');
  assert.ok(report.errors.some((finding) => finding.code === 'BINARY_FILE_NOT_ALLOWED'));
});

test('stable release evidence requires every stable-only gate', async () => {
  const root = await fixture();
  const evidence = JSON.parse(await readFile(join(root, 'release-evidence', 'v0.3.0.json'), 'utf8'));
  evidence.version = '1.0.0';
  evidence.releaseManifest.path = 'release-artifacts/release-manifest-v1.0.0.json';
  const options = {
    root,
    repositoryUrl: 'https://github.com/example/protheus-engineering-agent.git',
  };
  assert.equal(await completeReleaseEvidence(evidence, '1.0.0', options), false);
  evidence.stableGates = Object.fromEntries([
    'g0BaselineIntegrity', 'g1PremiumP0', 'g2SemanticP1', 'g3Tier0Virtualization',
    'g4OfficialAnalyzer', 'g5OfficialPostgres', 'g6LicensedAppserver',
    'g7PackageLifecycle', 'g8UxAccessibility', 'g9SecuritySupplyChain',
    'g10CompatibilitySupport', 'g11EffectivenessClaims', 'g12ExactRelease',
    'g13PublicationAuthorization',
  ].map((name, index) => [name, {
    passed: true,
    evidence: `https://github.com/example/protheus-engineering-agent/actions/runs/${index + 1}`,
    commit: evidence.commit,
  }]));
  assert.equal(await completeReleaseEvidence(evidence, '1.0.0', options), false);
});

test('stable local gate evidence must exist, stay contained and match its SHA-256', async () => {
  const root = await fixture();
  const evidence = JSON.parse(await readFile(join(root, 'release-evidence', 'v0.3.0.json'), 'utf8'));
  evidence.version = '1.0.0';
  evidence.releaseManifest.path = 'release-artifacts/release-manifest-v1.0.0.json';
  const gateIds = [
    'g0BaselineIntegrity', 'g1PremiumP0', 'g2SemanticP1', 'g3Tier0Virtualization',
    'g4OfficialAnalyzer', 'g5OfficialPostgres', 'g6LicensedAppserver',
    'g7PackageLifecycle', 'g8UxAccessibility', 'g9SecuritySupplyChain',
    'g10CompatibilitySupport', 'g11EffectivenessClaims', 'g12ExactRelease',
    'g13PublicationAuthorization',
  ];
  evidence.stableGates = {};
  for (const [index, name] of gateIds.entries()) {
    const path = `release-artifacts/${name}.json`;
    const document = {
      schemaVersion: 1,
      gateId: name,
      status: 'PASS',
      commit: evidence.commit,
      releaseManifestSha256: evidence.releaseManifest.sha256,
      evidence: [await stableControlEvidence(root, evidence, name)],
      validatedBy: 'release-reviewer',
      validatedAt: '2026-09-09T12:00:00.000Z',
      ...(index === 13 ? {
        authorization: {
          approvedBy: evidence.approvedBy,
          approvedAt: '2026-09-09T12:00:00.000Z',
          scope: 'publish-stable-1.0.0',
        },
      } : {}),
    };
    const contents = `${JSON.stringify(document)}\n`;
    await writeFile(join(root, path), contents, 'utf8');
    evidence.stableGates[name] = {
      passed: true,
      evidence: `${path}#sha256=${createHash('sha256').update(contents).digest('hex')}`,
      commit: evidence.commit,
    };
  }
  const options = { root, repositoryUrl: 'https://github.com/example/protheus-engineering-agent.git' };
  assert.equal(await completeReleaseEvidence(evidence, '1.0.0', options), true);
  const effectivenessGatePath = evidence.stableGates.g11EffectivenessClaims.evidence.split('#sha256=')[0];
  const effectivenessGate = JSON.parse(await readFile(join(root, effectivenessGatePath), 'utf8'));
  const effectivenessReceiptPath = effectivenessGate.evidence[0].receipt.split('#sha256=')[0];
  const effectivenessReceipt = JSON.parse(await readFile(join(root, effectivenessReceiptPath), 'utf8'));
  const originalIntervals = effectivenessReceipt.result.confidenceIntervals;
  effectivenessReceipt.result.confidenceIntervals = [];
  let rewrittenContents = `${JSON.stringify(effectivenessReceipt)}\n`;
  await writeFile(join(root, effectivenessReceiptPath), rewrittenContents, 'utf8');
  effectivenessGate.evidence[0].receipt = `${effectivenessReceiptPath}#sha256=${createHash('sha256').update(rewrittenContents).digest('hex')}`;
  rewrittenContents = `${JSON.stringify(effectivenessGate)}\n`;
  await writeFile(join(root, effectivenessGatePath), rewrittenContents, 'utf8');
  evidence.stableGates.g11EffectivenessClaims.evidence = `${effectivenessGatePath}#sha256=${createHash('sha256').update(rewrittenContents).digest('hex')}`;
  assert.equal(await completeReleaseEvidence(evidence, '1.0.0', options), false);
  effectivenessReceipt.result.confidenceIntervals = originalIntervals;
  rewrittenContents = `${JSON.stringify(effectivenessReceipt)}\n`;
  await writeFile(join(root, effectivenessReceiptPath), rewrittenContents, 'utf8');
  effectivenessGate.evidence[0].receipt = `${effectivenessReceiptPath}#sha256=${createHash('sha256').update(rewrittenContents).digest('hex')}`;
  rewrittenContents = `${JSON.stringify(effectivenessGate)}\n`;
  await writeFile(join(root, effectivenessGatePath), rewrittenContents, 'utf8');
  evidence.stableGates.g11EffectivenessClaims.evidence = `${effectivenessGatePath}#sha256=${createHash('sha256').update(rewrittenContents).digest('hex')}`;
  assert.equal(await completeReleaseEvidence(evidence, '1.0.0', options), true);
  const genericGatePath = 'release-artifacts/g4-generic.json';
  const genericGate = `${JSON.stringify({
    schemaVersion: 1,
    gateId: 'g4OfficialAnalyzer',
    status: 'PASS',
    commit: evidence.commit,
    releaseManifestSha256: evidence.releaseManifest.sha256,
    evidence: ['generic URL or text is not official analyzer proof'],
    validatedBy: 'release-reviewer',
    validatedAt: '2026-09-09T12:00:00.000Z',
  })}\n`;
  await writeFile(join(root, genericGatePath), genericGate, 'utf8');
  const originalAnalyzerEvidence = evidence.stableGates.g4OfficialAnalyzer.evidence;
  evidence.stableGates.g4OfficialAnalyzer.evidence = `${genericGatePath}#sha256=${createHash('sha256').update(genericGate).digest('hex')}`;
  assert.equal(await completeReleaseEvidence(evidence, '1.0.0', options), false);
  evidence.stableGates.g4OfficialAnalyzer.evidence = originalAnalyzerEvidence;
  evidence.stableGates.g0BaselineIntegrity.evidence = `release-artifacts/g0BaselineIntegrity.json#sha256=${'f'.repeat(64)}`;
  assert.equal(await completeReleaseEvidence(evidence, '1.0.0', options), false);
  evidence.stableGates.g0BaselineIntegrity.evidence = `release-artifacts/missing.json#sha256=${'a'.repeat(64)}`;
  assert.equal(await completeReleaseEvidence(evidence, '1.0.0', options), false);
});

test('stable local gate evidence is bound to the exact release manifest', async () => {
  const root = await fixture();
  const evidence = JSON.parse(await readFile(join(root, 'release-evidence', 'v0.3.0.json'), 'utf8'));
  evidence.version = '1.0.0';
  evidence.releaseManifest.path = 'release-artifacts/release-manifest-v1.0.0.json';
  const gateIds = [
    'g0BaselineIntegrity', 'g1PremiumP0', 'g2SemanticP1', 'g3Tier0Virtualization',
    'g4OfficialAnalyzer', 'g5OfficialPostgres', 'g6LicensedAppserver',
    'g7PackageLifecycle', 'g8UxAccessibility', 'g9SecuritySupplyChain',
    'g10CompatibilitySupport', 'g11EffectivenessClaims', 'g12ExactRelease',
    'g13PublicationAuthorization',
  ];
  evidence.stableGates = {};
  for (const name of gateIds) {
    const path = `release-artifacts/${name}.json`;
    const document = {
      schemaVersion: 1,
      gateId: name,
      status: 'PASS',
      commit: evidence.commit,
      releaseManifestSha256: name === 'g0BaselineIntegrity' ? '0'.repeat(64) : evidence.releaseManifest.sha256,
      evidence: [await stableControlEvidence(root, evidence, name)],
      validatedBy: 'release-reviewer',
      validatedAt: '2026-09-09T12:00:00.000Z',
      ...(name === 'g13PublicationAuthorization' ? {
        authorization: {
          approvedBy: evidence.approvedBy,
          approvedAt: '2026-09-09T12:00:00.000Z',
          scope: 'publish-stable-1.0.0',
        },
      } : {}),
    };
    const contents = `${JSON.stringify(document)}\n`;
    await writeFile(join(root, path), contents, 'utf8');
    evidence.stableGates[name] = {
      passed: true,
      evidence: `${path}#sha256=${createHash('sha256').update(contents).digest('hex')}`,
      commit: evidence.commit,
    };
  }
  assert.equal(await completeReleaseEvidence(evidence, '1.0.0', {
    root,
    repositoryUrl: 'https://github.com/example/protheus-engineering-agent.git',
  }), false);
});

test('release audit binds evidence to current HEAD and a clean tracked tree', async () => {
  const root = await fixture();
  await writeFile(join(root, 'README.md'), '# Dirty product\n', 'utf8');
  const dirty = await assessPublication({ root, release: true });
  assert.ok(dirty.blockers.some((finding) => finding.code === 'RELEASE_TREE_DIRTY'));

  await execFileAsync('git', ['-C', root, 'add', 'README.md']);
  await execFileAsync('git', [
    '-C', root, '-c', 'user.name=PEA Tests', '-c', 'user.email=pea@example.invalid',
    'commit', '-m', 'move head',
  ]);
  const mismatch = await assessPublication({ root, release: true });
  assert.ok(mismatch.blockers.some((finding) => finding.code === 'RELEASE_COMMIT_MISMATCH'));
});

test('audit rejects an interrupted mutation-testing sandbox', async () => {
  const root = await fixture();
  await mkdir(join(root, '.stryker-tmp', 'sandbox-1'), { recursive: true });
  await writeFile(join(root, '.stryker-tmp', 'sandbox-1', 'mutation.json'), '{}\n', 'utf8');

  const report = await assessPublication({ root, release: false });

  assert.equal(report.status, 'FAIL');
  assert.ok(report.errors.some((finding) => (
    finding.code === 'LOCAL_STATE_DIRECTORY' && finding.path === '.stryker-tmp'
  )));
});

test('exact-commit preparation may exclude untracked runtime state without weakening normal audit', async () => {
  const root = await fixture();
  await mkdir(join(root, '.stryker-tmp', 'locked-old-sandbox'), { recursive: true });
  await writeFile(join(root, '.stryker-tmp', 'locked-old-sandbox', 'mutation.json'), '{}\n', 'utf8');

  const report = await assessPublication({ root, release: false, excludeLocalState: true });

  assert.equal(report.status, 'PASS');
});

test('audit ignores the configured VS Code test download cache', async () => {
  const root = await fixture();
  await mkdir(join(root, '.vscode-test', 'vscode-test-runtime'), { recursive: true });
  await writeFile(join(root, '.vscode-test', 'vscode-test-runtime', 'private.txt'), 'C:\\Users\\developer\\profile', 'utf8');

  const report = await assessPublication({ root, release: false });

  assert.equal(report.status, 'PASS');
});

test('release audit requires the planned version and completed evidence', async () => {
  const root = await fixture();
  const manifestPath = join(root, 'package.json');
  const extensionPath = join(root, 'apps', 'vscode-extension', 'package.json');
  for (const path of [manifestPath, extensionPath]) {
    const manifest = JSON.parse(await (await import('node:fs/promises')).readFile(path, 'utf8'));
    manifest.version = '0.1.0';
    await writeFile(path, JSON.stringify(manifest), 'utf8');
  }
  const evidencePath = join(root, 'release-evidence', 'v0.3.0.json');
  const evidence = JSON.parse(await (await import('node:fs/promises')).readFile(evidencePath, 'utf8'));
  evidence.status = 'NO-GO';
  evidence.vscodeSmoke.passed = false;
  await writeFile(evidencePath, JSON.stringify(evidence), 'utf8');

  const report = await assessPublication({ root, release: true });

  assert.equal(report.status, 'BLOCKED');
  assert.ok(report.blockers.some((finding) => finding.code === 'RELEASE_VERSION_MISMATCH'));
  assert.ok(report.blockers.some((finding) => finding.code === 'RELEASE_EVIDENCE_INCOMPLETE'));
});

test('audit rejects an incomplete public license text', async () => {
  const root = await fixture();
  await writeFile(join(root, 'LICENSE.md'), 'SPDX-License-Identifier: Apache-2.0\n', 'utf8');

  const report = await assessPublication({ root, release: false });

  assert.equal(report.status, 'FAIL');
  assert.ok(report.errors.some((finding) => finding.code === 'LICENSE_TEXT_INCOMPLETE'));
});

test('audit accepts canonical Apache license text without an SPDX marker in the license file', async () => {
  const root = await fixture();
  await writeFile(
    join(root, 'LICENSE.md'),
    'Apache License\nVersion 2.0, January 2004\nhttp://www.apache.org/licenses/\n',
    'utf8',
  );

  const report = await assessPublication({ root, release: false });

  assert.equal(report.status, 'PASS');
});

test('release audit recalculates the declared artifact checksum', async () => {
  const root = await fixture();
  const evidencePath = join(root, 'release-evidence', 'v0.3.0.json');
  const evidence = JSON.parse(await (await import('node:fs/promises')).readFile(evidencePath, 'utf8'));
  evidence.artifacts[0].sha256 = 'c'.repeat(64);
  await writeFile(evidencePath, JSON.stringify(evidence), 'utf8');

  const report = await assessPublication({ root, release: true });

  assert.equal(report.status, 'BLOCKED');
  assert.ok(report.blockers.some((finding) => finding.code === 'RELEASE_ARTIFACT_INVALID'));
});

test('release audit requires source, VSIX, and CycloneDX SBOM artifacts', async () => {
  const root = await fixture();
  const evidencePath = join(root, 'release-evidence', 'v0.3.0.json');
  const evidence = JSON.parse(await (await import('node:fs/promises')).readFile(evidencePath, 'utf8'));
  evidence.artifacts.pop();
  await writeFile(evidencePath, JSON.stringify(evidence), 'utf8');

  const report = await assessPublication({ root, release: true });

  assert.equal(report.status, 'BLOCKED');
  assert.ok(report.blockers.some((finding) => finding.code === 'RELEASE_EVIDENCE_INCOMPLETE'));
});

test('release audit requires a successful fresh install of the packaged VSIX', async () => {
  const root = await fixture();
  const evidencePath = join(root, 'release-evidence', 'v0.3.0.json');
  const evidence = JSON.parse(await (await import('node:fs/promises')).readFile(evidencePath, 'utf8'));
  evidence.freshInstall.passed = false;
  await writeFile(evidencePath, JSON.stringify(evidence), 'utf8');

  const report = await assessPublication({ root, release: true });

  assert.equal(report.status, 'BLOCKED');
  assert.ok(report.blockers.some((finding) => finding.code === 'RELEASE_EVIDENCE_INCOMPLETE'));
});

test('release audit requires checksummed CodeQL evidence bound to the exact release', async () => {
  const root = await fixture();
  const evidencePath = join(root, 'release-evidence', 'v0.3.0.json');
  const evidence = JSON.parse(await (await import('node:fs/promises')).readFile(evidencePath, 'utf8'));
  evidence.codeScanning = { passed: false, evidence: 'https://example.invalid/report' };
  await writeFile(evidencePath, JSON.stringify(evidence), 'utf8');

  const report = await assessPublication({ root, release: true });

  assert.equal(report.status, 'BLOCKED');
  assert.ok(report.blockers.some((finding) => finding.code === 'RELEASE_EVIDENCE_INCOMPLETE'));
});

test('release audit rejects security controls backed only by self-declared text', async () => {
  const root = await fixture();
  const evidencePath = join(root, 'release-evidence', 'v0.3.0.json');
  const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
  const receiptPath = evidence.securityReview.evidence.split('#sha256=')[0];
  const receipt = JSON.parse(await readFile(join(root, receiptPath), 'utf8'));
  receipt.controls[0].evidence = 'verified codeql evidence';
  const contents = `${JSON.stringify(receipt)}\n`;
  await writeFile(join(root, receiptPath), contents, 'utf8');
  evidence.securityReview.evidence = `${receiptPath}#sha256=${createHash('sha256').update(contents).digest('hex')}`;
  await writeFile(evidencePath, JSON.stringify(evidence), 'utf8');

  const report = await assessPublication({ root, release: true });

  assert.equal(report.status, 'BLOCKED');
  assert.ok(report.blockers.some((finding) => finding.code === 'RELEASE_EVIDENCE_INCOMPLETE'));
});

test('release audit binds fresh-install evidence to the packaged VSIX hash', async () => {
  const root = await fixture();
  const evidencePath = join(root, 'release-evidence', 'v0.3.0.json');
  const evidence = JSON.parse(await (await import('node:fs/promises')).readFile(evidencePath, 'utf8'));
  evidence.freshInstall.vsixSha256 = 'd'.repeat(64);
  await writeFile(evidencePath, JSON.stringify(evidence), 'utf8');

  const report = await assessPublication({ root, release: true });

  assert.equal(report.status, 'BLOCKED');
  assert.ok(report.blockers.some((finding) => finding.code === 'RELEASE_EVIDENCE_INCOMPLETE'));
});

test('release audit requires two distinct supported VS Code versions in both installed matrices', async () => {
  const root = await fixture();
  const evidencePath = join(root, 'release-evidence', 'v0.3.0.json');
  const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
  evidence.vscodeSmoke.versions = ['1.95.3', '1.95.3'];
  evidence.freshInstall.versions = ['1.95.3', '1.95.3'];
  await writeFile(evidencePath, JSON.stringify(evidence), 'utf8');

  const report = await assessPublication({ root, release: true });

  assert.ok(report.blockers.some((finding) => finding.code === 'RELEASE_EVIDENCE_INCOMPLETE'));
});

test('release audit binds evidence to the checksummed release manifest', async () => {
  const root = await fixture();
  const evidencePath = join(root, 'release-evidence', 'v0.3.0.json');
  const evidence = JSON.parse(await (await import('node:fs/promises')).readFile(evidencePath, 'utf8'));
  evidence.commit = 'b'.repeat(40);
  await rebindReleaseReceipts(root, evidence);
  await writeFile(evidencePath, JSON.stringify(evidence), 'utf8');

  const report = await assessPublication({ root, release: true });

  assert.equal(report.status, 'BLOCKED');
  assert.ok(report.blockers.some((finding) => finding.code === 'RELEASE_MANIFEST_INVALID'));
});

test('release audit accepts final evidence outside the tracked source tree', async () => {
  const root = await fixture();
  const draftPath = join(root, 'release-evidence', 'v0.3.0.json');
  const finalPath = join(root, 'release-artifacts', 'release-evidence-final-v0.3.0.json');
  const validEvidence = await (await import('node:fs/promises')).readFile(draftPath, 'utf8');
  await writeFile(finalPath, validEvidence, 'utf8');
  const draft = JSON.parse(validEvidence);
  draft.status = 'NO-GO';
  await writeFile(draftPath, JSON.stringify(draft), 'utf8');

  const report = await assessPublication({
    root,
    release: true,
    evidencePath: 'release-artifacts/release-evidence-final-v0.3.0.json',
  });

  assert.equal(report.status, 'PASS');
});

test('release audit rejects correctly checksummed artifacts whose contents are invalid', async () => {
  const root = await fixture();
  const evidencePath = join(root, 'release-evidence', 'v0.3.0.json');
  const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
  const invalid = Buffer.from('correctly hashed but not a VSIX');
  const invalidHash = createHash('sha256').update(invalid).digest('hex');
  const vsix = evidence.artifacts.find((artifact) => artifact.path.endsWith('.vsix'));
  await writeFile(join(root, vsix.path), invalid);
  vsix.sha256 = invalidHash;
  evidence.freshInstall.vsixSha256 = invalidHash;
  const manifestPath = join(root, evidence.releaseManifest.path);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const manifestVsix = manifest.artifacts.find((artifact) => artifact.path.endsWith('.vsix'));
  manifestVsix.sha256 = invalidHash;
  manifestVsix.bytes = invalid.length;
  const manifestContents = `${JSON.stringify(manifest)}\n`;
  await writeFile(manifestPath, manifestContents, 'utf8');
  evidence.releaseManifest.sha256 = createHash('sha256').update(manifestContents).digest('hex');
  await rebindReleaseReceipts(root, evidence);
  await writeFile(evidencePath, JSON.stringify(evidence), 'utf8');

  const report = await assessPublication({ root, release: true });

  assert.ok(report.blockers.some((finding) => finding.code === 'RELEASE_MANIFEST_INVALID'));
});

test('release audit does not require an optional Hermes compatibility probe', async () => {
  const root = await fixture();
  const evidencePath = join(root, 'release-evidence', 'v0.3.0.json');
  const evidence = JSON.parse(await (await import('node:fs/promises')).readFile(evidencePath, 'utf8'));
  delete evidence.hermesProbe;
  await writeFile(evidencePath, JSON.stringify(evidence), 'utf8');

  const report = await assessPublication({ root, release: true });

  assert.equal(report.status, 'PASS');
});

test('audit rejects publishable symbolic links and directory junctions', async () => {
  const root = await fixture();
  const target = join(root, 'link-target');
  await mkdir(target, { recursive: true });
  await symlink(target, join(root, 'linked-directory'), 'junction');

  const report = await assessPublication({ root, release: false });

  assert.equal(report.status, 'FAIL');
  assert.ok(report.errors.some((finding) => finding.code === 'SYMLINK_NOT_ALLOWED'));
});

test('audit ignores the repository root git pointer used by a legitimate worktree', async () => {
  const root = await fixture();
  const baseline = await assessPublication({ root, release: false });
  await rm(join(root, '.git'), { recursive: true, force: true });
  await writeFile(join(root, '.git'), 'gitdir: C:/repository/.git/worktrees/release\n', 'utf8');

  const report = await assessPublication({ root, release: false });

  assert.equal(report.status, 'PASS');
  assert.equal(report.checkedFiles, baseline.checkedFiles);
});

test('audit rejects nested git metadata even when it is a file', async () => {
  const root = await fixture();
  await mkdir(join(root, 'recovered'), { recursive: true });
  await writeFile(join(root, 'recovered', '.git'), 'gitdir: C:/private/repository/.git\n', 'utf8');

  const report = await assessPublication({ root, release: false });

  assert.equal(report.status, 'FAIL');
  assert.ok(report.errors.some((finding) => (
    finding.code === 'NESTED_REPOSITORY' && finding.path === 'recovered/.git'
  )));
});

test('release audit rejects a non-GitHub repository URL', async () => {
  const root = await fixture();
  const manifestPath = join(root, 'package.json');
  const manifest = JSON.parse(await (await import('node:fs/promises')).readFile(manifestPath, 'utf8'));
  manifest.repository.url = 'https://example.invalid/repository.git';
  await writeFile(manifestPath, JSON.stringify(manifest), 'utf8');

  const report = await assessPublication({ root, release: true });

  assert.equal(report.status, 'BLOCKED');
  assert.ok(report.blockers.some((finding) => finding.code === 'REPOSITORY_NOT_CONFIGURED'));
});

test('repository CI has a least-privilege cross-platform matrix', async () => {
  const workflow = await (await import('node:fs/promises')).readFile(
    new URL('../.github/workflows/ci.yml', import.meta.url),
    'utf8',
  );

  assert.match(workflow, /permissions:\s*\n\s+contents: read/);
  assert.match(workflow, /push:\s*\n\s+branches: \[main\]/);
  assert.match(workflow, /pull_request:\s*\n\s+branches: \[main\]/);
  assert.match(workflow, /os: \[ubuntu-latest, windows-latest\]/);
  assert.match(workflow, /node: \[22, 24\]/);
  assert.match(workflow, /cancel-in-progress: true/);
  assert.match(workflow, /actions\/checkout@[0-9a-f]{40} # v7\.0\.1/);
  assert.match(workflow, /actions\/setup-node@[0-9a-f]{40} # v7\.0\.0/);
  assert.doesNotMatch(workflow, /pull_request_target/);
  assert.match(workflow, /node --test/);
  assert.match(workflow, /node scripts\/smoke\.mjs/);
  assert.match(workflow, /node scripts\/check\.mjs/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm audit --audit-level=moderate/);
  assert.match(workflow, /npm run test:mutation/);
  assert.match(workflow, /name: VS Code Extension Host/);
  assert.match(workflow, /npm run package:extension/);
  assert.match(workflow, /xvfb-run -a npm run test:vscode:minimum/);
});

test('the documented release gate cannot skip exact source rebuild verification', async () => {
  const manifest = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8'));

  assert.match(manifest.scripts['publication:release-check'], /^npm run verify:release && /);
  assert.match(manifest.scripts['validate:release-candidate'], /npm run build:release && npm run verify:release/);
});

test('public product metadata declares the canonical brand and repository', async () => {
  const productRoot = new URL('..', import.meta.url);
  const manifest = JSON.parse(await (await import('node:fs/promises')).readFile(
    new URL('package.json', productRoot),
    'utf8',
  ));
  const extension = JSON.parse(await (await import('node:fs/promises')).readFile(
    new URL('apps/vscode-extension/package.json', productRoot),
    'utf8',
  ));
  const readme = await (await import('node:fs/promises')).readFile(
    new URL('README.md', productRoot),
    'utf8',
  );
  const extensionReadme = await (await import('node:fs/promises')).readFile(
    new URL('apps/vscode-extension/README.md', productRoot),
    'utf8',
  );
  const extensionLocale = JSON.parse(await (await import('node:fs/promises')).readFile(
    new URL('apps/vscode-extension/package.nls.json', productRoot),
    'utf8',
  ));

  assert.equal(manifest.version, '0.3.1');
  assert.equal(extension.version, manifest.version);
  assert.match(extension.version, /^\d+\.\d+\.\d+$/);
  assert.equal(
    manifest.repository?.url,
    'https://github.com/danielmontagna86-source/protheus-engineering-agent.git',
  );
  assert.equal(
    manifest.description,
    'Runtime de engenharia baseado em evidências e interface VS Code fina para projetos Protheus ADVPL/TLPP.',
  );
  assert.ok(manifest.keywords.includes('vscode'));
  assert.ok(manifest.keywords.includes('mcp'));
  assert.match(readme, /Projeto comunitário independente/);
  assert.match(readme, /Extensão VS Code autônoma para engenharia ADVPL\/TLPP/i);
  assert.match(readme, /não exige Hermes, conta de IA, modelo, Python/i);
  assert.match(extensionReadme, /Interface VS Code autônoma para engenharia ADVPL\/TLPP/i);
  assert.match(extensionLocale['extension.description'], /^Ferramentas independentes de engenharia para projetos ADVPL\/TLPP/);
  assert.deepEqual(extension.categories, ['Linters', 'Testing']);
  assert.equal(extension.preview, true);
  assert.equal(extension.pricing, 'Free');
  assert.equal(extension.qna, 'marketplace');
  assert.match(extension.icon, /\.png$/i);
  assert.ok(extension.contributes.walkthroughs[0].steps.length >= 3);
  assert.match(extension.bugs?.url ?? '', /^https:\/\/github\.com\//);
});

test('source attributes canonicalize every textual release file to LF', async () => {
  const attributes = await (await import('node:fs/promises')).readFile(
    new URL('.gitattributes', new URL('..', import.meta.url)),
    'utf8',
  );
  assert.match(attributes, /^\* text=auto eol=lf\r?$/m);
  assert.match(attributes, /\*\.png binary/);
  assert.match(attributes, /\*\.prw text working-tree-encoding=windows-1252 eol=lf/);
});

test('public discovery contract makes the Marketplace and GitHub launch actionable without unsupported claims', async () => {
  const productRoot = new URL('..', import.meta.url);
  const launchOperations = await (await import('node:fs/promises')).readFile(
    new URL('docs/public-launch-operations.md', productRoot),
    'utf8',
  );
  const extensionReadme = await (await import('node:fs/promises')).readFile(
    new URL('apps/vscode-extension/README.md', productRoot),
    'utf8',
  );

  assert.match(launchOperations, /GitHub topics/i);
  assert.match(launchOperations, /social preview/i);
  assert.match(launchOperations, /Marketplace publisher/i);
  assert.match(launchOperations, /release evidence/i);
  assert.match(launchOperations, /Dependabot alerts enabled/i);
  assert.match(launchOperations, /private vulnerability reporting is unavailable/i);
  assert.match(launchOperations, /1,000 stars/i);
  assert.match(launchOperations, /not a release gate/i);
  assert.match(launchOperations, /do not.*productivity/i);
  assert.match(extensionReadme, /projeto comunitário independente/i);
  assert.match(extensionReadme, /não substitui.*VS Code/i);
});

test('publication audit rejects a Marketplace-incompatible prerelease version', async () => {
  const root = await fixture();
  for (const relativePath of ['package.json', 'apps/vscode-extension/package.json']) {
    const path = join(root, relativePath);
    const manifest = JSON.parse(await (await import('node:fs/promises')).readFile(path, 'utf8'));
    manifest.version = '0.3.0-alpha.1';
    await writeFile(path, JSON.stringify(manifest), 'utf8');
  }

  const report = await assessPublication({ root, release: false });

  assert.equal(report.status, 'FAIL');
  assert.ok(report.errors.some((finding) => finding.code === 'MARKETPLACE_VERSION_INVALID'));
});

test('Marketplace channel requires preview for 0.x and regular publication for stable 1.x', async () => {
  const root = await fixture();
  const packagePath = join(root, 'package.json');
  const extensionPath = join(root, 'apps', 'vscode-extension', 'package.json');
  const product = JSON.parse(await readFile(packagePath, 'utf8'));
  const extension = JSON.parse(await readFile(extensionPath, 'utf8'));
  product.version = '1.0.0';
  extension.version = '1.0.0';
  extension.preview = false;
  await writeFile(packagePath, JSON.stringify(product), 'utf8');
  await writeFile(extensionPath, JSON.stringify(extension), 'utf8');
  assert.equal((await assessPublication({ root, release: false })).status, 'PASS');

  extension.preview = true;
  await writeFile(extensionPath, JSON.stringify(extension), 'utf8');
  const invalid = await assessPublication({ root, release: false });
  assert.ok(invalid.errors.some((finding) => finding.code === 'MARKETPLACE_METADATA_INCOMPLETE'));
});

test('Marketplace icon is a real 128 by 128 PNG', async () => {
  const bytes = await (await import('node:fs/promises')).readFile(
    new URL('../apps/vscode-extension/media/icon.png', import.meta.url),
  );

  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16), 128);
  assert.equal(bytes.readUInt32BE(20), 128);
});

test('GitHub social preview is a compact 1280 by 640 PNG without a fabricated product screenshot', async () => {
  const bytes = await (await import('node:fs/promises')).readFile(
    new URL('../media/social-preview.png', import.meta.url),
  );

  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16), 1280);
  assert.equal(bytes.readUInt32BE(20), 640);
  assert.ok(bytes.length < 1_000_000);
});

test('Apache license file remains canonical for GitHub detection and keeps attribution outside it', async () => {
  const license = await readFile(new URL('../LICENSE.md', import.meta.url), 'utf8');
  const notice = await readFile(new URL('../NOTICE', import.meta.url), 'utf8');

  assert.match(license, /^\s*Apache License\s+Version 2\.0, January 2004/);
  assert.match(license, /Copyright \[yyyy\] \[name of copyright owner\]/);
  assert.doesNotMatch(license, /SPDX-License-Identifier/);
  assert.match(notice, /Copyright 2026 Montagna/);
});

test('extension staging copies Marketplace media into the VSIX root', async () => {
  const buildScript = await (await import('node:fs/promises')).readFile(
    new URL('../scripts/build-extension.mjs', import.meta.url),
    'utf8',
  );

  assert.match(buildScript, /cp\(join\(extensionRoot, 'media'\), join\(stageRoot, 'media'\), \{ recursive: true \}\)/);
});

test('dependency security gate uses pinned actions, fails closed and supports a private repository', async () => {
  const workflow = await (await import('node:fs/promises')).readFile(
    new URL('../.github/workflows/security.yml', import.meta.url),
    'utf8',
  );

  assert.match(workflow, /actions\/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8/);
  assert.match(workflow, /google\/osv-scanner-action\/osv-scanner-action@06b2ab4348248b456ee06c9e953637f55e03504f/);
  assert.match(workflow, /--lockfile=package-lock\.json/);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
  assert.doesNotMatch(workflow, /security-events:\s*write/);
  assert.doesNotMatch(workflow, /pull_request_target/);
});

test('CodeQL is pinned, least-privilege and activates automatically when the repository is public', async () => {
  const workflow = await (await import('node:fs/promises')).readFile(
    new URL('../.github/workflows/codeql.yml', import.meta.url),
    'utf8',
  );

  assert.match(workflow, /if: github\.event\.repository\.private == false/);
  assert.match(workflow, /github\/codeql-action\/init@f52b05f4acaaa234e44466e66d29050e135ea9ef # v4\.36\.0/);
  assert.match(workflow, /github\/codeql-action\/analyze@f52b05f4acaaa234e44466e66d29050e135ea9ef # v4\.36\.0/);
  assert.match(workflow, /languages: javascript-typescript/);
  assert.match(workflow, /queries: security-extended/);
  assert.match(workflow, /security-events: write/);
  assert.doesNotMatch(workflow, /pull_request_target/);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
});

test('supply-chain workflows are pinned, least-privilege and fail closed', async () => {
  const dependencyReview = await readFile(join(process.cwd(), '.github', 'workflows', 'dependency-review.yml'), 'utf8');
  const secretScan = await readFile(join(process.cwd(), '.github', 'workflows', 'secret-scan.yml'), 'utf8');
  const provenance = await readFile(join(process.cwd(), '.github', 'workflows', 'provenance.yml'), 'utf8');
  for (const workflow of [dependencyReview, secretScan, provenance]) {
    assert.doesNotMatch(workflow, /uses:\s+[^\s@]+@v\d+/);
    assert.match(workflow, /permissions:\s*\r?\n\s+contents: read/);
    assert.match(workflow, /timeout-minutes:/);
  }
  assert.match(dependencyReview, /fail-on-severity: moderate/);
  assert.match(dependencyReview, /if: github\.event\.repository\.private == false/);
  assert.match(secretScan, /fetch-depth: 0/);
  assert.match(secretScan, /version: 3\.97\.4/);
  assert.match(secretScan, /name: Verified secrets/);
  assert.match(secretScan, /extra_args: --results=verified/);
  assert.doesNotMatch(secretScan, /results=verified,unknown/);
  assert.doesNotMatch(secretScan, /extra_args:.*--fail/);
  assert.match(provenance, /id-token: write/);
  assert.match(provenance, /attestations: write/);
  assert.doesNotMatch(provenance, /artifact-metadata: write/);
  assert.match(provenance, /npm run build:release/);
  assert.match(provenance, /release-artifacts\/\*-source\.zip/);
  assert.match(provenance, /release-artifacts\/release-manifest-\*\.json/);
  assert.match(provenance, /release-artifacts\/SHA256SUMS/);
  assert.match(provenance, /sha256sum --check SHA256SUMS/);
  assert.match(provenance, /gh attestation verify/);
});

test('mutation testing always removes its local sandbox', async () => {
  const config = await (await import('node:fs/promises')).readFile(
    new URL('../stryker.config.mjs', import.meta.url),
    'utf8',
  );

  assert.match(config, /cleanTempDir:\s*['"]always['"]/);
  assert.match(config, /tempDirName:\s*join\(tmpdir\(\),\s*['"]pea-stryker-tmp['"]\)/);
  assert.match(config, /high:\s*95/);
  assert.match(config, /break:\s*95/);
});

test('third-party notices preserve the official EngPro provider license and revision', async () => {
  const notices = await (await import('node:fs/promises')).readFile(
    new URL('../THIRD_PARTY_NOTICES.md', import.meta.url),
    'utf8',
  );
  const catalog = JSON.parse(await (await import('node:fs/promises')).readFile(
    new URL('../config/skill-providers.json', import.meta.url),
    'utf8',
  ));

  assert.match(notices, /TOTVS EngPro AI Agent Skills/);
  assert.match(notices, /MIT/);
  assert.match(notices, new RegExp(catalog.providers[0].revision));
  assert.equal(catalog.providers[0].mode, 'reference');
});
