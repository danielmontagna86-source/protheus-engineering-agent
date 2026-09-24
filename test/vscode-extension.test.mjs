import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  parseVsCodeLifecycleArgs,
  requireExactVsCodeVersion,
  resolveLifecycleVsCodeExecutable,
} from '../scripts/run-vscode-lifecycle.mjs';
import { installedExtensionLine } from '../scripts/run-vscode-wsl-smoke.mjs';

const require = createRequire(import.meta.url);
const productRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const extension = require('../apps/vscode-extension/extension.cjs');

function fakeVscode() {
  const handlers = new Map();
  const output = [];
  const warnings = [];
  const diagnostics = [];
  const diagnosticDeletes = [];
  const treeProviders = new Map();
  const executions = [];
  const quickPicks = [];
  const inputBoxes = [];
  const inputBoxResponses = [];
  const informationMessages = [];
  const openDialogResponses = [];
  const openedExternal = [];
  const languageModelTools = new Map();
  const invokedLanguageModelTools = [];
  const progressCalls = [];
  const changeDocumentListeners = [];
  const closeDocumentListeners = [];
  return {
    handlers,
    output,
    warnings,
    diagnostics,
    diagnosticDeletes,
    treeProviders,
    executions,
    quickPicks,
    inputBoxes,
    inputBoxResponses,
    informationMessages,
    openDialogResponses,
    openedExternal,
    languageModelTools,
    invokedLanguageModelTools,
    progressCalls,
    fireDidChangeTextDocument(document) {
      for (const listener of changeDocumentListeners) listener({ document });
    },
    fireDidCloseTextDocument(document) {
      for (const listener of closeDocumentListeners) listener(document);
    },
    api: {
      lm: {
        registerTool(name, tool) {
          languageModelTools.set(name, tool);
          return { dispose() {} };
        },
        async invokeTool(name, options, token) {
          invokedLanguageModelTools.push({ name, options, token });
          return { content: [{ value: JSON.stringify({
            target: options.input.target,
            errors: 0,
            warnings: 0,
            diagnosticsUpdated: true,
            timedOut: false,
            diagnostics: [],
          }) }] };
        },
      },
      LanguageModelToolResult: class LanguageModelToolResult {
        constructor(content) { this.content = content; }
      },
      LanguageModelTextPart: class LanguageModelTextPart {
        constructor(value) { this.value = value; }
      },
      CancellationTokenSource: class CancellationTokenSource {
        constructor() {
          this.listeners = new Set();
          this.token = {
            isCancellationRequested: false,
            onCancellationRequested: (listener) => {
              this.listeners.add(listener);
              return { dispose: () => this.listeners.delete(listener) };
            },
          };
        }
        cancel() {
          if (this.token.isCancellationRequested) return;
          this.token.isCancellationRequested = true;
          for (const listener of [...this.listeners]) listener();
        }
        dispose() { this.listeners.clear(); }
      },
      commands: {
        registerCommand(name, handler) {
          handlers.set(name, handler);
          return { dispose() {} };
        },
        executeCommand(name, ...args) {
          executions.push({ name, args });
          return Promise.resolve();
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
        async showInformationMessage(message, options, ...actions) {
          informationMessages.push({ message, options, actions });
          return actions[0];
        },
        async showInputBox(options) {
          inputBoxes.push(options);
          return inputBoxResponses.shift();
        },
        async showOpenDialog() { return openDialogResponses.shift() ?? []; },
        async showQuickPick(items, options) {
          quickPicks.push({ items, options });
          return items[0];
        },
        withProgress(options, task) {
          const listeners = [];
          const token = {
            isCancellationRequested: false,
            onCancellationRequested(listener) {
              listeners.push(listener);
              return { dispose() {} };
            },
          };
          progressCalls.push({ options, token, cancel() {
            token.isCancellationRequested = true;
            for (const listener of listeners) listener();
          } });
          return task({ report() {} }, token);
        },
        registerTreeDataProvider(id, provider) {
          treeProviders.set(id, provider);
          return { dispose() {} };
        },
      },
      EventEmitter: class EventEmitter {
        constructor() { this.event = (listener) => { this.listener = listener; return { dispose() {} }; }; }
        fire(value) { this.listener?.(value); }
        dispose() {}
      },
      TreeItem: class TreeItem {
        constructor(label, collapsibleState) { Object.assign(this, { label, collapsibleState }); }
      },
      TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
      Uri: {
        file(fsPath) { return { fsPath }; },
        parse(value) { return { fsPath: value }; },
      },
      env: {
        async openExternal(uri) { openedExternal.push(uri); return true; },
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
        onDidChangeTextDocument(listener) {
          changeDocumentListeners.push(listener);
          return { dispose() {} };
        },
        onDidCloseTextDocument(listener) {
          closeDocumentListeners.push(listener);
          return { dispose() {} };
        },
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
    'pea.addJournalEntry', 'pea.addMemoryEntry', 'pea.askAi', 'pea.askCodex', 'pea.buildEvidence', 'pea.buildStatus',
    'pea.cancelBuild', 'pea.compileWithTds', 'pea.connectChatGpt', 'pea.doctor', 'pea.expireMemory', 'pea.importSnapshot',
    'pea.indexWorkspace', 'pea.manageAiConnections', 'pea.openContext', 'pea.openSampleWorkspace', 'pea.prepareBuild',
    'pea.promoteJournalEntry', 'pea.refreshEngineeringCenter', 'pea.reviewActiveFile',
    'pea.reviewChanges', 'pea.runBuild', 'pea.searchDictionary', 'pea.searchTdn',
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

test('extension persists a bounded API route while keeping its key only in VS Code SecretStorage', async () => {
  const fake = fakeVscode();
  const secrets = new Map();
  let manifest = { schemaVersion: 1, connections: [], routes: [] };
  const registry = {
    list() { return [{ id: 'openrouter', label: 'OpenRouter', connection: 'api-key', limitations: 'API key only.' }]; },
    get() { return this.list()[0]; },
  };
  fake.inputBoxResponses.push('key-entered-once', 'openai/gpt-test');
  extension.createExtension(fake.api, {
    providerRegistryFactory: () => registry,
    aiManifestStoreFactory({ validate }) {
      return {
        async read() { return manifest; },
        async write(value) { manifest = validate(value); return manifest; },
      };
    },
    mcpPreviewFactory: () => ({ cline: { mcpServers: {} }, opencode: { mcp: {} } }),
  }).activate({
    subscriptions: [],
    secrets: {
      async store(key, value) { secrets.set(key, value); },
      async get(key) { return secrets.get(key); },
      async delete(key) { secrets.delete(key); },
    },
  });

  await fake.handlers.get('pea.manageAiConnections')();

  assert.equal(secrets.get('pea.credential.openrouter-default.api-key'), 'key-entered-once');
  assert.deepEqual(manifest.connections, [{
    schemaVersion: 1, id: 'openrouter-default', provider: 'openrouter', mode: 'api-key',
    secretRef: 'openrouter-default.api-key', model: 'openai/gpt-test',
  }]);
  assert.deepEqual(manifest.routes.map(({ id, primary, allowedProviders, profile }) => ({ id, primary, allowedProviders, profile })), [{
    id: 'openrouter-default-analysis', primary: 'openrouter-default', allowedProviders: ['openrouter'], profile: 'analysis',
  }]);
  assert.match(fake.informationMessages.at(-1).message, /OpenRouter/i);
  assert.equal(fake.inputBoxes[0].password, true);
  assert.doesNotMatch(JSON.stringify(fake.output), /key-entered-once/);
});

test('extension rejects persisted AI routes that would invoke an external host or an unapproved provider', async () => {
  const fake = fakeVscode();
  let validate;
  extension.createExtension(fake.api, {
    providerRegistryFactory: () => ({ list: () => [
      { id: 'cline', label: 'Cline', connection: 'external-host' },
      { id: 'openrouter', label: 'OpenRouter', connection: 'api-key' },
    ] }),
    aiManifestStoreFactory(options) {
      validate = options.validate;
      return { async read() { return { schemaVersion: 1, connections: [], routes: [] }; }, async write() {} };
    },
  }).activate({ subscriptions: [], secrets: { async get() {}, async store() {}, async delete() {} } });

  await fake.handlers.get('pea.askAi')();
  assert.throws(() => validate({
    schemaVersion: 1,
    connections: [{ schemaVersion: 1, id: 'cline-default', provider: 'cline', mode: 'external-host' }],
    routes: [{ schemaVersion: 1, id: 'cline-analysis', profile: 'analysis', primary: 'cline-default', fallbacks: [], allowedProviders: ['cline'], maxInputBytes: 1, maxOutputBytes: 1, maxCostUsd: null }],
  }), /external host/i);
  assert.throws(() => validate({
    schemaVersion: 1,
    connections: [{ schemaVersion: 1, id: 'cline-api', provider: 'cline', mode: 'api-key', secretRef: 'cline-api.api-key', model: 'not-supported' }],
    routes: [],
  }), /mode does not match/i);
  assert.throws(() => validate({
    schemaVersion: 1,
    connections: [{ schemaVersion: 1, id: 'openrouter-default', provider: 'openrouter', mode: 'api-key', secretRef: 'openrouter-default.api-key', model: 'openai/gpt-test' }],
    routes: [{ schemaVersion: 1, id: 'openrouter-analysis', profile: 'analysis', primary: 'openrouter-default', fallbacks: [], allowedProviders: ['gemini-api'], maxInputBytes: 1, maxOutputBytes: 1, maxCostUsd: null }],
  }), /does not allow/i);
});

test('extension sends governed bounded context through configured OpenRouter without exposing its key', async () => {
  const fake = fakeVscode();
  const calls = [];
  fake.inputBoxResponses.push('Revise o risco desta alteração.');
  extension.createExtension(fake.api, {
    providerRegistryFactory: () => ({ list: () => [{ id: 'openrouter', label: 'OpenRouter', connection: 'api-key' }] }),
    aiManifestStoreFactory({ validate }) {
      const manifest = validate({
        schemaVersion: 1,
        connections: [{ schemaVersion: 1, id: 'openrouter-default', provider: 'openrouter', mode: 'api-key', secretRef: 'openrouter-default.api-key', model: 'openai/gpt-test' }],
        routes: [{ schemaVersion: 1, id: 'openrouter-default-analysis', profile: 'analysis', primary: 'openrouter-default', fallbacks: [], allowedProviders: ['openrouter'], maxInputBytes: 65536, maxOutputBytes: 131072, maxCostUsd: null }],
      });
      return { async read() { return manifest; }, async write() { throw new Error('not expected'); } };
    },
    aiProviderFactory({ id }) {
      assert.equal(id, 'openrouter');
      return { id, async complete() { return { model: 'safe-model', output: { summary: 'Resposta segura.' } }; } };
    },
    aiGatewayFactory({ provider, approve }) {
      return { async run(request) { calls.push({ provider, request }); assert.equal(await approve(), true); return { status: 'completed', output: { summary: 'Resposta segura.' } }; } };
    },
    execFile(_command, args, _options, callback) {
      if (args[1] === 'session') callback(null, JSON.stringify({ context: { source: 'evidence' } }), '');
      else callback(null, JSON.stringify({ configuration: { environment: 'development' } }), '');
      return { kill() {} };
    },
  }).activate({ subscriptions: [], secrets: { async get() { return 'not-exposed'; }, async store() {}, async delete() {} } });

  await fake.handlers.get('pea.askAi')();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].provider.id, 'pea-route.openrouter-default-analysis');
  assert.equal(calls[0].request.context.context.source, 'evidence');
  assert.doesNotMatch(JSON.stringify(fake.output), /not-exposed/);
});

test('extension uses managed ChatGPT login without an API-key input surface', async () => {
  const fake = fakeVscode();
  const provider = {
    async connect() {},
    async startChatGptLogin() { return { type: 'browser', url: 'https://auth.openai.com/codex/login' }; },
    status() { return { available: true, authentication: { authenticated: false, mode: null, plan: null } }; },
    async dispose() {},
  };
  extension.createExtension(fake.api, {
    codexProviderFactory: () => provider,
  }).activate({ subscriptions: [], globalState: { get() {}, async update() {} } });

  await fake.handlers.get('pea.connectChatGpt')();

  assert.equal(fake.inputBoxes.length, 0);
  assert.deepEqual(fake.openedExternal, [{ fsPath: 'https://auth.openai.com/codex/login' }]);
  assert.match(fake.informationMessages[0].message, /ChatGPT/i);
});

test('extension sends only runtime session context through the governed AI gateway after explicit approval', async () => {
  const fake = fakeVscode();
  const calls = [];
  fake.inputBoxResponses.push('Resuma os riscos.');
  extension.createExtension(fake.api, {
    codexProviderFactory: () => ({ getThreadId() { return 'opaque-thread-id'; }, async dispose() {} }),
    codexGatewayFactory({ workspace, approve }) {
      return {
        async run(request) {
          calls.push({ workspace, request });
          assert.equal(await approve(), true);
          return { status: 'completed', output: { summary: 'Resposta limitada.' }, privacy: { redactedFields: 0 } };
        },
      };
    },
    execFile(_command, args, _options, callback) {
      if (args[1] === 'session') callback(null, JSON.stringify({ schemaVersion: 1, trust: 'untrusted-project-data', context: { memory: 'Known evidence' } }), '');
      else if (args[1] === 'doctor') callback(null, JSON.stringify({ configuration: { environment: 'development' } }), '');
      else callback(null, '{}', '');
      return { kill() {} };
    },
  }).activate({ subscriptions: [], globalState: { get() {}, async update() {} } });

  await fake.handlers.get('pea.askCodex')();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].workspace, 'C:\\workspace');
  assert.equal(calls[0].request.context.context.memory, 'Known evidence');
  assert.match(calls[0].request.instruction, /Resuma os riscos/);
  assert.deepEqual(calls[0].request.outputSchema, {
    type: 'object',
    properties: { summary: { type: 'string' } },
    required: ['summary'],
    additionalProperties: false,
  });
  assert.match(fake.output.join('\n'), /Resposta limitada/);
});

test('extension exposes attributed Memory and Journal workflows with promotion preview', async () => {
  const fake = fakeVscode();
  const calls = [];
  fake.inputBoxResponses.push('Keep offline review.', 'reviewer', 'maintainer');
  extension.createExtension(fake.api, {
    cliPath: 'cli.mjs',
    execFile(_command, args, _options, callback) {
      calls.push(args.slice(1));
      const operation = args[1];
      if (operation === 'session') callback(null, JSON.stringify({ context: { journal: [{ id: 'journal-1', kind: 'decision', summary: 'Keep offline review.' }] } }), '');
      else if (operation === 'journal-preview') callback(null, JSON.stringify({ status: 'ready', patch: '+ Keep offline review.', beforeSha256: 'a'.repeat(64), afterSha256: 'b'.repeat(64) }), '');
      else callback(null, JSON.stringify({ status: operation === 'journal-promote' ? 'promoted' : 'recorded' }), '');
      return { kill() {} };
    },
  }).activate({ subscriptions: [] });

  await fake.handlers.get('pea.addJournalEntry')();
  await fake.handlers.get('pea.promoteJournalEntry')();

  assert.deepEqual(calls[0].slice(0, 4), ['journal-add', 'C:\\workspace', 'decision', 'reviewer']);
  assert.deepEqual(calls.map((args) => args[0]), ['journal-add', 'session', 'journal-preview', 'journal-promote']);
  assert.match(fake.informationMessages[0].message, /Keep offline review/);
});

test('extension validates and imports a licensed snapshot only after confirmation', async () => {
  const fake = fakeVscode();
  const calls = [];
  fake.openDialogResponses.push([{ fsPath: 'C:\\snapshots\\tdn.json' }]);
  extension.createExtension(fake.api, {
    cliPath: 'cli.mjs',
    execFile(_command, args, _options, callback) {
      calls.push(args.slice(1));
      callback(null, JSON.stringify({
        status: 'ready', integration: 'tdn', records: 2, freshness: 'fresh',
        license: { status: 'declared', value: 'owner-authorized-local-snapshot' }, sha256: 'a'.repeat(64),
      }), '');
      return { kill() {} };
    },
  }).activate({ subscriptions: [] });

  await fake.handlers.get('pea.importSnapshot')();
  await fake.handlers.get('pea.searchTdn')({ query: 'FWExecStatement' });
  await fake.handlers.get('pea.searchDictionary')({ query: 'E1_PREFIXO' });

  assert.deepEqual(calls.map((args) => args[0]), [
    'snapshot-inspect', 'snapshot-import', 'tdn-search', 'dictionary-search',
  ]);
  assert.equal(calls[1].at(-1), 'a'.repeat(64));
  assert.deepEqual(calls[2].slice(-2), ['FWExecStatement', '10']);
  assert.deepEqual(calls[3].slice(-2), ['E1_PREFIXO', '10']);
  assert.match(fake.informationMessages[0].message, /2/);
});

test('extension exposes the supervised build lifecycle while preserving unavailable evidence', async () => {
  const fake = fakeVscode();
  const calls = [];
  fake.inputBoxResponses.push('verify', 'maintainer');
  extension.createExtension(fake.api, {
    cliPath: 'cli.mjs',
    execFile(_command, args, _options, callback) {
      calls.push(args.slice(1));
      if (args[1] === 'build-prepare') callback(null, JSON.stringify({ status: 'prepared', requestId: 'request-1' }), '');
      else callback(null, JSON.stringify({ status: 'unavailable', error: { code: 'BUILD_UNAVAILABLE' } }), '');
      return { kill() {} };
    },
  }).activate({ subscriptions: [] });

  await fake.handlers.get('pea.prepareBuild')();
  await fake.handlers.get('pea.runBuild')();
  await fake.handlers.get('pea.buildStatus')();
  await fake.handlers.get('pea.cancelBuild')();
  await fake.handlers.get('pea.buildEvidence')();

  assert.deepEqual(calls.map((args) => args[0]), [
    'build-prepare', 'build-run', 'build-status', 'build-cancel', 'build-evidence',
  ]);
  assert.equal(calls[1].length, 4);
  assert.doesNotMatch(calls[1][3], /maintainer/);
});

test('TDS bridge invokes only the public compiler tool and does not overclaim zero diagnostics', async () => {
  const fake = fakeVscode();
  const workspace = process.platform === 'win32' ? 'C:\\workspace' : '/workspace';
  const source = join(workspace, 'pea_lab_cp1252_20260913.prw');
  fake.api.workspace.workspaceFolders = [{ uri: { fsPath: workspace } }];
  fake.api.workspace.isTrusted = true;

  const result = await extension.invokeTdsCompilerTool(fake.api, { workspace, target: source }, {}, { resolvePath: (candidate) => candidate });

  assert.equal(result.status, 'unverified');
  assert.equal(result.error.code, 'TDS_COMPILE_SUCCESS_UNPROVEN');
  assert.equal(result.adapter, 'tds-language-model-tool');
  assert.deepEqual({
    name: fake.invokedLanguageModelTools[0].name,
    options: fake.invokedLanguageModelTools[0].options,
  }, {
    name: 'tds-lm-tools',
    options: { input: {
      command: 'compiler',
      target: source,
      flags: { only: 'all', sort: 'file', format: 'json', syntaxOnly: false, applyOld: false, applied: [] },
    } },
  });
  assert.equal(fake.invokedLanguageModelTools[0].token.isCancellationRequested, false);
});

test('TDS bridge fails closed outside trusted contained AdvPL/TLPP scope and on unavailable API', async () => {
  const fake = fakeVscode();
  const workspace = process.platform === 'win32' ? 'C:\\workspace' : '/workspace';
  const outside = process.platform === 'win32' ? 'D:\\outside.prw' : '/outside.prw';
  fake.api.workspace.isTrusted = true;
  await assert.rejects(
    extension.invokeTdsCompilerTool(fake.api, { workspace, target: outside }, {}, { resolvePath: (candidate) => candidate }),
    /inside the selected workspace/,
  );
  const linked = join(workspace, 'linked-source.prw');
  await assert.rejects(
    extension.invokeTdsCompilerTool(fake.api, { workspace, target: linked }, {}, {
      resolvePath: (candidate) => candidate === linked ? outside : candidate,
    }),
    /inside the selected workspace/,
  );
  await assert.rejects(
    extension.invokeTdsCompilerTool(fake.api, { workspace, target: join(workspace, 'readme.md') }, {}, { resolvePath: (candidate) => candidate }),
    /ADVPL\/TLPP/,
  );
  fake.api.workspace.isTrusted = false;
  await assert.rejects(
    extension.invokeTdsCompilerTool(fake.api, { workspace, target: join(workspace, 'source.prw') }, {}, { resolvePath: (candidate) => candidate }),
    /trusted workspace/,
  );
  fake.api.workspace.isTrusted = true;
  delete fake.api.lm.invokeTool;
  const unavailable = await extension.invokeTdsCompilerTool(fake.api, { workspace, target: join(workspace, 'source.prw') }, {}, { resolvePath: (candidate) => candidate });
  assert.deepEqual(unavailable, {
    adapter: 'tds-language-model-tool', status: 'unavailable',
    error: { code: 'TDS_TOOL_UNAVAILABLE', message: 'The installed VS Code or TDS does not expose the public TDS language-model compiler tool.' },
  });
});

test('TDS bridge marks timeouts and malformed replies unverified and redacts secret-like text', async () => {
  const fake = fakeVscode();
  const workspace = process.platform === 'win32' ? 'C:\\workspace' : '/workspace';
  const source = join(workspace, 'source.prw');
  fake.api.workspace.isTrusted = true;
  fake.api.lm.invokeTool = async () => ({ content: [new fake.api.LanguageModelTextPart(JSON.stringify({
    errors: 0, warnings: 0, diagnosticsUpdated: false, timedOut: true,
    diagnostics: [{ message: 'Authorization: Bearer should-not-appear' }],
  }))] });

  const timeout = await extension.invokeTdsCompilerTool(fake.api, { workspace, target: source }, {}, { resolvePath: (candidate) => candidate });
  assert.equal(timeout.status, 'unverified');
  assert.equal(timeout.error.code, 'TDS_DIAGNOSTICS_UNVERIFIED');
  assert.doesNotMatch(JSON.stringify(timeout), /should-not-appear/);

  fake.api.lm.invokeTool = async () => ({ content: [new fake.api.LanguageModelTextPart('not-json')] });
  const malformed = await extension.invokeTdsCompilerTool(fake.api, { workspace, target: source }, {}, { resolvePath: (candidate) => candidate });
  assert.equal(malformed.status, 'unverified');
  assert.equal(malformed.error.code, 'TDS_TOOL_MALFORMED_RESULT');
});

test('TDS bridge bounds a compiler tool that ignores downstream cancellation', async () => {
  const fake = fakeVscode();
  const workspace = process.platform === 'win32' ? 'C:\\workspace' : '/workspace';
  const source = join(workspace, 'source.prw');
  fake.api.workspace.isTrusted = true;
  let downstreamToken;
  fake.api.lm.invokeTool = async (_name, _options, token) => {
    downstreamToken = token;
    return new Promise(() => {});
  };

  const result = await Promise.race([
    extension.invokeTdsCompilerTool(fake.api, { workspace, target: source }, {}, {
      resolvePath: (candidate) => candidate,
      timeoutMs: 5,
    }),
    new Promise((resolve) => setTimeout(() => resolve({ status: 'test-harness-timeout' }), 50)),
  ]);

  assert.equal(result.status, 'unverified');
  assert.equal(result.error.code, 'TDS_TOOL_TIMEOUT');
  assert.equal(downstreamToken.isCancellationRequested, true);
});

test('TDS bridge observes in-flight user cancellation when the compiler tool ignores its token', async () => {
  const fake = fakeVscode();
  const workspace = process.platform === 'win32' ? 'C:\\workspace' : '/workspace';
  const source = join(workspace, 'source.prw');
  fake.api.workspace.isTrusted = true;
  const parent = new fake.api.CancellationTokenSource();
  let downstreamToken;
  fake.api.lm.invokeTool = async (_name, _options, token) => {
    downstreamToken = token;
    return new Promise(() => {});
  };

  const pending = extension.invokeTdsCompilerTool(fake.api, { workspace, target: source }, parent.token, {
    resolvePath: (candidate) => candidate,
    timeoutMs: 1_000,
  });
  parent.cancel();
  const result = await Promise.race([
    pending,
    new Promise((resolve) => setTimeout(() => resolve({ status: 'test-harness-timeout' }), 50)),
  ]);

  assert.equal(result.status, 'unverified');
  assert.equal(result.error.code, 'TDS_TOOL_CANCELLED');
  assert.equal(downstreamToken.isCancellationRequested, true);
});

test('TDS bridge accepts nested diagnostics but keeps zero-error compilation unverified', async () => {
  const fake = fakeVscode();
  const workspace = process.platform === 'win32' ? 'C:\\workspace' : '/workspace';
  const source = join(workspace, 'source.prw');
  fake.api.workspace.isTrusted = true;
  fake.api.lm.invokeTool = async () => ({ content: [new fake.api.LanguageModelTextPart(JSON.stringify({
    command: 'totvs-developer-studio.rebuild.file',
    target: source,
    flags: { format: 'json' },
    diagnosticsUpdated: true,
    timedOut: false,
    diagnostics: {
      target: source,
      errors: 0,
      warnings: 0,
      truncated: false,
      diagnostics: [],
    },
  }))] });

  const result = await extension.invokeTdsCompilerTool(
    fake.api,
    { workspace, target: source },
    {},
    { resolvePath: (candidate) => candidate },
  );

  assert.equal(result.status, 'unverified');
  assert.equal(result.error.code, 'TDS_COMPILE_SUCCESS_UNPROVEN');
  assert.deepEqual(result.diagnostics, { errors: 0, warnings: 0, updated: true, timedOut: false, entries: [] });
});

test('TDS compile command asks for confirmation and links a cancellable native progress token', async () => {
  const fake = fakeVscode();
  const workspace = process.platform === 'win32' ? 'C:\\workspace' : '/workspace';
  const source = join(workspace, 'source.prw');
  fake.api.workspace.workspaceFolders = [{ uri: { fsPath: workspace } }];
  fake.api.workspace.isTrusted = true;
  fake.api.window.activeTextEditor = { document: { uri: { fsPath: source } } };
  extension.createExtension(fake.api, { resolveTdsPath: (candidate) => candidate }).activate({ subscriptions: [] });

  await fake.handlers.get('pea.compileWithTds')();

  assert.equal(fake.informationMessages[0].options.modal, true);
  assert.match(fake.informationMessages[0].message, /RPO/);
  assert.equal(fake.progressCalls.at(-1).options.cancellable, true);
  assert.notEqual(fake.invokedLanguageModelTools.at(-1).token, fake.progressCalls.at(-1).token);
  assert.equal(fake.invokedLanguageModelTools.at(-1).token.isCancellationRequested, false);
});

test('TDS compile command falls back to the sole visible local ADVPL/TLPP editor', async () => {
  const fake = fakeVscode();
  const workspace = process.platform === 'win32' ? 'C:\\workspace' : '/workspace';
  const source = join(workspace, 'source.prw');
  fake.api.workspace.workspaceFolders = [{ uri: { fsPath: workspace } }];
  fake.api.workspace.isTrusted = true;
  fake.api.window.activeTextEditor = { document: { uri: { scheme: 'output', fsPath: '' } } };
  fake.api.window.visibleTextEditors = [{ document: { uri: { scheme: 'file', fsPath: source } } }];
  extension.createExtension(fake.api, { resolveTdsPath: (candidate) => candidate }).activate({ subscriptions: [] });

  await fake.handlers.get('pea.compileWithTds')();

  assert.equal(fake.warnings.length, 0);
  assert.equal(fake.invokedLanguageModelTools.at(-1).options.input.target, source);
});

test('TDS compile command rejects an ambiguous visible ADVPL/TLPP selection before invoking TDS', async () => {
  const fake = fakeVscode();
  const workspace = process.platform === 'win32' ? 'C:\\workspace' : '/workspace';
  fake.api.workspace.workspaceFolders = [{ uri: { fsPath: workspace } }];
  fake.api.workspace.isTrusted = true;
  fake.api.window.activeTextEditor = { document: { uri: { scheme: 'output', fsPath: '' } } };
  fake.api.window.visibleTextEditors = [
    { document: { uri: { scheme: 'file', fsPath: join(workspace, 'first.prw') } } },
    { document: { uri: { scheme: 'file', fsPath: join(workspace, 'second.tlpp') } } },
  ];
  extension.createExtension(fake.api, { resolveTdsPath: (candidate) => candidate }).activate({ subscriptions: [] });

  await fake.handlers.get('pea.compileWithTds')();

  assert.match(fake.warnings.at(-1), /Open one local ADVPL\/TLPP source file first/);
  assert.equal(fake.invokedLanguageModelTools.length, 0);
});

test('in-process runtime aborts the underlying operation on timeout', async () => {
  let aborted = false;
  const runner = extension.createInProcessCliRunner('runtime.cjs', {
    timeoutMs: 5,
    loadModule() {
      return {
        runCli(_args, io) {
          return new Promise((resolve) => {
            io.signal.addEventListener('abort', () => { aborted = true; resolve(1); }, { once: true });
          });
        },
      };
    },
  });

  await assert.rejects(runner(['index'], 'C:\\workspace'), /timed out/);
  assert.equal(aborted, true);
});

test('extension exposes read-only deterministic language model tools without requiring a model provider', async () => {
  const fake = fakeVscode();
  const calls = [];
  const workspace = process.platform === 'win32' ? 'C:\\workspace' : '/workspace';
  const source = join(workspace, 'source.prw');
  fake.api.workspace.workspaceFolders = [{ uri: { fsPath: workspace } }];
  extension.createExtension(fake.api, {
    cliPath: 'cli.mjs',
    execFile(_command, args, options, callback) {
      calls.push({ args, options });
      callback(null, JSON.stringify({ ok: true, command: args[1] }), '');
      return { kill() {} };
    },
  }).activate({ subscriptions: [] });

  assert.deepEqual([...fake.languageModelTools.keys()].sort(), [
    'pea_readProjectContext', 'pea_reviewChanges', 'pea_reviewFile',
  ]);
  const token = { isCancellationRequested: false, onCancellationRequested() { return { dispose() {} }; } };
  const result = await fake.languageModelTools.get('pea_reviewFile').invoke({
    input: { path: source },
  }, token);

  assert.equal(JSON.parse(result.content[0].value).command, 'review');
  assert.deepEqual(calls[0].args.slice(-3), [
    'review', source, workspace,
  ]);
});

test('language model tools fail closed when runtime output exceeds their bounded context budget', async () => {
  const fake = fakeVscode();
  extension.createExtension(fake.api, {
    cliPath: 'cli.mjs',
    execFile(_command, _args, _options, callback) {
      callback(null, 'x'.repeat(300 * 1024), '');
      return { kill() {} };
    },
  }).activate({ subscriptions: [] });

  const result = await fake.languageModelTools.get('pea_readProjectContext').invoke({ input: {} }, {});
  const payload = JSON.parse(result.content[0].value);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, 'LM_TOOL_OUTPUT_TOO_LARGE');
  assert.ok(Buffer.byteLength(result.content[0].value, 'utf8') < 1024);
});

