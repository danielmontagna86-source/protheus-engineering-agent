import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { McpServer, fromJsonSchema } from '@modelcontextprotocol/server';

import { createRuntime } from '../../runtime/src/index.mjs';
import { toSarif } from '../../evidence/src/index.mjs';

const require = createRequire(import.meta.url);
const { version: productVersion } = require('../../../package.json');
const MAX_RESPONSE_BYTES = 1024 * 1024;

const TOOLS = Object.freeze([
  {
    name: 'pea_doctor',
    description: 'Report local runtime, policy, integration, and Hermes adapter status.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'pea_index_workspace',
    description: 'Build a read-only ADVPL/TLPP symbol and call graph for the workspace.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'pea_review_file',
    description: 'Run deterministic pre-review rules on one workspace source file.',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
      additionalProperties: false,
    },
  },
  {
    name: 'pea_review_changes',
    description: 'Review one explicit staged, unstaged, working-tree or branch Git change set.',
    inputSchema: {
      type: 'object',
      properties: {
        scope: { type: 'string', enum: ['staged', 'unstaged', 'working-tree', 'branch'] },
        baseRef: { type: 'string' },
        repository: { type: 'string' },
        format: { type: 'string', enum: ['json', 'sarif'] },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'pea_read_context',
    description: 'Read bounded Project Memory and Journal data.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'pea_session_context',
    description: 'Snapshot live project skills, rules, memory, journal, and isolated Hermes ACP/MCP descriptors.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'pea_write_memory',
    description: 'Replace Project Memory when the active environment grants context:write.',
    inputSchema: {
      type: 'object',
      properties: { content: { type: 'string' } },
      required: ['content'],
      additionalProperties: false,
    },
  },
  {
    name: 'pea_append_memory',
    description: 'Append one attributed, Git-friendly Project Memory record when context:write is granted.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' }, summary: { type: 'string' }, actor: { type: 'string' }, expiresAt: { type: 'string' },
      },
      required: ['summary', 'actor'],
      additionalProperties: false,
    },
  },
  {
    name: 'pea_record_journal',
    description: 'Append one attributed Journal event when context:write is granted.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' }, kind: { type: 'string' }, summary: { type: 'string' },
        actor: { type: 'string' }, expiresAt: { type: 'string' },
      },
      required: ['kind', 'summary', 'actor'],
      additionalProperties: false,
    },
  },
  ...['preview_journal_promotion', 'promote_journal'].map((operation) => ({
    name: `pea_${operation}`,
    description: operation.startsWith('preview')
      ? 'Preview the exact attributed Memory record and hashes produced by promoting a Journal event.'
      : 'Promote one Journal event to attributed Project Memory when context:write is granted.',
    inputSchema: {
      type: 'object',
      properties: { journalId: { type: 'string' }, actor: { type: 'string' } },
      required: ['journalId', 'actor'],
      additionalProperties: false,
    },
  })),
  {
    name: 'pea_expire_memory',
    description: 'Remove only structured Project Memory entries whose explicit expiry is elapsed.',
    inputSchema: {
      type: 'object', properties: { at: { type: 'string' } }, required: ['at'], additionalProperties: false,
    },
  },
  {
    name: 'pea_tdn_search',
    description: 'Search a configured read-only, versioned TDN snapshot and return provenance.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 50 } },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'pea_dictionary_table',
    description: 'Read one table from a configured, versioned Protheus dictionary snapshot.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'pea_dictionary_field',
    description: 'Read one field from a configured, versioned Protheus dictionary snapshot.',
    inputSchema: {
      type: 'object',
      properties: { table: { type: 'string' }, name: { type: 'string' } },
      required: ['table', 'name'],
      additionalProperties: false,
    },
  },
  {
    name: 'pea_bug_review',
    description: 'Create one traceable bug report from source review, CodeGraph impact and residual risk.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        path: { type: 'string' },
        targetSymbol: { type: 'string' },
      },
      required: ['title', 'path', 'targetSymbol'],
      additionalProperties: false,
    },
  },
  {
    name: 'pea_subagent_run',
    description: 'Run one host-configured bounded child task with parent, depth and tool evidence.',
    inputSchema: {
      type: 'object',
      properties: {
        role: { type: 'string' }, tool: { type: 'string' }, input: { type: 'object' },
        parentId: { type: 'string' }, depth: { type: 'integer', minimum: 1 },
      },
      required: ['role', 'tool', 'input', 'parentId', 'depth'],
      additionalProperties: false,
    },
  },
  {
    name: 'pea_ai_task',
    description: 'Run a structured task through a host-configured governed AI provider.',
    inputSchema: {
      type: 'object',
      properties: {
        instruction: { type: 'string' }, context: { type: 'object' }, outputSchema: { type: 'object' },
      },
      required: ['instruction', 'context'],
      additionalProperties: false,
    },
  },
  {
    name: 'pea_build_prepare',
    description: 'Prepare one host-configured supervised build plan without executing it.',
    inputSchema: {
      type: 'object', properties: { planId: { type: 'string' } }, required: ['planId'], additionalProperties: false,
    },
  },
  {
    name: 'pea_build_run',
    description: 'Run one prepared build request using a host-issued, one-time approval token.',
    inputSchema: {
      type: 'object',
      properties: {
        requestId: { type: 'string' }, approvalToken: { type: 'string' },
      },
      required: ['requestId', 'approvalToken'],
      additionalProperties: false,
    },
  },
  ...['status', 'cancel', 'evidence'].map((operation) => ({
    name: `pea_build_${operation}`,
    description: `${operation === 'cancel' ? 'Cancel' : 'Read'} one supervised build ${operation}.`,
    inputSchema: {
      type: 'object', properties: { requestId: { type: 'string' } }, required: ['requestId'], additionalProperties: false,
    },
  })),
  {
    name: 'pea_oracle_query',
    description: 'Execute one configured read-only Oracle named query with bind variables.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' }, binds: { type: 'object' } },
      required: ['name', 'binds'],
      additionalProperties: false,
    },
  },
]);

