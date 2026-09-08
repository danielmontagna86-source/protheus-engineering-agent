import { lstat, readFile, realpath } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { snapshotAgentResources } from '../../agent-resources/src/index.mjs';
import { ADVPL_EXTENSIONS, decodeSource, indexWorkspace } from '../../codegraph-advpl/src/index.mjs';
import { createProjectContext } from '../../project-context/src/index.mjs';
import { decideCapability, getEnvironmentPolicy } from '../../policy/src/index.mjs';
import { createHermesAdapter } from '../../hermes-adapter/src/index.mjs';
import {
  createDictionarySnapshotAdapter,
  createIntegrationRegistry,
  createTdnSnapshotAdapter,
} from '../../integrations/src/index.mjs';
import { reviewSource } from '../../review/src/index.mjs';

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
  const hermes = options.hermesAdapter ?? createHermesAdapter({
    mcpServerPath,
    environment: 'production',
    ...hermesOptions,
    hermesHome,
    nodeCommand,
    electronRunAsNode: hermesOptions.electronRunAsNode
      ?? (process.env.ELECTRON_RUN_AS_NODE === '1' && nodeCommand === process.env.PEA_NODE_COMMAND),
    command: hermesOptions.command ?? process.env.PEA_HERMES_COMMAND ?? 'hermes',
  });
  const tdnSnapshotPath = options.tdnSnapshotPath ?? process.env.PEA_TDN_SNAPSHOT;
  const dictionarySnapshotPath = options.dictionarySnapshotPath ?? process.env.PEA_DICTIONARY_SNAPSHOT;
  const configuredAdapters = {};
  if (tdnSnapshotPath) configuredAdapters.tdn = createTdnSnapshotAdapter({ snapshotPath: tdnSnapshotPath });
  if (dictionarySnapshotPath) {
    configuredAdapters.dictionary = createDictionarySnapshotAdapter({ snapshotPath: dictionarySnapshotPath });
  }
  const integrations = options.integrations ?? createIntegrationRegistry(configuredAdapters);
  const context = createProjectContext({ workspace });

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

  return {
    workspace,
    environment,
    async doctor({ probeHermes = false } = {}) {
      if (probeHermes) await assertHermesBoundary();
      return {
        ok: true,
        schemaVersion: 1,
        runtime: { node: process.version, platform: process.platform, arch: process.arch },
        workspace,
        policy: getEnvironmentPolicy(environment),
        integrations: integrations.status(),
        hermes: probeHermes
          ? { mode: 'acp', probed: true, ...hermes.probe() }
          : { mode: 'acp', probed: false, available: null },
      };
    },
    index() {
      return indexWorkspace(workspace);
    },
    invokeIntegration(name, operation, args) {
      return integrations.invoke(name, operation, args);
    },
    async reviewFile(filePath) {
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
      const decoded = decodeSource(await readFile(resolvedSource));
      return {
        ...reviewSource(decoded.text, { file: relative(workspace, absolute).replaceAll('\\', '/') }),
        encoding: decoded.encoding,
      };
    },
    readContext() {
      return context.read();
    },
    async getSessionContext() {
      await assertHermesBoundary();
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
          launch: hermes.getLaunchDescriptor(workspace),
          mcp: hermes.getSessionMcpServerDescriptor(workspace),
        },
      };
    },
    writeMemory(content) {
      const decision = decideCapability(environment, 'context:write', { grants });
      if (!decision.allowed) throw new Error(decision.reason);
      return context.writeMemory(content);
    },
    recordJournal(event) {
      const decision = decideCapability(environment, 'context:write', { grants });
      if (!decision.allowed) throw new Error(decision.reason);
      return context.recordJournal(event);
    },
    async getHermesLaunchDescriptor() {
      await assertHermesBoundary();
      return hermes.getLaunchDescriptor(workspace);
    },
  };
}