test('language model change review forwards one bounded explicit repository root', async () => {
  const fake = fakeVscode();
  const calls = [];
  const workspace = process.platform === 'win32' ? 'C:\\workspace' : '/workspace';
  const repository = join(workspace, 'nested');
  const outside = process.platform === 'win32' ? 'D:\\outside' : '/outside';
  fake.api.workspace.workspaceFolders = [{ uri: { fsPath: workspace } }];
  extension.createExtension(fake.api, {
    cliPath: 'cli.mjs',
    execFile(_command, args, _options, callback) {
      calls.push(args.slice(1));
      callback(null, JSON.stringify({ kind: 'change-review' }), '');
      return { kill() {} };
    },
  }).activate({ subscriptions: [] });

  await fake.languageModelTools.get('pea_reviewChanges').invoke({
    input: { scope: 'working-tree', repository },
  }, {});
  assert.deepEqual(calls[0], [
    'review-changes', workspace, 'working-tree', `--repository=${repository}`,
  ]);
  await assert.rejects(fake.languageModelTools.get('pea_reviewChanges').invoke({
    input: { scope: 'working-tree', repository: outside },
  }, {}), /inside the selected workspace/);
});

test('long-running command surfaces use cancellable native progress and forward its token', async () => {
  const fake = fakeVscode();
  const tokens = [];
  extension.createExtension(fake.api, {
    runtimeRunner: async (_args, _cwd, token) => {
      tokens.push(token);
      return JSON.stringify({ ok: true });
    },
  }).activate({ subscriptions: [] });

  await fake.handlers.get('pea.indexWorkspace')();
  assert.equal(fake.progressCalls[0].options.cancellable, true);
  assert.equal(tokens[0], fake.progressCalls[0].token);
});

