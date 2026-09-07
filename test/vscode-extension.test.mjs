import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const productRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const extension = require('../apps/vscode-extension/extension.cjs');

function fakeVscode() {
  const handlers = new Map();
  const output = [];
  const warnings = [];
  const diagnostics = [];
  const diagnosticDeletes = [];
  return {
    handlers,
    output,
    warnings,
    diagnostics,
    diagnosticDeletes,
    api: {
      commands: {
        registerCommand(name, handler) {
          handlers.set(name, handler);
          return { dispose() {} };
        },
      },
      window: {
        activeTextEditor: null,
        createOutputChannel() {
          return {
            clear() { output.length = 0; },
            appendLine(line) { output.push(line); },
            show() {},
            dispose() {},
          };
        },
        showWarningMessage(message) { warnings.push(message); },
        showErrorMessage(message) { warnings.push(message); },
        withProgress(_options, task) { return task(); },
      },
      languages: {
        createDiagnosticCollection() {
          return {
            set(uri, values) { diagnostics.push({ uri, values }); },
            delete(uri) { diagnosticDeletes.push(uri); },
            clear() {},
            dispose() {},
          };
        },
      },
      Diagnostic: class Diagnostic {
        constructor(range, message, severity) {
          Object.assign(this, { range, message, severity });
        }
      },
      Range: class Range {
        constructor(startLine, startCharacter, endLine, endCharacter) {
          Object.assign(this, { startLine, startCharacter, endLine, endCharacter });
        }
      },
      DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
      ProgressLocation: { Notification: 15 },
      workspace: {
        workspaceFolders: [{ uri: { fsPath: 'C:\\workspace' } }],
      },
    },
  };
}

test('extension registers only thin orchestration commands and delegates doctor to the runtime CLI', async () => {
  const fake = fakeVscode();
  const calls = [];
  const controller = extension.createExtension(fake.api, {
    cliPath: join(productRoot, 'packages', 'runtime', 'src', 'cli.mjs'),
    execFile(command, args, options, callback) {
      calls.push({ command, args, options });
      callback(null, '{"ok":true}', '');
    },
  });
  const context = { subscriptions: [] };

  controller.activate(context);
  const doctorResult = await fake.handlers.get('pea.doctor')();
  await fake.handlers.get('pea.openContext')();

  assert.deepEqual([...fake.handlers.keys()].sort(), [
    'pea.doctor', 'pea.indexWorkspace', 'pea.openContext', 'pea.reviewActiveFile',
  ]);
  assert.deepEqual(calls[0].args.slice(-2), ['doctor', 'C:\\workspace']);
  assert.deepEqual(calls[1].args.slice(-2), ['session', 'C:\\workspace']);
  assert.equal(calls[0].options.env.ELECTRON_RUN_AS_NODE, '1');
  assert.equal(calls[0].options.env.PEA_NODE_COMMAND, process.execPath);
  assert.match(calls[0].options.env.PEA_MCP_SERVER_PATH, /dist[\\/]mcp-stdio\.mjs$/);
  assert.equal(calls[0].options.timeout, 120_000);
  assert.equal(doctorResult.trim(), '{"ok":true}');
  assert.equal(fake.output.join('\n').includes('"ok":true'), true);
});

test('extension defaults to the bundled runtime shipped beside its entry point', async () => {
  const fake = fakeVscode();
  const calls = [];
  const controller = extension.createExtension(fake.api, {
    execFile(command, args, options, callback) {
      calls.push({ command, args, options });
      callback(null, '{"ok":true}', '');
    },
  });
  controller.activate({ subscriptions: [] });

  await fake.handlers.get('pea.doctor')();

  assert.match(calls[0].args[0], /apps[\\/]vscode-extension[\\/]dist[\\/]runtime-cli\.mjs$/);
});

test('review command fails safely when there is no active editor', async () => {
  const fake = fakeVscode();
  const controller = extension.createExtension(fake.api, {
    cliPath: 'cli.mjs',
    execFile() { throw new Error('must not execute'); },
  });
  controller.activate({ subscriptions: [] });

  await fake.handlers.get('pea.reviewActiveFile')();

  assert.match(fake.warnings[0], /Open an ADVPL\/TLPP source file/);
});

