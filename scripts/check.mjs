import { readdir, readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
let checkedSources = 0;
let checkedManifests = 0;

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'work'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (entry.name === 'package.json') {
      checkedManifests += 1;
      try {
        JSON.parse(await readFile(path, 'utf8'));
      } catch (error) {
        failures.push(`${path}: invalid JSON: ${error.message}`);
      }
    }
    if (['.js', '.mjs', '.cjs'].includes(extname(entry.name))) {
      checkedSources += 1;
      const result = spawnSync(process.execPath, ['--check', path], {
        encoding: 'utf8',
        windowsHide: true,
      });
      if (result.status !== 0) failures.push(`${path}: ${result.stderr.trim()}`);
    }
  }
}

await walk(root);

const extensionManifest = JSON.parse(
  await readFile(join(root, 'apps', 'vscode-extension', 'package.json'), 'utf8'),
);
const extensionMain = join(root, 'apps', 'vscode-extension', extensionManifest.main);
try {
  if (!(await stat(extensionMain)).isFile()) failures.push('VS Code extension main is not a file');
} catch {
  failures.push('VS Code extension main is missing');
}
const commandIds = extensionManifest.contributes.commands.map((item) => item.command);
if (new Set(commandIds).size !== commandIds.length) failures.push('VS Code command ids are duplicated');

if (failures.length > 0) {
  for (const failure of failures) process.stderr.write(`${failure}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`check ok: ${checkedSources} source files, ${checkedManifests} manifests\n`);
}
