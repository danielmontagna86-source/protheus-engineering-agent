import { spawn } from 'node:child_process';

/** Real subprocess client for standard MCP sessions and PEA's finite-input mode. */
export function runMcpSession(entrypoint, {
  workspace, requests, initializeId = 1, clientName = 'pea-smoke',
  finiteInput = false, timeoutMs = 30_000,
} = {}) {
  const initialize = {
    jsonrpc: '2.0', id: initializeId, method: 'initialize',
    params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: clientName, version: '1' } },
  };
  const initialized = { jsonrpc: '2.0', method: 'notifications/initialized', params: {} };
  const ids = [initializeId, ...requests.map((request) => request.id)];
  if (ids.some((id) => typeof id !== 'string' && !Number.isSafeInteger(id)) || new Set(ids).size !== ids.length) {
    throw new TypeError('MCP session requests require distinct string/integer IDs');
  }
  const expected = new Set(ids);
  const encode = (messages) => messages.map((message) => `${JSON.stringify(message)}\n`).join('');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entrypoint], {
      cwd: workspace, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PEA_WORKSPACE: workspace, PEA_ENVIRONMENT: 'production', PEA_GRANTS: '' },
    });
    const messages = [];
    const responseById = new Map();
    let buffer = '';
    let stderr = '';
    let failure;
    const fail = (error) => {
      failure ??= error;
      child.kill(); // Only the child this session owns.
    };
    const deadline = setTimeout(() => fail(new Error(`MCP session timed out; missing response IDs: ${JSON.stringify([...expected])}`)), timeoutMs);
    child.once('error', (error) => { clearTimeout(deadline); reject(error); });
    child.stdin.on('error', (error) => { if (expected.size > 0) fail(error); });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      let newline;
      try {
        while ((newline = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newline);
          buffer = buffer.slice(newline + 1);
          if (!line.trim()) continue;
          const message = JSON.parse(line);
          messages.push(message);
          if (!Object.hasOwn(message, 'id')) continue;
          if (responseById.has(message.id)) throw new Error(`duplicate MCP response ID: ${message.id}`);
          responseById.set(message.id, message);
          expected.delete(message.id);
          if (!finiteInput && message.id === initializeId) {
            if (message.error || message.result?.protocolVersion !== initialize.params.protocolVersion) {
              throw new Error('MCP initialize did not negotiate the requested protocol');
            }
            child.stdin.write(encode([initialized, ...requests]));
          }
          if (!finiteInput && expected.size === 0) child.stdin.end();
        }
      } catch (error) { fail(error); }
    });
    child.once('close', (code) => {
      clearTimeout(deadline);
      if (failure) reject(failure);
      else if (code !== 0) reject(new Error(`MCP process failed (${code}): ${stderr.trim()}`));
      else if (expected.size > 0) reject(new Error(`missing MCP response IDs: ${JSON.stringify([...expected])}; ${stderr.trim()}`));
      else if (buffer.trim()) reject(new Error('MCP process returned an incomplete output frame'));
      else resolve({ messages, responseById, stderr });
    });
    if (finiteInput) child.stdin.end(encode([initialize, initialized, ...requests]));
    else child.stdin.write(encode([initialize]));
  });
}
