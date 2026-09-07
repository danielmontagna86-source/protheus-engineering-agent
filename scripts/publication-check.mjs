import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const requiredFiles = [
  'README.md',
  'README.en.md',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'CHANGELOG.md',
  'NOTICE',
  'THIRD_PARTY_NOTICES.md',
  'docs/brand-positioning.md',
  'docs/qa-test-quality-review.md',
  '.github/workflows/ci.yml',
  '.specs/project/PROJECT.md',
  '.specs/features/public-github-release/spec.md',
];

const ignoredDirectories = new Set(['.git', 'coverage', 'dist', 'node_modules']);
const localStateDirectories = new Set(['.pea', '.stryker-tmp', '.worktrees', 'work']);
const textExtensions = new Set([
  '.cjs', '.css', '.html', '.js', '.json', '.md', '.mjs', '.prg', '.prw', '.sql', '.toml', '.ts', '.txt', '.yaml', '.yml',
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

async function walk(root, directory, files, errors) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const repositoryPath = relative(root, path).replaceAll('\\', '/');
    if (entry.isDirectory() && localStateDirectories.has(entry.name)) {
      errors.push(finding('LOCAL_STATE_DIRECTORY', repositoryPath, 'Local runtime or worktree state must not be published.'));
      continue;
    }
    if (entry.name === '.git' && repositoryPath !== '.git') {
      errors.push(finding('NESTED_REPOSITORY', repositoryPath, 'Recovered or nested Git metadata must not be published.'));
      continue;
    }
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    if (entry.isSymbolicLink()) {
      errors.push(finding('SYMLINK_NOT_ALLOWED', repositoryPath, 'Symbolic links are excluded from the portable public source tree.'));
      continue;
    }
    if (entry.isDirectory()) {
      await walk(root, path, files, errors);
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
  return evidence?.schemaVersion === 1
    && evidence.version === targetVersion
    && evidence.status === 'GO'
    && /^[0-9a-f]{40}$/i.test(evidence.commit ?? '')
    && evidence.ci?.passed === true
    && /^https:\/\/github\.com\//.test(evidence.ci?.url ?? '')
    && evidence.codeReview?.passed === true
    && evidence.securityReview?.passed === true
    && evidence.vscodeSmoke?.passed === true
    && evidence.hermesProbe?.passed === true
    && typeof evidence.artifact?.path === 'string'
    && /^[0-9a-f]{64}$/i.test(evidence.artifact?.sha256 ?? '')
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
    const info = await lstat(artifactPath);
    if (!info.isFile() || info.isSymbolicLink()) return false;
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(artifactPath)) hash.update(chunk);
    return hash.digest('hex').toLowerCase() === artifact.sha256.toLowerCase();
  } catch {
    return false;
  }
}

export async function assessPublication({ root, release = false }) {
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
        const evidencePath = `release-evidence/v${targetVersion}.json`;
        try {
          const evidence = JSON.parse(await readFile(join(productRoot, evidencePath), 'utf8'));
          if (!completeReleaseEvidence(evidence, targetVersion)) {
            blockers.push(finding('RELEASE_EVIDENCE_INCOMPLETE', evidencePath, 'Release evidence must record GO, CI, reviews, smokes, commit, artifact checksum, and approver.'));
          } else if (!(await verifyReleaseArtifact(productRoot, evidence.artifact))) {
            blockers.push(finding('RELEASE_ARTIFACT_INVALID', evidence.artifact.path, 'Release artifact is missing, outside the repository, a symlink, or does not match its SHA-256.'));
          }
        } catch {
          blockers.push(finding('RELEASE_EVIDENCE_INCOMPLETE', evidencePath, 'Versioned release evidence is missing or invalid.'));
        }
      }
    }
  }

  const files = [];
  await walk(productRoot, productRoot, files, errors);
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
  const report = await assessPublication({ root, release: process.argv.includes('--release') });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status !== 'PASS') process.exitCode = 1;
}
