import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const productRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const extension = require('../apps/vscode-extension/extension.cjs');

function fakeVscode() {
  const handlers = new Map();
  const output = [];
  const warnings = [];
  return {
    handlers,
    output,
    warnings,
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
      },
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
  await fake.handlers.get('pea.doctor')();
  await fake.handlers.get('pea.openContext')();

  assert.deepEqual([...fake.handlers.keys()].sort(), [
    'pea.doctor', 'pea.indexWorkspace', 'pea.openContext', 'pea.reviewActiveFile',
  ]);
  assert.deepEqual(calls[0].args.slice(-2), ['doctor', 'C:\\workspace']);
  assert.deepEqual(calls[1].args.slice(-2), ['session', 'C:\\workspace']);
  assert.equal(calls[0].options.env.ELECTRON_RUN_AS_NODE, '1');
  assert.equal(calls[0].options.env.PEA_NODE_COMMAND, process.execPath);
  assert.equal(fake.output.join('\n').includes('"ok":true'), true);
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
