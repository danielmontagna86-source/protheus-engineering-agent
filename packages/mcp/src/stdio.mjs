#!/usr/bin/env node

import { createMcpHandler } from './server.mjs';

const handler = createMcpHandler({
  workspace: process.env.PEA_WORKSPACE || process.cwd(),
  environment: process.env.PEA_ENVIRONMENT || 'production',
  grants: (process.env.PEA_GRANTS || '').split(',').map((item) => item.trim()).filter(Boolean),
});

const MAX_REQUEST_BYTES = 1024 * 1024;

function writeProtocolError(code, message) {
  process.stdout.write(`${JSON.stringify({
    jsonrpc: '2.0', id: null, error: { code, message },
  })}\n`);
}

async function processLine(bytes) {
  const line = bytes.toString('utf8').replace(/\r$/, '');
  if (!line.trim()) return;
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    writeProtocolError(-32700, 'Parse error');
    return;
  }
  const response = await handler(request);
  if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
}

let parts = [];
let bufferedBytes = 0;
let droppingOversizedLine = false;
for await (const chunkValue of process.stdin) {
  const chunk = Buffer.isBuffer(chunkValue) ? chunkValue : Buffer.from(chunkValue);
  let offset = 0;
  while (offset < chunk.length) {
    const newline = chunk.indexOf(0x0a, offset);
    const end = newline === -1 ? chunk.length : newline;
    const part = chunk.subarray(offset, end);
    if (!droppingOversizedLine) {
      if (bufferedBytes + part.length > MAX_REQUEST_BYTES) {
        parts = [];
        bufferedBytes = 0;
        droppingOversizedLine = true;
        writeProtocolError(-32600, `Request exceeds ${MAX_REQUEST_BYTES} bytes`);
      } else if (part.length > 0) {
        parts.push(part);
        bufferedBytes += part.length;
      }
    }
    if (newline === -1) break;
    if (!droppingOversizedLine) await processLine(Buffer.concat(parts, bufferedBytes));
    parts = [];
    bufferedBytes = 0;
    droppingOversizedLine = false;
    offset = newline + 1;
  }
}
if (!droppingOversizedLine && bufferedBytes > 0) await processLine(Buffer.concat(parts, bufferedBytes));