test('review uses the workspace folder that owns the active file in a multi-root window', async () => {
  const fake = fakeVscode();
  const activeUri = { fsPath: 'D:\\protheus-two\\source.prw' };
  fake.api.window.activeTextEditor = { document: { uri: activeUri } };
  fake.api.workspace.workspaceFolders = [
    { uri: { fsPath: 'C:\\protheus-one' } },
    { uri: { fsPath: 'D:\\protheus-two' } },
  ];
  fake.api.workspace.getWorkspaceFolder = (uri) => (
    uri === activeUri ? fake.api.workspace.workspaceFolders[1] : undefined
  );
  const calls = [];
  const controller = extension.createExtension(fake.api, {
    cliPath: 'cli.mjs',
    execFile(command, args, options, callback) {
      calls.push({ command, args, options });
      callback(null, '{}', '');
    },
  });
  controller.activate({ subscriptions: [] });

  await fake.handlers.get('pea.reviewActiveFile')();

  assert.deepEqual(calls[0].args.slice(-3), [
    'review', 'D:\\protheus-two\\source.prw', 'D:\\protheus-two',
  ]);
  assert.equal(calls[0].options.cwd, 'D:\\protheus-two');
});

test('review publishes evidence-backed findings to the native Problems panel', async () => {
  const fake = fakeVscode();
  const activeUri = { fsPath: 'C:\\workspace\\source.prw' };
  fake.api.window.activeTextEditor = { document: { uri: activeUri } };
  const controller = extension.createExtension(fake.api, {
    cliPath: 'cli.mjs',
    execFile(_command, _args, _options, callback) {
      callback(null, JSON.stringify({
        findings: [
          {
            ruleId: 'CA1003',
            severity: 'MAJOR',
            title: 'Expensive API inside loop',
            guidance: 'Resolve the invariant before the loop.',
            line: 4,
          },
          {
            ruleId: 'CA4000',
            severity: 'INFO',
            title: 'Inline conditional',
            guidance: 'Use an explicit conditional.',
            line: 7,
          },
        ],
      }), '');
    },
  });
  controller.activate({ subscriptions: [] });

  await fake.handlers.get('pea.reviewActiveFile')();

  assert.equal(fake.diagnostics.length, 1);
  assert.equal(fake.diagnostics[0].uri, activeUri);
  assert.equal(fake.diagnostics[0].values.length, 2);
  assert.equal(fake.diagnostics[0].values[0].range.startLine, 3);
  assert.equal(fake.diagnostics[0].values[0].severity, fake.api.DiagnosticSeverity.Warning);
  assert.equal(fake.diagnostics[0].values[0].code, 'CA1003');
  assert.equal(fake.diagnostics[0].values[0].source, 'Protheus Engineering Agent');
});

test('review reports malformed runtime output without publishing stale diagnostics', async () => {
  const fake = fakeVscode();
  fake.api.window.activeTextEditor = { document: { uri: { fsPath: 'C:\\workspace\\source.prw' } } };
  const controller = extension.createExtension(fake.api, {
    cliPath: 'cli.mjs',
    execFile(_command, _args, _options, callback) { callback(null, 'not-json', ''); },
  });
  controller.activate({ subscriptions: [] });

  await fake.handlers.get('pea.reviewActiveFile')();

  assert.equal(fake.diagnostics.length, 0);
  assert.match(fake.warnings[0], /invalid review output/i);
});

test('review clears diagnostics for the active file when a later runtime result is invalid', async () => {
  const fake = fakeVscode();
  const uri = { fsPath: 'C:\\workspace\\source.prw' };
  fake.api.window.activeTextEditor = { document: { uri } };
  let invocation = 0;
  const controller = extension.createExtension(fake.api, {
    cliPath: 'cli.mjs',
    execFile(_command, _args, _options, callback) {
      invocation += 1;
      callback(null, invocation === 1
        ? JSON.stringify({ findings: [{ ruleId: 'CA4000', severity: 'INFO', title: 'Finding', line: 1 }] })
        : 'invalid', '');
    },
  });
  controller.activate({ subscriptions: [] });

  await fake.handlers.get('pea.reviewActiveFile')();
  await fake.handlers.get('pea.reviewActiveFile')();

  assert.equal(fake.diagnostics.length, 1);
  assert.deepEqual(fake.diagnosticDeletes, [uri]);
});

test('real host smoke installs the packaged VSIX before exercising commands', async () => {
  const runner = await readFile(join(productRoot, 'scripts', 'run-vscode-smoke.mjs'), 'utf8');
  const host = await readFile(join(productRoot, 'integration', 'vscode-host', 'index.cjs'), 'utf8');

  assert.match(runner, /packageExtension/);
  assert.match(runner, /--install-extension/);
  assert.match(runner, /extensionDevelopmentPath:\s*hostRoot/);
  assert.match(runner, /installedVsix:\s*true/);
  assert.match(runner, /vsixSha256:\s*await sha256\(packaged\.path\)/);
  assert.match(runner, /--version requires an exact VS Code version/);
  assert.match(host, /vscode\.extensions\.getExtension\('danielmontagna86-source\.protheus-engineering-agent'\)/);
});
