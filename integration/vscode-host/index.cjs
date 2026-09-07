const assert = require('node:assert/strict');
const path = require('node:path');
const vscode = require('vscode');

async function execute(command) {
  const result = await vscode.commands.executeCommand(command);
  assert.equal(typeof result, 'string', `${command} did not return the runtime JSON`);
  return JSON.parse(result);
}

async function run() {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspace, 'isolated smoke workspace was not opened');
  const product = vscode.extensions.getExtension('danielmontagna86-source.protheus-engineering-agent');
  assert.ok(product, 'packaged Protheus Engineering Agent VSIX is not installed');
  const expectedExtensionsDir = process.env.PEA_EXPECTED_EXTENSIONS_DIR;
  assert.ok(expectedExtensionsDir, 'isolated extensions directory was not provided');
  assert.equal(
    path.resolve(product.extensionPath).startsWith(`${path.resolve(expectedExtensionsDir)}${path.sep}`),
    true,
    'product extension was not loaded from the isolated installed-extension directory',
  );

  const doctor = await execute('pea.doctor');
  assert.equal(doctor.ok, true);
  assert.equal(doctor.hermes.probed, false);

  const index = await execute('pea.indexWorkspace');
  assert.deepEqual(index.files, ['empty.prw']);

  const context = await execute('pea.openContext');
  assert.equal(context.trust, 'untrusted-project-data');
  assert.match(context.hermes.mcp.args[0], /dist[\\/]mcp-stdio\.mjs$/);
  assert.deepEqual(
    context.hermes.mcp.env.find((item) => item.name === 'PEA_ENVIRONMENT'),
    { name: 'PEA_ENVIRONMENT', value: 'production' },
  );

  const sourceUri = vscode.Uri.file(path.join(workspace.uri.fsPath, 'empty.prw'));
  const document = await vscode.workspace.openTextDocument(sourceUri);
  await vscode.window.showTextDocument(document);
  const review = await execute('pea.reviewActiveFile');
  assert.equal(review.assessment, 'PASS');
  assert.equal(review.file, 'empty.prw');

  process.stdout.write('VS Code Extension Host smoke: PASS (4 commands)\n');
}

module.exports = { run };
