const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vscode = require('vscode');
const executedCommandIds = new Set();

async function execute(command, ...args) {
  executedCommandIds.add(command);
  process.stdout.write(`VS Code smoke: invoking ${command}\n`);
  const result = await vscode.commands.executeCommand(command, ...args);
  process.stdout.write(`VS Code smoke: completed ${command}\n`);
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

  const doctor = await execute('pea.doctor', workspace.uri);
  assert.equal(doctor.ok, true);
  assert.equal(doctor.hermes.probed, false);

  const index = await execute('pea.indexWorkspace', workspace.uri);
  assert.deepEqual(index.files, ['empty.prw']);
  const warmIndex = await execute('pea.indexWorkspace', workspace.uri);
  assert.deepEqual(warmIndex.files, index.files);
  assert.equal(warmIndex.analysis.cache.hits, 1, 'second index did not reuse the installed runtime cache');
  assert.equal(warmIndex.analysis.cache.misses, 0, 'unchanged source was unexpectedly reparsed');

  const context = await execute('pea.openContext', workspace.uri);
  assert.equal(context.trust, 'untrusted-project-data');
  assert.match(context.hermes.mcp.args[0], /dist[\\/]mcp-stdio\.mjs$/);
  assert.deepEqual(
    context.hermes.mcp.env.find((item) => item.name === 'PEA_ENVIRONMENT'),
    { name: 'PEA_ENVIRONMENT', value: 'production' },
  );

  const journal = await execute('pea.addJournalEntry', {
    uri: workspace.uri,
    summary: 'Installed VSIX lifecycle smoke',
    actor: 'qa-smoke',
  });
  assert.equal(journal.kind, 'decision');
  assert.equal(journal.attribution.actor, 'qa-smoke');
  const updatedContext = await execute('pea.openContext', workspace.uri);
  assert.equal(updatedContext.context.journal.some((entry) => entry.id === journal.id), true);

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

  const declaredCommandIds = (product.packageJSON.contributes?.commands ?? []).map((item) => item.command).sort();
  const registeredCommands = new Set(await vscode.commands.getCommands(true));
  assert.equal(declaredCommandIds.length, 19, 'packaged extension must declare all 19 public commands');
  assert.deepEqual(
    declaredCommandIds.filter((command) => !registeredCommands.has(command)),
    [],
    'every packaged public command must be registered in the installed Extension Host',
  );
  const receiptPath = process.env.PEA_SMOKE_RECEIPT;
  assert.ok(receiptPath, 'installed smoke receipt path was not provided');
  await fs.writeFile(receiptPath, JSON.stringify({
    schemaVersion: 1,
    commandIds: declaredCommandIds,
    executedCommandIds: [...executedCommandIds].sort(),
    invocations: 7,
  }, null, 2));

  process.stdout.write(`VS Code Extension Host smoke: PASS (7 core command invocations${expectTds ? ', TDS + CP1252/LF + multi-root' : ''})\n`);
}

module.exports = { run };
