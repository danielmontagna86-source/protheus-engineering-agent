const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
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
  const expectTds = process.env.PEA_EXPECT_TDS === '1';
  if (expectTds) {
    assert.equal(vscode.workspace.workspaceFolders.length, 2, 'TDS smoke must use a multi-root workspace');
    const tds = vscode.extensions.getExtension('TOTVS.tds-vscode');
    assert.ok(tds, 'TOTVS.tds-vscode is not installed in the isolated extensions directory');
    assert.equal(tds.packageJSON.version, process.env.PEA_EXPECT_TDS_VERSION);
    assert.equal(
      path.resolve(tds.extensionPath).startsWith(`${path.resolve(expectedExtensionsDir)}${path.sep}`),
      true,
      'TDS was not loaded from the isolated extensions directory',
    );
    const productCommands = new Set((product.packageJSON.contributes?.commands ?? []).map((item) => item.command));
    const conflicts = (tds.packageJSON.contributes?.commands ?? [])
      .map((item) => item.command)
      .filter((command) => productCommands.has(command));
    assert.deepEqual(conflicts, [], 'product and TDS command identifiers conflict');
    await tds.activate();
    assert.equal(tds.isActive, true, 'TDS did not activate in the isolated workspace');
  }

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

  const sourceUri = vscode.Uri.file(path.join(
    expectTds ? vscode.workspace.workspaceFolders[1].uri.fsPath : workspace.uri.fsPath,
    expectTds ? 'accent.prw' : 'empty.prw',
  ));
  const document = await vscode.workspace.openTextDocument(sourceUri);
  await vscode.window.showTextDocument(document);
  if (expectTds) {
    assert.match(document.getText(), /Função financeira/, 'VS Code did not decode the CP1252 fixture');
  }
  const review = await execute('pea.reviewActiveFile');
  assert.equal(review.assessment, 'PASS WITH OBSERVATIONS');
  assert.equal(review.file, expectTds ? 'accent.prw' : 'empty.prw');
  const diagnostics = vscode.languages.getDiagnostics(sourceUri)
    .filter((item) => item.source === 'Protheus Engineering Agent');
  assert.equal(diagnostics.length, 1, 'review finding was not published to Problems');
  assert.equal(diagnostics[0].code, 'CA4000');
  assert.equal(diagnostics[0].source, 'Protheus Engineering Agent');
  assert.equal(diagnostics[0].range.start.line, expectTds ? 2 : 1);

  if (expectTds) {
    const bytes = await fs.readFile(sourceUri.fsPath);
    assert.equal(bytes.includes(Buffer.from([0xe7, 0xe3])), true, 'CP1252 accents were modified');
    assert.equal(bytes.includes(Buffer.from([0x0d, 0x0a])), false, 'LF fixture was converted to CRLF');
  }

  process.stdout.write(`VS Code Extension Host smoke: PASS (4 commands${expectTds ? ', TDS + CP1252/LF + multi-root' : ''})\n`);
}

module.exports = { run };
