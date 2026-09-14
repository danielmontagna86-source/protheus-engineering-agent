const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { execFile: nodeExecFile } = require('node:child_process');
const { realpathSync } = require('node:fs');
const { appendFile, cp, mkdir, rm } = require('node:fs/promises');
const { promisify } = require('node:util');
const MAX_LANGUAGE_MODEL_OUTPUT_BYTES = 256 * 1024;
const MAX_TDS_TOOL_OUTPUT_BYTES = 64 * 1024;
const TDS_COMPILER_TOOL = 'tds-lm-tools';
const TDS_SOURCE_EXTENSIONS = new Set(['.prw', '.prg', '.prx', '.tlpp', '.ppx', '.ppp', '.apw', '.aph']);
const execFileAsync = promisify(nodeExecFile);

function redactTdsToolText(value) {
  return String(value)
    .replace(/(authorization\s*[:=]\s*(?:bearer|basic)\s+)[^\s"'\\,}]+/gi, '$1<redacted>')
    .replace(/\b(password|passwd|token|api[_-]?key)\s*[:=]\s*["']?[^\s"'\\,}]+/gi, '$1=<redacted>');
}

function localTdsSourcePath(uri) {
  const candidate = uri?.fsPath;
  if (typeof candidate !== 'string' || !path.isAbsolute(candidate)) return null;
  if (typeof uri?.scheme === 'string' && uri.scheme !== 'file') return null;
  return TDS_SOURCE_EXTENSIONS.has(path.extname(candidate).toLowerCase()) ? candidate : null;
}

function resolveTdsCompileTarget(vscode, uri) {
  const direct = localTdsSourcePath(uri);
  if (direct) return direct;
  const active = localTdsSourcePath(vscode.window?.activeTextEditor?.document?.uri);
  if (active) return active;
  const visible = (vscode.window?.visibleTextEditors ?? [])
    .map((editor) => localTdsSourcePath(editor?.document?.uri))
    .filter(Boolean);
  return [...new Set(visible)].length === 1 ? visible[0] : null;
}

function tdsToolUnavailable() {
  return {
    adapter: 'tds-language-model-tool',
    status: 'unavailable',
    error: {
      code: 'TDS_TOOL_UNAVAILABLE',
      message: 'The installed VS Code or TDS does not expose the public TDS language-model compiler tool.',
    },
  };
}

function assertTdsTarget(workspace, target, resolvePath = realpathSync.native) {
  if (typeof workspace !== 'string' || !path.isAbsolute(workspace)) {
    throw new Error('a selected absolute workspace is required');
  }
  if (typeof target !== 'string' || !path.isAbsolute(target)) {
    throw new Error('an absolute ADVPL/TLPP target is required');
  }
  const normalizedWorkspace = path.resolve(workspace);
  const normalizedTarget = path.resolve(target);
  let physicalWorkspace;
  let physicalTarget;
  try {
    physicalWorkspace = path.resolve(resolvePath(normalizedWorkspace));
    physicalTarget = path.resolve(resolvePath(normalizedTarget));
  } catch {
    throw new Error('workspace and target must resolve to regular local paths');
  }
  const relative = path.relative(physicalWorkspace, physicalTarget);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('target must stay inside the selected workspace');
  }
  if (!TDS_SOURCE_EXTENSIONS.has(path.extname(physicalTarget).toLowerCase())) {
    throw new Error('target must be an ADVPL/TLPP source supported by TDS');
  }
  return physicalTarget;
}

function tdsToolText(result) {
  if (!Array.isArray(result?.content)) return null;
  const text = result.content.map((part) => (typeof part?.value === 'string' ? part.value : '')).join('\n');
  if (Buffer.byteLength(text, 'utf8') > MAX_TDS_TOOL_OUTPUT_BYTES) return null;
  return redactTdsToolText(text);
}

async function invokeTdsCompilerTool(vscode, { workspace, target }, token, options = {}) {
  if (vscode.workspace?.isTrusted !== true) throw new Error('compile with TDS requires a trusted workspace');
  const source = assertTdsTarget(workspace, target, options.resolvePath);
  if (typeof vscode.lm?.invokeTool !== 'function') return tdsToolUnavailable();
  if (token?.isCancellationRequested) {
    return {
      adapter: 'tds-language-model-tool', status: 'unverified',
      error: { code: 'TDS_TOOL_CANCELLED', message: 'TDS compiler invocation was cancelled before it started.' },
    };
  }
  let result;
  try {
    result = await vscode.lm.invokeTool(TDS_COMPILER_TOOL, {
      input: {
        command: 'compiler',
        target: source,
        flags: { only: 'all', sort: 'file', format: 'json', syntaxOnly: false, applyOld: false, applied: [] },
      },
    }, token);
  } catch (error) {
    const cancelled = token?.isCancellationRequested || error?.name === 'CancellationError';
    return {
      adapter: 'tds-language-model-tool', status: 'unverified',
      error: {
        code: cancelled ? 'TDS_TOOL_CANCELLED' : 'TDS_TOOL_INVOCATION_FAILED',
        message: cancelled ? 'TDS compiler invocation was cancelled.' : 'TDS compiler tool invocation failed.',
      },
    };
  }
  const text = tdsToolText(result);
  if (!text) {
    return {
      adapter: 'tds-language-model-tool', status: 'unverified',
      error: { code: 'TDS_TOOL_MALFORMED_RESULT', message: 'TDS compiler tool returned no bounded structured diagnostics.' },
    };
  }
  let diagnostics;
  try {
    diagnostics = JSON.parse(text);
  } catch {
    return {
      adapter: 'tds-language-model-tool', status: 'unverified',
      error: { code: 'TDS_TOOL_MALFORMED_RESULT', message: 'TDS compiler tool returned malformed diagnostics.' },
    };
  }
  const diagnosticSummary = diagnostics?.diagnostics;
  const errors = Number.isInteger(diagnostics?.errors) ? diagnostics.errors : diagnosticSummary?.errors;
  const warnings = Number.isInteger(diagnostics?.warnings) ? diagnostics.warnings : diagnosticSummary?.warnings;
  const entries = Array.isArray(diagnosticSummary) ? diagnosticSummary : diagnosticSummary?.diagnostics;
  if (!diagnostics || typeof diagnostics !== 'object' || !Number.isInteger(errors)
    || !Number.isInteger(warnings) || typeof diagnostics.timedOut !== 'boolean'
    || typeof diagnostics.diagnosticsUpdated !== 'boolean' || !Array.isArray(entries)) {
    return {
      adapter: 'tds-language-model-tool', status: 'unverified',
      error: { code: 'TDS_TOOL_MALFORMED_RESULT', message: 'TDS compiler tool returned an unsupported diagnostics contract.' },
    };
  }
  const evidence = {
    adapter: 'tds-language-model-tool',
    target: source,
    diagnostics: {
      errors,
      warnings,
      updated: diagnostics.diagnosticsUpdated,
      timedOut: diagnostics.timedOut,
      entries,
    },
  };
  if (diagnostics.timedOut || !diagnostics.diagnosticsUpdated) {
    return {
      ...evidence,
      status: 'unverified',
      error: { code: 'TDS_DIAGNOSTICS_UNVERIFIED', message: 'TDS did not provide fresh final diagnostics for this compilation.' },
    };
  }
  return { ...evidence, status: errors > 0 ? 'failed' : 'completed' };
}

async function createSampleWorkspace(source, storageRoot, options = {}) {
  if (typeof storageRoot !== 'string' || storageRoot.length === 0) throw new Error('VS Code global storage is unavailable');
  const destination = path.resolve(storageRoot, 'sample-workspaces', `sample-${Date.now()}-${randomUUID()}`);
  const runGit = options.runGit ?? ((args, cwd) => execFileAsync('git', args, {
    cwd, windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024,
  }));
  try {
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true, force: false });
    await runGit(['init', '--initial-branch=main'], destination);
    await runGit(['add', '--all'], destination);
    await runGit([
      '-c', 'user.name=Protheus Engineering Agent',
      '-c', 'user.email=sample@localhost.invalid',
      'commit', '--no-gpg-sign', '-m', 'Create sample baseline',
    ], destination);
    await appendFile(path.join(destination, 'sample-review.prw'), '\n// Demonstration change for Git review\n', 'utf8');
    return destination;
  } catch (error) {
    await rm(destination, { recursive: true, force: true });
    throw new Error(`Could not prepare the writable Git sample: ${String(error?.message ?? error)}`);
  }
}

function createInProcessCliRunner(cliPath, options = {}) {
  const loadModule = options.loadModule ?? require;
  const timeoutMs = options.timeoutMs ?? 120_000;
  let cliModule;
  const runtimeCache = new Map();
  const approvals = new Map();

  const runInProcess = async function runInProcess(args, _cwd, cancellationToken) {
    if (cancellationToken?.isCancellationRequested) throw new Error('Operation cancelled.');
    cliModule ??= loadModule(path.resolve(cliPath));
    const cli = cliModule;
    if (typeof cli.runCli !== 'function') throw new Error('Bundled runtime CLI does not export runCli');

    let stdout = '';
    let stderr = '';
    let timeout;
    let cancellation;
    const controller = new AbortController();
    const interrupted = new Promise((_, reject) => {
      timeout = setTimeout(() => {
        reject(new Error(`Runtime operation timed out after ${timeoutMs}ms`));
        controller.abort();
      }, timeoutMs);
      cancellation = cancellationToken?.onCancellationRequested?.(() => {
        reject(new Error('Operation cancelled.'));
        controller.abort();
      });
    });
    const execution = cli.runCli(args, {
      stdout: { write(value) { stdout += String(value); } },
      stderr: { write(value) { stderr += String(value); } },
      runtimeOptions: options.runtimeOptions,
      runtimeCache,
      signal: controller.signal,
      resolveBuildApproval({ requestId, approvalToken }) {
        const evidence = approvals.get(approvalToken);
        approvals.delete(approvalToken);
        if (!evidence || evidence.requestId !== requestId) return null;
        return evidence.approval;
      },
    });
    try {
      const code = await Promise.race([execution, interrupted]);
      if (code !== 0) throw new Error(stderr.trim() || `Runtime command failed with exit code ${code}`);
      return stdout;
    } finally {
      clearTimeout(timeout);
      cancellation?.dispose?.();
    }
  };

  runInProcess.authorizeBuild = ({ requestId, approvedBy, approvedAt }) => {
    const token = randomUUID();
    approvals.set(token, { requestId, approval: { approvedBy, approvedAt } });
    return token;
  };
  return runInProcess;
}

function createCredentialStore(secretStorage) {
  if (!secretStorage || typeof secretStorage.store !== 'function'
    || typeof secretStorage.get !== 'function' || typeof secretStorage.delete !== 'function') {
    throw new TypeError('VS Code SecretStorage is required');
  }
  function keyFor(id) {
    if (typeof id !== 'string' || !/^[a-z][a-z0-9.-]{0,79}$/.test(id)) {
      throw new Error(`unsupported credential id: ${id}`);
    }
    return `pea.credential.${id}`;
  }
  return {
    get(id) { return secretStorage.get(keyFor(id)); },
    async set(id, value) {
      if (typeof value !== 'string' || value.length === 0) {
        throw new Error('credential value must be a non-empty string');
      }
      return secretStorage.store(keyFor(id), value);
    },
    delete(id) { return secretStorage.delete(keyFor(id)); },
  };
}

function createEngineeringCenterProvider(vscode, options) {
  const emitter = new vscode.EventEmitter();
  const t = options.t ?? ((message, ...args) => args.reduce(
    (value, argument, index) => value.replaceAll(`{${index}}`, String(argument)), message,
  ));
  let snapshot;
  const roots = [
    { id: 'workspace', label: t('Workspace & CodeGraph') },
    { id: 'review', label: t('Change Review') },
    { id: 'memory', label: t('Memory & Journal') },
    { id: 'integrations', label: t('Integrations') },
    { id: 'environment', label: t('Environment') },
  ];

  function treeItem(label, command) {
    const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
    if (command) item.command = { command, title: label };
    return item;
  }

  return {
    onDidChangeTreeData: emitter.event,
    getTreeItem(element) {
      if (element.id) {
        const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
        item.contextValue = `pea.section.${element.id}`;
        return item;
      }
      return element;
    },
    async getChildren(element) {
      if (!element) return snapshot ? roots : [];
      if (element.id === 'workspace') {
        const fileCount = snapshot.graph?.files?.length ?? 0;
        const symbolCount = snapshot.graph?.nodes?.length ?? 0;
        const encodingCounts = Object.values(snapshot.graph?.encodings ?? {}).reduce((counts, encoding) => {
          counts[encoding] = (counts[encoding] ?? 0) + 1;
          return counts;
        }, {});
        const unresolved = snapshot.graph?.analysis?.unresolvedTargets?.length ?? 0;
        const ambiguous = snapshot.graph?.analysis?.ambiguousTargets?.length ?? 0;
        return [
          treeItem(t(fileCount === 1 ? '{0} indexed file' : '{0} indexed files', fileCount), 'pea.indexWorkspace'),
          treeItem(t(symbolCount === 1 ? '{0} indexed symbol' : '{0} indexed symbols', symbolCount), 'pea.indexWorkspace'),
          ...Object.entries(encodingCounts).sort().map(([encoding, count]) => treeItem(`${encoding}: ${count}`)),
          treeItem(t('Unresolved calls: {0}', unresolved), 'pea.indexWorkspace'),
          treeItem(t('Ambiguous calls: {0}', ambiguous), 'pea.indexWorkspace'),
          treeItem(t('Last refresh: {0}', snapshot.refreshedAt)),
        ];
      }
      if (element.id === 'review') {
        if (snapshot.changes?.status === 'unavailable') {
          return [
            treeItem(t('Git change evidence unavailable'), 'pea.reviewChanges'),
            treeItem(t('Review the active ADVPL/TLPP source'), 'pea.reviewActiveFile'),
          ];
        }
        const changed = snapshot.changes?.summary?.filesChanged ?? 0;
        const findings = snapshot.changes?.summary?.findings ?? 0;
        return [
          treeItem(t(changed === 1 ? '{0} changed file' : '{0} changed files', changed), 'pea.reviewChanges'),
          treeItem(t(findings === 1 ? '{0} finding · {1}' : '{0} findings · {1}', findings, snapshot.changes?.summary?.assessment ?? t('NOT RUN')), 'pea.reviewChanges'),
          treeItem(t('Review the active ADVPL/TLPP source'), 'pea.reviewActiveFile'),
        ];
      }
      if (element.id === 'memory') {
        const memory = snapshot.session?.context?.memory?.trim();
        const journalCount = snapshot.session?.context?.journal?.length ?? 0;
        return [
          treeItem(memory ? t('Project Memory: available') : t('Project Memory: empty'), 'pea.openContext'),
          treeItem(t('Journal entries: {0}', journalCount), 'pea.openContext'),
          treeItem(t('Add Project Memory entry'), 'pea.addMemoryEntry'),
          treeItem(t('Add Journal entry'), 'pea.addJournalEntry'),
          treeItem(t('Promote Journal entry'), 'pea.promoteJournalEntry'),
        ];
      }
      if (element.id === 'integrations') {
        const integrations = snapshot.doctor?.integrations ?? [];
        if (integrations.length === 0) return [
          treeItem(t('No connected integrations')),
          treeItem(t('Import TDN or Dictionary snapshot'), 'pea.importSnapshot'),
        ];
        return [...integrations.map((integration) => treeItem(
          t('{0}: {1}', String(integration.name).toUpperCase(), integration.available ? t('available') : t('unavailable')),
          'pea.doctor',
        )),
        treeItem(t('Search TDN snapshot'), 'pea.searchTdn'),
        treeItem(t('Search Dictionary snapshot'), 'pea.searchDictionary'),
        treeItem(t('Import TDN or Dictionary snapshot'), 'pea.importSnapshot')];
      }
      if (element.id === 'environment') {
        const configuration = snapshot.doctor?.configuration;
        return [
          treeItem(t('Profile: {0}', configuration?.activeProfile ?? 'default'), 'pea.doctor'),
          treeItem(t('Environment: {0}', configuration?.environment ?? 'development'), 'pea.doctor'),
          treeItem(t('Approvals required: {0}', snapshot.doctor?.policy?.approvalRequired?.length ?? 0), 'pea.doctor'),
          treeItem(t('Build: {0}', snapshot.doctor?.build?.available ? t('available') : t('unavailable')), 'pea.prepareBuild'),
          treeItem(t('Docker: not required')),
        ];
      }
      return [];
    },
    async refresh(token) {
      snapshot = await options.loadSnapshot(token);
      emitter.fire(undefined);
      return snapshot;
    },
    dispose() { emitter.dispose(); },
  };
}

function createExtension(vscode, options = {}) {
  const cliPath = options.cliPath ?? path.resolve(__dirname, 'dist', 'runtime-cli.cjs');
  const mcpServerPath = options.mcpServerPath ?? path.resolve(__dirname, 'dist', 'mcp-stdio.mjs');
  const execFile = options.execFile;
  const codexCommand = options.codexCommand ?? process.env.PEA_CODEX_APP_SERVER_COMMAND ?? 'codex';
  const inProcessRunner = options.runtimeRunner ?? createInProcessCliRunner(cliPath, {
    runtimeOptions: {
      hermes: {
        nodeCommand: process.execPath,
        mcpServerPath,
        electronRunAsNode: true,
      },
    },
  });
  let channel;
  let diagnostics;
  let lastBuildRequestId;
  let codexProvider;
  let codexWorkspace;
  const t = (message, ...args) => {
    if (vscode.l10n?.t) return vscode.l10n.t(message, ...args);
    return args.reduce((value, argument, index) => value.replaceAll(`{${index}}`, String(argument)), message);
  };

  async function workspacePath(uri) {
    if (uri && typeof vscode.workspace.getWorkspaceFolder === 'function') {
      const owningFolder = vscode.workspace.getWorkspaceFolder(uri);
      if (owningFolder) return owningFolder.uri.fsPath;
    }
    const folders = vscode.workspace.workspaceFolders ?? [];
    if (folders.length === 0) return null;
    if (folders.length === 1) return folders[0].uri.fsPath;
    const selected = await vscode.window.showQuickPick(folders.map((folder) => ({
      label: folder.name ?? path.basename(folder.uri.fsPath),
      description: folder.uri.fsPath,
      folder,
    })), { placeHolder: t('Select the workspace folder to analyze') });
    return selected?.folder?.uri.fsPath ?? null;
  }

  function runCli(args, cwd, cancellationToken) {
    if (!execFile) return inProcessRunner(args, cwd, cancellationToken);
    return new Promise((resolve, reject) => {
      if (cancellationToken?.isCancellationRequested) {
        reject(new Error(t('Operation cancelled.')));
        return;
      }
      let cancellation;
      const child = execFile(process.execPath, [cliPath, ...args], {
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
        cancellation?.dispose();
        if (error) {
          reject(new Error(String(stderr || error.message).trim()));
          return;
        }
        resolve(String(stdout));
      });
      cancellation = cancellationToken?.onCancellationRequested?.(() => child?.kill());
    });
  }

  function toolWorkspacePath(explicitWorkspace, uri) {
    const folders = vscode.workspace.workspaceFolders ?? [];
    if (explicitWorkspace !== undefined) {
      if (typeof explicitWorkspace !== 'string' || !path.isAbsolute(explicitWorkspace)) {
        throw new Error('workspace must be an absolute path');
      }
      const selected = folders.find((folder) => path.resolve(folder.uri.fsPath) === path.resolve(explicitWorkspace));
      if (!selected) throw new Error(t('workspace must identify an open VS Code workspace folder'));
      return selected.uri.fsPath;
    }
    if (uri && typeof vscode.workspace.getWorkspaceFolder === 'function') {
      const owningFolder = vscode.workspace.getWorkspaceFolder(uri);
      if (owningFolder) return owningFolder.uri.fsPath;
    }
    if (folders.length === 1) return folders[0].uri.fsPath;
    if (folders.length === 0) throw new Error(t('Open a workspace first.'));
    throw new Error(t('workspace is required when multiple workspace folders are open'));
  }

  function repositoryPath(workspace, value) {
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !path.isAbsolute(value)) throw new Error('repository must be an absolute path');
    const normalizedWorkspace = path.resolve(workspace);
    const normalizedRepository = path.resolve(value);
    const relative = path.relative(normalizedWorkspace, normalizedRepository);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error('repository must stay inside the selected workspace');
    }
    return normalizedRepository;
  }

  function languageModelResult(output) {
    const text = output.trim();
    if (Buffer.byteLength(text, 'utf8') > MAX_LANGUAGE_MODEL_OUTPUT_BYTES) {
      return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(JSON.stringify({
        ok: false,
        error: {
          code: 'LM_TOOL_OUTPUT_TOO_LARGE',
          message: `Output exceeds the ${MAX_LANGUAGE_MODEL_OUTPUT_BYTES} byte language-model tool budget. Narrow the requested scope.`,
        },
      }))]);
    }
    return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(text)]);
  }

  function registerLanguageModelTools() {
    if (!vscode.lm?.registerTool || !vscode.LanguageModelToolResult || !vscode.LanguageModelTextPart) return [];
    return [
      vscode.lm.registerTool('pea_reviewFile', {
        prepareInvocation(options) {
          return { invocationMessage: `Reviewing ${options.input.path} with deterministic Protheus rules` };
        },
        async invoke(options, token) {
          const file = options.input.path;
          if (typeof file !== 'string' || !path.isAbsolute(file)) throw new Error('path must be an absolute source path');
          const workspace = toolWorkspacePath(options.input.workspace, vscode.Uri.file(file));
          return languageModelResult(await runCli(['review', file, workspace], workspace, token));
        },
      }),
      vscode.lm.registerTool('pea_reviewChanges', {
        prepareInvocation() { return { invocationMessage: 'Reviewing the selected Git change scope' }; },
        async invoke(options, token) {
          const input = options.input ?? {};
          const workspace = toolWorkspacePath(input.workspace);
          const scope = input.scope ?? 'working-tree';
          if (!['staged', 'unstaged', 'working-tree', 'branch'].includes(scope)) throw new Error('unsupported Git review scope');
          if (scope === 'branch' && (typeof input.baseRef !== 'string' || !input.baseRef.trim())) {
            throw new Error('baseRef is required for branch review');
          }
          const repository = repositoryPath(workspace, input.repository);
          return languageModelResult(await runCli([
            'review-changes', workspace, scope,
            ...(input.baseRef ? [input.baseRef] : []),
            ...(repository ? [`--repository=${repository}`] : []),
          ], workspace, token));
        },
      }),
      vscode.lm.registerTool('pea_readProjectContext', {
        prepareInvocation() { return { invocationMessage: 'Reading bounded Protheus project context' }; },
        async invoke(options, token) {
          const workspace = toolWorkspacePath(options.input?.workspace);
          return languageModelResult(await runCli(['session', workspace], workspace, token));
        },
      }),
    ];
  }

  async function present(args, cwd, options = {}) {
    try {
      const output = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: options.title ?? t('Running Protheus Engineering Agent'),
        cancellable: true,
      }, (_progress, token) => runCli(args, cwd, token));
      channel.clear();
      channel.appendLine(output.trim());
      channel.show(true);
      return output;
    } catch (error) {
      if (!options.suppressError) await vscode.window.showErrorMessage(t('Protheus Engineering Agent: {0}', error.message));
      throw error;
    }
  }

  function parseRuntimeJson(output, label) {
    try {
      return JSON.parse(output);
    } catch {
      throw new Error(t('Invalid {0} output from the bundled runtime.', label));
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
        title: t('Reviewing ADVPL/TLPP source'),
        cancellable: true,
      }, (_progress, token) => runCli(['review', file, workspace], workspace, token));
      let report;
      try {
        report = JSON.parse(output);
      } catch {
        throw new Error(t('Invalid review output from the bundled runtime.'));
      }
      if (!Array.isArray(report.findings)) {
        throw new Error(t('Invalid review output from the bundled runtime.'));
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
      vscode.window.showErrorMessage(t('Protheus Engineering Agent: {0}', error.message));
    }
  }

  async function searchSnapshot(command, label, request = {}) {
    const workspace = await workspacePath(request.uri);
    if (!workspace) return vscode.window.showWarningMessage(t('Open a workspace first.'));
    const query = request.query ?? await vscode.window.showInputBox({
      prompt: t('Search the local {0} snapshot', label),
      validateInput: (value) => value?.trim() ? null : t('A search query is required.'),
    });
    if (!query) return undefined;
    return present([command, workspace, query.trim(), '10'], workspace);
  }

  function providerForCodex(workspace, context) {
    if (codexProvider && codexWorkspace === workspace) return codexProvider;
    void codexProvider?.dispose?.();
    const factory = options.codexProviderFactory ?? ((providerOptions) => {
      const { createCodexAppServerProvider } = require('./dist/codex-app-server.cjs');
      return createCodexAppServerProvider({ ...providerOptions, command: codexCommand });
    });
    codexProvider = factory({
      workspace,
      threadId: context.globalState?.get('pea.codexAppServer.threadId'),
    });
    codexWorkspace = workspace;
    return codexProvider;
  }

  async function approveAiContext(providerLabel = 'ChatGPT') {
    const action = t('Send context');
    const choice = await vscode.window.showInformationMessage(
      t('Send bounded, redacted engineering context to {0}? This is read-only and advisory.', providerLabel),
      { modal: true },
      action,
    );
    return choice === action;
  }

  function codexGateway(workspace, provider, approve) {
    if (typeof options.aiGatewayFactory === 'function') {
      return options.aiGatewayFactory({ workspace, provider, approve });
    }
    if (typeof options.codexGatewayFactory === 'function') {
      return options.codexGatewayFactory({ workspace, provider, approve });
    }
    const { createAiGateway } = require('./dist/ai-gateway.cjs');
    const { createPermissionBroker } = require('./dist/policy.cjs');
    const broker = createPermissionBroker({
      async requestApproval(request) {
        const approved = await approve();
        return {
          id: request.id,
          environment: request.environment,
          capability: request.capability,
          approved,
          approvedBy: approved ? 'VS Code user' : '',
          approvedAt: new Date().toISOString(),
        };
      },
    });
    return createAiGateway({ provider, authorize: broker });
  }

  function providerForAi(connection, workspace, context) {
    const providerId = connection.provider ?? connection.id;
    if (providerId === 'openai-codex-app-server') return providerForCodex(workspace, context);
    if (typeof options.aiProviderFactory === 'function') return options.aiProviderFactory({ ...connection, id: providerId, connectionId: connection.id, workspace, context });
    const { createAnthropicProvider, createGeminiProvider, createOpenRouterProvider } = require('./dist/ai-providers.cjs');
    const credentials = createCredentialStore(context.secrets);
    const providerOptions = { getApiKey: () => credentials.get(connection.secretRef) };
    const configuration = { model: connection.model };
    if (providerId === 'openrouter') return createOpenRouterProvider(providerOptions, configuration);
    if (providerId === 'anthropic-api') return createAnthropicProvider(providerOptions, configuration);
    if (providerId === 'gemini-api') return createGeminiProvider(providerOptions, configuration);
    throw new Error(t('{0} must be used through its own official client or MCP host.', connection.label ?? providerId));
  }

  function providerRegistry() {
    if (typeof options.providerRegistryFactory === 'function') return options.providerRegistryFactory();
    const { createProviderRegistry } = require('./dist/ai-providers.cjs');
    return createProviderRegistry();
  }

  function mcpConnectionPreview() {
    if (typeof options.mcpPreviewFactory === 'function') return options.mcpPreviewFactory();
    const { createMcpConnectionPreview } = require('./dist/ai-providers.cjs');
    return createMcpConnectionPreview({ command: process.execPath, serverPath: mcpServerPath });
  }

  function validateAiManifest(manifest, registry) {
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)
      || manifest.schemaVersion !== 1 || !Array.isArray(manifest.connections) || !Array.isArray(manifest.routes)
      || Object.keys(manifest).some((key) => !['schemaVersion', 'connections', 'routes'].includes(key))) {
      throw new TypeError('AI connection manifest is invalid');
    }
    const { validateConnection, validateRoute } = require('./dist/ai-connections.cjs');
    const descriptors = new Map(registry.list().map((provider) => [provider.id, provider]));
    const providers = [...descriptors.keys()];
    const connections = manifest.connections.map((connection) => validateConnection(connection, { providers }));
    if (new Set(connections.map((connection) => connection.id)).size !== connections.length) throw new TypeError('AI connection identifiers must be unique');
    for (const connection of connections) {
      if (descriptors.get(connection.provider).connection !== connection.mode) {
        throw new TypeError(`AI connection mode does not match ${connection.provider}`);
      }
    }
    const ids = connections.map((connection) => connection.id);
    const routes = manifest.routes.map((route) => validateRoute(route, { connections: ids }));
    if (new Set(routes.map((route) => route.id)).size !== routes.length) throw new TypeError('AI route identifiers must be unique');
    for (const route of routes) {
      for (const connectionId of [route.primary, ...route.fallbacks]) {
        const connection = connections.find((candidate) => candidate.id === connectionId);
        if (connection.mode !== 'api-key') throw new TypeError('AI routes cannot invoke an external host or managed login');
        if (!route.allowedProviders.includes(connection.provider)) throw new TypeError(`AI route does not allow ${connection.provider}`);
      }
    }
    return { schemaVersion: 1, connections, routes };
  }

  function aiManifestStore(workspace, registry) {
    const validate = (manifest) => validateAiManifest(manifest, registry);
    if (typeof options.aiManifestStoreFactory === 'function') return options.aiManifestStoreFactory({ workspace, validate });
    const { createConnectionManifestStore } = require('./dist/ai-connection-store.cjs');
    return createConnectionManifestStore({ workspace, validate });
  }

  function defaultRoute(connection) {
    return {
      schemaVersion: 1,
      id: `${connection.id}-analysis`,
      profile: 'analysis',
      primary: connection.id,
      fallbacks: [],
      allowedProviders: [connection.provider],
      maxInputBytes: 65_536,
      maxOutputBytes: 131_072,
      maxCostUsd: null,
    };
  }

  function routeProviderForAi(route, manifest, workspace, context) {
    const { createRouteProvider } = require('./dist/ai-connections.cjs');
    const connections = new Map(manifest.connections.map((connection) => [connection.id, connection]));
    return createRouteProvider({
      route,
      connections,
      resolveProvider: (connection) => providerForAi(connection, workspace, context),
    });
  }

  async function manageAiConnection(context) {
    const registry = providerRegistry();
    const candidates = registry.list().map((provider) => ({
      label: provider.label,
      description: provider.connection === 'managed-login'
        ? t('Official login')
        : provider.connection === 'api-key' ? t('API key in VS Code') : t('External host / MCP'),
      detail: provider.limitations,
      provider,
    }));
    const selected = await vscode.window.showQuickPick(candidates, { placeHolder: t('Select an AI connection') });
    if (!selected?.provider) return undefined;
    const provider = selected.provider;
    if (provider.connection === 'api-key') {
      const workspace = await workspacePath();
      if (!workspace) return vscode.window.showWarningMessage(t('Open a workspace first.'));
      const apiKey = await vscode.window.showInputBox({
        prompt: t('{0} API key (stored only in VS Code SecretStorage)', provider.label), password: true,
        ignoreFocusOut: true,
        validateInput: (value) => value?.trim() ? null : t('An API key is required.'),
      });
      if (!apiKey) return undefined;
      const model = await vscode.window.showInputBox({
        prompt: t('Model identifier for {0}', provider.label),
        ignoreFocusOut: true,
        validateInput: (value) => /^[A-Za-z0-9._/-]{1,160}$/.test(value?.trim() ?? '') ? null : t('A model identifier is required.'),
      });
      if (!model) return undefined;
      const connection = {
        schemaVersion: 1, id: `${provider.id}-default`, provider: provider.id, mode: 'api-key',
        secretRef: `${provider.id}-default.api-key`, model: model.trim(),
      };
      const store = aiManifestStore(workspace, registry);
      const manifest = await store.read();
      const connections = [...manifest.connections.filter((candidate) => candidate.id !== connection.id), connection];
      const route = defaultRoute(connection);
      const routes = [...manifest.routes.filter((candidate) => candidate.id !== route.id), route];
      await createCredentialStore(context.secrets).set(connection.secretRef, apiKey.trim());
      await store.write({ schemaVersion: 1, connections, routes });
      return vscode.window.showInformationMessage(t('{0} was configured with a bounded analysis route. The key is not saved in workspace settings or logs.', provider.label));
    }
    if (provider.connection === 'external-host') {
      const preview = mcpConnectionPreview();
      channel.clear();
      channel.appendLine(JSON.stringify(preview[provider.id], null, 2));
      channel.show(true);
      return vscode.window.showInformationMessage(t('Copy the displayed MCP configuration into {0}; authenticate in that host itself.', provider.label));
    }
    return vscode.window.showInformationMessage(t('{0} uses its official login. Complete authentication in its client; PEA never reads account credentials.', provider.label));
  }

  function activate(context) {
    channel = vscode.window.createOutputChannel('Protheus Engineering Agent');
    diagnostics = vscode.languages.createDiagnosticCollection('protheus-engineering-agent');
    const engineeringCenter = createEngineeringCenterProvider(vscode, {
      async loadSnapshot(token) {
        const workspace = await workspacePath();
        if (!workspace) throw new Error(t('Open a workspace first.'));
        const [doctor, graph, session, changes] = await Promise.all([
          runCli(['doctor', workspace], workspace, token),
          runCli(['index', workspace], workspace, token),
          runCli(['session', workspace], workspace, token),
          runCli(['review-changes', workspace, 'working-tree'], workspace, token)
            .catch((error) => JSON.stringify({ status: 'unavailable', error: error.message })),
        ]);
        try {
          return {
            doctor: JSON.parse(doctor),
            graph: JSON.parse(graph),
            session: JSON.parse(session),
            changes: JSON.parse(changes),
            refreshedAt: new Date().toISOString(),
          };
        } catch {
          throw new Error(t('Invalid Engineering Center output from the bundled runtime.'));
        }
      },
      t,
    });
    const commands = [
      vscode.commands.registerCommand('pea.doctor', async (uri) => {
        const workspace = await workspacePath(uri);
        if (!workspace) return vscode.window.showWarningMessage(t('Open a workspace first.'));
        return present(['doctor', workspace], workspace);
      }),
      vscode.commands.registerCommand('pea.indexWorkspace', async (uri) => {
        const workspace = await workspacePath(uri);
        if (!workspace) return vscode.window.showWarningMessage(t('Open a workspace first.'));
        return present(['index', workspace], workspace);
      }),
      vscode.commands.registerCommand('pea.openContext', async (uri) => {
        const workspace = await workspacePath(uri);
        if (!workspace) return vscode.window.showWarningMessage(t('Open a workspace first.'));
        return present(['session', workspace], workspace);
      }),
      vscode.commands.registerCommand('pea.manageAiConnections', async () => manageAiConnection(context)),
      vscode.commands.registerCommand('pea.askAi', async () => {
        const workspace = await workspacePath();
        if (!workspace) return vscode.window.showWarningMessage(t('Open a workspace first.'));
        const registry = providerRegistry();
        const manifest = await aiManifestStore(workspace, registry).read();
        if (manifest.routes.length === 0) return vscode.window.showWarningMessage(t('Configure an API connection before asking an AI route.'));
        const selected = await vscode.window.showQuickPick(manifest.routes.map((route) => ({
          label: route.id, description: route.profile, route,
        })), { placeHolder: t('Select a configured AI route for bounded engineering context') });
        if (!selected?.route) return undefined;
        const instruction = await vscode.window.showInputBox({
          prompt: t('Question for route {0} using bounded Protheus engineering context', selected.route.id),
          validateInput: (value) => value?.trim() ? null : t('A question is required.'),
        });
        if (!instruction) return undefined;
        try {
          const [sessionOutput, doctorOutput] = await Promise.all([
            runCli(['session', workspace], workspace), runCli(['doctor', workspace], workspace),
          ]);
          const provider = routeProviderForAi(selected.route, manifest, workspace, context);
          const result = await codexGateway(workspace, provider, () => approveAiContext(selected.route.id)).run({
            instruction: instruction.trim(), context: parseRuntimeJson(sessionOutput, t('session')),
            outputSchema: { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'], additionalProperties: false },
          }, { environment: parseRuntimeJson(doctorOutput, t('doctor')).configuration?.environment ?? 'development' });
          if (result.status !== 'completed') throw new Error(result.error?.message ?? t('The AI provider did not complete the request.'));
          channel.clear(); channel.appendLine(JSON.stringify(result.output, null, 2)); channel.show(true);
          return result;
        } catch (error) {
          return vscode.window.showWarningMessage(t('AI context request is unavailable: {0}', error.message));
        }
      }),
      vscode.commands.registerCommand('pea.connectChatGpt', async () => {
        const workspace = await workspacePath();
        if (!workspace) return vscode.window.showWarningMessage(t('Open a workspace first.'));
        try {
          const provider = providerForCodex(workspace, context);
          await provider.connect?.();
          const status = provider.status?.();
          if (status?.authentication?.authenticated && status.authentication.mode === 'chatgpt') {
            return vscode.window.showInformationMessage(t('ChatGPT is already connected through the local Codex App Server.'));
          }
          const login = await provider.startChatGptLogin();
          if (login?.type === 'browser' && typeof login.url === 'string') {
            await vscode.env.openExternal(vscode.Uri.parse(login.url));
            return vscode.window.showInformationMessage(t('Finish ChatGPT login in the browser, then run this command again to confirm status.'));
          }
          if (login?.type === 'device-code' && typeof login.url === 'string' && typeof login.code === 'string') {
            await vscode.env.openExternal(vscode.Uri.parse(login.url));
            return vscode.window.showInformationMessage(t('Finish ChatGPT device-code login in the browser with code {0}.', login.code));
          }
          throw new Error(t('The local Codex App Server did not provide a supported login flow.'));
        } catch (error) {
          return vscode.window.showWarningMessage(t('ChatGPT connection is unavailable: {0}', error.message));
        }
      }),
      vscode.commands.registerCommand('pea.askCodex', async () => {
        const workspace = await workspacePath();
        if (!workspace) return vscode.window.showWarningMessage(t('Open a workspace first.'));
        const instruction = await vscode.window.showInputBox({
          prompt: t('Question for Codex using bounded Protheus engineering context'),
          validateInput: (value) => value?.trim() ? null : t('A question is required.'),
        });
        if (!instruction) return undefined;
        try {
          const [sessionOutput, doctorOutput] = await Promise.all([
            runCli(['session', workspace], workspace),
            runCli(['doctor', workspace], workspace),
          ]);
          const session = parseRuntimeJson(sessionOutput, t('session'));
          const doctor = parseRuntimeJson(doctorOutput, t('doctor'));
          const provider = providerForCodex(workspace, context);
          const gateway = codexGateway(workspace, provider, approveAiContext);
          const result = await gateway.run({
            instruction: instruction.trim(),
            context: session,
            outputSchema: {
              type: 'object',
              properties: { summary: { type: 'string' } },
              required: ['summary'],
              additionalProperties: false,
            },
          }, { environment: doctor.configuration?.environment ?? 'development' });
          if (result.status !== 'completed') throw new Error(result.error?.message ?? t('Codex did not complete the request.'));
          const threadId = provider.getThreadId?.();
          if (typeof threadId === 'string') await context.globalState?.update('pea.codexAppServer.threadId', threadId);
          channel.clear();
          channel.appendLine(JSON.stringify(result.output, null, 2));
          channel.show(true);
          return result;
        } catch (error) {
          return vscode.window.showWarningMessage(t('Codex context request is unavailable: {0}', error.message));
        }
      }),
      vscode.commands.registerCommand('pea.reviewActiveFile', async () => {
        const document = vscode.window.activeTextEditor?.document;
        const uri = document?.uri;
        const file = uri?.fsPath;
        if (!file) {
          return vscode.window.showWarningMessage(t('Open an ADVPL/TLPP source file first.'));
        }
        if (document.isDirty) {
          return vscode.window.showWarningMessage(t('Save the source file before reviewing it.'));
        }
        const workspace = await workspacePath(uri) ?? path.dirname(file);
        return presentReview(uri, file, workspace);
      }),
      vscode.commands.registerCommand('pea.reviewChanges', async (request = {}) => {
        const workspace = await workspacePath(request.uri);
        if (!workspace) return vscode.window.showWarningMessage(t('Select a workspace folder first.'));
        const selectedScope = await vscode.window.showQuickPick([
          { label: t('Working tree'), description: t('Staged, unstaged and untracked files'), kind: 'working-tree' },
          { label: t('Staged'), description: t('Only changes in the Git index'), kind: 'staged' },
          { label: t('Unstaged'), description: t('Unstaged and untracked files'), kind: 'unstaged' },
          { label: t('Branch'), description: t('Changes since a merge base'), kind: 'branch' },
        ], { placeHolder: t('Select the Git change scope to review') });
        if (!selectedScope) return undefined;
        let baseRef;
        if (selectedScope.kind === 'branch') {
          baseRef = await vscode.window.showInputBox({
            prompt: t('Base branch or ref'),
            placeHolder: 'origin/main',
            validateInput(value) { return value?.trim() ? null : t('A base ref is required.'); },
          });
          if (!baseRef) return undefined;
        }
        const explicitRepository = repositoryPath(workspace, request.repository);
        const reviewArguments = [
          'review-changes', workspace, selectedScope.kind,
          ...(baseRef ? [baseRef] : []),
          ...(explicitRepository ? [`--repository=${explicitRepository}`] : []),
        ];
        try {
          return await present(reviewArguments, workspace, { suppressError: true });
        } catch (error) {
          if (explicitRepository || !/ambiguous Git repository selection/i.test(error.message)) {
            await vscode.window.showErrorMessage(t('Protheus Engineering Agent: {0}', error.message));
            throw error;
          }
          const repositoryOutput = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: t('Finding Git repositories'),
            cancellable: true,
          }, (_progress, token) => runCli(['repositories', workspace], workspace, token));
          const repositories = parseRuntimeJson(repositoryOutput, t('repository discovery')).repositories;
          if (!Array.isArray(repositories) || repositories.length < 2) throw error;
          const selected = await vscode.window.showQuickPick(repositories.map((repository) => ({
            label: repository,
            repository: path.resolve(workspace, repository),
          })), { placeHolder: t('Select the Git repository to review') });
          if (!selected) return undefined;
          return present([...reviewArguments, `--repository=${selected.repository}`], workspace);
        }
      }),
      vscode.commands.registerCommand('pea.refreshEngineeringCenter', async () => {
        try {
          return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: t('Refreshing Protheus Engineering Center'),
            cancellable: true,
          }, (_progress, token) => engineeringCenter.refresh(token));
        } catch (error) {
          vscode.window.showErrorMessage(t('Protheus Engineering Agent: {0}', error.message));
        }
      }),
      vscode.commands.registerCommand('pea.openSampleWorkspace', async () => {
        const samplePath = await (options.sampleWorkspaceFactory ?? createSampleWorkspace)(
          path.resolve(__dirname, 'sample-workspace'),
          context.globalStorageUri?.fsPath,
        );
        return vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(samplePath), true);
      }),
      vscode.commands.registerCommand('pea.addMemoryEntry', async (request = {}) => {
        const workspace = await workspacePath(request.uri);
        if (!workspace) return vscode.window.showWarningMessage(t('Open a workspace first.'));
        const summary = request.summary ?? await vscode.window.showInputBox({ prompt: t('Project Memory entry'), validateInput: (value) => value?.trim() ? null : t('A summary is required.') });
        if (!summary) return undefined;
        const actor = request.actor ?? await vscode.window.showInputBox({ prompt: t('Attribution actor'), placeHolder: t('Your name or team role'), validateInput: (value) => value?.trim() ? null : t('An actor is required.') });
        if (!actor) return undefined;
        return present(['memory-append', workspace, actor.trim(), summary.trim()], workspace);
      }),
      vscode.commands.registerCommand('pea.addJournalEntry', async (request = {}) => {
        const workspace = await workspacePath(request.uri);
        if (!workspace) return vscode.window.showWarningMessage(t('Open a workspace first.'));
        const summary = request.summary ?? await vscode.window.showInputBox({ prompt: t('Journal event summary'), validateInput: (value) => value?.trim() ? null : t('A summary is required.') });
        if (!summary) return undefined;
        const actor = request.actor ?? await vscode.window.showInputBox({ prompt: t('Attribution actor'), placeHolder: t('Your name or team role'), validateInput: (value) => value?.trim() ? null : t('An actor is required.') });
        if (!actor) return undefined;
        return present(['journal-add', workspace, 'decision', actor.trim(), summary.trim()], workspace);
      }),
      vscode.commands.registerCommand('pea.promoteJournalEntry', async () => {
        const workspace = await workspacePath();
        if (!workspace) return vscode.window.showWarningMessage(t('Open a workspace first.'));
        let session;
        try {
          session = parseRuntimeJson(await runCli(['session', workspace], workspace), t('session'));
        } catch (error) {
          return vscode.window.showErrorMessage(t('Protheus Engineering Agent: {0}', error.message));
        }
        const entries = (session.context?.journal ?? []).filter((entry) => entry.id);
        if (entries.length === 0) return vscode.window.showWarningMessage(t('No promotable Journal entries were found.'));
        const selected = await vscode.window.showQuickPick(entries.map((entry) => ({
          label: entry.summary,
          description: `${entry.kind ?? 'event'} · ${entry.id}`,
          entry,
        })), { placeHolder: t('Select the Journal entry to promote') });
        if (!selected) return undefined;
        const actor = await vscode.window.showInputBox({ prompt: t('Promotion attribution actor'), validateInput: (value) => value?.trim() ? null : t('An actor is required.') });
        if (!actor) return undefined;
        let preview;
        try {
          preview = parseRuntimeJson(await runCli(['journal-preview', workspace, selected.entry.id, actor.trim()], workspace), t('promotion preview'));
        } catch (error) {
          return vscode.window.showErrorMessage(t('Protheus Engineering Agent: {0}', error.message));
        }
        const promote = t('Promote');
        const choice = await vscode.window.showInformationMessage(
          t('Promote this reviewed change to Project Memory?\n{0}\nBefore: {1}\nAfter: {2}', preview.patch, preview.beforeSha256, preview.afterSha256),
          { modal: true },
          promote,
        );
        if (choice !== promote) return undefined;
        return present(['journal-promote', workspace, selected.entry.id, actor.trim()], workspace);
      }),
      vscode.commands.registerCommand('pea.expireMemory', async () => {
        const workspace = await workspacePath();
        if (!workspace) return vscode.window.showWarningMessage(t('Open a workspace first.'));
        const cutoff = await vscode.window.showInputBox({
          prompt: t('Expire structured Memory entries at or before this ISO date'),
          value: new Date().toISOString(),
          validateInput(value) { return Number.isNaN(Date.parse(value)) ? t('Enter a valid ISO date.') : null; },
        });
        if (!cutoff) return undefined;
        const expire = t('Expire');
        if (await vscode.window.showInformationMessage(t('Remove only entries with elapsed explicit expiry?'), { modal: true }, expire) !== expire) return undefined;
        return present(['memory-expire', workspace, cutoff], workspace);
      }),
      vscode.commands.registerCommand('pea.importSnapshot', async () => {
        const workspace = await workspacePath();
        if (!workspace) return vscode.window.showWarningMessage(t('Open a workspace first.'));
        const selectedFiles = await vscode.window.showOpenDialog({ canSelectFiles: true, canSelectFolders: false, canSelectMany: false, filters: { JSON: ['json'] }, title: t('Select an authorized local snapshot') });
        const selectedFile = selectedFiles?.[0];
        if (!selectedFile) return undefined;
        const selectedIntegration = await vscode.window.showQuickPick([
          { label: 'TDN', integration: 'tdn' },
          { label: t('Dictionary'), integration: 'dictionary' },
        ], { placeHolder: t('Select the snapshot type') });
        if (!selectedIntegration) return undefined;
        let inspection;
        try {
          inspection = parseRuntimeJson(await runCli([
            'snapshot-inspect', workspace, selectedIntegration.integration, selectedFile.fsPath,
          ], workspace), t('snapshot inspection'));
        } catch (error) {
          return vscode.window.showErrorMessage(t('Protheus Engineering Agent: {0}', error.message));
        }
        if (inspection.license?.status !== 'declared') return vscode.window.showErrorMessage(t('Snapshot import requires explicit license or owner authorization metadata.'));
        const importAction = t('Import');
        const choice = await vscode.window.showInformationMessage(
          t('Import {0} records ({1}) with SHA-256 {2}?', inspection.records, inspection.freshness, inspection.sha256),
          { modal: true },
          importAction,
        );
        if (choice !== importAction) return undefined;
        return present([
          'snapshot-import', workspace, selectedIntegration.integration, selectedFile.fsPath, inspection.sha256,
        ], workspace);
      }),
      vscode.commands.registerCommand('pea.searchTdn', (request) => searchSnapshot('tdn-search', 'TDN', request)),
      vscode.commands.registerCommand('pea.searchDictionary', (request) => searchSnapshot('dictionary-search', t('Dictionary'), request)),
      vscode.commands.registerCommand('pea.prepareBuild', async () => {
        const workspace = await workspacePath();
        if (!workspace) return vscode.window.showWarningMessage(t('Open a workspace first.'));
        const planId = await vscode.window.showInputBox({ prompt: t('Trusted build plan identifier'), placeHolder: 'verify' });
        if (!planId) return undefined;
        const output = await present(['build-prepare', workspace, planId.trim()], workspace);
        if (output) lastBuildRequestId = parseRuntimeJson(output, t('build preparation')).requestId;
        return output;
      }),
      vscode.commands.registerCommand('pea.compileWithTds', async (uri) => {
        const target = resolveTdsCompileTarget(vscode, uri);
        if (!target) return vscode.window.showWarningMessage(t('Open one local ADVPL/TLPP source file first.'));
        const workspace = await workspacePath({ scheme: 'file', fsPath: target });
        if (!workspace) return vscode.window.showWarningMessage(t('Open a workspace first.'));
        const compile = t('Compile with TDS');
        const choice = await vscode.window.showInformationMessage(
          t('Compile {0} with TDS? This changes the selected AppServer RPO.', path.basename(target)),
          { modal: true }, compile,
        );
        if (choice !== compile) return undefined;
        return vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: t('Compiling with TDS'),
          cancellable: true,
        }, async (_progress, token) => {
          const result = await invokeTdsCompilerTool(vscode, { workspace, target }, token, {
            resolvePath: options.resolveTdsPath,
          });
          channel.clear();
          channel.appendLine(JSON.stringify(result, null, 2));
          channel.show(true);
          return result;
        });
      }),
      vscode.commands.registerCommand('pea.runBuild', async () => {
        const workspace = await workspacePath();
        if (!workspace) return vscode.window.showWarningMessage(t('Open a workspace first.'));
        if (!lastBuildRequestId) return vscode.window.showWarningMessage(t('Prepare a build request first.'));
        const actor = await vscode.window.showInputBox({ prompt: t('Named build approver'), validateInput: (value) => value?.trim() ? null : t('An actor is required.') });
        if (!actor) return undefined;
        const run = t('Run');
        if (await vscode.window.showInformationMessage(t('Run approved build request {0}?', lastBuildRequestId), { modal: true }, run) !== run) return undefined;
        const approvalToken = typeof inProcessRunner.authorizeBuild === 'function'
          ? inProcessRunner.authorizeBuild({
            requestId: lastBuildRequestId,
            approvedBy: actor.trim(),
            approvedAt: new Date().toISOString(),
          })
          : randomUUID();
        return present(['build-run', workspace, lastBuildRequestId, approvalToken], workspace);
      }),
      ...[
        ['pea.buildStatus', 'build-status'],
        ['pea.cancelBuild', 'build-cancel'],
        ['pea.buildEvidence', 'build-evidence'],
      ].map(([command, operation]) => vscode.commands.registerCommand(command, async () => {
        const workspace = await workspacePath();
        if (!workspace) return vscode.window.showWarningMessage(t('Open a workspace first.'));
        if (!lastBuildRequestId) return vscode.window.showWarningMessage(t('Prepare a build request first.'));
        if (operation === 'build-cancel') {
          const cancel = t('Cancel build');
          if (await vscode.window.showInformationMessage(t('Cancel build request {0}?', lastBuildRequestId), { modal: true }, cancel) !== cancel) return undefined;
        }
        return present([operation, workspace, lastBuildRequestId], workspace);
      })),
    ];
    const treeRegistration = vscode.window.registerTreeDataProvider('pea.engineeringCenter', engineeringCenter);
    const languageModelTools = registerLanguageModelTools();
    const diagnosticInvalidators = [];
    if (typeof vscode.workspace.onDidChangeTextDocument === 'function') {
      diagnosticInvalidators.push(vscode.workspace.onDidChangeTextDocument(({ document }) => {
        if (document?.uri) diagnostics.delete(document.uri);
      }));
    }
    if (typeof vscode.workspace.onDidCloseTextDocument === 'function') {
      diagnosticInvalidators.push(vscode.workspace.onDidCloseTextDocument((document) => {
        if (document?.uri) diagnostics.delete(document.uri);
      }));
    }
    context.subscriptions.push(
      channel, diagnostics, engineeringCenter, treeRegistration,
      { dispose() { return codexProvider?.dispose?.(); } },
      ...commands, ...languageModelTools, ...diagnosticInvalidators,
    );
  }

  return { activate };
}

function activate(context) {
  const vscode = require('vscode');
  return createExtension(vscode).activate(context);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
  createCredentialStore,
  createEngineeringCenterProvider,
  createInProcessCliRunner,
  createSampleWorkspace,
  createExtension,
  invokeTdsCompilerTool,
};
