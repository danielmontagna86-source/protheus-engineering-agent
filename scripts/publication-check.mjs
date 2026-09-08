import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertNoLinkPath } from './path-safety.mjs';

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
  'docs/code-review-production-readiness.md',
  'docs/qa-test-quality-review.md',
  'docs/security/dependency-license-review.md',
  'docs/security/owasp-coverage.md',
  '.github/workflows/ci.yml',
  '.github/workflows/security.yml',
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
  '.cff', '.cjs', '.css', '.html', '.js', '.json', '.md', '.mjs', '.prg', '.prw', '.sql', '.toml', '.ts', '.txt', '.yaml', '.yml',
]);
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

function completeReleaseEvidence(evidence, targetVersion) {
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
  return evidence?.schemaVersion === 1
    && evidence.version === targetVersion
    && evidence.status === 'GO'
    && /^[0-9a-f]{40}$/i.test(evidence.commit ?? '')
    && evidence.ci?.passed === true
    && /^https:\/\/github\.com\//.test(evidence.ci?.url ?? '')
    && evidence.codeReview?.passed === true
    && evidence.securityReview?.passed === true
    && evidence.vscodeSmoke?.passed === true
    && evidence.vscodeSmoke?.commands === 4
    && evidence.vscodeSmoke?.isolated === true
    && Array.isArray(evidence.vscodeSmoke?.versions)
    && evidence.vscodeSmoke.versions.includes('1.95.3')
    && evidence.vscodeSmoke.versions.length >= 2
    && evidence.freshInstall?.passed === true
    && evidence.freshInstall?.commands === 4
    && evidence.freshInstall?.isolated === true
    && Array.isArray(evidence.freshInstall?.versions)
    && evidence.freshInstall.versions.includes('1.95.3')
    && evidence.freshInstall.versions.length >= 2
    && evidence.freshInstall?.vsixSha256 === vsix?.sha256
    && completeArtifacts
    && evidence.releaseManifest?.path === `release-artifacts/release-manifest-v${targetVersion}.json`
    && /^[0-9a-f]{64}$/i.test(evidence.releaseManifest?.sha256 ?? '')
    && typeof evidence.approvedBy === 'string'
    && evidence.approvedBy.trim().length > 0;
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
    return manifest.schemaVersion === 1
      && manifest.version === targetVersion
      && manifest.commit === evidence.commit
      && JSON.stringify(manifestArtifacts) === JSON.stringify(evidence.artifacts)
      && ['publication', 'sourceArchive', 'vsix', 'sbom'].every(
        (key) => manifest.verification?.[key] === 'PASS',
      );
  } catch {
    return false;
  }
}

export async function assessPublication({ root, release = false, evidencePath: requestedEvidencePath, excludeLocalState = false }) {
  const productRoot = resolve(root);
  const errors = [];
  const blockers = [];

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
    const marketplaceMetadataComplete = extensionManifest.preview === true
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
      errors.push(finding('MARKETPLACE_METADATA_INCOMPLETE', 'apps/vscode-extension/package.json', 'Preview, pricing, Q&A, gallery, PNG icon, and a three-step walkthrough are required.'));
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
          if (!completeReleaseEvidence(evidence, targetVersion)) {
            blockers.push(finding('RELEASE_EVIDENCE_INCOMPLETE', evidencePath, 'Release evidence must record GO, CI, reviews, smokes, commit, artifact and manifest checksums, and approver.'));
          } else {
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
    if (!textExtensions.has(extname(file.name).toLowerCase()) && !['.gitignore', '.gitattributes', '.editorconfig', 'NOTICE'].includes(file.name)) {
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
