import { randomUUID } from 'node:crypto';

function byteLength(value, label) {
  try {
    return Buffer.byteLength(JSON.stringify(value));
  } catch {
    throw Object.assign(new TypeError(`${label} must be JSON serializable`), { code: `SUBAGENT_${label.toUpperCase()}_INVALID` });
  }
}

function failure(base, code, message) {
  return { ...base, status: 'failed', error: { code, message: String(message).slice(0, 500) } };
}

function validCheckpoint(value) {
  return value && typeof value.id === 'string' && value.id.length > 0
    && ['snapshot', 'worktree'].includes(value.kind)
    && typeof value.reference === 'string' && value.reference.length > 0;
}

export function createSubagentSupervisor(options = {}) {
  if (typeof options.invoke !== 'function') throw new TypeError('subagent invoke adapter is required');
  const maxDepth = options.maxDepth ?? 2;
  const maxConcurrent = options.maxConcurrent ?? 2;
  const maxInputBytes = options.maxInputBytes ?? 32 * 1024;
  const maxOutputBytes = options.maxOutputBytes ?? 256 * 1024;
  const timeoutMs = options.timeoutMs ?? 60_000;
  const idFactory = options.idFactory ?? randomUUID;
  const clock = options.clock ?? Date.now;
  for (const [name, value] of Object.entries({ maxDepth, maxConcurrent, maxInputBytes, maxOutputBytes, timeoutMs })) {
    if (!Number.isInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer`);
  }
  let active = 0;

  return {
    async run(spec, context = {}) {
      const id = idFactory();
      const base = {
        schemaVersion: 1,
        id,
        parentId: typeof context.parentId === 'string' ? context.parentId : null,
        depth: context.depth,
        role: spec?.role,
        tool: spec?.tool,
        allowedTools: Array.isArray(context.allowedTools) ? [...context.allowedTools] : [],
        startedAt: new Date(clock()).toISOString(),
      };
      if (!spec || typeof spec.role !== 'string' || spec.role.length < 1 || spec.role.length > 100
        || typeof spec.tool !== 'string' || spec.tool.length < 1) {
        return failure(base, 'SUBAGENT_SPEC_INVALID', 'role and tool are required');
      }
      if (!Number.isInteger(context.depth) || context.depth < 1 || context.depth > maxDepth) {
        return failure(base, 'SUBAGENT_DEPTH_EXCEEDED', `depth must be between 1 and ${maxDepth}`);
      }
      if (!base.allowedTools.includes(spec.tool)) {
        return failure(base, 'SUBAGENT_TOOL_DENIED', 'tool is not in the child allowlist');
      }
      try {
        if (byteLength(spec.input ?? {}, 'input') > maxInputBytes) {
          return failure(base, 'SUBAGENT_INPUT_TOO_LARGE', `input exceeds ${maxInputBytes} bytes`);
        }
      } catch (error) {
        return failure(base, error.code, error.message);
      }
      if (active >= maxConcurrent) {
        return failure(base, 'SUBAGENT_CONCURRENCY_EXCEEDED', `at most ${maxConcurrent} child runs are allowed`);
      }
      if (context.signal?.aborted) return failure(base, 'SUBAGENT_CANCELLED', 'child run was cancelled');
      if (spec.mutating && (typeof options.checkpoint !== 'function' || typeof options.diff !== 'function')) {
        return failure(base, 'SUBAGENT_CHECKPOINT_UNAVAILABLE', 'mutating runs require checkpoint and diff adapters');
      }

      active += 1;
      let checkpoint;
      let timer;
      let abortListener;
      const controller = new AbortController();
      try {
        if (spec.mutating) {
          checkpoint = await options.checkpoint({ id, parentId: base.parentId, role: spec.role });
          if (!validCheckpoint(checkpoint)) {
            return failure(base, 'SUBAGENT_CHECKPOINT_INVALID', 'checkpoint adapter returned invalid evidence');
          }
        }
        const races = [
          Promise.resolve().then(() => options.invoke({
            id,
            parentId: base.parentId,
            depth: context.depth,
            role: spec.role,
            tool: spec.tool,
            input: spec.input ?? {},
            signal: controller.signal,
          })),
          new Promise((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(Object.assign(new Error('child run timed out'), { code: 'SUBAGENT_TIMEOUT' }));
            }, timeoutMs);
          }),
        ];
        if (context.signal) races.push(new Promise((_, reject) => {
          abortListener = () => {
            controller.abort();
            reject(Object.assign(new Error('child run was cancelled'), { code: 'SUBAGENT_CANCELLED' }));
          };
          context.signal.addEventListener('abort', abortListener, { once: true });
        }));
        const output = await Promise.race(races);
        if (byteLength(output, 'output') > maxOutputBytes) {
          throw Object.assign(new Error(`output exceeds ${maxOutputBytes} bytes`), { code: 'SUBAGENT_OUTPUT_TOO_LARGE' });
        }
        if (!spec.mutating) return { ...base, status: 'completed', output };
        const diff = await options.diff(checkpoint, { id, output });
        if (!diff || typeof diff !== 'object' || byteLength(diff, 'diff') > maxOutputBytes) {
          throw Object.assign(new Error('diff evidence is missing or oversized'), { code: 'SUBAGENT_DIFF_INVALID' });
        }
        return { ...base, status: 'awaiting-review', checkpoint, diff, output };
      } catch (error) {
        const result = failure(base, error?.code ?? 'SUBAGENT_INVOCATION_FAILED', error?.message ?? error);
        if (checkpoint && typeof options.rollback === 'function') {
          try {
            const recovered = await options.rollback(checkpoint, { id });
            result.recovery = { attempted: true, restored: recovered?.restored === true };
          } catch {
            result.recovery = { attempted: true, restored: false };
          }
        }
        return result;
      } finally {
        clearTimeout(timer);
        if (context.signal && abortListener) context.signal.removeEventListener('abort', abortListener);
        active -= 1;
      }
    },
  };
}
