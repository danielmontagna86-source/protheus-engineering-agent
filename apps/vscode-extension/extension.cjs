const { execFile: nodeExecFile } = require('node:child_process');
const path = require('node:path');

function createExtension(vscode, options = {}) {
  const cliPath = options.cliPath ?? path.resolve(__dirname, 'dist', 'runtime-cli.mjs');
  const mcpServerPath = options.mcpServerPath ?? path.resolve(__dirname, 'dist', 'mcp-stdio.mjs');
  const execFile = options.execFile ?? nodeExecFile;
  let channel;
  let diagnostics;

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
        timeout: 120_000,
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
          PEA_NODE_COMMAND: process.execPath,
          PEA_MCP_SERVER_PATH: mcpServerPath,
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
      return output;
    } catch (error) {
      vscode.window.showErrorMessage(`Protheus Engineering Agent: ${error.message}`);
    }
  }

  function diagnosticSeverity(severity) {
    if (severity === 'CRITICAL') return vscode.DiagnosticSeverity.Error;
    if (severity === 'MAJOR') return vscode.DiagnosticSeverity.Warning;
    if (severity === 'MINOR') return vscode.DiagnosticSeverity.Information;
    return vscode.DiagnosticSeverity.Hint;
  }

  async function presentReview(uri, file, workspace) {
    try {
      const output = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Reviewing ADVPL/TLPP source',
        cancellable: false,
      }, () => runCli(['review', file, workspace], workspace));
      let report;
      try {
        report = JSON.parse(output);
      } catch {
        throw new Error('Invalid review output from the bundled runtime.');
      }
      if (!Array.isArray(report.findings)) {
        throw new Error('Invalid review output from the bundled runtime.');
      }
      const values = report.findings.map((finding) => {
        const line = Math.max(0, Number(finding.line || 1) - 1);
        const range = new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER);
        const message = finding.guidance
          ? `${finding.title}: ${finding.guidance}`
          : String(finding.title || finding.ruleId || 'Review finding');
        const diagnostic = new vscode.Diagnostic(range, message, diagnosticSeverity(finding.severity));
        diagnostic.code = finding.ruleId;
        diagnostic.source = 'Protheus Engineering Agent';
        return diagnostic;
      });
      diagnostics.set(uri, values);
      channel.clear();
      channel.appendLine(output.trim());
      channel.show(true);
      return output;
    } catch (error) {
      diagnostics.delete(uri);
      vscode.window.showErrorMessage(`Protheus Engineering Agent: ${error.message}`);
    }
  }

  function activate(context) {
    channel = vscode.window.createOutputChannel('Protheus Engineering Agent');
    diagnostics = vscode.languages.createDiagnosticCollection('protheus-engineering-agent');
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
        return presentReview(uri, file, workspace);
      }),
    ];
    context.subscriptions.push(channel, diagnostics, ...commands);
  }

  return { activate };
}

function activate(context) {
  const vscode = require('vscode');
  return createExtension(vscode).activate(context);
}

function deactivate() {}

module.exports = { activate, deactivate, createExtension };
