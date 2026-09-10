import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { assertNoLinkPath } from './path-safety.mjs';
import { verifySbom, verifySourceArchive } from './release-artifacts.mjs';
import { verifyVsix } from './verify-vsix.mjs';

const requiredFiles = [
  'README.md',
  'README.en.md',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'GOVERNANCE.md',
  'SUPPORT.md',
  'CHANGELOG.md',
  'NOTICE',
  'THIRD_PARTY_NOTICES.md',
  'docs/brand-positioning.md',
  'docs/public-launch-operations.md',
  'docs/code-review-production-readiness.md',
  'docs/qa-test-quality-review.md',
  'docs/security/dependency-license-review.md',
  'docs/security/owasp-coverage.md',
  '.github/workflows/ci.yml',
  '.github/workflows/security.yml',
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
];

const ignoredDirectories = new Set(['.git', '.vscode-test', 'coverage', 'dist', 'node_modules', 'release-artifacts']);
const localStateDirectories = new Set(['.pea', '.stryker-tmp', '.worktrees', 'work']);
const textExtensions = new Set([
  '.aph', '.apw', '.cff', '.cjs', '.css', '.html', '.js', '.json', '.md', '.mjs', '.ppp', '.ppx', '.prg', '.prw', '.prx', '.sql', '.svg', '.tlpp', '.toml', '.ts', '.txt', '.yaml', '.yml',
]);
const allowedBinaryFiles = new Set(['apps/vscode-extension/media/icon.png']);
const extensionlessTextNames = new Set([
  '.editorconfig', '.env.example', '.gitattributes', '.gitignore', '.vscodeignore', 'CODEOWNERS', 'NOTICE',
]);
const publicCommandIds = Object.freeze([
  'pea.doctor', 'pea.indexWorkspace', 'pea.openContext', 'pea.addMemoryEntry',
  'pea.addJournalEntry', 'pea.promoteJournalEntry', 'pea.expireMemory', 'pea.importSnapshot',
  'pea.searchTdn', 'pea.searchDictionary', 'pea.prepareBuild', 'pea.runBuild',
  'pea.buildStatus', 'pea.cancelBuild', 'pea.buildEvidence', 'pea.reviewActiveFile',
  'pea.reviewChanges', 'pea.refreshEngineeringCenter', 'pea.openSampleWorkspace',
]);
const stableGateIds = Object.freeze([
  'g0BaselineIntegrity', 'g1PremiumP0', 'g2SemanticP1', 'g3Tier0Virtualization',
  'g4OfficialAnalyzer', 'g5OfficialPostgres', 'g6LicensedAppserver',
  'g7PackageLifecycle', 'g8UxAccessibility', 'g9SecuritySupplyChain',
  'g10CompatibilitySupport', 'g11EffectivenessClaims', 'g12ExactRelease',
  'g13PublicationAuthorization',
]);
const stableGateEvidenceKinds = Object.freeze({
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
});
const securityControlWorkflows = Object.freeze({
  codeql: '.github/workflows/codeql.yml',
  'dependency-review': '.github/workflows/dependency-review.yml',
  osv: '.github/workflows/security.yml',
  provenance: '.github/workflows/provenance.yml',
  'secret-scan': '.github/workflows/secret-scan.yml',
});
const secretFilePatterns = [
  /^\.env(?:\..+)?$/i,
  /^(?:id_rsa|id_ed25519)$/i,
  /\.(?:jks|key|p12|pfx|pem)$/i,
];
const personalPathPatterns = [
  /[A-Za-z]:[\\/]Users[\\/][^\s)'"`]+/g,
  /\/(?:Users|home)\/[^\s)'"`]+/g,
];
const secretContentPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
];

function finding(code, path, message) {
  return { code, path, message };
}

async function existsAsFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function walk(root, directory, files, errors, options = {}) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const repositoryPath = relative(root, path).replaceAll('\\', '/');
    if (entry.name === '.git') {
      if (repositoryPath !== '.git') {
        errors.push(finding('NESTED_REPOSITORY', repositoryPath, 'Recovered or nested Git metadata must not be published.'));
      }
      continue;
    }
    if (entry.isDirectory() && localStateDirectories.has(entry.name)) {
      if (!options.excludeLocalState) {
        errors.push(finding('LOCAL_STATE_DIRECTORY', repositoryPath, 'Local runtime or worktree state must not be published.'));
      }
      continue;
    }
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    if (entry.isSymbolicLink()) {
      errors.push(finding('SYMLINK_NOT_ALLOWED', repositoryPath, 'Symbolic links are excluded from the portable public source tree.'));
      continue;
    }
    if (entry.isDirectory()) {
      await walk(root, path, files, errors, options);
      continue;
    }
    if (entry.isFile()) files.push({ path, repositoryPath, name: entry.name });
  }
}

