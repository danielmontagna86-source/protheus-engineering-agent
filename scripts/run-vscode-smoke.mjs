import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
  runTests,
} from '@vscode/test-electron';

import { packageExtension } from './package-extension.mjs';
import { sha256 } from './release-artifacts.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

async function existingFile(path) {
  if (!path) return null;
  try {
    await access(path, constants.R_OK);
    return path;
  } catch {
    return null;
  }
}

function commandLineVersion() {
  const index = process.argv.indexOf('--version');
  if (index < 0) return null;
  const version = process.argv[index + 1];
  if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
    throw new Error('--version requires an exact VS Code version such as 1.95.3');
  }
  return version;
}

async function localVsCodeExecutable(requestedVersion) {
  if (requestedVersion || process.env.PEA_VSCODE_VERSION) return null;
  if (process.env.PEA_VSCODE_EXECUTABLE) {
    const configured = await existingFile(resolve(process.env.PEA_VSCODE_EXECUTABLE));
    if (!configured) throw new Error('PEA_VSCODE_EXECUTABLE does not name a readable file');
    return configured;
  }
  if (process.platform !== 'win32' || !process.env.LOCALAPPDATA) return null;
  return existingFile(join(process.env.LOCALAPPDATA, 'Programs', 'Microsoft VS Code', 'Code.exe'));
}

function runVsCodeCli(cli, args) {
  return spawnSync(process.platform === 'win32' ? `"${cli}"` : cli, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    timeout: 120_000,
    windowsHide: true,
  });
}

export async function runVsCodeSmoke() {
  const packaged = await packageExtension();
  const sandbox = await mkdtemp(join(tmpdir(), 'pea-vscode-host-'));
  const workspace = join(sandbox, 'workspace');
  const userData = join(sandbox, 'user-data');
  const extensions = join(sandbox, 'extensions');
  await Promise.all([
    mkdir(workspace, { recursive: true }),
    mkdir(userData, { recursive: true }),
    mkdir(extensions, { recursive: true }),
  ]);
  await writeFile(join(workspace, 'empty.prw'), '', 'utf8');

  const requestedVersion = commandLineVersion();
  const version = requestedVersion || process.env.PEA_VSCODE_VERSION || '1.95.3';
  const vscodeExecutablePath = await localVsCodeExecutable(requestedVersion)
    ?? await downloadAndUnzipVSCode(version);
  const hostRoot = join(root, 'integration', 'vscode-host');
  try {
    const [cli, ...baseArgs] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath, {
      reuseMachineInstall: true,
    });
    const detectedVersion = runVsCodeCli(cli, [...baseArgs, '--version']);
    if (detectedVersion.error) throw detectedVersion.error;
    if (detectedVersion.status !== 0) {
      throw new Error(`VS Code version query failed: ${String(detectedVersion.stderr || detectedVersion.stdout).trim()}`);
    }
    const actualVscodeVersion = String(detectedVersion.stdout).trim().split(/\r?\n/)[0];
    if (!/^\d+\.\d+\.\d+$/.test(actualVscodeVersion)) {
      throw new Error(`VS Code returned an invalid version: ${actualVscodeVersion}`);
    }
    if ((requestedVersion || process.env.PEA_VSCODE_VERSION) && actualVscodeVersion !== version) {
      throw new Error(`VS Code ${actualVscodeVersion} does not match requested ${version}`);
    }

    const install = runVsCodeCli(cli, [
      ...baseArgs,
      '--install-extension', packaged.path,
      '--force',
      `--user-data-dir=${userData}`,
      `--extensions-dir=${extensions}`,
    ]);
    if (install.error) throw install.error;
    if (install.status !== 0) {
      throw new Error(`VSIX installation failed: ${String(install.stderr || install.stdout).trim()}`);
    }

    const code = await runTests({
      vscodeExecutablePath,
      reuseMachineInstall: true,
      extensionDevelopmentPath: hostRoot,
      extensionTestsPath: join(root, 'integration', 'vscode-host', 'index.cjs'),
      launchArgs: [
        workspace,
        '--disable-extension=github.copilot',
        '--disable-extension=github.copilot-chat',
        `--user-data-dir=${userData}`,
        `--extensions-dir=${extensions}`,
      ],
      extensionTestsEnv: {
        PEA_VSCODE_SMOKE: '1',
        PEA_EXPECTED_EXTENSIONS_DIR: extensions,
      },
    });
    const report = {
      status: code === 0 ? 'PASS' : 'FAIL',
      commands: 4,
      vscode: actualVscodeVersion,
      isolatedWorkspace: true,
      isolatedUserData: true,
      installedVsix: true,
      vsixSha256: await sha256(packaged.path),
      hermesProbed: false,
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (code !== 0) process.exitCode = code;
    return report;
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runVsCodeSmoke();
}
