import { resolve } from 'node:path';
import { createRequire } from 'node:module';

import { createRuntime } from '../../runtime/src/index.mjs';

const require = createRequire(import.meta.url);
const { version: productVersion } = require('../../../package.json');

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
        parentId: { type: 'string' }, depth: { type: 'integer', minimum: 1 }, mutating: { type: 'boolean' },
      },
      required: ['role', 'tool', 'input', 'parentId', 'depth'],
      additionalProperties: false,
    },
  },
]);

const TOOL_ARGUMENTS = Object.freeze({
  pea_doctor: Object.freeze({ allowed: [], required: [] }),
  pea_index_workspace: Object.freeze({ allowed: [], required: [] }),
  pea_review_file: Object.freeze({ allowed: ['path'], required: ['path'] }),
  pea_read_context: Object.freeze({ allowed: [], required: [] }),
  pea_session_context: Object.freeze({ allowed: [], required: [] }),
  pea_write_memory: Object.freeze({ allowed: ['content'], required: ['content'] }),
  pea_tdn_search: Object.freeze({ allowed: ['query', 'limit'], required: ['query'] }),
  pea_dictionary_table: Object.freeze({ allowed: ['name'], required: ['name'] }),
  pea_dictionary_field: Object.freeze({ allowed: ['table', 'name'], required: ['table', 'name'] }),
  pea_bug_review: Object.freeze({
    allowed: ['title', 'path', 'targetSymbol'], required: ['title', 'path', 'targetSymbol'],
  }),
  pea_subagent_run: Object.freeze({
    allowed: ['role', 'tool', 'input', 'parentId', 'depth', 'mutating'],
    required: ['role', 'tool', 'input', 'parentId', 'depth'],
    nonStringRequired: ['input', 'depth'],
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
      if (key === 'input' && (!args[key] || typeof args[key] !== 'object' || Array.isArray(args[key]))) {
        throw new Error('input is required');
      }
    } else if (typeof args[key] !== 'string' || args[key].length === 0) throw new Error(`${key} is required`);
  }
  if (args.mutating !== undefined && typeof args.mutating !== 'boolean') throw new Error('mutating must be boolean');
  return args;
}

function toolResult(value, isError = false) {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    isError,
  };
}

export function createMcpHandler(options) {
  const runtime = createRuntime({
    workspace: resolve(options.workspace),
    environment: options.environment ?? 'production',
    grants: options.grants ?? [],
    tdnSnapshotPath: options.tdnSnapshotPath,
    dictionarySnapshotPath: options.dictionarySnapshotPath,
    subagentSupervisor: options.subagentSupervisor,
    subagentAllowedTools: options.subagentAllowedTools,
  });

  return async function handle(request) {
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
      return { jsonrpc: '2.0', id, result: { tools: TOOLS.map((tool) => ({ ...tool })) } };
    }
    if (request?.method === 'tools/call') {
      const name = request.params?.name;
      try {
        const args = validateToolArguments(name, request.params?.arguments);
        let value;
        if (name === 'pea_doctor') value = await runtime.doctor();
        else if (name === 'pea_index_workspace') value = await runtime.index();
        else if (name === 'pea_review_file') {
          value = await runtime.reviewFile(args.path);
        } else if (name === 'pea_read_context') value = await runtime.readContext();
        else if (name === 'pea_session_context') value = await runtime.getSessionContext();
        else if (name === 'pea_write_memory') {
          await runtime.writeMemory(args.content);
          value = { ok: true };
        } else if (name === 'pea_tdn_search') {
          value = await runtime.invokeIntegration('tdn', 'search', args);
        } else if (name === 'pea_dictionary_table') {
          value = await runtime.invokeIntegration('dictionary', 'table', args);
        } else if (name === 'pea_dictionary_field') {
          value = await runtime.invokeIntegration('dictionary', 'field', args);
        } else if (name === 'pea_bug_review') {
          value = await runtime.createBugReview({
            title: args.title,
            filePath: args.path,
            targetSymbol: args.targetSymbol,
            changedFiles: [],
            validation: [],
            uncertainty: ['The CodeGraph is lexical; dynamic calls require additional evidence.'],
          });
        } else if (name === 'pea_subagent_run') {
          value = await runtime.runSubagent({
            role: args.role, tool: args.tool, input: args.input, mutating: args.mutating === true,
          }, { parentId: args.parentId, depth: args.depth });
        }
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
