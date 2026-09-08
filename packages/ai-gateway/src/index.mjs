const SECRET_KEY = /(?:password|passwd|secret|token|api[_-]?key|authorization|credential)/i;

function fail(code, message) {
  return { schemaVersion: 1, status: 'failed', error: { code, message } };
}

function redact(value) {
  let redactedFields = 0;
  let serialized;
  try {
    serialized = JSON.stringify(value ?? {}, (key, item) => {
      if (key && SECRET_KEY.test(key)) {
        redactedFields += 1;
        return '[REDACTED]';
      }
      return item;
    });
  } catch {
    return { error: 'AI_CONTEXT_INVALID' };
  }
  return { data: JSON.parse(serialized), redactedFields };
}

function validRequest(request) {
  return request && typeof request === 'object'
    && typeof request.instruction === 'string'
    && request.instruction.length > 0
    && request.context && typeof request.context === 'object'
    && !Array.isArray(request.context);
}

function validateOutputSchema(output, schema) {
  if (!output || typeof output !== 'object' || Array.isArray(output)) return false;
  if (!schema) return true;
  if (schema.type && schema.type !== 'object') return false;
  return !Array.isArray(schema.required) || schema.required.every((key) => Object.hasOwn(output, key));
}

export function createAiGateway(options = {}) {
  const provider = options.provider;
  const authorize = typeof options.authorize === 'function'
    ? options.authorize
    : options.authorize?.authorize?.bind(options.authorize);
  const timeoutMs = options.timeoutMs ?? 60_000;
  const maxRequestBytes = options.maxRequestBytes ?? 64 * 1024;
  const maxResponseBytes = options.maxResponseBytes ?? 256 * 1024;
  const clock = options.clock ?? Date.now;
  for (const [name, value] of Object.entries({ timeoutMs, maxRequestBytes, maxResponseBytes })) {
    if (!Number.isInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer`);
  }

  return {
    async run(request, context = {}) {
      if (!provider || typeof provider.id !== 'string' || typeof provider.complete !== 'function') {
        return fail('AI_PROVIDER_UNAVAILABLE', 'No AI provider is configured');
      }
      if (typeof authorize !== 'function') return fail('AI_CAPABILITY_DENIED', 'No capability authorizer is configured');
      if (!validRequest(request)) return fail('AI_REQUEST_INVALID', 'instruction and object context are required');
      if (context.signal?.aborted) return fail('AI_CANCELLED', 'AI request was cancelled');
      const decision = await authorize(context.environment ?? 'local', 'ai:invoke', {
        grants: context.grants ?? [], signal: context.signal, purpose: request.instruction.slice(0, 200),
      });
      if (!decision?.allowed) return {
        ...fail('AI_CAPABILITY_DENIED', decision?.reason ?? 'AI invocation was denied'), decision,
      };

      const protectedContext = redact(request.context);
      if (protectedContext.error) return fail(protectedContext.error, 'context must be JSON serializable');
      const providerRequest = {
        schemaVersion: 1,
        instruction: request.instruction,
        context: { trust: 'untrusted-project-data', data: protectedContext.data },
        outputSchema: request.outputSchema ?? { type: 'object' },
      };
      if (Buffer.byteLength(JSON.stringify(providerRequest)) > maxRequestBytes) {
        return fail('AI_REQUEST_TOO_LARGE', `AI request exceeds ${maxRequestBytes} bytes`);
      }

      const startedAt = clock();
      const controller = new AbortController();
      let timer;
      let abortListener;
      try {
        const races = [
          Promise.resolve().then(() => provider.complete(providerRequest, { signal: controller.signal })),
          new Promise((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(Object.assign(new Error('AI provider timed out'), { code: 'AI_TIMEOUT' }));
            }, timeoutMs);
          }),
        ];
        if (context.signal) races.push(new Promise((_, reject) => {
          abortListener = () => {
            controller.abort();
            reject(Object.assign(new Error('AI request was cancelled'), { code: 'AI_CANCELLED' }));
          };
          context.signal.addEventListener('abort', abortListener, { once: true });
        }));
        const response = await Promise.race(races);
        if (!validateOutputSchema(response?.output, providerRequest.outputSchema)) {
          return fail('AI_RESPONSE_INVALID', 'Provider must return structured output matching required fields');
        }
        if (Buffer.byteLength(JSON.stringify(response.output)) > maxResponseBytes) {
          return fail('AI_RESPONSE_TOO_LARGE', `AI response exceeds ${maxResponseBytes} bytes`);
        }
        return {
          schemaVersion: 1,
          status: 'completed',
          provider: { id: provider.id, model: typeof response.model === 'string' ? response.model : null },
          output: response.output,
          privacy: { redactedFields: protectedContext.redactedFields, telemetry: 'disabled' },
          durationMs: Math.max(0, clock() - startedAt),
        };
      } catch (error) {
        return fail(error?.code ?? 'AI_PROVIDER_FAILED', String(error?.message ?? error).slice(0, 500));
      } finally {
        clearTimeout(timer);
        if (context.signal && abortListener) context.signal.removeEventListener('abort', abortListener);
      }
    },
  };
}
