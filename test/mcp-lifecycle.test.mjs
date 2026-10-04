import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough, Writable } from 'node:stream';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { createEofDrainingTransport as createTransport } from '../packages/mcp/src/draining-stdio.mjs';

const line = (message) => `${JSON.stringify(message)}\n`;
const request = (id) => ({ jsonrpc: '2.0', id, method: 'tools/list', params: {} });

async function setup(options = {}) {
  const stdin = options.stdin ?? new PassThrough();
  const chunks = [];
  const stdout = options.stdout ?? new Writable({
    write(chunk, _encoding, callback) { chunks.push(chunk.toString()); callback(); },
  });
  const transport = createTransport({ stdin, stdout, drainTimeoutMs: 500, ...options });
  const messages = [];
  const errors = [];
  let closeCount = 0;
  let resolveClose;
  const closed = new Promise((resolve) => { resolveClose = resolve; });
  transport.onmessage = (message) => { messages.push(message); };
  transport.onerror = (error) => { errors.push(error); };
  transport.onclose = () => { closeCount += 1; resolveClose(); };
  await transport.start();
  return { stdin, stdout, transport, messages, errors, chunks, closed, get closeCount() { return closeCount; } };
}

test('finite stdin drains asynchronous responses, including zero and empty IDs, before close', { timeout: 2000 }, async () => {
  const f = await setup();
  f.stdin.end(line(request(0)) + line(request('')));
  await nextTurn();
  assert.deepEqual(f.messages.map((message) => message.id), [0, '']);
  assert.equal(f.closeCount, 0, 'EOF must leave accepted requests answerable');
  await f.transport.send({ jsonrpc: '2.0', id: '', result: { ok: true } });
  assert.equal(f.closeCount, 0);
  await f.transport.send({ jsonrpc: '2.0', id: 0, error: { code: -32602, message: 'invalid arguments' } });
  await f.closed;
  assert.equal(f.closeCount, 1);
  assert.deepEqual(f.chunks.join('').trim().split('\n').map((value) => JSON.parse(value).id), ['', 0]);
  assert.equal(f.errors.length, 0);
});

test('EOF waits for actual output callbacks under backpressure', { timeout: 2000 }, async () => {
  let finishWrite;
  let started;
  const wrote = new Promise((resolve) => { started = resolve; });
  const stdout = new Writable({ highWaterMark: 1, write(chunk, _encoding, callback) {
    if (chunk.length === 0) callback();
    else { finishWrite = callback; started(); }
  } });
  const f = await setup({ stdout, drainTimeoutMs: 500 });
  f.stdin.write(line(request(4)));
  const sent = f.transport.send({ jsonrpc: '2.0', id: 4, result: { text: 'x'.repeat(100_000) } });
  await wrote;
  f.stdin.end();
  await nextTurn();
  assert.equal(f.closeCount, 0, 'buffered output must finish before closing');
  // Empty writable barriers complete synchronously; they carry no protocol bytes.
  finishWrite();
  await sent;
  await f.closed;
  assert.equal(f.closeCount, 1);
  assert.equal(f.errors.length, 0);
});

test('stalled EOF drain reports a deadline and closes instead of waiting indefinitely', { timeout: 2000 }, async () => {
  const f = await setup({ drainTimeoutMs: 40 });
  f.stdin.end(line(request(9)));
  await f.closed;
  assert.match(f.errors[0]?.message ?? '', /MCP_EOF_DRAIN_TIMEOUT/);
  assert.equal(f.stdout.destroyed, true);
  assert.equal(f.closeCount, 1);
});

test('explicit cancellation retires a zero request ID while preserving the notification', { timeout: 2000 }, async () => {
  const f = await setup();
  const cancelled = { jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 0, reason: 'cancelled by client' } };
  f.stdin.end(line(request(0)) + line(cancelled));
  await f.closed;
  assert.deepEqual(f.messages[1], cancelled);
  assert.equal(f.errors.length, 0);
  assert.equal(f.chunks.length, 0);
});

test('malformed cancellation cannot retire an accepted request', { timeout: 2000 }, async () => {
  const f = await setup({ drainTimeoutMs: 40 });
  f.stdin.end(line(request(1)) + line({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 1, reason: 42 } }));
  await f.closed;
  assert.match(f.errors[0]?.message ?? '', /MCP_EOF_DRAIN_TIMEOUT/);
});

