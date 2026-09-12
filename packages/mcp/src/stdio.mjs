#!/usr/bin/env node

import { StdioServerTransport, serveStdio } from '@modelcontextprotocol/server/stdio';
import { fileURLToPath } from 'node:url';

import { createOfficialMcpServer } from './server.mjs';

const MAX_REQUEST_BYTES = 1024 * 1024;

const options = {
  workspace: process.env.PEA_WORKSPACE || process.cwd(),
  environment: process.env.PEA_ENVIRONMENT || 'production',
  grants: (process.env.PEA_GRANTS || '').split(',').map((item) => item.trim()).filter(Boolean),
  hermes: {
    nodeCommand: process.execPath,
    mcpServerPath: fileURLToPath(import.meta.url),
    electronRunAsNode: process.env.ELECTRON_RUN_AS_NODE === '1',
  },
};

const transport = new StdioServerTransport(process.stdin, process.stdout, {
  maxBufferSize: MAX_REQUEST_BYTES,
});

const handle = serveStdio(() => createOfficialMcpServer(options), {
  legacy: 'serve',
  transport,
  onerror(error) {
    process.stderr.write(`[pea-mcp] ${String(error?.message ?? error)}\n`);
  },
});

async function shutdown() {
  await handle.close();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