function toolsForHost(options = {}) {
  return TOOLS.filter((tool) => tool.name !== 'pea_build_run' || typeof options.resolveBuildApproval === 'function');
}

const TOOL_ARGUMENTS = Object.freeze({
  pea_doctor: Object.freeze({ allowed: [], required: [] }),
  pea_index_workspace: Object.freeze({ allowed: [], required: [] }),
  pea_review_file: Object.freeze({ allowed: ['path'], required: ['path'] }),
  pea_review_changes: Object.freeze({ allowed: ['scope', 'baseRef', 'repository', 'format'], required: [] }),
  pea_read_context: Object.freeze({ allowed: [], required: [] }),
  pea_session_context: Object.freeze({ allowed: [], required: [] }),
  pea_write_memory: Object.freeze({ allowed: ['content'], required: ['content'] }),
  pea_append_memory: Object.freeze({ allowed: ['id', 'summary', 'actor', 'expiresAt'], required: ['summary', 'actor'] }),
  pea_record_journal: Object.freeze({
    allowed: ['id', 'kind', 'summary', 'actor', 'expiresAt'], required: ['kind', 'summary', 'actor'],
  }),
  pea_preview_journal_promotion: Object.freeze({ allowed: ['journalId', 'actor'], required: ['journalId', 'actor'] }),
  pea_promote_journal: Object.freeze({ allowed: ['journalId', 'actor'], required: ['journalId', 'actor'] }),
  pea_expire_memory: Object.freeze({ allowed: ['at'], required: ['at'] }),
  pea_tdn_search: Object.freeze({ allowed: ['query', 'limit'], required: ['query'] }),
  pea_dictionary_table: Object.freeze({ allowed: ['name'], required: ['name'] }),
  pea_dictionary_field: Object.freeze({ allowed: ['table', 'name'], required: ['table', 'name'] }),
  pea_bug_review: Object.freeze({
    allowed: ['title', 'path', 'targetSymbol'], required: ['title', 'path', 'targetSymbol'],
  }),
  pea_subagent_run: Object.freeze({
    allowed: ['role', 'tool', 'input', 'parentId', 'depth'],
    required: ['role', 'tool', 'input', 'parentId', 'depth'],
    nonStringRequired: ['input', 'depth'],
  }),
  pea_ai_task: Object.freeze({
    allowed: ['instruction', 'context', 'outputSchema'],
    required: ['instruction', 'context'],
    nonStringRequired: ['context'],
  }),
  pea_build_prepare: Object.freeze({ allowed: ['planId'], required: ['planId'] }),
  pea_build_run: Object.freeze({
    allowed: ['requestId', 'approvalToken'], required: ['requestId', 'approvalToken'],
  }),
  pea_build_status: Object.freeze({ allowed: ['requestId'], required: ['requestId'] }),
  pea_build_cancel: Object.freeze({ allowed: ['requestId'], required: ['requestId'] }),
  pea_build_evidence: Object.freeze({ allowed: ['requestId'], required: ['requestId'] }),
  pea_oracle_query: Object.freeze({
    allowed: ['name', 'binds'], required: ['name', 'binds'], nonStringRequired: ['binds'],
  }),
});