test('extension manifest declara apenas ferramentas de modelo limitadas e somente leitura', async () => {
  const manifest = JSON.parse(await readFile(
    join(productRoot, 'apps', 'vscode-extension', 'package.json'),
    'utf8',
  ));
  const tools = manifest.contributes.languageModelTools;
  const messages = JSON.parse(await readFile(
    join(productRoot, 'apps', 'vscode-extension', 'package.nls.json'),
    'utf8',
  ));
  const localized = (value) => messages[value.slice(1, -1)];

  assert.deepEqual(tools.map((tool) => tool.name).sort(), [
    'pea_readProjectContext', 'pea_reviewChanges', 'pea_reviewFile',
  ]);
  assert.ok(tools.every((tool) => tool.canBeReferencedInPrompt === true));
  assert.ok(tools.every((tool) => localized(tool.modelDescription).includes('somente leitura')));
  assert.ok(tools.every((tool) => tool.inputSchema.additionalProperties === false));
});

test('Engineering Center requires an explicit workspace choice in a multi-root window', async () => {
  const fake = fakeVscode();
  fake.api.workspace.workspaceFolders = [
    { name: 'one', uri: { fsPath: 'C:\\protheus-one' } },
    { name: 'two', uri: { fsPath: 'D:\\protheus-two' } },
  ];
  fake.api.window.showQuickPick = async (items, options) => {
    fake.quickPicks.push({ items, options });
    return items[1];
  };
  const calls = [];
  extension.createExtension(fake.api, {
    cliPath: 'cli.mjs',
    execFile(_command, args, options, callback) {
      calls.push({ args, options });
      const operation = args[1];
      if (operation === 'doctor') callback(null, JSON.stringify({ configuration: {}, integrations: [] }), '');
      else if (operation === 'index') callback(null, JSON.stringify({ files: [], nodes: [] }), '');
      else callback(null, JSON.stringify({ context: {} }), '');
    },
  }).activate({ subscriptions: [] });

  await fake.handlers.get('pea.refreshEngineeringCenter')();

  assert.equal(fake.quickPicks.length, 1);
  assert.match(fake.quickPicks[0].options.placeHolder, /workspace folder/i);
  assert.equal(calls.length, 4);
  assert.ok(calls.every((call) => call.options.cwd === 'D:\\protheus-two'));
});

