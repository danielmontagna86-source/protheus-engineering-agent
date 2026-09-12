import { lstat, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readZipArchive } from './zip.mjs';

const requiredEntries = new Set([
  'extension/package.json',
  'extension/extension.cjs',
  'extension/dist/runtime-cli.cjs',
  'extension/dist/runtime-cli.mjs',
  'extension/dist/mcp-stdio.mjs',
  'extension/dist/codex-app-server.cjs',
  'extension/dist/ai-connections.cjs',
  'extension/dist/ai-connection-store.cjs',
  'extension/dist/ai-providers.cjs',
  'extension/dist/ai-gateway.cjs',
  'extension/dist/policy.cjs',
  'extension/readme.md',
  'extension/license.md',
  'extension/notice',
  'extension/changelog.md',
  'extension/third_party_notices.md',
  'extension/third-party-licenses/model-context-protocol.txt',
  'extension/third-party-licenses/zod.txt',
  'extension/package.nls.json',
  'extension/package.nls.pt-br.json',
  'extension/l10n/bundle.l10n.pt-br.json',
  'extension/media/icon.png',
  'extension/media/activity-icon.svg',
  'extension/sample-workspace/readme.md',
  'extension/sample-workspace/sample-review.prw',
  'extension/skills/protheus-evidence-review/skill.md',
]);

const allowedEntries = new Set([
  '[content_types].xml',
  'extension.vsixmanifest',
  ...requiredEntries,
]);

const forbiddenEntryPatterns = [
  /(?:^|\/)\.git(?:\/|$)/i,
  /(?:^|\/)\.pea(?:\/|$)/i,
  /(?:^|\/)node_modules(?:\/|$)/i,
  /(?:^|\/)test(?:\/|$)/i,
  /(?:^|\/)\.env(?:\.|\/|$)/i,
  /(?:^|\/)(?:id_rsa|id_ed25519)(?:\/|$)/i,
  /\.(?:jks|key|p12|pfx|pem)$/i,
];

export async function verifyVsix(path, expectedVersion, { commit } = {}) {
  const fileState = await lstat(path);
  if (!fileState.isFile() || fileState.isSymbolicLink() || fileState.size > 25 * 1024 * 1024) {
    return {
      status: 'FAIL', path: resolve(path), version: null, entries: 0,
      compressedBytes: fileState.size, uncompressedBytes: 0,
      errors: ['VSIX is unsafe or exceeds the 25 MiB compressed budget'],
    };
  }
  const bytes = await readFile(path);
  let entries;
  try {
    entries = await readZipArchive(bytes, { maxUncompressedBytes: 20 * 1024 * 1024 });
  } catch (error) {
    return {
      status: 'FAIL',
      path: resolve(path),
      version: null,
      entries: 0,
      compressedBytes: bytes.length,
      uncompressedBytes: 0,
      errors: [`invalid VSIX archive: ${error.message}`],
    };
  }
  const files = entries.filter((entry) => !entry.isDirectory);
  const names = files.map((entry) => entry.name.replaceAll('\\', '/'));
  const nameSet = new Set(names.map((name) => name.toLowerCase()));
  const errors = [];

  for (const required of requiredEntries) {
    if (!nameSet.has(required)) errors.push(`missing required VSIX entry: ${required}`);
  }
  if (nameSet.size !== names.length) errors.push('duplicate or case-colliding VSIX entries are not allowed');
  for (const name of names) {
    if (!allowedEntries.has(name.toLowerCase())) errors.push(`unexpected VSIX entry: ${name}`);
    if (name.startsWith('/') || name.split('/').includes('..')) errors.push(`unsafe VSIX path: ${name}`);
    if (forbiddenEntryPatterns.some((pattern) => pattern.test(name))) {
      errors.push(`forbidden VSIX entry: ${name}`);
    }
  }
  const uncompressedBytes = files.reduce((total, entry) => total + entry.uncompressedSize, 0);
  if (uncompressedBytes > 20 * 1024 * 1024) errors.push('VSIX exceeds the 20 MiB uncompressed budget');

  const manifestEntry = files.find((entry) => entry.name.toLowerCase() === 'extension/package.json');
  let version = null;
  if (manifestEntry) {
    try {
      const manifest = JSON.parse(manifestEntry.data.toString('utf8'));
      version = manifest.version;
      if (expectedVersion && version !== expectedVersion) {
        errors.push(`VSIX version ${version} does not match ${expectedVersion}`);
      }
      if (commit && manifest.peaRelease?.commit !== commit) {
        errors.push(`VSIX release commit ${manifest.peaRelease?.commit ?? 'missing'} does not match ${commit}`);
      }
      if (manifest.private === true) errors.push('packaged extension manifest must not be private');
    } catch (error) {
      errors.push(`invalid packaged extension manifest: ${error.message}`);
    }
  }

  const legalRequirements = [
    ['extension/third_party_notices.md', ['@modelcontextprotocol/server', 'Zod']],
    ['extension/third-party-licenses/model-context-protocol.txt', ['Apache License', 'MIT License', 'Model Context Protocol']],
    ['extension/third-party-licenses/zod.txt', ['MIT License', 'Colin McDonnell']],
  ];
  for (const [requiredName, markers] of legalRequirements) {
    const entry = files.find((item) => item.name.toLowerCase() === requiredName);
    if (entry) {
      const content = entry.data.toString('utf8');
      for (const marker of markers) {
        if (!content.includes(marker)) errors.push(`incomplete VSIX legal notice ${requiredName}: missing ${marker}`);
      }
    }
  }

  return {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    path: resolve(path),
    version,
    entries: files.length,
    compressedBytes: bytes.length,
    uncompressedBytes,
    errors,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , path, expectedVersion] = process.argv;
  if (!path) throw new Error('usage: node scripts/verify-vsix.mjs <path> [version]');
  const report = await verifyVsix(resolve(path), expectedVersion);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status !== 'PASS') process.exitCode = 1;
}