function repositoryUrl(manifest) {
  if (typeof manifest.repository === 'string') return manifest.repository;
  return manifest.repository?.url;
}

function hasCompleteLicenseText(license, contents) {
  if (license === 'UNLICENSED') return contents.includes('UNLICENSED');
  if (license === 'Apache-2.0') {
    return contents.includes('Apache License')
      && contents.includes('Version 2.0')
      && contents.includes('http://www.apache.org/licenses/');
  }
  if (license === 'MIT') {
    return contents.includes('Permission is hereby granted')
      && contents.includes('THE SOFTWARE IS PROVIDED "AS IS"');
  }
  return contents.length >= 500 && contents.includes(`SPDX-License-Identifier: ${license}`);
}

function completeCommandEvidence(evidence) {
  return evidence?.commands === publicCommandIds.length
    && Array.isArray(evidence.commandIds)
    && evidence.commandIds.length === publicCommandIds.length
    && publicCommandIds.every((id) => evidence.commandIds.includes(id));
}

function completeVersionMatrix(versions) {
  return Array.isArray(versions)
    && versions.includes('1.95.3')
    && versions.every((version) => /^\d+\.\d+\.\d+$/.test(version))
    && new Set(versions).size >= 2
    && new Set(versions).size === versions.length;
}

function canonicalGithubRepository(url) {
  const match = String(url ?? '').match(/^(?:git\+)?https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/i);
  return match ? `https://github.com/${match[1]}/${match[2]}` : null;
}