test('workspace commands accept an explicit folder URI for headless multi-root execution', async () => {
  const fake = fakeVscode();
  const secondUri = { fsPath: 'D:\\protheus-two' };
  fake.api.workspace.workspaceFolders = [
    { name: 'one', uri: { fsPath: 'C:\\protheus-one' } },
    { name: 'two', uri: secondUri },
  ];
  fake.api.workspace.getWorkspaceFolder = (uri) => (
    uri === secondUri ? fake.api.workspace.workspaceFolders[1] : undefined
  );
  const calls = [];
  extension.createExtension(fake.api, {
    cliPath: 'cli.mjs',
    execFile(_command, args, options, callback) {
      calls.push({ args, options });
      callback(null, '{}', '');
    },
  }).activate({ subscriptions: [] });

  await fake.handlers.get('pea.doctor')(secondUri);
  await fake.handlers.get('pea.indexWorkspace')(secondUri);
  await fake.handlers.get('pea.openContext')(secondUri);

  assert.equal(fake.quickPicks.length, 0);
  assert.ok(calls.every((call) => call.options.cwd === 'D:\\protheus-two'));
});

test('changed-files command delegates one explicit SCM scope to the runtime', async () => {
  const fake = fakeVscode();
  const calls = [];
  extension.createExtension(fake.api, {
    cliPath: 'cli.mjs',
    execFile(_command, args, options, callback) {
      calls.push({ args, options });
      callback(null, JSON.stringify({ kind: 'change-review', summary: { filesReviewed: 0 } }), '');
    },
  }).activate({ subscriptions: [] });

  const output = await fake.handlers.get('pea.reviewChanges')();

  assert.deepEqual(calls[0].args.slice(-3), ['review-changes', 'C:\\workspace', 'working-tree']);
  assert.equal(calls[0].options.cwd, 'C:\\workspace');
  assert.equal(JSON.parse(output).kind, 'change-review');
});

