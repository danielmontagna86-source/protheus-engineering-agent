import { lstat, open, readFile, realpath } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { snapshotAgentResources } from '../../agent-resources/src/index.mjs';
import {
  ADVPL_EXTENSIONS,
  createIncrementalParser,
  decodeSource,
  indexWorkspace,
  parseAdvplSource,
} from '../../codegraph-advpl/src/index.mjs';
import { createProjectContext, loadProjectConfiguration } from '../../project-context/src/index.mjs';
import { decideCapability, getEnvironmentPolicy } from '../../policy/src/index.mjs';
import { createGitScm } from '../../scm/src/index.mjs';
import { createHermesAdapter } from '../../hermes-adapter/src/index.mjs';
import {
  createDictionarySnapshotAdapter,
  createIntegrationRegistry,
  createTdnSnapshotAdapter,
  inspectSnapshotFile,
  installSnapshotFile,
} from '../../integrations/src/index.mjs';
import { exportChangeReview } from '../../evidence/src/index.mjs';
import { assessmentFor, createBugReview as createBugReviewReport, reviewSource } from '../../review/src/index.mjs';

function assertInside(workspace, candidate) {
  const rel = relative(workspace, candidate);
  if (rel === '..' || rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(rel)) {
    throw new Error(`path is outside workspace: ${candidate}`);
  }
}

