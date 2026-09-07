import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { assessPublication } from '../scripts/publication-check.mjs';

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

async function fixture({ license = 'Apache-2.0', repository = true } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'pea-publication-'));
  const manifest = {
    name: 'protheus-engineering-agent',
    version: '0.2.0-alpha.1',
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
    JSON.stringify({ ...manifest, name: 'protheus-engineering-agent-vscode' }),
    'utf8',
  );
  for (const relativePath of requiredFiles) {
    await mkdir(join(root, relativePath, '..'), { recursive: true });
    await writeFile(join(root, relativePath), '# Public product\n', 'utf8');
  }
  await writeFile(
    join(root, '.specs', 'features', 'public-github-release', 'spec.md'),
    '**Target:** `v0.2.0-alpha.1`\n',
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
  const artifactPath = join(root, 'release-artifacts', 'protheus-engineering-agent.zip');
  const artifactContents = 'fixture release artifact';
  await writeFile(artifactPath, artifactContents, 'utf8');
  const artifactSha256 = createHash('sha256').update(artifactContents).digest('hex');
  await writeFile(
    join(root, 'release-evidence', 'v0.2.0-alpha.1.json'),
    JSON.stringify({
      schemaVersion: 1,
      version: '0.2.0-alpha.1',
      status: 'GO',
      commit: 'a'.repeat(40),
      ci: { passed: true, url: 'https://github.com/example/protheus-engineering-agent/actions/runs/1' },
      codeReview: { passed: true },
      securityReview: { passed: true },
      vscodeSmoke: { passed: true },
      hermesProbe: { passed: true },
      artifact: {
        path: 'release-artifacts/protheus-engineering-agent.zip',
        sha256: artifactSha256,
      },
      approvedBy: 'maintainer',
    }),
    'utf8',
  );
  return root;
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
    ['LICENSE_NOT_SELECTED', 'REPOSITORY_NOT_CONFIGURED'],
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

test('release audit requires the planned version and completed evidence', async () => {
  const root = await fixture();
  const manifestPath = join(root, 'package.json');
  const extensionPath = join(root, 'apps', 'vscode-extension', 'package.json');
  for (const path of [manifestPath, extensionPath]) {
    const manifest = JSON.parse(await (await import('node:fs/promises')).readFile(path, 'utf8'));
    manifest.version = '0.1.0';
    await writeFile(path, JSON.stringify(manifest), 'utf8');
  }
  const evidencePath = join(root, 'release-evidence', 'v0.2.0-alpha.1.json');
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

test('release audit recalculates the declared artifact checksum', async () => {
  const root = await fixture();
  const evidencePath = join(root, 'release-evidence', 'v0.2.0-alpha.1.json');
  const evidence = JSON.parse(await (await import('node:fs/promises')).readFile(evidencePath, 'utf8'));
  evidence.artifact.sha256 = 'c'.repeat(64);
  await writeFile(evidencePath, JSON.stringify(evidence), 'utf8');

  const report = await assessPublication({ root, release: true });

  assert.equal(report.status, 'BLOCKED');
  assert.ok(report.blockers.some((finding) => finding.code === 'RELEASE_ARTIFACT_INVALID'));
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
  assert.match(workflow, /npm audit --audit-level=high/);
  assert.match(workflow, /npm run test:mutation/);
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

  assert.equal(manifest.version, '0.2.0-alpha.1');
  assert.equal(extension.version, manifest.version);
  assert.equal(
    manifest.repository?.url,
    'https://github.com/danielmontagna86-source/protheus-engineering-agent.git',
  );
  assert.match(manifest.description, /ADVPL\/TLPP/);
  assert.ok(manifest.keywords.includes('vscode'));
  assert.ok(manifest.keywords.includes('mcp'));
  assert.match(readme, /Projeto comunitário independente/);
  assert.match(readme, /runtime aberto de engenharia para ADVPL\/TLPP/i);
});