function validateToolArguments(name, value) {
  const contract = TOOL_ARGUMENTS[name];
  if (!contract) throw new Error(`Unknown tool: ${String(name)}`);
  const args = value ?? {};
  if (typeof args !== 'object' || Array.isArray(args)) throw new Error('tool arguments must be an object');
  const unexpected = Object.keys(args).filter((key) => !contract.allowed.includes(key));
  if (unexpected.length > 0) throw new Error(`unexpected argument: ${unexpected[0]}`);
  for (const key of contract.required) {
    if (contract.nonStringRequired?.includes(key)) {
      if (key === 'depth' && (!Number.isInteger(args[key]) || args[key] < 1)) throw new Error('depth is required');
      if (['input', 'context', 'binds'].includes(key) && (!args[key] || typeof args[key] !== 'object' || Array.isArray(args[key]))) {
        throw new Error(`${key} is required`);
      }
    } else if (typeof args[key] !== 'string' || args[key].length === 0) throw new Error(`${key} is required`);
  }
  if (args.outputSchema !== undefined && (!args.outputSchema || typeof args.outputSchema !== 'object' || Array.isArray(args.outputSchema))) {
    throw new Error('outputSchema must be an object');
  }
  return args;
}

function toolResult(value, isError = false) {
  const serialized = JSON.stringify(value, null, 2);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_RESPONSE_BYTES) {
    return {
      content: [{ type: 'text', text: JSON.stringify({
        ok: false,
        error: { code: 'MCP_RESPONSE_TOO_LARGE', message: `response exceeds ${MAX_RESPONSE_BYTES} bytes` },
      }, null, 2) }],
      isError: true,
    };
  }
  return {
    content: [{ type: 'text', text: serialized }],
    isError,
  };
}

async function notifyProgress(context, progress, message) {
  const progressToken = context?.mcpReq?._meta?.progressToken;
  if (progressToken === undefined || typeof context?.mcpReq?.notify !== 'function') return;
  await context.mcpReq.notify({
    method: 'notifications/progress',
    params: { progressToken, progress, total: 1, message },
  });
}

function runtimeOptions(options) {
  return {
    workspace: resolve(options.workspace),
    environment: options.environment ?? 'production',
    grants: options.grants ?? [],
    tdnSnapshotPath: options.tdnSnapshotPath,
    dictionarySnapshotPath: options.dictionarySnapshotPath,
    subagentSupervisor: options.subagentSupervisor,
    subagentAllowedTools: options.subagentAllowedTools,
    aiGateway: options.aiGateway,
    buildService: options.buildService,
    oracleAdapter: options.oracleAdapter,
    scm: options.scm,
    hermes: options.hermes,
    sourceLimits: options.sourceLimits,
  };
}

function boundedResourceText(value) {
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_RESPONSE_BYTES) {
    throw new Error(`MCP_RESPONSE_TOO_LARGE: resource exceeds ${MAX_RESPONSE_BYTES} bytes`);
  }
  return serialized;
}

async function executeTool(runtime, name, rawArgs, context = {}) {
  const args = validateToolArguments(name, rawArgs);
  if (name === 'pea_doctor') return runtime.doctor();
  if (name === 'pea_index_workspace') return runtime.index({ signal: context.signal });
  if (name === 'pea_review_file') return runtime.reviewFile(args.path, { signal: context.signal });
  if (name === 'pea_review_changes') {
    const report = await runtime.reviewChanges({
      scope: args.scope ?? 'working-tree',
      baseRef: args.baseRef,
      repository: args.repository,
      signal: context.signal,
    });
    return args.format === 'sarif' ? toSarif(report, { toolVersion: productVersion }) : report;
  }
  if (name === 'pea_read_context') return runtime.readContext();
  if (name === 'pea_session_context') return runtime.getSessionContext();
  if (name === 'pea_write_memory') {
    await runtime.writeMemory(args.content);
    return { ok: true };
  }
  if (name === 'pea_append_memory') {
    return runtime.appendMemory({
      id: args.id,
      summary: args.summary,
      attribution: { actor: args.actor, source: 'mcp' },
      expiresAt: args.expiresAt,
    });
  }
  if (name === 'pea_record_journal') {
    return runtime.recordJournal({
      id: args.id,
      kind: args.kind,
      summary: args.summary,
      attribution: { actor: args.actor, source: 'mcp' },
      expiresAt: args.expiresAt,
    });
  }
  if (name === 'pea_preview_journal_promotion') {
    return runtime.previewJournalPromotion(args.journalId, { actor: args.actor, source: 'mcp' });
  }
  if (name === 'pea_promote_journal') {
    return runtime.promoteJournal(args.journalId, { actor: args.actor, source: 'mcp' });
  }
  if (name === 'pea_expire_memory') return runtime.expireMemory(args.at);
  if (name === 'pea_tdn_search') return runtime.invokeIntegration('tdn', 'search', args, { signal: context.signal });
  if (name === 'pea_dictionary_table') return runtime.invokeIntegration('dictionary', 'table', args, { signal: context.signal });
  if (name === 'pea_dictionary_field') return runtime.invokeIntegration('dictionary', 'field', args, { signal: context.signal });
  if (name === 'pea_bug_review') {
    return runtime.createBugReview({
      title: args.title,
      filePath: args.path,
      targetSymbol: args.targetSymbol,
      changedFiles: [],
      validation: [],
      uncertainty: ['The CodeGraph is lexical; dynamic calls require additional evidence.'],
    }, { signal: context.signal });
  }
  if (name === 'pea_subagent_run') {
    return runtime.runSubagent({
      role: args.role,
      tool: args.tool,
      input: args.input,
    }, { parentId: args.parentId, depth: args.depth, signal: context.signal });
  }
  if (name === 'pea_ai_task') {
    return runtime.runAiTask({
      instruction: args.instruction,
      context: args.context,
      outputSchema: args.outputSchema,
    }, { signal: context.signal });
  }
  if (name === 'pea_build_prepare') return runtime.prepareBuild({ planId: args.planId });
  if (name === 'pea_build_run') {
    if (typeof context.resolveBuildApproval !== 'function') {
      throw new Error('host approval resolver is unavailable');
    }
    const approval = await context.resolveBuildApproval({
      requestId: args.requestId,
      approvalToken: args.approvalToken,
    });
    if (!approval || typeof approval.approvedBy !== 'string' || approval.approvedBy.length === 0
      || Number.isNaN(Date.parse(approval.approvedAt))) {
      throw new Error('host approval resolver returned invalid approval evidence');
    }
    return runtime.runBuild({ requestId: args.requestId }, {
      approval,
      signal: context.signal,
    });
  }
  if (name === 'pea_build_status') return runtime.buildStatus(args.requestId);
  if (name === 'pea_build_cancel') return runtime.cancelBuild(args.requestId);
  if (name === 'pea_build_evidence') return runtime.buildEvidence(args.requestId);
  if (name === 'pea_oracle_query') {
    return runtime.invokeIntegration('oracle', 'query', { name: args.name, binds: args.binds }, { signal: context.signal });
  }
  throw new Error(`Unknown tool: ${String(name)}`);
}

