'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const vscode = require('vscode');

async function invoke(command, ...args) {
  const value = await vscode.commands.executeCommand(command, ...args);
  if (typeof value !== 'string') throw new Error(`${command} did not return runtime JSON`);
  return JSON.parse(value);
}

async function activate() {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) return;
  const receiptPath = path.join(workspace.uri.fsPath, '.pea-wsl-smoke-receipt.json');
  let receipt;
  try {
    if (vscode.env.remoteName !== 'wsl' || workspace.uri.scheme !== 'vscode-remote') {
      throw new Error('probe is not running in the WSL workspace extension host');
    }
    const product = vscode.extensions.getExtension('danielmontagna86-source.protheus-engineering-agent');
    if (!product || !product.extensionPath.includes('/.vscode-server/extensions/')) {
      throw new Error('packaged product is not installed in the remote extension directory');
    }
    await product.activate();
    const doctor = await invoke('pea.doctor', workspace.uri);
    const index = await invoke('pea.indexWorkspace', workspace.uri);
    const source = vscode.Uri.joinPath(workspace.uri, 'empty.prw');
    const document = await vscode.workspace.openTextDocument(source);
    await vscode.window.showTextDocument(document);
    const review = await invoke('pea.reviewActiveFile');
    const commandIds = (product.packageJSON.contributes?.commands ?? []).map((item) => item.command).sort();
    const registered = new Set(await vscode.commands.getCommands(true));
    if (commandIds.length !== 24 || commandIds.some((command) => !registered.has(command))) {
      throw new Error('remote command surface is incomplete');
    }
    if (doctor.ok !== true || index.files?.[0] !== 'empty.prw' || review.findings?.[0]?.ruleId !== 'CA4000') {
      throw new Error('remote runtime journey returned unexpected evidence');
    }
    receipt = {
      schemaVersion: 1,
      status: 'PASS',
      remoteName: vscode.env.remoteName,
      workspaceScheme: workspace.uri.scheme,
      productVersion: product.packageJSON.version,
      commandCount: commandIds.length,
      invocations: 3,
      finding: review.findings[0].ruleId,
    };
  } catch (error) {
    receipt = { schemaVersion: 1, status: 'FAIL', message: String(error?.message ?? error) };
  }
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  setTimeout(() => vscode.commands.executeCommand('workbench.action.closeWindow'), 250);
}

function deactivate() {}

module.exports = { activate, deactivate };
