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
]);

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
      const args = request.params?.arguments ?? {};
      try {
        let value;
        if (name === 'pea_doctor') value = await runtime.doctor();
        else if (name === 'pea_index_workspace') value = await runtime.index();
        else if (name === 'pea_review_file') {
          if (typeof args.path !== 'string') throw new Error('path is required');
          value = await runtime.reviewFile(args.path);
        } else if (name === 'pea_read_context') value = await runtime.readContext();
        else if (name === 'pea_session_context') value = await runtime.getSessionContext();
        else if (name === 'pea_write_memory') {
          if (typeof args.content !== 'string') throw new Error('content is required');
          await runtime.writeMemory(args.content);
          value = { ok: true };
        } else {
          throw new Error(`Unknown tool: ${String(name)}`);
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
