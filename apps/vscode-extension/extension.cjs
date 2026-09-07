const { execFile: nodeExecFile } = require('node:child_process');
const path = require('node:path');

function createExtension(vscode, options = {}) {
  const cliPath = options.cliPath ?? path.resolve(__dirname, '..', '..', 'packages', 'runtime', 'src', 'cli.mjs');
  const execFile = options.execFile ?? nodeExecFile;
  let channel;

  function workspacePath(uri) {
    if (uri && typeof vscode.workspace.getWorkspaceFolder === 'function') {
      const owningFolder = vscode.workspace.getWorkspaceFolder(uri);
      if (owningFolder) return owningFolder.uri.fsPath;
    }
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
  }

  function runCli(args, cwd) {
    return new Promise((resolve, reject) => {
      execFile(process.execPath, [cliPath, ...args], {
        cwd,
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
          PEA_NODE_COMMAND: process.execPath,
        },
      }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(String(stderr || error.message).trim()));
          return;
        }
        resolve(String(stdout));
      });
    });
  }

  async function present(args, cwd) {
    try {
      const output = await runCli(args, cwd);
      channel.clear();
      channel.appendLine(output.trim());
      channel.show(true);
    } catch (error) {
      vscode.window.showErrorMessage(`Protheus Engineering Agent: ${error.message}`);
    }
  }

  function activate(context) {
    channel = vscode.window.createOutputChannel('Protheus Engineering Agent');
    const commands = [
      vscode.commands.registerCommand('pea.doctor', async () => {
        const workspace = workspacePath();
        if (!workspace) return vscode.window.showWarningMessage('Open a workspace first.');
        return present(['doctor', workspace], workspace);
      }),
      vscode.commands.registerCommand('pea.indexWorkspace', async () => {
        const workspace = workspacePath();
        if (!workspace) return vscode.window.showWarningMessage('Open a workspace first.');
        return present(['index', workspace], workspace);
      }),
      vscode.commands.registerCommand('pea.openContext', async () => {
        const workspace = workspacePath();
        if (!workspace) return vscode.window.showWarningMessage('Open a workspace first.');
        return present(['session', workspace], workspace);
      }),
      vscode.commands.registerCommand('pea.reviewActiveFile', async () => {
        const uri = vscode.window.activeTextEditor?.document?.uri;
        const file = uri?.fsPath;
        if (!file) {
          return vscode.window.showWarningMessage('Open an ADVPL/TLPP source file first.');
        }
        const workspace = workspacePath(uri) ?? path.dirname(file);
        return present(['review', file, workspace], workspace);
      }),
    ];
    context.subscriptions.push(channel, ...commands);
  }

  return { activate };
}

function activate(context) {
  const vscode = require('vscode');
  return createExtension(vscode).activate(context);
}

function deactivate() {}

module.exports = { activate, deactivate, createExtension };
