import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import AdmZip from 'adm-zip';

const requiredEntries = new Set([
  'extension/package.json',
  'extension/extension.cjs',
  'extension/dist/runtime-cli.mjs',
  'extension/dist/mcp-stdio.mjs',
  'extension/readme.md',
  'extension/license.md',
  'extension/changelog.md',
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

export async function verifyVsix(path, expectedVersion) {
  const bytes = await readFile(path);
  let zip;
  try {
    zip = new AdmZip(bytes);
    zip.getEntries();
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
  const entries = zip.getEntries().filter((entry) => !entry.isDirectory);
  const names = entries.map((entry) => entry.entryName.replaceAll('\\', '/'));
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
  const uncompressedBytes = entries.reduce((total, entry) => total + entry.header.size, 0);
  if (uncompressedBytes > 20 * 1024 * 1024) errors.push('VSIX exceeds the 20 MiB uncompressed budget');

  const manifestEntry = zip.getEntry('extension/package.json');
  let version = null;
  if (manifestEntry) {
    try {
      const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
      version = manifest.version;
      if (expectedVersion && version !== expectedVersion) {
        errors.push(`VSIX version ${version} does not match ${expectedVersion}`);
      }
      if (manifest.private === true) errors.push('packaged extension manifest must not be private');
    } catch (error) {
      errors.push(`invalid packaged extension manifest: ${error.message}`);
    }
  }

  return {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    path: resolve(path),
    version,
    entries: entries.length,
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