test('a request using the cancellation notification method cannot retire another request', { timeout: 2000 }, async () => {
  const f = await setup();
  f.stdin.end(line(request(0)) + line({ jsonrpc: '2.0', id: 99, method: 'notifications/cancelled', params: { requestId: 0 } }));
  await nextTurn();
  await f.transport.send({ jsonrpc: '2.0', id: 99, error: { code: -32601, message: 'unsupported request method' } });
  assert.equal(f.closeCount, 0, 'only a cancellation notification can retire the original request');
  await f.transport.send({ jsonrpc: '2.0', id: 0, result: {} });
  await f.closed;
  assert.equal(f.errors.length, 0);
});

test('notification-only EOF closes once and preserves unrelated source listeners', { timeout: 2000 }, async () => {
  const stdin = new PassThrough();
  const external = () => {};
  stdin.on('data', external);
  const f = await setup({ stdin });
  f.stdin.end(line({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }));
  await f.closed;
  await f.transport.close();
  assert.equal(f.closeCount, 1);
  assert.ok(stdin.listeners('data').includes(external));
  assert.equal(f.errors.length, 0);
});

test('input disconnect without EOF aborts promptly rather than draining', { timeout: 2000 }, async () => {
  const f = await setup({ drainTimeoutMs: 1000 });
  f.stdin.write(line(request(2)));
  f.stdin.destroy();
  await f.closed;
  assert.equal(f.errors.length, 0);
});

test('output failure rejects pending send and closes the transport', { timeout: 2000 }, async () => {
  const stdout = new Writable({ write(_chunk, _encoding, callback) { callback(new Error('output disconnected')); } });
  const f = await setup({ stdout, drainTimeoutMs: 40 });
  f.stdin.write(line(request(2)));
  await assert.rejects(f.transport.send({ jsonrpc: '2.0', id: 2, result: {} }), /output disconnected|closed/);
  await f.closed;
  assert.match(f.errors[0]?.message ?? '', /output disconnected/);
});

test('explicit close rejects a blocked output send without waiting for drain', { timeout: 2000 }, async () => {
  let started;
  const wrote = new Promise((resolve) => { started = resolve; });
  const stdout = new Writable({ highWaterMark: 1, write() { started(); } });
  const f = await setup({ stdout });
  const baselineErrors = stdout.listenerCount('error');
  f.stdin.write(line(request(2)));
  const sent = f.transport.send({ jsonrpc: '2.0', id: 2, result: {} });
  const rejected = assert.rejects(sent, /closed/);
  await wrote;
  await f.transport.close();
  await rejected;
  assert.equal(stdout.destroyed, true, 'hard close must abort the owned blocked output');
  await nextTurn();
  assert.equal(stdout.listenerCount('drain'), 0);
  assert.equal(stdout.listenerCount('error'), baselineErrors);
});

test('EOF deadline rejects a blocked SDK write and releases its send listeners', { timeout: 2000 }, async () => {
  let started;
  const wrote = new Promise((resolve) => { started = resolve; });
  const stdout = new Writable({ highWaterMark: 1, write() { started(); } });
  const f = await setup({ stdout });
  const baselineErrors = stdout.listenerCount('error');
  f.stdin.write(line(request(0)));
  const rejected = assert.rejects(f.transport.send({ jsonrpc: '2.0', id: 0, result: {} }), /closed/);
  await wrote;
  f.stdin.end();
  await f.closed;
  await rejected;
  await nextTurn();
  assert.match(f.errors[0]?.message ?? '', /MCP_EOF_DRAIN_TIMEOUT/);
  assert.equal(stdout.listenerCount('drain'), 0);
  assert.equal(stdout.listenerCount('error'), baselineErrors);
});

test('SDK request size bound remains fail-closed through the lifecycle adapter', { timeout: 2000 }, async () => {
  const f = await setup({ maxBufferSize: 100 });
  f.stdin.end(`${'x'.repeat(101)}\n${line(request(3))}`);
  await f.closed;
  assert.equal(f.messages.length, 0);
  assert.match(f.errors[0]?.message ?? '', /exceeded maximum size/);
});
