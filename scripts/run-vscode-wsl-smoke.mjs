import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

import { packageExtension } from './package-extension.mjs';
import { sha256 } from './release-artifacts.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

function run(command, args, options = {}) {
  const executable = options.shell && process.platform === 'win32' ? `"${command}"` : command;
  const result = spawnSync(executable, args, {
    encoding: 'utf8', windowsHide: true,
    timeout: options.timeout ?? 120_000,
    shell: options.shell ?? false,
    cwd: options.cwd,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(String(result.stderr || result.stdout).trim());
  return String(result.stdout).trim().replaceAll('\0', '');
}

function wslPath(_distro, windowsPath) {
  const match = /^([A-Za-z]):[\\/](.*)$/.exec(resolve(windowsPath));
  if (!match) throw new Error('WSL smoke requires a drive-backed Windows path');
  return `/mnt/${match[1].toLowerCase()}/${match[2].replaceAll('\\', '/')}`;
}

async function removeWithRetry(target) {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await rm(target, { recursive: true, force: true });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
    }
  }
  throw lastError;
}

function findServerRoot(distro) {
  const remoteHome = run('wsl.exe', ['-d', distro, '--', 'printenv', 'HOME']);
  const roots = run('wsl.exe', [
    '-d', distro, '--', 'find', `${remoteHome}/.vscode-server/bin`, '-path', '*/out/server-main.js',
    '-type', 'f', '-printf', '%T@ %p\n',
  ]).split(/\r?\n/).filter(Boolean).sort().reverse();
  if (roots.length === 0) throw new Error('VS Code Server is not installed in WSL');
  return roots[0].replace(/^\S+\s+/, '').replace(/\/out\/server-main\.js$/, '');
}

function installRemoteVsix(distro, serverRoot, windowsVsix) {
  run('wsl.exe', [
    '-d', distro, '--', `${serverRoot}/node`, `${serverRoot}/out/server-main.js`,
    '--install-extension', wslPath(distro, windowsVsix), '--force',
  ]);
  return run('wsl.exe', [
    '-d', distro, '--', `${serverRoot}/node`, `${serverRoot}/out/server-main.js`,
    '--list-extensions', '--show-versions',
  ]);
}

function uninstallRemoteProbe(distro, serverRoot) {
  run('wsl.exe', [
    '-d', distro, '--', `${serverRoot}/node`, `${serverRoot}/out/server-main.js`,
    '--uninstall-extension', 'local-test.pea-wsl-smoke-probe',
  ]);
}

function packageProbe(outputPath) {
  const vsce = join(root, 'node_modules', '@vscode', 'vsce', 'vsce');
  run(process.execPath, [
    vsce, 'package', '--out', outputPath, '--no-dependencies',
    '--allow-missing-repository', '--skip-license', '--allow-star-activation',
  ], { cwd: join(root, 'integration', 'vscode-wsl-probe') });
}

export async function runVsCodeWslSmoke() {
  if (process.platform !== 'win32') throw new Error('WSL smoke requires Windows');
  const distro = process.env.PEA_WSL_DISTRO ?? 'Ubuntu';
  if (!/^[A-Za-z0-9._-]+$/.test(distro)) throw new Error('PEA_WSL_DISTRO is invalid');
  if (process.env.PEA_WSL_ALLOW_RESTART !== '1') {
    throw new Error('WSL smoke requires PEA_WSL_ALLOW_RESTART=1 for a dedicated test distro');
  }
  run('wsl.exe', ['-d', distro, '--', 'true']);

  const codePath = join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Microsoft VS Code', 'Code.exe');
  await access(codePath, constants.X_OK);
  const packaged = await packageExtension();
  const remoteAuthority = `wsl+${distro}`;
  const serverRoot = findServerRoot(distro);
  const sandbox = await mkdtemp(join(tmpdir(), 'pea-vscode-wsl-'));
  const workspace = join(sandbox, 'workspace');
  const receipt = join(workspace, '.pea-wsl-smoke-receipt.json');
  const probeVsix = join(sandbox, 'pea-wsl-smoke-probe-0.0.0.vsix');
  await mkdir(workspace, { recursive: true });
  packageProbe(probeVsix);
  installRemoteVsix(distro, serverRoot, packaged.path);
  const installed = installRemoteVsix(distro, serverRoot, probeVsix);
  if (!/^danielmontagna86-source\.protheus-engineering-agent@0\.3\.9$/im.test(installed)
    || !/^local-test\.pea-wsl-smoke-probe@0\.0\.0$/im.test(installed)) {
    throw new Error('packaged product and probe are not installed in the WSL extension host');
  }
  run('wsl.exe', ['--terminate', distro]);
  await writeFile(join(workspace, 'empty.prw'), [
    'User Function RemoteSmoke()',
    '    IIF(.T., 1, 0)',
    'Return',
    '',
  ].join('\n'), 'utf8');

  try {
    const remoteWorkspace = wslPath(distro, workspace);
    const folderUri = `vscode-remote://${remoteAuthority}${remoteWorkspace}`;

    const child = spawn(codePath, [
      '--remote', remoteAuthority,
      '--folder-uri', folderUri,
      '--new-window',
      '--disable-extension=github.copilot',
      '--disable-extension=github.copilot-chat',
    ], { windowsHide: true, stdio: 'ignore' });
    const deadline = Date.now() + 90_000;
    let receiptFound = false;
    while (Date.now() < deadline) {
      try {
        await access(receipt, constants.R_OK);
        receiptFound = true;
        break;
      } catch {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
      }
    }
    if (!receiptFound) {
      if (child.exitCode === null) child.kill();
      const error = new Error('WSL_REMOTE_ACTIVATION_UNPROVEN: remote Extension Host produced no command receipt');
      error.code = 'WSL_REMOTE_ACTIVATION_UNPROVEN';
      throw error;
    }
    await Promise.race([
      new Promise((resolveExit) => child.once('exit', resolveExit)),
      new Promise((resolveDelay) => setTimeout(resolveDelay, 5_000)),
    ]);
    if (child.exitCode === null) child.kill();

    const hostReceipt = JSON.parse(await readFile(receipt, 'utf8'));
    if (hostReceipt.status !== 'PASS' || hostReceipt.remoteName !== 'wsl'
      || hostReceipt.workspaceScheme !== 'vscode-remote' || hostReceipt.commandCount !== 24) {
      throw new Error('WSL Extension Host returned incomplete remote evidence');
    }
    const report = {
      status: 'PASS',
      remoteName: hostReceipt.remoteName,
      distro,
      installedVsix: true,
      vsixSha256: await sha256(packaged.path),
      commands: hostReceipt.commandCount,
      invocations: hostReceipt.invocations,
      workspaceScheme: hostReceipt.workspaceScheme,
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return report;
  } finally {
    try {
      uninstallRemoteProbe(distro, serverRoot);
    } catch (error) {
      process.stderr.write(`WSL smoke probe cleanup warning: ${String(error.message ?? error)}\n`);
    }
    try {
      await removeWithRetry(sandbox);
    } catch (error) {
      process.stderr.write(`WSL smoke sandbox cleanup warning: ${String(error.message ?? error)}\n`);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runVsCodeWslSmoke();
}