test('changed-files command resolves an ambiguous workspace through an explicit repository choice', async () => {
  const fake = fakeVscode();
  const calls = [];
  const workspace = process.platform === 'win32' ? 'C:\\workspace' : '/workspace';
  fake.api.workspace.workspaceFolders = [{ uri: { fsPath: workspace } }];
  extension.createExtension(fake.api, {
    cliPath: 'cli.mjs',
    execFile(_command, args, _options, callback) {
      const invocation = args.slice(1);
      calls.push(invocation);
      if (invocation[0] === 'repositories') {
        callback(null, JSON.stringify({ schemaVersion: 1, repositories: ['one', 'two'] }), '');
      } else if (!invocation.some((item) => item.startsWith('--repository='))) {
        callback(new Error('ambiguous Git repository selection'), '', 'ambiguous Git repository selection');
      } else {
        callback(null, JSON.stringify({ kind: 'change-review', summary: { filesReviewed: 0 } }), '');
      }
      return { kill() {} };
    },
  }).activate({ subscriptions: [] });

  await fake.handlers.get('pea.reviewChanges')();

  assert.deepEqual(calls.map((args) => args[0]), ['review-changes', 'repositories', 'review-changes']);
  assert.equal(calls[2].at(-1), `--repository=${join(workspace, 'one')}`);
  assert.match(fake.quickPicks.at(-1).options.placeHolder, /Git repository/i);
});