function githubEvidenceMatches(url, repository) {
  const base = canonicalGithubRepository(repository);
  if (!base || typeof url !== 'string' || !url.startsWith(`${base}/`)) return false;
  const suffix = url.slice(base.length + 1);
  return /^(?:actions\/runs\/\d+|security\/code-scanning(?:\/[^?#]+)?|attestations(?:\/[^?#]+)?|releases\/tag\/[^/?#]+|pull\/\d+|commit\/[0-9a-f]{40})(?:[?#].*)?$/i.test(suffix);
}

async function verifyReleaseReceipt(productRoot, reference, expected) {
  const match = String(reference ?? '').match(/^(release-artifacts\/[A-Za-z0-9._-]+)#sha256=([0-9a-f]{64})$/i);
  if (!match || !(await verifyReleaseArtifact(productRoot, { path: match[1], sha256: match[2] }))) return false;
  try {
    const document = JSON.parse(await readFile(resolve(productRoot, match[1]), 'utf8'));
    const common = document.schemaVersion === 1
      && document.kind === expected.kind
      && document.status === 'PASS'
      && document.commit?.toLowerCase() === expected.commit.toLowerCase()
      && document.releaseManifestSha256?.toLowerCase() === expected.releaseManifestSha256.toLowerCase()
      && canonicalGithubRepository(document.repository) === canonicalGithubRepository(expected.repository)
      && !Number.isNaN(Date.parse(document.capturedAt));
    if (!common) return false;
    if (expected.kind === 'github-actions-receipt') {
      return document.source === 'github-api'
        && document.headSha?.toLowerCase() === expected.commit.toLowerCase()
        && document.conclusion === 'success'
        && document.workflowPath === '.github/workflows/ci.yml'
        && Number.isSafeInteger(document.runAttempt)
        && document.runAttempt > 0
        && githubEvidenceMatches(document.url, expected.repository);
    }
    if (expected.kind === 'github-code-scanning-receipt') {
      return document.source === 'github-api'
        && document.headSha?.toLowerCase() === expected.commit.toLowerCase()
        && document.conclusion === 'success'
        && document.toolName === 'CodeQL'
        && Number.isSafeInteger(document.analysisId)
        && document.analysisId > 0
        && document.sarifResults === true
        && githubEvidenceMatches(document.url, expected.repository);
    }
    if (expected.kind === 'security-review-receipt') {
      const required = Object.keys(securityControlWorkflows);
      return Array.isArray(document.controls)
        && document.controls.length === required.length
        && required.every((control) => document.controls.some((item) => (
          item?.id === control
          && item.status === 'PASS'
          && item.evidence?.source === 'github-api'
          && item.evidence?.headSha?.toLowerCase() === expected.commit.toLowerCase()
          && item.evidence?.conclusion === 'success'
          && item.evidence?.workflowPath === securityControlWorkflows[control]
          && Number.isSafeInteger(item.evidence?.runId)
          && item.evidence.runId > 0
          && Number.isSafeInteger(item.evidence?.runAttempt)
          && item.evidence.runAttempt > 0
          && githubEvidenceMatches(item.evidence?.url, expected.repository)
        )));
    }
    return false;
  } catch {
    return false;
  }
}

async function verifyStableControlReceipt(productRoot, reference, expected) {
  const match = String(reference ?? '').match(/^(release-artifacts\/[A-Za-z0-9._-]+)#sha256=([0-9a-f]{64})$/i);
  if (!match || !(await verifyReleaseArtifact(productRoot, { path: match[1], sha256: match[2] }))) return false;
  try {
    const receipt = JSON.parse(await readFile(resolve(productRoot, match[1]), 'utf8'));
    const common = receipt.schemaVersion === 1
      && receipt.kind === expected.kind
      && receipt.gateId === expected.gateId
      && receipt.status === 'PASS'
      && receipt.commit?.toLowerCase() === expected.commit.toLowerCase()
      && receipt.releaseManifestSha256?.toLowerCase() === expected.releaseManifestSha256.toLowerCase()
      && typeof receipt.validatedBy === 'string'
      && receipt.validatedBy.trim().length > 0
      && !Number.isNaN(Date.parse(receipt.capturedAt))
      && receipt.result
      && typeof receipt.result === 'object'
      && !Array.isArray(receipt.result)
      && Object.keys(receipt.result).length > 0;
    if (!common) return false;
    const result = receipt.result;
    switch (expected.gateId) {
      case 'g0BaselineIntegrity':
        return Number.isSafeInteger(result.testsPassed) && result.testsPassed > 0
          && result.testsFailed === 0 && result.testsSkipped === 0
          && result.mutationScore >= 95 && result.diffCheck === true;
      case 'g1PremiumP0':
        return result.publicCommandsRegistered === publicCommandIds.length
          && result.coreJourneysPassed === true && result.offline === true;
      case 'g2SemanticP1':
        return result.corpusPassed === true && result.performancePassed === true
          && result.compilerEquivalentClaim === false;
      case 'g3Tier0Virtualization':
        return result.networkRequired === false && result.successFailureMatrix === true;
      case 'g4OfficialAnalyzer':
        return /^sha256:[0-9a-f]{64}$/i.test(result.imageDigest ?? '')
          && result.cleanCase === 'PASS' && result.failingCase === 'EXPECTED_FAIL'
          && result.cancellation === 'PASS' && result.timeout === 'PASS';
      case 'g5OfficialPostgres':
        return /^sha256:[0-9a-f]{64}$/i.test(result.imageDigest ?? '')
          && result.readOnly === true && result.namedQueriesPassed === true
          && result.writeDenied === true && result.teardownPassed === true;
      case 'g6LicensedAppserver':
        return result.lawfulInputs === true
          && typeof result.compilerIdentity === 'string' && result.compilerIdentity.length > 0
          && typeof result.appserverIdentity === 'string' && result.appserverIdentity.length > 0
          && /^[0-9a-f]{64}$/i.test(result.rpoSha256 ?? '')
          && result.compileSuccess === true && result.compileFailureCaptured === true;
      case 'g7PackageLifecycle':
        return Array.isArray(result.versions) && new Set(result.versions).size >= 2
          && ['install', 'upgrade', 'uninstall', 'reinstall', 'rollback'].every((key) => result[key] === 'PASS');
      case 'g8UxAccessibility':
        return Number.isSafeInteger(result.participants) && result.participants >= 3
          && ['keyboard', 'screenReader', 'highContrast', 'zoom'].every((key) => result[key] === 'PASS')
          && Number.isFinite(result.medianFirstValueSeconds) && result.medianFirstValueSeconds <= 300;
      case 'g9SecuritySupplyChain':
        return ['dependencyReview', 'secretScan', 'osv', 'npmAudit', 'codeql'].every((key) => result[key] === 'PASS')
          && result.attestationVerified === true;
      case 'g10CompatibilitySupport':
        return result.windows === true && result.linux === true && result.remote === true
          && result.supportDrill === 'PASS';
      case 'g11EffectivenessClaims':
        return Number.isSafeInteger(result.participants) && result.participants >= 3
          && result.preregistered === true
          && githubEvidenceMatches(result.preregistrationUrl, expected.repository)
          && Number.isSafeInteger(result.acceptedTasks?.withProduct)
          && result.acceptedTasks.withProduct >= result.participants
          && Number.isSafeInteger(result.acceptedTasks?.baseline)
          && result.acceptedTasks.baseline >= result.participants
          && result.anonymizedDataset === true
          && result.rawObservationsPublished === true
          && githubEvidenceMatches(result.datasetUrl, expected.repository)
          && result.analysisCodePublished === true
          && githubEvidenceMatches(result.analysisUrl, expected.repository)
          && typeof result.analysisReviewedBy === 'string'
          && result.analysisReviewedBy.trim().length > 0
          && result.licensingReviewed === true
          && result.companyAuthorizationReviewed === true
          && Array.isArray(result.confidenceIntervals)
          && result.confidenceIntervals.length > 0
          && result.confidenceIntervals.every((interval) => (
            typeof interval?.metric === 'string' && interval.metric.length > 0
            && Number.isFinite(interval.lower) && Number.isFinite(interval.upper)
            && interval.lower <= interval.upper && interval.confidenceLevel === 0.95
          ))
          && result.claimDecision === 'APPROVED';
      case 'g12ExactRelease':
        return result.attestationVerified === true
          && result.verificationTool === 'gh attestation verify'
          && githubEvidenceMatches(result.attestationUrl, expected.repository)
          && result.downloadedArtifactsVerified === true
          && result.artifactCount === 3
          && Array.isArray(result.downloadedArtifacts)
          && result.downloadedArtifacts.length === expected.artifacts.length
          && expected.artifacts.every((artifact) => result.downloadedArtifacts.some((item) => (
            item?.path === artifact.path && item.sha256 === artifact.sha256
          )))
          && Array.isArray(result.verifiedSubjects)
          && result.verifiedSubjects.length === 5
          && new Set(result.verifiedSubjects.map((item) => item?.path)).size === 5
          && result.verifiedSubjects.every((item) => (
            /^release-artifacts\/[A-Za-z0-9._-]+$/.test(item?.path ?? '')
            && /^[0-9a-f]{64}$/.test(item?.sha256 ?? '')
          ))
          && expected.artifacts.every((artifact) => result.verifiedSubjects.some((item) => (
            item.path === artifact.path && item.sha256 === artifact.sha256
          )))
          && result.verifiedSubjects.some((item) => (
            item.path === `release-artifacts/release-manifest-v${expected.targetVersion}.json`
            && item.sha256 === expected.releaseManifestSha256
          ))
          && result.verifiedSubjects.some((item) => item.path === 'release-artifacts/SHA256SUMS');
      case 'g13PublicationAuthorization':
        return result.legalApproved === true && result.publisherReady === true
          && result.ownerAuthorized === true;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

async function verifyStableGateEvidence(
  productRoot,
  gateId,
  gate,
  commit,
  targetVersion,
  approvedBy,
  releaseManifestSha256,
  artifacts,
  repository,
) {
  if (gate?.passed !== true || gate.commit?.toLowerCase() !== commit.toLowerCase()) return false;
  const match = String(gate.evidence ?? '').match(/^(release-artifacts\/[A-Za-z0-9._-]+)#sha256=([0-9a-f]{64})$/i);
  if (!match || !productRoot) return false;
  if (!(await verifyReleaseArtifact(productRoot, { path: match[1], sha256: match[2] }))) return false;
  try {
    const document = JSON.parse(await readFile(resolve(productRoot, match[1]), 'utf8'));
    const common = document?.schemaVersion === 1
      && document.gateId === gateId
      && document.status === 'PASS'
      && document.commit?.toLowerCase() === commit.toLowerCase()
      && document.releaseManifestSha256?.toLowerCase() === releaseManifestSha256?.toLowerCase()
      && Array.isArray(document.evidence)
      && document.evidence.length === 1
      && document.evidence[0]?.kind === stableGateEvidenceKinds[gateId]
      && typeof document.evidence[0]?.receipt === 'string'
      && typeof document.validatedBy === 'string'
      && document.validatedBy.trim().length > 0
      && !Number.isNaN(Date.parse(document.validatedAt));
    if (!common) return false;
    if (!(await verifyStableControlReceipt(productRoot, document.evidence[0].receipt, {
      gateId,
      kind: stableGateEvidenceKinds[gateId],
      commit,
      releaseManifestSha256,
      artifacts,
      repository,
      targetVersion,
    }))) return false;
    if (gateId !== 'g13PublicationAuthorization') return true;
    return typeof approvedBy === 'string'
      && document.authorization?.approvedBy === approvedBy
      && !Number.isNaN(Date.parse(document.authorization?.approvedAt))
      && document.authorization?.scope === `publish-stable-${targetVersion}`;
  } catch {
    return false;
  }
}

async function completeStableGates(evidence, targetVersion, options) {
  if (Number.parseInt(targetVersion.split('.')[0], 10) < 1) return true;
  if (!options?.root || !canonicalGithubRepository(options.repositoryUrl)) return false;
  const actualIds = Object.keys(evidence?.stableGates ?? {});
  if (actualIds.length !== stableGateIds.length || stableGateIds.some((id) => !actualIds.includes(id))) return false;
  const results = await Promise.all(stableGateIds.map((id) => verifyStableGateEvidence(
    options.root,
    id,
    evidence.stableGates[id],
    evidence.commit,
    targetVersion,
    evidence.approvedBy,
    evidence.releaseManifest?.sha256,
    evidence.artifacts,
    options.repositoryUrl,
  )));
  return results.every(Boolean);
}

export async function completeReleaseEvidence(evidence, targetVersion, options = {}) {
  const artifacts = evidence?.artifacts;
  const vsix = Array.isArray(artifacts) ? artifacts.find((artifact) => artifact?.path?.endsWith('.vsix')) : null;
  const completeArtifacts = Array.isArray(artifacts)
    && artifacts.length === 3
    && new Set(artifacts.map((artifact) => artifact?.path)).size === 3
    && artifacts.every((artifact) => (
      typeof artifact?.path === 'string'
      && /^release-artifacts\/[A-Za-z0-9._-]+$/.test(artifact.path)
      && /^[0-9a-f]{64}$/i.test(artifact.sha256 ?? '')
    ))
    && artifacts.some((artifact) => artifact.path.endsWith('-source.zip'))
    && artifacts.some((artifact) => artifact.path.endsWith('.vsix'))
    && artifacts.some((artifact) => artifact.path.endsWith('.cdx.json'));
  const receiptContext = {
    commit: evidence?.commit ?? '',
    releaseManifestSha256: evidence?.releaseManifest?.sha256 ?? '',
    repository: options.repositoryUrl,
  };
  const receiptsComplete = options.root && canonicalGithubRepository(options.repositoryUrl)
    && (await Promise.all([
      verifyReleaseReceipt(options.root, evidence?.ci?.evidence, { ...receiptContext, kind: 'github-actions-receipt' }),
      verifyReleaseReceipt(options.root, evidence?.codeScanning?.evidence, { ...receiptContext, kind: 'github-code-scanning-receipt' }),
      verifyReleaseReceipt(options.root, evidence?.securityReview?.evidence, { ...receiptContext, kind: 'security-review-receipt' }),
    ])).every(Boolean);
  return evidence?.schemaVersion === 1
    && evidence.version === targetVersion
    && evidence.status === 'GO'
    && /^[0-9a-f]{40}$/i.test(evidence.commit ?? '')
    && evidence.ci?.passed === true
    && evidence.codeReview?.passed === true
    && evidence.securityReview?.passed === true
    && evidence.codeScanning?.passed === true
    && receiptsComplete
    && evidence.vscodeSmoke?.passed === true
    && completeCommandEvidence(evidence.vscodeSmoke)
    && evidence.vscodeSmoke?.isolated === true
    && completeVersionMatrix(evidence.vscodeSmoke?.versions)
    && evidence.freshInstall?.passed === true
    && completeCommandEvidence(evidence.freshInstall)
    && evidence.freshInstall?.isolated === true
    && completeVersionMatrix(evidence.freshInstall?.versions)
    && JSON.stringify([...evidence.freshInstall.versions].sort())
      === JSON.stringify([...evidence.vscodeSmoke.versions].sort())
    && evidence.freshInstall?.vsixSha256 === vsix?.sha256
    && completeArtifacts
    && evidence.releaseManifest?.path === `release-artifacts/release-manifest-v${targetVersion}.json`
    && /^[0-9a-f]{64}$/i.test(evidence.releaseManifest?.sha256 ?? '')
    && await completeStableGates(evidence, targetVersion, options)
    && typeof evidence.approvedBy === 'string'
    && evidence.approvedBy.trim().length > 0;
}

function inspectGitState(productRoot) {
  const run = (args) => spawnSync('git', args, {
    cwd: productRoot, encoding: 'utf8', windowsHide: true,
  });
  const head = run(['rev-parse', '--verify', 'HEAD']);
  const status = run(['status', '--porcelain=v1', '--untracked-files=no']);
  if (head.status !== 0 || status.status !== 0) return null;
  return { commit: String(head.stdout).trim(), dirty: String(status.stdout).trim().length > 0 };
}

async function verifyReleaseArtifact(productRoot, artifact) {
  try {
    const artifactPath = resolve(productRoot, artifact.path);
    const repositoryPath = relative(productRoot, artifactPath);
    if (repositoryPath === '..' || repositoryPath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(repositoryPath)) {
      return false;
    }
    await assertNoLinkPath(productRoot, artifactPath);
    const info = await lstat(artifactPath);
    if (!info.isFile() || info.isSymbolicLink()) return false;
    if (artifact.bytes !== undefined && info.size !== artifact.bytes) return false;
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(artifactPath)) hash.update(chunk);
    return hash.digest('hex').toLowerCase() === artifact.sha256.toLowerCase();
  } catch {
    return false;
  }
}

async function verifyReleaseManifestEvidence(productRoot, evidence, targetVersion) {
  if (!(await verifyReleaseArtifact(productRoot, evidence.releaseManifest))) return false;
  try {
    const manifest = JSON.parse(await readFile(resolve(productRoot, evidence.releaseManifest.path), 'utf8'));
    const manifestArtifacts = Array.isArray(manifest.artifacts)
      ? manifest.artifacts.map(({ path, sha256 }) => ({ path, sha256 }))
      : [];
    const structurallyValid = manifest.schemaVersion === 1
      && manifest.version === targetVersion
      && manifest.commit === evidence.commit
      && JSON.stringify(manifestArtifacts) === JSON.stringify(evidence.artifacts)
      && ['publication', 'sourceArchive', 'vsix', 'vsixReproducible', 'vsixSourceCommit', 'vsixSourceRebuild', 'sbom', 'sbomLockfile'].every(
        (key) => manifest.verification?.[key] === 'PASS',
      );
    if (!structurallyValid) return false;
    for (const artifact of manifest.artifacts) {
      if (!(await verifyReleaseArtifact(productRoot, artifact))) return false;
    }
    const source = manifest.artifacts.find((artifact) => artifact.path.endsWith('-source.zip'));
    const vsix = manifest.artifacts.find((artifact) => artifact.path.endsWith('.vsix'));
    const sbom = manifest.artifacts.find((artifact) => artifact.path.endsWith('.cdx.json'));
    if (!source || !vsix || !sbom) return false;
    const [sourceReport, vsixReport, sbomReport] = await Promise.all([
      verifySourceArchive(resolve(productRoot, source.path), targetVersion, {
        root: productRoot,
        commit: manifest.commit,
      }),
      verifyVsix(resolve(productRoot, vsix.path), targetVersion, { commit: manifest.commit }),
      verifySbom(resolve(productRoot, sbom.path), targetVersion, { root: productRoot }),
    ]);
    return [sourceReport, vsixReport, sbomReport].every((report) => report.status === 'PASS');
  } catch {
    return false;
  }
}

export async function assessPublication({ root, release = false, evidencePath: requestedEvidencePath, excludeLocalState = false }) {
  const productRoot = resolve(root);
  const errors = [];
  const blockers = [];
  const gitState = release ? inspectGitState(productRoot) : null;
  if (release && !gitState) {
    blockers.push(finding('RELEASE_GIT_STATE_UNAVAILABLE', '.git', 'Release verification requires a readable Git HEAD and tracked-tree status.'));
  } else if (gitState?.dirty) {
    blockers.push(finding('RELEASE_TREE_DIRTY', '.git', 'Release verification requires a clean tracked working tree.'));
  }

  for (const repositoryPath of requiredFiles) {
    if (!(await existsAsFile(join(productRoot, repositoryPath)))) {
      errors.push(finding('REQUIRED_FILE_MISSING', repositoryPath, 'Required public repository file is missing.'));
    }
  }

  let manifest;
  let extensionManifest;
  try {
    manifest = JSON.parse(await readFile(join(productRoot, 'package.json'), 'utf8'));
  } catch (error) {
    errors.push(finding('MANIFEST_INVALID', 'package.json', error.message));
  }
  try {
    extensionManifest = JSON.parse(
      await readFile(join(productRoot, 'apps', 'vscode-extension', 'package.json'), 'utf8'),
    );
  } catch (error) {
    errors.push(finding('MANIFEST_INVALID', 'apps/vscode-extension/package.json', error.message));
  }

  if (manifest && extensionManifest) {
    if (manifest.version !== extensionManifest.version) {
      errors.push(finding('VERSION_MISMATCH', 'apps/vscode-extension/package.json', 'Product and extension versions differ.'));
    }
    if (manifest.license !== extensionManifest.license) {
      errors.push(finding('LICENSE_MISMATCH', 'apps/vscode-extension/package.json', 'Product and extension licenses differ.'));
    }
    if (!/^\d+\.\d+\.\d+$/.test(extensionManifest.version ?? '')) {
      errors.push(finding('MARKETPLACE_VERSION_INVALID', 'apps/vscode-extension/package.json', 'Marketplace extension version must use numeric major.minor.patch; publish preview builds with the Marketplace pre-release flag.'));
    }
    const stableChannel = Number.parseInt(extensionManifest.version.split('.')[0], 10) >= 1;
    const marketplaceMetadataComplete = extensionManifest.preview === !stableChannel
      && extensionManifest.pricing === 'Free'
      && extensionManifest.qna === 'marketplace'
      && /^#[0-9a-f]{6}$/i.test(extensionManifest.galleryBanner?.color ?? '')
      && ['dark', 'light'].includes(extensionManifest.galleryBanner?.theme)
      && /\.png$/i.test(extensionManifest.icon ?? '')
      && Array.isArray(extensionManifest.contributes?.walkthroughs)
      && extensionManifest.contributes.walkthroughs.some((walkthrough) => (
        Array.isArray(walkthrough.steps) && walkthrough.steps.length >= 3
      ));
    if (!marketplaceMetadataComplete) {
      errors.push(finding('MARKETPLACE_METADATA_INCOMPLETE', 'apps/vscode-extension/package.json', 'Channel-appropriate preview status, pricing, Q&A, gallery, PNG icon, and a three-step walkthrough are required.'));
    } else if (!(await existsAsFile(join(productRoot, 'apps', 'vscode-extension', extensionManifest.icon)))) {
      errors.push(finding('MARKETPLACE_ICON_MISSING', extensionManifest.icon, 'The declared Marketplace PNG icon is missing.'));
    }
    try {
      const licenseText = await readFile(join(productRoot, 'LICENSE.md'), 'utf8');
      const expected = manifest.license === 'UNLICENSED'
        ? 'UNLICENSED'
        : `SPDX-License-Identifier: ${manifest.license}`;
      if (!licenseText.includes(expected)) {
        errors.push(finding('LICENSE_MISMATCH', 'LICENSE.md', 'License file does not match package metadata.'));
      } else if (!hasCompleteLicenseText(manifest.license, licenseText)) {
        errors.push(finding('LICENSE_TEXT_INCOMPLETE', 'LICENSE.md', 'License identifier exists but the applicable license text is incomplete.'));
      }
    } catch {
      errors.push(finding('REQUIRED_FILE_MISSING', 'LICENSE.md', 'License file is missing.'));
    }

    if (release && manifest.license === 'UNLICENSED') {
      blockers.push(finding('LICENSE_NOT_SELECTED', 'package.json', 'Select and apply a public product license before release.'));
    }
    const configuredRepository = repositoryUrl(manifest);
    const validGitHubRepository = typeof configuredRepository === 'string'
      && /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(configuredRepository);
    if (release && !validGitHubRepository) {
      blockers.push(finding('REPOSITORY_NOT_CONFIGURED', 'package.json', 'Configure the final GitHub repository URL before release.'));
    }
    if (release) {
      let targetVersion;
      try {
        const releaseSpec = await readFile(
          join(productRoot, '.specs', 'features', 'public-github-release', 'spec.md'),
          'utf8',
        );
        targetVersion = releaseSpec.match(/\*\*Target:\*\*\s+`v([^`]+)`/)?.[1];
      } catch {
        // The required-file check reports a missing specification.
      }
      if (!targetVersion) {
        blockers.push(finding('RELEASE_TARGET_UNDECLARED', '.specs/features/public-github-release/spec.md', 'Declare the target release version in the public specification.'));
      } else {
        if (manifest.version !== targetVersion) {
          blockers.push(finding('RELEASE_VERSION_MISMATCH', 'package.json', `Product version must match planned release ${targetVersion}.`));
        }
        const evidencePath = requestedEvidencePath ?? `release-evidence/v${targetVersion}.json`;
        try {
          if (requestedEvidencePath && !/^release-artifacts\/[A-Za-z0-9._-]+\.json$/.test(evidencePath)) {
            throw new Error('final release evidence must be a JSON file inside release-artifacts');
          }
          await assertNoLinkPath(productRoot, join(productRoot, evidencePath));
          const evidence = JSON.parse(await readFile(join(productRoot, evidencePath), 'utf8'));
          if (!(await completeReleaseEvidence(evidence, targetVersion, {
            root: productRoot,
            repositoryUrl: repositoryUrl(manifest),
          }))) {
            blockers.push(finding('RELEASE_EVIDENCE_INCOMPLETE', evidencePath, 'Release evidence must record GO, CI, reviews, code scanning, smokes, commit, artifact and manifest checksums, and approver.'));
          } else {
            if (gitState && evidence.commit.toLowerCase() !== gitState.commit.toLowerCase()) {
              blockers.push(finding('RELEASE_COMMIT_MISMATCH', evidencePath, 'Release evidence commit must equal the current Git HEAD.'));
            }
            for (const artifact of evidence.artifacts) {
              if (!(await verifyReleaseArtifact(productRoot, artifact))) {
                blockers.push(finding('RELEASE_ARTIFACT_INVALID', artifact.path, 'Release artifact is missing, outside the repository, a symlink, or does not match its SHA-256.'));
              }
            }
            if (!(await verifyReleaseManifestEvidence(productRoot, evidence, targetVersion))) {
              blockers.push(finding('RELEASE_MANIFEST_INVALID', evidence.releaseManifest.path, 'Release evidence must match the checksummed manifest, commit, artifact set, and successful verifications.'));
            }
          }
        } catch {
          blockers.push(finding('RELEASE_EVIDENCE_INCOMPLETE', evidencePath, 'Versioned release evidence is missing or invalid.'));
        }
      }
    }
  }

  const files = [];
  await walk(productRoot, productRoot, files, errors, { excludeLocalState });
  for (const file of files) {
    if (file.name !== '.env.example' && secretFilePatterns.some((pattern) => pattern.test(file.name))) {
      errors.push(finding('SECRET_FILE', file.repositoryPath, 'Secret-bearing filename must not be published.'));
    }
    const isText = textExtensions.has(extname(file.name).toLowerCase())
      || extensionlessTextNames.has(file.name);
    if (!isText) {
      if (!allowedBinaryFiles.has(file.repositoryPath)) {
        errors.push(finding('BINARY_FILE_NOT_ALLOWED', file.repositoryPath, 'Binary files require an explicit reviewed publication allow-list entry.'));
      }
      continue;
    }
    const contents = await readFile(file.path, 'utf8');
    if (secretContentPatterns.some((pattern) => pattern.test(contents))) {
      errors.push(finding('SECRET_CONTENT', file.repositoryPath, 'High-confidence credential or private-key material found.'));
    }
    for (const pattern of personalPathPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(contents)) {
        errors.push(finding('PERSONAL_PATH', file.repositoryPath, 'Personal absolute path found in publishable text.'));
        break;
      }
    }
  }

  const status = errors.length > 0 ? 'FAIL' : blockers.length > 0 ? 'BLOCKED' : 'PASS';
  return {
    status,
    mode: release ? 'release' : 'development',
    checkedFiles: files.length,
    errors,
    blockers,
  };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const evidenceIndex = process.argv.indexOf('--evidence');
  if (evidenceIndex >= 0 && !process.argv[evidenceIndex + 1]) {
    throw new Error('--evidence requires a repository-relative JSON path');
  }
  const report = await assessPublication({
    root,
    release: process.argv.includes('--release'),
    evidencePath: evidenceIndex >= 0 ? process.argv[evidenceIndex + 1].replaceAll('\\', '/') : undefined,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status !== 'PASS') process.exitCode = 1;
}
