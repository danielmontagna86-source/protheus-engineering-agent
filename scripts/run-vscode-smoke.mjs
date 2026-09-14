import { access, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
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

function commandLineValue(flag) {
  const index = process.argv.indexOf(flag);
  return index < 0 ? null : process.argv[index + 1];
}

async function installedTdsExtension() {
  if (!process.argv.includes('--with-tds')) return null;
  const configured = commandLineValue('--tds-extension') ?? process.env.PEA_TDS_EXTENSION_PATH;
  if (configured) {
    const path = resolve(configured);
    if (!await existingFile(join(path, 'package.json'))) throw new Error('TDS extension path is invalid');
    return path;
  }
  const extensionRoot = join(homedir(), '.vscode', 'extensions');
  const entries = await readdir(extensionRoot, { withFileTypes: true });
  const match = entries
    .filter((entry) => entry.isDirectory() && entry.name.toLowerCase().startsWith('totvs.tds-vscode-'))
    .sort((left, right) => right.name.localeCompare(left.name))[0];
  if (!match) throw new Error('--with-tds requires an installed TOTVS.tds-vscode extension or --tds-extension');
  return join(extensionRoot, match.name);
}

export async function localVsCodeExecutable(requestedVersion) {
  if (requestedVersion || process.env.PEA_VSCODE_VERSION) return null;
  if (process.env.PEA_VSCODE_EXECUTABLE) {
    const configured = await existingFile(resolve(process.env.PEA_VSCODE_EXECUTABLE));
    if (!configured) throw new Error('PEA_VSCODE_EXECUTABLE does not name a readable file');
    return configured;
  }
  if (process.platform !== 'win32' || !process.env.LOCALAPPDATA) return null;
  return existingFile(join(process.env.LOCALAPPDATA, 'Programs', 'Microsoft VS Code', 'Code.exe'));
}

export function runVsCodeCli(cli, args) {
  return spawnSync(process.platform === 'win32' ? `"${cli}"` : cli, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    timeout: 120_000,
    windowsHide: true,
  });
}

export async function runVsCodeSmoke() {
  const packaged = await packageExtension();
  const tdsSource = await installedTdsExtension();
  const sandbox = await mkdtemp(join(tmpdir(), 'pea-vscode-host-'));
  const workspace = join(sandbox, 'workspace');
  const secondWorkspace = join(sandbox, 'workspace-cp1252');
    const userData = join(sandbox, 'user-data');
    const extensions = join(sandbox, 'extensions');
    const hostReceiptPath = join(sandbox, 'installed-host-receipt.json');
  await Promise.all([
    mkdir(workspace, { recursive: true }),
    mkdir(secondWorkspace, { recursive: true }),
    mkdir(userData, { recursive: true }),
    mkdir(extensions, { recursive: true }),
  ]);
  await writeFile(join(workspace, 'empty.prw'), [
    'User Function SmokeReview()',
    '    IIF(.T., 1, 0)',
    'Return',
    '',
  ].join('\n'), 'utf8');
  const cp1252Source = Buffer.concat([
    Buffer.from('User Function Accent()\n    // Fun'),
    Buffer.from([0xe7, 0xe3]),
    Buffer.from('o financeira\n    IIF(.T., 1, 0)\nReturn\n'),
  ]);
  await writeFile(join(secondWorkspace, 'accent.prw'), cp1252Source);
  const workspaceFile = join(sandbox, 'tds-coexistence.code-workspace');
  await writeFile(workspaceFile, JSON.stringify({
    folders: [{ path: workspace }, { path: secondWorkspace }],
    settings: { 'files.encoding': 'windows1252' },
  }, null, 2));

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

    let tdsVersion = null;
    if (tdsSource) {
      const tdsManifest = JSON.parse(await readFile(join(tdsSource, 'package.json'), 'utf8'));
      if (`${tdsManifest.publisher}.${tdsManifest.name}`.toLowerCase() !== 'totvs.tds-vscode') {
        throw new Error('configured TDS extension has an unexpected identity');
      }
      tdsVersion = tdsManifest.version;
      await cp(tdsSource, join(extensions, `totvs.tds-vscode-${tdsVersion}`), { recursive: true, force: false });
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
        tdsSource ? workspaceFile : workspace,
        '--disable-extension=github.copilot',
        '--disable-extension=github.copilot-chat',
        `--user-data-dir=${userData}`,
        `--extensions-dir=${extensions}`,
      ],
      extensionTestsEnv: {
        PEA_VSCODE_SMOKE: '1',
        PEA_EXPECTED_EXTENSIONS_DIR: extensions,
        PEA_EXPECT_TDS: tdsSource ? '1' : '0',
        PEA_EXPECT_TDS_VERSION: tdsVersion ?? '',
        PEA_SMOKE_RECEIPT: hostReceiptPath,
      },
    });
    const hostReceipt = JSON.parse(await readFile(hostReceiptPath, 'utf8'));
    const extensionManifest = JSON.parse(await readFile(join(root, 'apps', 'vscode-extension', 'package.json'), 'utf8'));
    const expectedCommandIds = (extensionManifest.contributes?.commands ?? []).map((item) => item.command).sort();
    if (hostReceipt.schemaVersion !== 1
      || !Array.isArray(hostReceipt.commandIds)
      || hostReceipt.commandIds.length !== expectedCommandIds.length
      || new Set(hostReceipt.commandIds).size !== expectedCommandIds.length
      || expectedCommandIds.some((command) => !hostReceipt.commandIds.includes(command))
      || !Array.isArray(hostReceipt.executedCommandIds)
      || hostReceipt.executedCommandIds.length < 5
      || hostReceipt.invocations !== 7
      || (tdsSource && hostReceipt.tdsStructuredInputAccepted !== true)) {
      throw new Error('installed Extension Host returned incomplete command evidence');
    }
    const report = {
      status: code === 0 ? 'PASS' : 'FAIL',
      commands: hostReceipt.commandIds.length,
      commandIds: hostReceipt.commandIds,
      executedCommandIds: hostReceipt.executedCommandIds,
      invocations: hostReceipt.invocations,
      vscode: actualVscodeVersion,
      isolatedWorkspace: true,
      isolatedUserData: true,
      installedVsix: true,
      vsixSha256: await sha256(packaged.path),
      hermesProbed: false,
      tds: tdsSource ? {
        installed: true,
        version: tdsVersion,
        activated: true,
        commandConflicts: 0,
        structuredInputAccepted: hostReceipt.tdsStructuredInputAccepted === true,
      } : null,
      cp1252Lf: tdsSource ? true : null,
      multiRoot: tdsSource ? true : null,
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