test('sample workspace command opens the bundled legal offline sample', async () => {
  const fake = fakeVscode();
  let source;
  extension.createExtension(fake.api, {
    async sampleWorkspaceFactory(value) {
      source = value;
      return 'C:\\writable-samples\\sample-1';
    },
  }).activate({ subscriptions: [], globalStorageUri: { fsPath: 'C:\\global-storage' } });

  await fake.handlers.get('pea.openSampleWorkspace')();

  assert.equal(fake.executions[0].name, 'vscode.openFolder');
  assert.match(source, /apps[\\/]vscode-extension[\\/]sample-workspace$/);
  assert.equal(fake.executions[0].args[0].fsPath, 'C:\\writable-samples\\sample-1');
  assert.equal(fake.executions[0].args[1], true);
});

test('sample workspace factory creates a writable Git baseline with one reviewable change', async () => {
  const storage = await mkdtemp(join(tmpdir(), 'pea-sample-storage-'));
  const source = join(productRoot, 'apps', 'vscode-extension', 'sample-workspace');
  const destination = await extension.createSampleWorkspace(source, storage);
  const gitDirectory = await stat(join(destination, '.git'));
  const statusResult = await new Promise((resolve, reject) => {
    require('node:child_process').execFile('git', ['status', '--porcelain=v1'], { cwd: destination }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });

  assert.equal(gitDirectory.isDirectory(), true);
  assert.match(statusResult, /^ M sample-review\.prw/m);
});

test('Engineering Center is a native tree with the five product status sections', async () => {
  const fake = fakeVscode();
  const calls = [];
  const controller = extension.createExtension(fake.api, {
    cliPath: 'cli.mjs',
    execFile(_command, args, _options, callback) {
      calls.push(args);
      const operation = args[1];
      if (operation === 'doctor') callback(null, JSON.stringify({
        ok: true,
        configuration: { activeProfile: 'default', environment: 'development' },
        integrations: [{ name: 'tdn', available: false }],
        policy: { approvalRequired: ['build:execute'] },
      }), '');
      else if (operation === 'index') callback(null, JSON.stringify({
        files: ['a.prw'], nodes: [{ name: 'A' }], encodings: { 'a.prw': 'windows-1252' },
        analysis: { unresolvedTargets: [{ callee: 'Missing' }], ambiguousTargets: [] },
      }), '');
      else if (operation === 'review-changes') callback(null, JSON.stringify({
        status: 'changed', changedFiles: [{ path: 'a.prw' }],
        summary: { filesChanged: 1, filesReviewed: 1, findings: 2, assessment: 'PASS WITH OBSERVATIONS' },
      }), '');
      else callback(null, JSON.stringify({ context: { memory: 'decision', journal: [{ kind: 'review' }] } }), '');
    },
  });
  controller.activate({ subscriptions: [] });

  const provider = fake.treeProviders.get('pea.engineeringCenter');
  assert.ok(provider, 'native Engineering Center provider was not registered');
  assert.deepEqual(await provider.getChildren(), [], 'the welcome content must be visible before first refresh');

  await fake.handlers.get('pea.refreshEngineeringCenter')();
  assert.deepEqual(calls.map((args) => args[1]).sort(), ['doctor', 'index', 'review-changes', 'session']);
  const roots = await provider.getChildren();
  assert.deepEqual(roots.map((item) => item.label), [
    'Workspace & CodeGraph', 'Change Review', 'Memory & Journal', 'Integrations', 'Environment',
  ]);
  const workspaceItems = await provider.getChildren(roots[0]);
  const reviewItems = await provider.getChildren(roots[1]);
  const integrationItems = await provider.getChildren(roots[3]);
  const environmentItems = await provider.getChildren(roots[4]);
  assert.match(workspaceItems[0].label, /1 indexed file/);
  assert.ok(workspaceItems.some((item) => /windows-1252: 1/.test(item.label)));
  assert.ok(workspaceItems.some((item) => /Unresolved calls: 1/.test(item.label)));
  assert.ok(reviewItems.some((item) => /1 changed file/.test(item.label)));
  assert.ok(reviewItems.some((item) => /2 findings/.test(item.label)));
  assert.match(integrationItems[0].label, /TDN: unavailable/);
  assert.ok(environmentItems.some((item) => /Approvals required: 1/.test(item.label)));
});

test('extension manifest contributes a native Engineering Center rather than a webview', async () => {
  const manifest = JSON.parse(await readFile(
    join(productRoot, 'apps', 'vscode-extension', 'package.json'),
    'utf8',
  ));

  assert.equal(manifest.contributes.viewsContainers.activitybar[0].id, 'pea');
  assert.equal(manifest.contributes.views.pea[0].id, 'pea.engineeringCenter');
  assert.equal(manifest.contributes.views.pea[0].type, undefined);
  assert.equal(manifest.contributes.viewsWelcome[0].view, 'pea.engineeringCenter');
});

test('Activity Bar uses a theme-safe monochrome 24px SVG while Marketplace keeps the PNG icon', async () => {
  const manifest = JSON.parse(await readFile(
    join(productRoot, 'apps', 'vscode-extension', 'package.json'),
    'utf8',
  ));
  const activityIcon = manifest.contributes.viewsContainers.activitybar[0].icon;
  const svg = await readFile(join(productRoot, 'apps', 'vscode-extension', activityIcon), 'utf8');

  assert.equal(manifest.icon, 'media/icon.png');
  assert.equal(activityIcon, 'media/activity-icon.svg');
  assert.match(svg, /viewBox="0 0 24 24"/);
  assert.match(svg, /currentColor/);
  assert.match(svg, /<title>Protheus Engineering Agent<\/title>/);
  assert.doesNotMatch(svg, /<image|data:image|#[0-9a-f]{3,8}/i);
});

test('walkthrough starts from the bundled sample and staging copies it into the VSIX', async () => {
  const manifest = JSON.parse(await readFile(
    join(productRoot, 'apps', 'vscode-extension', 'package.json'),
    'utf8',
  ));
  const messages = JSON.parse(await readFile(
    join(productRoot, 'apps', 'vscode-extension', 'package.nls.json'),
    'utf8',
  ));
  const buildScript = await readFile(join(productRoot, 'scripts', 'build-extension.mjs'), 'utf8');
  const steps = manifest.contributes.walkthroughs[0].steps;

  assert.equal(steps[0].description, '%walkthrough.sample.description%');
  assert.match(messages['walkthrough.sample.description'], /command:pea\.openSampleWorkspace/);
  assert.ok(steps.length >= 4);
  assert.match(buildScript, /sample-workspace/);
});

test('extension packages the repository evidence-review skill for VS Code agents', async () => {
  const manifest = JSON.parse(await readFile(
    join(productRoot, 'apps', 'vscode-extension', 'package.json'),
    'utf8',
  ));
  const buildScript = await readFile(join(productRoot, 'scripts', 'build-extension.mjs'), 'utf8');
  const skill = manifest.contributes.chatSkills.find((item) => item.path.includes('protheus-evidence-review'));

  assert.equal(skill.path, './skills/protheus-evidence-review/SKILL.md');
  assert.match(buildScript, /protheus-evidence-review/);
  assert.match(buildScript, /\.agents.*skills/s);
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

  assert.match(calls[0].args[0], /apps[\\/]vscode-extension[\\/]dist[\\/]runtime-cli\.cjs$/);
});

test('extension credential storage uses VS Code SecretStorage and never workspace settings', async () => {
  const values = new Map();
  const store = extension.createCredentialStore({
    async store(key, value) { values.set(key, value); },
    async get(key) { return values.get(key); },
    async delete(key) { values.delete(key); },
  });

  await store.set('database', 'sensitive-value');
  assert.equal(await store.get('database'), 'sensitive-value');
  assert.equal(values.get('pea.credential.database'), 'sensitive-value');
  await store.delete('database');
  assert.equal(await store.get('database'), undefined);
  await assert.rejects(store.set('../escape', 'x'), /unsupported credential id/);
  await assert.rejects(store.set('database', ''), /non-empty string/);
});

test('extension keeps environment configuration in the typed project schema without inert VS Code settings', async () => {
  const manifest = JSON.parse(await readFile(
    join(productRoot, 'apps', 'vscode-extension', 'package.json'),
    'utf8',
  ));
  const schema = JSON.parse(await readFile(join(productRoot, 'schemas', 'pea-config.schema.json'), 'utf8'));
  assert.equal(manifest.contributes.configuration, undefined);
  assert.equal(schema.properties.schemaVersion.const, 1);
  assert.equal(schema.additionalProperties, false);
});

test('extension ships complete VS Code manifest and runtime localization for English and Brazilian Portuguese', async () => {
  const extensionRoot = join(productRoot, 'apps', 'vscode-extension');
  const manifest = JSON.parse(await readFile(join(extensionRoot, 'package.json'), 'utf8'));
  const defaults = JSON.parse(await readFile(join(extensionRoot, 'package.nls.json'), 'utf8'));
  const portuguese = JSON.parse(await readFile(join(extensionRoot, 'package.nls.pt-br.json'), 'utf8'));
  const runtimePortuguese = JSON.parse(await readFile(
    join(extensionRoot, 'l10n', 'bundle.l10n.pt-br.json'), 'utf8',
  ));
  const manifestText = JSON.stringify(manifest);
  const referencedKeys = [...manifestText.matchAll(/%([^%]+)%/g)].map((match) => match[1]);

  assert.equal(manifest.l10n, './l10n');
  assert.ok(referencedKeys.length >= 15);
  assert.ok(referencedKeys.every((key) => typeof defaults[key] === 'string' && defaults[key].length > 0));
  assert.deepEqual(Object.keys(portuguese).sort(), Object.keys(defaults).sort());
  assert.equal(defaults['commands.compileWithTds'], 'PEA: Compilar arquivo com TDS');
  assert.equal(portuguese['commands.compileWithTds'], 'PEA: Compilar arquivo com TDS');
  assert.ok(Object.keys(runtimePortuguese).length >= 10);
  assert.ok(Object.values(runtimePortuguese).every((value) => typeof value === 'string' && value.length > 0));
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

test('review command refuses a dirty editor instead of reviewing stale disk content', async () => {
  const fake = fakeVscode();
  const uri = { fsPath: 'C:\\workspace\\source.prw' };
  fake.api.window.activeTextEditor = { document: { uri, isDirty: true } };
  const controller = extension.createExtension(fake.api, {
    cliPath: 'cli.mjs',
    execFile() { throw new Error('must not execute'); },
  });
  controller.activate({ subscriptions: [] });

  await fake.handlers.get('pea.reviewActiveFile')();

  assert.match(fake.warnings[0], /save.*review/i);
  assert.equal(fake.diagnostics.length, 0);
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

test('Problems findings are invalidated when the reviewed document changes or closes', async () => {
  const fake = fakeVscode();
  const uri = { fsPath: 'C:\\workspace\\source.prw' };
  const document = { uri, isDirty: false };
  fake.api.window.activeTextEditor = { document };
  extension.createExtension(fake.api, {
    cliPath: 'cli.mjs',
    execFile(_command, _args, _options, callback) {
      callback(null, JSON.stringify({ findings: [{ ruleId: 'CA4000', severity: 'INFO', title: 'Finding', line: 1 }] }), '');
    },
  }).activate({ subscriptions: [] });

  await fake.handlers.get('pea.reviewActiveFile')();
  fake.fireDidChangeTextDocument(document);
  fake.fireDidCloseTextDocument(document);

  assert.equal(fake.diagnostics.length, 1);
  assert.deepEqual(fake.diagnosticDeletes, [uri, uri]);
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
  assert.match(runner, /--with-tds/);
  assert.match(runner, /totvs\.tds-vscode-/);
  assert.match(runner, /PEA_SMOKE_RECEIPT/);
  assert.match(runner, /executedCommandIds/);
  assert.match(runner, /expectedCommandIds/);
  assert.doesNotMatch(runner, /hostReceipt\.commandIds\.length !== 21/);
  assert.match(host, /TOTVS\.tds-vscode/);
  assert.match(runner, /windows1252/i);
  assert.match(host, /vscode\.extensions\.getExtension\('danielmontagna86-source\.protheus-engineering-agent'\)/);
  assert.match(host, /execute\('pea\.doctor', workspace\.uri\)/);
  assert.match(host, /declaredCommandIds\.length, 24/);
});

test('historical VS Code smoke allows enough time to provision the requested host', async () => {
  const runner = await readFile(join(productRoot, 'scripts', 'run-vscode-smoke.mjs'), 'utf8');

  assert.match(runner, /downloadAndUnzipVSCode\(\{ version, timeout: 60_000 \}\)/);
});

test('installed VSIX accessibility smoke uses native high-contrast and keyboard surfaces', async () => {
  const runner = await readFile(join(productRoot, 'scripts', 'run-vscode-smoke.mjs'), 'utf8');
  const host = await readFile(join(productRoot, 'integration', 'vscode-host', 'index.cjs'), 'utf8');

  assert.match(runner, /--accessibility/);
  assert.match(runner, /--force-renderer-accessibility/);
  assert.match(runner, /PEA_EXPECT_ACCESSIBILITY/);
  assert.match(runner, /Default High Contrast/);
  assert.match(runner, /window\.zoomLevel/);
  assert.match(runner, /firstValueDurationMs/);
  assert.match(host, /activeColorTheme\.kind/);
  assert.match(host, /accessibilitySupport/);
  assert.match(host, /nativeViews/);
});

test('WSL smoke installs and executes the packaged extension in a remote extension host', async () => {
  const runner = await readFile(join(productRoot, 'scripts', 'run-vscode-wsl-smoke.mjs'), 'utf8');
  const probe = await readFile(join(productRoot, 'integration', 'vscode-wsl-probe', 'extension.cjs'), 'utf8');

  assert.match(runner, /--remote/);
  assert.match(runner, /wsl\+/);
  assert.match(runner, /--install-extension/);
  assert.match(runner, /PEA_WSL_ALLOW_RESTART/);
  assert.match(runner, /--terminate/);
  assert.match(runner, /packageProbe/);
  assert.match(runner, /server-main\.js/);
  assert.match(runner, /WSL_REMOTE_ACTIVATION_UNPROVEN/);
  assert.match(runner, /--uninstall-extension/);
  assert.match(probe, /vscode\.env\.remoteName/);
  assert.match(probe, /pea\.reviewActiveFile/);
});

test('WSL smoke matches the packaged extension version instead of a release literal', () => {
  assert.equal(
    installedExtensionLine('danielmontagna86-source.protheus-engineering-agent', '1.0.0'),
    'danielmontagna86-source.protheus-engineering-agent@1.0.0',
  );
});

test('package lifecycle harness proves install, upgrade, uninstall, reinstall and rollback', async () => {
  const lifecycle = await readFile(join(productRoot, 'scripts', 'run-vscode-lifecycle.mjs'), 'utf8');
  const workflow = await readFile(join(productRoot, '.github', 'workflows', 'ci.yml'), 'utf8');
  for (const operation of ['install previous', 'upgrade', 'uninstall', 'reinstall', 'rollback']) {
    assert.match(lifecycle, new RegExp(operation));
  }
  assert.match(lifecycle, /--list-extensions/);
  assert.match(lifecycle, /--show-versions/);
  assert.match(lifecycle, /previous and current VSIX versions must differ/);
  assert.match(lifecycle, /isolated: true/);
  assert.match(lifecycle, /downloadAndUnzipVSCode/);
  assert.match(workflow, /ref: 1a6836576049c213af49abfb8e7d3350890770ac/);
  assert.match(workflow, /npm ci --prefix previous-preview/);
  assert.match(workflow, /npm run --prefix previous-preview package:extension/);
  assert.match(workflow, /run-vscode-lifecycle\.mjs --previous-vsix previous-preview\/release-artifacts\/protheus-engineering-agent-v0\.2\.0-alpha\.1\.vsix --version 1\.95\.3/);
});

test('package lifecycle accepts an exact hosted VS Code version and provisions it when no local executable exists', async () => {
  assert.deepEqual(
    parseVsCodeLifecycleArgs(['node', 'lifecycle', 'previous.vsix', '1.95.3']),
    { previousVsix: 'previous.vsix', vscodeVersion: '1.95.3' },
  );
  assert.deepEqual(
    parseVsCodeLifecycleArgs(['node', 'lifecycle', '--previous-vsix', 'previous.vsix', '--vscode-version', '1.95.3']),
    { previousVsix: 'previous.vsix', vscodeVersion: '1.95.3' },
  );
  assert.deepEqual(
    parseVsCodeLifecycleArgs(['node', 'lifecycle', '--previous-vsix', 'previous.vsix', '--version', '1.95.3']),
    { previousVsix: 'previous.vsix', vscodeVersion: '1.95.3' },
  );
  assert.throws(
    () => parseVsCodeLifecycleArgs(['node', 'lifecycle', '--previous-vsix', 'previous.vsix', '--version', 'latest']),
    /--version requires an exact VS Code version/,
  );
  assert.throws(
    () => parseVsCodeLifecycleArgs(['node', 'lifecycle', '--previous-vsix', 'previous.vsix', '--version']),
    /--version requires an exact VS Code version/,
  );
  const executable = await resolveLifecycleVsCodeExecutable({
    vscodeVersion: '1.95.3',
    localExecutable: async () => null,
    downloadExecutable: async (version) => `/tmp/vscode-${version}/code`,
  });
  assert.equal(executable, '/tmp/vscode-1.95.3/code');
  assert.equal(requireExactVsCodeVersion('1.95.3', '1.95.3'), '1.95.3');
  assert.throws(() => requireExactVsCodeVersion('1.95.3', '1.96.0'), /does not match requested/);
});

test('in-process runtime runner does not depend on the VS Code Electron executable', async () => {
  const loads = [];
  const workspace = process.platform === 'win32' ? 'C:\\workspace' : '/workspace';
  const cliPath = join(workspace, 'extension', 'dist', 'runtime-cli.cjs');
  const runner = extension.createInProcessCliRunner(cliPath, {
    loadModule(modulePath) {
      loads.push(modulePath);
      return {
        async runCli(argv, io) {
          assert.deepEqual(argv, ['doctor', workspace]);
          io.stdout.write('{"ok":true}');
          return 0;
        },
      };
    },
  });

  const output = await runner(['doctor', workspace], workspace);

  assert.equal(output, '{"ok":true}');
  assert.deepEqual(loads, [cliPath]);
});

test('in-process runtime runner preserves runtime errors', async () => {
  const runner = extension.createInProcessCliRunner('C:\\extension\\dist\\runtime-cli.cjs', {
    loadModule() {
      return {
        async runCli(_argv, io) {
          io.stderr.write('policy denied');
          return 1;
        },
      };
    },
  });

  await assert.rejects(() => runner(['memory-append'], 'C:\\workspace'), /policy denied/);
});