export function createOfficialMcpServer(options) {
  const runtime = createRuntime(runtimeOptions(options));
  const tools = toolsForHost(options);
  const server = new McpServer(
    { name: 'protheus-engineering-agent', version: productVersion },
    { capabilities: { tools: {}, resources: {} } },
  );

  for (const tool of tools) {
    server.registerTool(tool.name, {
      description: tool.description,
      inputSchema: fromJsonSchema(tool.inputSchema),
    }, async (args, context) => {
      try {
        await notifyProgress(context, 0, `${tool.name} started`);
        const result = await executeTool(runtime, tool.name, args, {
          signal: context.mcpReq.signal,
          resolveBuildApproval: options.resolveBuildApproval,
        });
        await notifyProgress(context, 1, `${tool.name} completed`);
        return toolResult(result);
      } catch (error) {
        await notifyProgress(context, 1, `${tool.name} stopped`);
        return toolResult({ ok: false, error: String(error?.message ?? error) }, true);
      }
    });
  }

  server.registerResource(
    'pea-project-context',
    'pea://project-context',
    { title: 'Protheus Engineering Agent project context', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: boundedResourceText(await runtime.readContext()) }],
    }),
  );
  server.registerResource(
    'pea-session-context',
    'pea://session-context',
    { title: 'Protheus Engineering Agent session context', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: boundedResourceText(await runtime.getSessionContext()) }],
    }),
  );

  return server;
}

export function createMcpHandler(options) {
  const runtime = createRuntime(runtimeOptions(options));
  const tools = toolsForHost(options);
  const toolNames = new Set(tools.map((tool) => tool.name));

  return async function handle(request, context = {}) {
    const id = request?.id ?? null;
    if (request?.method === 'notifications/initialized') return null;
    if (request?.method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: request.params?.protocolVersion ?? '2025-06-18',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'protheus-engineering-agent', version: productVersion },
        },
      };
    }
    if (request?.method === 'tools/list') {
      return { jsonrpc: '2.0', id, result: { tools: tools.map((tool) => ({ ...tool })) } };
    }
    if (request?.method === 'tools/call') {
      const name = request.params?.name;
      try {
        if (!toolNames.has(name)) throw new Error(`tool is not advertised by this host: ${String(name)}`);
        const value = await executeTool(runtime, name, request.params?.arguments, {
          signal: context.signal,
          resolveBuildApproval: options.resolveBuildApproval,
        });
        return { jsonrpc: '2.0', id, result: toolResult(value) };
      } catch (error) {
        return {
          jsonrpc: '2.0',
          id,
          result: toolResult({ ok: false, error: String(error?.message ?? error) }, true),
        };
      }
    }
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${String(request?.method)}` },
    };
  };
}
