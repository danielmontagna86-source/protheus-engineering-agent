import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
} from '@vscode/test-electron';

import { packageExtension } from './package-extension.mjs';
import { readZipArchive } from './zip.mjs';
import { localVsCodeExecutable, runVsCodeCli } from './run-vscode-smoke.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

async function extensionIdentity(path) {
  const entries = await readZipArchive(await readFile(path));
  const entry = entries.find((item) => item.name.toLowerCase() === 'extension/package.json');
  if (!entry) throw new Error(`VSIX has no extension/package.json: ${path}`);
  const manifest = JSON.parse(entry.data.toString('utf8'));
  if (!manifest.publisher || !manifest.name || !manifest.version) throw new Error('VSIX identity is incomplete');
  return { id: `${manifest.publisher}.${manifest.name}`, version: manifest.version };
}

function requireSuccess(result, step) {
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${step} failed: ${String(result.stderr || result.stdout).trim()}`);
  }
}

export function parseVsCodeLifecycleArgs(argv = process.argv) {
  const previousIndex = argv.indexOf('--previous-vsix');
  const versionIndex = argv.indexOf('--version');
  const previousVsix = previousIndex >= 0 ? argv[previousIndex + 1] : null;
  const vscodeVersion = versionIndex >= 0 ? argv[versionIndex + 1] : null;
  if (versionIndex >= 0 && !/^\d+\.\d+\.\d+$/.test(vscodeVersion ?? '')) {
    throw new Error('--version requires an exact VS Code version such as 1.95.3');
  }
  return { previousVsix, vscodeVersion };
}

export async function resolveLifecycleVsCodeExecutable({
  vscodeVersion = null,
  vscodeExecutable = null,
  localExecutable = localVsCodeExecutable,
  downloadExecutable = downloadAndUnzipVSCode,
} = {}) {
  if (vscodeExecutable) return vscodeExecutable;
  const local = await localExecutable(vscodeVersion);
  if (local) return local;
  return downloadExecutable(vscodeVersion ?? process.env.PEA_VSCODE_VERSION ?? '1.95.3');
}

export function requireExactVsCodeVersion(requestedVersion, detectedVersion) {
  if (requestedVersion && detectedVersion !== requestedVersion) {
    throw new Error(`VS Code ${detectedVersion} does not match requested ${requestedVersion}`);
  }
  return detectedVersion;
}

export async function runVsCodeLifecycle({ previousVsix, vscodeExecutable, vscodeVersion } = {}) {
  if (!previousVsix) throw new Error('a previous VSIX is required to prove upgrade and rollback');
  const previousPath = resolve(previousVsix);
  const current = await packageExtension();
  const [previousIdentity, currentIdentity] = await Promise.all([
    extensionIdentity(previousPath), extensionIdentity(current.path),
  ]);
  if (previousIdentity.id.toLowerCase() !== currentIdentity.id.toLowerCase()) {
    throw new Error('previous and current VSIX identities differ');
  }
  if (previousIdentity.version === currentIdentity.version) throw new Error('previous and current VSIX versions must differ');
  const executable = await resolveLifecycleVsCodeExecutable({ vscodeVersion, vscodeExecutable });
  const sandbox = await mkdtemp(resolve(tmpdir(), 'pea-vscode-lifecycle-'));
  const userData = resolve(sandbox, 'user-data');
  const extensions = resolve(sandbox, 'extensions');
  const [cli, ...baseArgs] = resolveCliArgsFromVSCodeExecutablePath(executable, { reuseMachineInstall: true });
  const run = (args, step) => {
    const result = runVsCodeCli(cli, [...baseArgs, ...args, `--user-data-dir=${userData}`, `--extensions-dir=${extensions}`]);
    requireSuccess(result, step);
    return String(result.stdout);
  };
  const listedAs = (version) => run(['--list-extensions', '--show-versions'], 'list extensions')
    .toLowerCase().split(/\r?\n/).includes(`${currentIdentity.id}@${version}`.toLowerCase());
  try {
    const actualVscodeVersion = requireExactVsCodeVersion(
      vscodeVersion,
      run(['--version'], 'VS Code version').trim().split(/\r?\n/)[0],
    );
    run(['--install-extension', previousPath, '--force'], 'install previous');
    if (!listedAs(previousIdentity.version)) throw new Error('previous version was not installed');
    run(['--install-extension', current.path, '--force'], 'upgrade');
    if (!listedAs(currentIdentity.version)) throw new Error('current version was not installed during upgrade');
    run(['--uninstall-extension', currentIdentity.id], 'uninstall');
    if (listedAs(currentIdentity.version)) throw new Error('extension remained installed after uninstall');
    run(['--install-extension', current.path, '--force'], 'reinstall');
    if (!listedAs(currentIdentity.version)) throw new Error('current version was not reinstalled');
    run(['--install-extension', previousPath, '--force'], 'rollback');
    if (!listedAs(previousIdentity.version)) throw new Error('previous version was not restored during rollback');
    return {
      status: 'PASS',
      vscode: actualVscodeVersion,
      extension: currentIdentity.id,
      previousVersion: previousIdentity.version,
      currentVersion: currentIdentity.version,
      install: 'PASS', upgrade: 'PASS', uninstall: 'PASS', reinstall: 'PASS', rollback: 'PASS',
      isolated: true,
    };
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { previousVsix, vscodeVersion } = parseVsCodeLifecycleArgs();
  const report = await runVsCodeLifecycle({ previousVsix, vscodeVersion });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
