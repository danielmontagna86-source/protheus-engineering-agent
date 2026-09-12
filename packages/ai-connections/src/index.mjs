import { createHash } from 'node:crypto';

const CONNECTION_FIELDS = new Set(['schemaVersion', 'id', 'provider', 'mode', 'secretRef', 'model']);
const ROUTE_FIELDS = new Set(['schemaVersion', 'id', 'profile', 'primary', 'fallbacks', 'allowedProviders', 'maxInputBytes', 'maxOutputBytes', 'maxCostUsd']);
const RECEIPT_FIELDS = new Set(['schemaVersion', 'status', 'routeId', 'attempt', 'connectionId', 'provider', 'model', 'durationMs', 'inputSha256', 'outputSha256', 'usage', 'errorCode']);
const RETRYABLE_CODES = new Set(['AI_TIMEOUT', 'AI_PROVIDER_UNAVAILABLE', 'AI_RATE_LIMITED', 'AI_PROVIDER_TRANSIENT']);

export const TASK_PROFILES = Object.freeze({
  analysis: Object.freeze({ tools: Object.freeze({ read: 'allow', write: 'deny', shell: 'deny', database: 'deny', build: 'deny' }) }),
  plan: Object.freeze({ tools: Object.freeze({ read: 'allow', write: 'deny', shell: 'deny', database: 'deny', build: 'deny' }) }),
  review: Object.freeze({ tools: Object.freeze({ read: 'allow', write: 'deny', shell: 'deny', database: 'deny', build: 'deny' }) }),
});

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
}

function rejectUnknown(value, fields, name) {
  for (const key of Object.keys(value)) {
    if (!fields.has(key)) throw new TypeError(`unsupported ${name} field: ${key}`);
  }
}

function identifier(value, name) {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9.-]{0,79}$/.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}

function modelIdentifier(value, name) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._/-]{1,160}$/.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}