export function createRuntime(options) {
  const workspace = resolve(options.workspace);
  const environment = options.environment ?? 'development';
  const grants = options.grants ?? [];
  const realpathImpl = options.realpathImpl ?? realpath;
  const runtimeDirectory = dirname(fileURLToPath(import.meta.url));
  const hermesOptions = options.hermes ?? {};
  const nodeCommand = hermesOptions.nodeCommand ?? process.env.PEA_NODE_COMMAND ?? process.execPath;
  const mcpServerPath = hermesOptions.mcpServerPath
    ?? process.env.PEA_MCP_SERVER_PATH
    ?? resolve(runtimeDirectory, '..', '..', 'mcp', 'src', 'stdio.mjs');
  const hermesHome = resolve(hermesOptions.hermesHome ?? join(workspace, '.pea', 'hermes'));
  assertInside(workspace, hermesHome);
  function createDefaultHermesAdapter(descriptorEnvironment = environment) {
    return createHermesAdapter({
      mcpServerPath,
      environment: descriptorEnvironment,
      ...hermesOptions,
      hermesHome,
      nodeCommand,
      electronRunAsNode: hermesOptions.electronRunAsNode
        ?? (process.env.ELECTRON_RUN_AS_NODE === '1' && nodeCommand === process.env.PEA_NODE_COMMAND),
      command: hermesOptions.command ?? process.env.PEA_HERMES_COMMAND ?? 'hermes',
    });
  }
  const hermes = options.hermesAdapter ?? createDefaultHermesAdapter();
  const explicitTdnSnapshotPath = options.tdnSnapshotPath ?? process.env.PEA_TDN_SNAPSHOT;
  const explicitDictionarySnapshotPath = options.dictionarySnapshotPath ?? process.env.PEA_DICTIONARY_SNAPSHOT;
  const integrationRegistryCache = new Map();
  const context = createProjectContext({ workspace });
  const subagentSupervisor = options.subagentSupervisor;
  const subagentAllowedTools = Object.freeze([...(options.subagentAllowedTools ?? [])]);
  const aiGateway = options.aiGateway;
  const buildService = options.buildService;
  const scm = options.scm ?? createGitScm({ workspace });
  const incrementalParser = createIncrementalParser();
  const defaultSignal = options.signal;

  function assertRuntimeNotCancelled(signal = defaultSignal) {
    if (signal?.aborted) {
      const error = new Error('runtime operation cancelled');
      error.code = 'RUNTIME_CANCELLED';
      throw error;
    }
  }
  const sourceLimits = {
    maxFiles: options.sourceLimits?.maxFiles ?? 10_000,
    maxSourceBytes: options.sourceLimits?.maxSourceBytes ?? 20 * 1024 * 1024,
    maxTotalSourceBytes: options.sourceLimits?.maxTotalSourceBytes ?? 256 * 1024 * 1024,
    maxReviewTotalBytes: options.sourceLimits?.maxReviewTotalBytes ?? 100 * 1024 * 1024,
  };
  for (const [name, value] of Object.entries(sourceLimits)) {
    if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${name} must be a positive safe integer`);
  }

  async function readWorkspaceSource(path) {
    const before = await lstat(path);
    if (!before.isFile() || before.isSymbolicLink()) throw new Error(`source is not a regular file: ${path}`);
    if (before.size > sourceLimits.maxSourceBytes) throw new Error(`per-file source byte limit exceeded: ${path}`);
    const handle = await open(path, 'r');
    try {
      const opened = await handle.stat();
      if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) {
        throw new Error(`source changed during bounded read: ${path}`);
      }
      const buffer = Buffer.alloc(before.size + 1);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      if (bytesRead > sourceLimits.maxSourceBytes) throw new Error(`per-file source byte limit exceeded: ${path}`);
      return buffer.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  }

  function unavailableBuild() {
    return {
      schemaVersion: 1,
      status: 'unavailable',
      error: { code: 'BUILD_UNAVAILABLE', message: 'No supervised build adapter is configured' },
    };
  }

  async function activeEnvironment() {
    if (options.environment) return options.environment;
    const configuration = await loadProjectConfiguration({ workspace });
    return configuration.config.profiles[configuration.config.activeProfile].environment;
  }

  function profileSnapshotPath(candidate) {
    if (!candidate) return undefined;
    const path = resolve(workspace, candidate);
    assertInside(workspace, path);
    return path;
  }

  async function integrationsForActiveProfile() {
    if (options.integrations) return options.integrations;
    const configuration = await loadProjectConfiguration({ workspace });
    const profile = configuration.config.profiles[configuration.config.activeProfile];
    const tdnSnapshotPath = explicitTdnSnapshotPath ?? profileSnapshotPath(profile.tdnSnapshotPath);
    const dictionarySnapshotPath = explicitDictionarySnapshotPath ?? profileSnapshotPath(profile.dictionarySnapshotPath);
    const key = JSON.stringify([tdnSnapshotPath ?? null, dictionarySnapshotPath ?? null, Boolean(options.oracleAdapter)]);
    if (integrationRegistryCache.has(key)) return integrationRegistryCache.get(key);
    const configuredAdapters = {};
    if (tdnSnapshotPath) configuredAdapters.tdn = createTdnSnapshotAdapter({ snapshotPath: tdnSnapshotPath });
    if (dictionarySnapshotPath) {
      configuredAdapters.dictionary = createDictionarySnapshotAdapter({ snapshotPath: dictionarySnapshotPath });
    }
    if (options.oracleAdapter) configuredAdapters.oracle = options.oracleAdapter;
    const registry = createIntegrationRegistry(configuredAdapters);
    integrationRegistryCache.set(key, registry);
    return registry;
  }

  async function assertHermesBoundary() {
    await context.assertStateDirectorySafe();
    try {
      const hermesStat = await lstat(hermesHome);
      if (hermesStat.isSymbolicLink()) throw new Error('Hermes home must not be a symlink');
      if (!hermesStat.isDirectory()) throw new Error('Hermes home is not a directory');
      const [resolvedWorkspace, resolvedHermesHome] = await Promise.all([
        realpathImpl(workspace),
        realpathImpl(hermesHome),
      ]);
      assertInside(resolvedWorkspace, resolvedHermesHome);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  async function reviewFile(filePath, { signal = defaultSignal } = {}) {
    assertRuntimeNotCancelled(signal);
    const absolute = resolve(filePath);
    assertInside(workspace, absolute);
    if (!ADVPL_EXTENSIONS.has(extname(absolute).toLowerCase())) {
      throw new Error(`unsupported Protheus source extension: ${extname(absolute)}`);
    }
    const [resolvedWorkspace, resolvedSource] = await Promise.all([
      realpathImpl(workspace),
      realpathImpl(absolute),
    ]);
    assertInside(resolvedWorkspace, resolvedSource);
    const decoded = decodeSource(await readWorkspaceSource(resolvedSource));
    assertRuntimeNotCancelled(signal);
    return {
      ...reviewSource(decoded.text, { file: relative(workspace, absolute).replaceAll('\\', '/') }),
      encoding: decoded.encoding,
    };
  }

  return {
    workspace,
    environment,
    async doctor({ probeHermes = false } = {}) {
      if (probeHermes) await assertHermesBoundary();
      const configuration = await loadProjectConfiguration({ workspace });
      const activeProfile = configuration.config.profiles[configuration.config.activeProfile];
      return {
        ok: true,
        schemaVersion: 1,
        runtime: { node: process.version, platform: process.platform, arch: process.arch },
        workspace,
        configuration: {
          source: configuration.source,
          schemaVersion: configuration.config.schemaVersion,
          locale: configuration.config.locale,
          activeProfile: configuration.config.activeProfile,
          environment: activeProfile.environment,
        },
        policy: getEnvironmentPolicy(options.environment ?? activeProfile.environment),
        integrations: (await integrationsForActiveProfile()).status(),
        build: { available: Boolean(buildService), mode: buildService ? 'supervised' : 'unavailable' },
        hermes: probeHermes
          ? { mode: 'acp', probed: true, ...hermes.probe() }
          : { mode: 'acp', probed: false, available: null },
      };
    },
    index({ signal = defaultSignal } = {}) {
      return indexWorkspace(workspace, { incrementalParser, ...sourceLimits, signal });
    },
    async invokeIntegration(name, operation, args, { signal = defaultSignal } = {}) {
      assertRuntimeNotCancelled(signal);
      const result = await (await integrationsForActiveProfile()).invoke(name, operation, args, { signal });
      assertRuntimeNotCancelled(signal);
      return result;
    },
    inspectSnapshot(request) {
      return inspectSnapshotFile({
        integration: request.integration,
        snapshotPath: request.path,
        expectedSha256: request.expectedSha256,
        maxAgeMs: request.maxAgeMs,
      });
    },
    async importSnapshot(request) {
      const decision = decideCapability(await activeEnvironment(), 'context:write', { grants });
      if (!decision.allowed) throw new Error(decision.reason);
      if (!['tdn', 'dictionary'].includes(request.integration)) throw new Error(`unsupported snapshot integration: ${request.integration}`);
      await context.assertStateDirectorySafe();
      const destination = resolve(workspace, '.pea', 'snapshots', `${request.integration}.json`);
      assertInside(workspace, destination);
      const result = await installSnapshotFile({
        integration: request.integration,
        sourcePath: request.path,
        destinationPath: destination,
        expectedSha256: request.expectedSha256,
        maxAgeMs: request.maxAgeMs,
      });
      const relativeSnapshotPath = `.pea/snapshots/${request.integration}.json`;
      await context.configureSnapshot(request.integration, relativeSnapshotPath);
      integrationRegistryCache.clear();
      return {
        ...result,
        configuration: { [`${request.integration === 'tdn' ? 'tdn' : 'dictionary'}SnapshotPath`]: relativeSnapshotPath },
      };
    },
    reviewFile,
    async listRepositories({ signal = defaultSignal } = {}) {
      assertRuntimeNotCancelled(signal);
      const repositories = typeof scm.repositories === 'function'
        ? await scm.repositories({ ...(signal ? { signal } : {}) })
        : ['.'];
      assertRuntimeNotCancelled(signal);
      return { schemaVersion: 1, repositories };
    },
    async reviewChanges({ scope = 'working-tree', baseRef, repository, signal = defaultSignal } = {}) {
      assertRuntimeNotCancelled(signal);
      let changeSet;
      try {
        changeSet = await scm.changes({ scope, baseRef, repository, ...(signal ? { signal } : {}) });
      } catch (error) {
        assertRuntimeNotCancelled(signal);
        throw error;
      }
      assertRuntimeNotCancelled(signal);
      const repositoryRoot = resolve(workspace, changeSet.repository);
      assertInside(workspace, repositoryRoot);
      const excluded = [];
      const reviewable = [];
      for (const file of changeSet.files) {
        if (file.status === 'deleted') excluded.push({ path: file.path, reason: 'deleted' });
        else if (file.binary) excluded.push({ path: file.path, reason: 'binary' });
        else if (!ADVPL_EXTENSIONS.has(extname(file.path).toLowerCase())) {
          excluded.push({ path: file.path, reason: 'unsupported-extension' });
        } else reviewable.push(file);
      }
      const scopedReviews = [];
      let reviewedBytes = 0;
      for (const file of reviewable) {
        assertRuntimeNotCancelled(signal);
        const absolute = resolve(repositoryRoot, file.path);
        assertInside(workspace, absolute);
        let bytes;
        try {
          bytes = typeof scm.readSource === 'function'
            ? await scm.readSource({ path: file.path, scope, baseRef, repository: repositoryRoot, ...(signal ? { signal } : {}) })
            : await readWorkspaceSource(absolute);
        } catch (error) {
          assertRuntimeNotCancelled(signal);
          throw error;
        }
        assertRuntimeNotCancelled(signal);
        if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) {
          throw new TypeError('SCM source adapter must return bounded bytes');
        }
        if (bytes.length > sourceLimits.maxSourceBytes) throw new Error(`per-file changed-source byte limit exceeded: ${file.path}`);
        reviewedBytes += bytes.length;
        if (reviewedBytes > sourceLimits.maxReviewTotalBytes) {
          throw new Error(`aggregate changed-source byte limit exceeded: ${sourceLimits.maxReviewTotalBytes}`);
        }
        const decoded = decodeSource(bytes);
        const source = decoded.text;
        const reviewPath = relative(workspace, absolute).replaceAll('\\', '/');
        scopedReviews.push({
          review: { ...reviewSource(source, { file: reviewPath }), encoding: decoded.encoding },
          nodes: parseAdvplSource(source, { file: reviewPath }).symbols,
        });
      }
      const scopedNodes = scopedReviews.flatMap((item) => item.nodes);
      const enrichedReviews = scopedReviews.map(({ review }) => ({
        ...review,
        findings: review.findings.map((finding) => {
          const owner = scopedNodes
            .filter((node) => node.file === review.file && node.line <= finding.line)
            .sort((left, right) => right.line - left.line)[0];
          return {
            ...finding,
            evidence: { ...finding.evidence, ...(owner ? { symbol: owner.name } : {}) },
          };
        }),
      }));
      const findings = enrichedReviews.flatMap((review) => review.findings);
      return exportChangeReview({
        schemaVersion: 1,
        kind: 'change-review',
        status: changeSet.status,
        repository: changeSet.repository,
        scope: changeSet.scope,
        changedFiles: changeSet.files,
        reviews: enrichedReviews,
        excluded,
        summary: {
          filesChanged: changeSet.files.length,
          filesReviewed: enrichedReviews.length,
          findings: findings.length,
          assessment: assessmentFor(findings),
        },
        evidence: [{
          type: 'scm-change-set',
          repository: changeSet.repository,
          scope: changeSet.scope,
          fileCount: changeSet.files.length,
        }],
        disclaimer: 'Deterministic changed-file review only; compilation and release compatibility are not asserted.',
      });
    },
    async createBugReview(input, { signal = defaultSignal } = {}) {
      const [graph, sourceReport] = await Promise.all([
        indexWorkspace(workspace, { incrementalParser, ...sourceLimits, signal }),
        reviewFile(input.filePath, { signal }),
      ]);
      return createBugReviewReport({ ...input, graph, sourceReport });
    },
    runSubagent(spec, subagentContext = {}) {
      if (!subagentSupervisor || typeof subagentSupervisor.run !== 'function') {
        return {
          schemaVersion: 1,
          status: 'unavailable',
          error: { code: 'SUBAGENT_UNAVAILABLE', message: 'No governed subagent transport is configured' },
        };
      }
      return subagentSupervisor.run(spec, {
        parentId: subagentContext.parentId,
        depth: subagentContext.depth,
        allowedTools: [...subagentAllowedTools],
        signal: subagentContext.signal,
      });
    },
    async runAiTask(request, aiContext = {}) {
      if (!aiGateway || typeof aiGateway.run !== 'function') {
        return {
          schemaVersion: 1,
          status: 'unavailable',
          error: { code: 'AI_PROVIDER_UNAVAILABLE', message: 'No governed AI provider is configured' },
        };
      }
      return aiGateway.run(request, {
        environment: await activeEnvironment(),
        grants: [...grants],
        signal: aiContext.signal,
      });
    },
    prepareBuild(request) {
      return buildService ? buildService.prepare(request) : unavailableBuild();
    },
    async runBuild(request, buildContext = {}) {
      if (!buildService) return unavailableBuild();
      return buildService.run(request, {
        ...buildContext,
        workspace,
        environment: await activeEnvironment(),
        grants: [...grants],
      });
    },
    buildStatus(requestId) {
      return buildService ? buildService.status(requestId) : unavailableBuild();
    },
    cancelBuild(requestId) {
      return buildService ? buildService.cancel(requestId) : unavailableBuild();
    },
    buildEvidence(requestId) {
      return buildService ? buildService.evidence(requestId) : unavailableBuild();
    },
    readContext() {
      return context.read();
    },
    async getSessionContext() {
      await assertHermesBoundary();
      const sessionEnvironment = await activeEnvironment();
      const sessionHermes = options.hermesAdapter ?? createDefaultHermesAdapter(sessionEnvironment);
      const [projectContext, resources] = await Promise.all([
        context.read(),
        snapshotAgentResources({ workspace }),
      ]);
      return {
        schemaVersion: 1,
        trust: 'untrusted-project-data',
        context: projectContext,
        resources,
        hermes: {
          launch: sessionHermes.getLaunchDescriptor(workspace),
          mcp: sessionHermes.getSessionMcpServerDescriptor(workspace),
        },
      };
    },
    async writeMemory(content) {
      const decision = decideCapability(await activeEnvironment(), 'context:write', { grants });
      if (!decision.allowed) throw new Error(decision.reason);
      return context.writeMemory(content);
    },
    async appendMemory(entry) {
      const decision = decideCapability(await activeEnvironment(), 'context:write', { grants });
      if (!decision.allowed) throw new Error(decision.reason);
      return context.appendMemory(entry);
    },
    async recordJournal(event) {
      const decision = decideCapability(await activeEnvironment(), 'context:write', { grants });
      if (!decision.allowed) throw new Error(decision.reason);
      return context.recordJournal(event);
    },
    previewJournalPromotion(journalId, attribution) {
      return context.previewPromotion(journalId, attribution);
    },
    async promoteJournal(journalId, attribution) {
      const decision = decideCapability(await activeEnvironment(), 'context:write', { grants });
      if (!decision.allowed) throw new Error(decision.reason);
      return context.promoteJournal(journalId, attribution);
    },
    async expireMemory(at) {
      const decision = decideCapability(await activeEnvironment(), 'context:write', { grants });
      if (!decision.allowed) throw new Error(decision.reason);
      return context.expireMemory(at);
    },
    async getHermesLaunchDescriptor() {
      await assertHermesBoundary();
      return hermes.getLaunchDescriptor(workspace);
    },
  };
}
