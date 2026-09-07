#!/usr/bin/env node
import { createInterface } from 'node:readline';

import { createMcpHandler } from './server.mjs';

const handler = createMcpHandler({
  workspace: process.env.PEA_WORKSPACE || process.cwd(),
  environment: process.env.PEA_ENVIRONMENT || 'production',
  grants: (process.env.PEA_GRANTS || '').split(',').map((item) => item.trim()).filter(Boolean),
});

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of lines) {
  if (!line.trim()) continue;
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    process.stdout.write(`${JSON.stringify({
      jsonrpc: '2.0', id: null,
      error: { code: -32700, message: 'Parse error' },
    })}\n`);
    continue;
  }
  const response = await handler(request);
  if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
}