function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer`);
  return value;
}

function nonnegativeInteger(value, name) {
  if (!Number.isInteger(value) || value < 0) throw new TypeError(`${name} must be a non-negative integer`);
  return value;
}

function digest(value, name) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new TypeError(`${name} must be a SHA-256`);
  return value;
}

export function validateConnection(value, options = {}) {
  requireObject(value, 'connection');
  rejectUnknown(value, CONNECTION_FIELDS, 'connection');
  if (value.schemaVersion !== 1) throw new TypeError('connection schemaVersion must be 1');
  const provider = identifier(value.provider, 'provider');
  if (!Array.isArray(options.providers) || !options.providers.includes(provider)) throw new TypeError(`unsupported provider: ${provider}`);
  if (!['api-key', 'managed-login', 'external-host'].includes(value.mode)) throw new TypeError('connection mode is invalid');
  if (value.mode === 'api-key' && typeof value.secretRef !== 'string') throw new TypeError('api-key connection requires secretRef');
  if (value.mode === 'api-key' && typeof value.model !== 'string') throw new TypeError('api-key connection requires model');
  if (value.secretRef !== undefined) identifier(value.secretRef, 'secretRef');
  return Object.freeze({
    schemaVersion: 1, id: identifier(value.id, 'connection id'), provider, mode: value.mode,
    ...(value.secretRef ? { secretRef: value.secretRef } : {}),
    ...(value.model ? { model: modelIdentifier(value.model, 'connection model') } : {}),
  });
}

export function validateRoute(value, options = {}) {
  requireObject(value, 'route');
  rejectUnknown(value, ROUTE_FIELDS, 'route');
  if (value.schemaVersion !== 1) throw new TypeError('route schemaVersion must be 1');
  if (!Object.hasOwn(TASK_PROFILES, value.profile)) throw new TypeError('route profile is invalid');
  const connections = new Set(options.connections ?? []);
  const primary = identifier(value.primary, 'primary');
  if (!connections.has(primary)) throw new TypeError(`unknown connection: ${primary}`);
  if (!Array.isArray(value.fallbacks) || value.fallbacks.some((connection) => typeof connection !== 'string')) throw new TypeError('fallbacks must be a string array');
  const fallbacks = value.fallbacks.map((connection) => identifier(connection, 'fallback connection'));
  if (new Set([primary, ...fallbacks]).size !== fallbacks.length + 1) throw new TypeError('route contains duplicate connection');
  if (fallbacks.some((connection) => !connections.has(connection))) throw new TypeError('route contains unknown connection');
  if (!Array.isArray(value.allowedProviders) || value.allowedProviders.length === 0) throw new TypeError('allowedProviders must not be empty');
  const allowedProviders = value.allowedProviders.map((provider) => identifier(provider, 'allowed provider'));
  if (new Set(allowedProviders).size !== allowedProviders.length) throw new TypeError('allowedProviders contains duplicate provider');
  const maxCostUsd = value.maxCostUsd ?? null;
  if (maxCostUsd !== null && (typeof maxCostUsd !== 'number' || !Number.isFinite(maxCostUsd) || maxCostUsd <= 0)) throw new TypeError('maxCostUsd must be positive or null');
  return Object.freeze({
    schemaVersion: 1, id: identifier(value.id, 'route id'), profile: value.profile, primary, fallbacks, allowedProviders,
    maxInputBytes: positiveInteger(value.maxInputBytes, 'maxInputBytes'), maxOutputBytes: positiveInteger(value.maxOutputBytes, 'maxOutputBytes'), maxCostUsd,
  });
}

export function createReceipt(value) {
  requireObject(value, 'receipt');
  rejectUnknown(value, RECEIPT_FIELDS, 'receipt');
  if (value.errorCode !== undefined && value.status !== 'failed') throw new TypeError('errorCode requires failed receipt');
  const usage = value.usage ?? {};
  requireObject(usage, 'usage');
  for (const [name, count] of Object.entries(usage)) nonnegativeInteger(count, `usage.${name}`);
  return Object.freeze({
    schemaVersion: 1, status: value.status ?? 'completed', routeId: identifier(value.routeId, 'routeId'), attempt: positiveInteger(value.attempt, 'attempt'),
    connectionId: identifier(value.connectionId, 'connectionId'), provider: identifier(value.provider, 'provider'), model: typeof value.model === 'string' && value.model.length > 0 ? value.model.slice(0, 160) : null,
    durationMs: positiveInteger(value.durationMs, 'durationMs'), inputSha256: digest(value.inputSha256, 'inputSha256'), outputSha256: digest(value.outputSha256, 'outputSha256'), usage: { ...usage },
    ...(value.errorCode ? { errorCode: identifier(value.errorCode.toLowerCase(), 'errorCode') } : {}),
  });
}

function sha256(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function errorCode(error) {
  const value = String(error?.code ?? 'AI_PROVIDER_FAILED').toLowerCase().replace(/[^a-z0-9.-]/g, '-');
  return /^[a-z]/.test(value) ? value.slice(0, 80) : 'ai-provider-failed';
}

function isRetryable(error) {
  return error?.retryable === true || RETRYABLE_CODES.has(error?.code);
}

function receiptUsage(usage) {
  const safe = {};
  for (const name of ['inputTokens', 'outputTokens']) {
    if (Number.isInteger(usage?.[name]) && usage[name] >= 0) safe[name] = usage[name];
  }
  return safe;
}

export function createRouteProvider(options = {}) {
  const route = options.route;
  const connections = options.connections;
  const resolveProvider = options.resolveProvider;
  const receiptSink = options.receiptSink;
  if (!route || typeof route !== 'object') throw new TypeError('route is required');
  if (!(connections instanceof Map)) throw new TypeError('connections must be a Map');
  if (typeof resolveProvider !== 'function') throw new TypeError('resolveProvider is required');
  if (receiptSink !== undefined && typeof receiptSink !== 'function') throw new TypeError('receiptSink must be a function');

  const orderedConnections = [route.primary, ...(route.fallbacks ?? [])];
  return {
    id: `pea-route.${route.id}`,
    async complete(request, context = {}) {
      if (Buffer.byteLength(JSON.stringify(request)) > route.maxInputBytes) {
        throw Object.assign(new Error('AI route input exceeds its approved byte limit'), { code: 'AI_REQUEST_TOO_LARGE' });
      }
      const inputSha256 = sha256({ instruction: request?.instruction, context: request?.context, outputSchema: request?.outputSchema });
      let lastError;
      for (let index = 0; index < orderedConnections.length; index += 1) {
        if (context.signal?.aborted) throw Object.assign(new Error('AI request was cancelled'), { code: 'AI_CANCELLED' });
        const connectionId = orderedConnections[index];
        const connection = connections.get(connectionId);
        if (!connection || !route.allowedProviders.includes(connection.provider)) {
          throw Object.assign(new Error(`Route connection is unavailable: ${connectionId}`), { code: 'AI_CONNECTION_UNAVAILABLE' });
        }
        const provider = resolveProvider(connection, { route, profile: TASK_PROFILES[route.profile] });
        if (!provider || typeof provider.complete !== 'function' || typeof provider.id !== 'string') {
          throw Object.assign(new Error(`Route provider is unavailable: ${connection.provider}`), { code: 'AI_PROVIDER_UNAVAILABLE' });
        }
        const startedAt = Date.now();
        try {
          const response = await provider.complete(request, context);
          if (Buffer.byteLength(JSON.stringify(response?.output)) > route.maxOutputBytes) {
            throw Object.assign(new Error('AI route output exceeds its approved byte limit'), { code: 'AI_RESPONSE_TOO_LARGE' });
          }
          const costUsd = response?.costUsd;
          if (route.maxCostUsd !== null && (typeof costUsd !== 'number' || !Number.isFinite(costUsd))) {
            throw Object.assign(new Error('AI route budget cannot be verified for this provider response'), { code: 'AI_BUDGET_UNVERIFIED' });
          }
          if (route.maxCostUsd !== null && costUsd > route.maxCostUsd) {
            throw Object.assign(new Error('AI route budget was exceeded'), { code: 'AI_BUDGET_EXCEEDED' });
          }
          const result = { model: response?.model ?? null, output: response?.output, ...(response?.usage ? { usage: response.usage } : {}) };
          const receipt = createReceipt({
            status: 'completed', routeId: route.id, attempt: index + 1, connectionId, provider: connection.provider, model: result.model,
            durationMs: Math.max(1, Date.now() - startedAt), inputSha256, outputSha256: sha256(result.output), usage: receiptUsage(response?.usage),
          });
          await receiptSink?.(receipt);
          return result;
        } catch (error) {
          lastError = error;
          const receipt = createReceipt({
            status: 'failed', routeId: route.id, attempt: index + 1, connectionId, provider: connection.provider, model: null,
            durationMs: Math.max(1, Date.now() - startedAt), inputSha256, outputSha256: sha256(null), usage: {}, errorCode: errorCode(error),
          });
          await receiptSink?.(receipt);
          if (!isRetryable(error) || index === orderedConnections.length - 1) throw error;
        }
      }
      throw lastError ?? Object.assign(new Error('AI route has no connection'), { code: 'AI_CONNECTION_UNAVAILABLE' });
    },
  };
}
