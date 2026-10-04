import { PassThrough } from 'node:stream';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';

export const EOF_DRAIN_TIMEOUT_MS = 5_000;

const isRequestId = (value) => typeof value === 'string' || Number.isSafeInteger(value);
const isResponse = (message) => isRequestId(message.id)
  && (Object.hasOwn(message, 'result') || Object.hasOwn(message, 'error'));

/**
 * PEA's finite-input compatibility layer. The SDK owns parsing and serialization;
 * a normal source EOF closes the public transport only after accepted requests
 * and output callbacks settle. A disconnected peer, explicit close or deadline
 * still aborts through the SDK's normal onclose chain.
 */
export function createEofDrainingTransport({
  stdin = process.stdin,
  stdout = process.stdout,
  maxBufferSize,
  drainTimeoutMs = EOF_DRAIN_TIMEOUT_MS,
} = {}) {
  if (!Number.isSafeInteger(drainTimeoutMs) || drainTimeoutMs <= 0) {
    throw new TypeError('drainTimeoutMs must be a positive safe integer');
  }
  const input = new PassThrough();
  const wire = new StdioServerTransport(input, stdout, { maxBufferSize });
  const pending = new Map();
  const sendFailures = new Set();
  let ended = false;
  let closed = false;
  let started = false;
  let writing = 0;
  let deadline;

  const finishIfDrained = () => {
    if (ended && !closed && pending.size === 0 && writing === 0) void transport.close();
  };
  const onEnd = () => {
    if (ended || closed) return;
    ended = true;
    deadline = setTimeout(() => {
      try {
        transport.onerror?.(new Error(`MCP_EOF_DRAIN_TIMEOUT: requests or output did not drain within ${drainTimeoutMs} ms`));
      } finally {
        void transport.close();
        // An unread pipe must not retain buffered writes after the deadline.
        stdout.destroy(new Error('MCP_EOF_DRAIN_TIMEOUT: output discarded'));
      }
    }, drainTimeoutMs);
    finishIfDrained();
  };
  const onInputClose = () => {
    // Node streams may emit close after their normal end. Only a close without
    // EOF represents a broken input channel and bypasses graceful draining.
    if (!ended) void transport.close();
  };
  const onInputError = (error) => {
    try { transport.onerror?.(error); } finally { void transport.close(); }
  };
  const onOutputClose = () => { void transport.close(); };

  const transport = {
    onmessage: undefined,
    onerror: undefined,
    onclose: undefined,
    async start() {
      if (started || closed) throw new Error('PEA stdio transport cannot be started twice or after close');
      started = true;
      stdin.on('end', onEnd);
      stdin.on('close', onInputClose);
      stdin.on('error', onInputError);
      stdout.on('close', onOutputClose);
      await wire.start();
      if (closed) return;
      if (stdout.destroyed || stdin.destroyed && !stdin.readableEnded) {
        await transport.close();
      } else if (stdin.readableEnded) {
        setImmediate(onEnd);
      } else {
        // end:false is a public Node stream option. No SDK listener is removed
        // or replaced: the SDK never sees source EOF before PEA finishes drain.
        stdin.pipe(input, { end: false });
      }
    },
    async close() {
      await wire.close();
    },
    async send(message, options) {
      if (closed) throw new Error('PEA stdio transport is closed');
      writing += 1;
      let rejectOnClose;
      const failedOnClose = new Promise((_, reject) => { rejectOnClose = reject; sendFailures.add(reject); });
      try {
        await Promise.race([
          (async () => {
            await wire.send(message, options);
            // The SDK respects write()/drain backpressure. This empty writable
            // barrier additionally waits for actual callbacks of preceding
            // writes; it emits no protocol bytes and does not end stdout.
            await new Promise((resolve, reject) => {
              stdout.write('', (error) => { if (error) reject(error); else resolve(); });
            });
          })(),
          failedOnClose,
        ]);
        if (isResponse(message) && pending.has(message.id)) {
          const remaining = pending.get(message.id) - 1;
          if (remaining === 0) pending.delete(message.id);
          else pending.set(message.id, remaining);
        }
      } finally {
        sendFailures.delete(rejectOnClose);
        writing -= 1;
        finishIfDrained();
      }
    },
  };

  wire.onmessage = (message) => {
    if (isRequestId(message.id) && typeof message.method === 'string') {
      pending.set(message.id, (pending.get(message.id) ?? 0) + 1);
    }
    transport.onmessage?.(message);
    if (!Object.hasOwn(message, 'id') && message.method === 'notifications/cancelled'
      && isRequestId(message.params?.requestId)
      && (message.params.reason === undefined || typeof message.params.reason === 'string')) {
      pending.delete(message.params.requestId);
      finishIfDrained();
    }
  };
  wire.onerror = (error) => { transport.onerror?.(error); };
  wire.onclose = () => {
    if (closed) return;
    closed = true;
    clearTimeout(deadline);
    pending.clear();
    stdin.unpipe(input);
    stdin.off('end', onEnd);
    stdin.off('close', onInputClose);
    stdin.off('error', onInputError);
    stdout.off('close', onOutputClose);
    if (stdin.listenerCount('data') === 0) stdin.pause();
    input.destroy();
    // Reject the SDK's own write()/drain wait as well as our outer send promise.
    // Normal EOF reaches here only after writing===0, so successful output is
    // preserved. Hard close with a stalled write cannot leave a live pipe.
    if (writing > 0 && !stdout.destroyed) stdout.destroy(new Error('PEA stdio transport is closed'));
    for (const reject of sendFailures) reject(new Error('PEA stdio transport is closed'));
    transport.onclose?.();
  };
  return transport;
}
