import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TASK_PROFILES,
  createReceipt,
  createRouteProvider,
  validateConnection,
  validateRoute,
} from '../packages/ai-connections/src/index.mjs';
import { createConnectionManifestStore } from '../packages/ai-connections/src/store.mjs';

test('connection contract stores a secret reference but rejects secret values and unknown providers', () => {
  const connection = validateConnection({
    schemaVersion: 1, id: 'openrouter-main', provider: 'openrouter', mode: 'api-key', secretRef: 'openrouter.main',
  }, { providers: ['openrouter'] });
  assert.deepEqual(connection, {
    schemaVersion: 1, id: 'openrouter-main', provider: 'openrouter', mode: 'api-key', secretRef: 'openrouter.main',
  });
  assert.throws(() => validateConnection({ ...connection, apiKey: 'not-allowed' }, { providers: ['openrouter'] }), /unsupported connection field/i);
  assert.throws(() => validateConnection({ ...connection, provider: 'unknown' }, { providers: ['openrouter'] }), /unsupported provider/i);
});

test('route provider tries only explicit transient fallback and writes content-free receipts', async () => {
  const records = [];
  const route = validateRoute({
    schemaVersion: 1, id: 'review-standard', profile: 'review', primary: 'openrouter-main', fallbacks: ['gemini-main'],
    allowedProviders: ['openrouter', 'gemini-api'], maxInputBytes: 65536, maxOutputBytes: 131072, maxCostUsd: null,
  }, { connections: ['openrouter-main', 'gemini-main'] });
  const provider = createRouteProvider({
    route,
    connections: new Map([
      ['openrouter-main', { provider: 'openrouter' }], ['gemini-main', { provider: 'gemini-api' }],
    ]),
    resolveProvider(connection) {
      if (connection.provider === 'openrouter') return { id: 'openrouter', async complete() { throw Object.assign(new Error('temporarily unavailable'), { code: 'AI_TIMEOUT', retryable: true }); } };
      return { id: 'gemini-api', async complete() { return { model: 'gemini-test', output: { summary: 'bounded' }, usage: { inputTokens: 2, outputTokens: 1 } }; } };
    },
    receiptSink(receipt) { records.push(receipt); },
  });

  const result = await provider.complete({ instruction: 'Review', context: { data: 'untrusted' }, outputSchema: { type: 'object' } });

  assert.deepEqual(result, { model: 'gemini-test', output: { summary: 'bounded' }, usage: { inputTokens: 2, outputTokens: 1 } });
  assert.equal(records.length, 2);
  assert.deepEqual(records.map(({ connectionId, status }) => ({ connectionId, status })), [
    { connectionId: 'openrouter-main', status: 'failed' }, { connectionId: 'gemini-main', status: 'completed' },
  ]);
  assert.doesNotMatch(JSON.stringify(records), /untrusted|Review/);
});

test('route provider stops on policy or credential errors instead of leaking context to fallback', async () => {
  const route = validateRoute({
    schemaVersion: 1, id: 'review-standard', profile: 'review', primary: 'openrouter-main', fallbacks: ['gemini-main'],
    allowedProviders: ['openrouter', 'gemini-api'], maxInputBytes: 65536, maxOutputBytes: 131072, maxCostUsd: 1,
  }, { connections: ['openrouter-main', 'gemini-main'] });
  let fallbackCalled = false;
  const provider = createRouteProvider({
    route,
    connections: new Map([
      ['openrouter-main', { provider: 'openrouter' }], ['gemini-main', { provider: 'gemini-api' }],
    ]),
    resolveProvider(connection) {
      if (connection.provider === 'openrouter') return { id: 'openrouter', async complete() { throw Object.assign(new Error('bad key'), { code: 'OPENROUTER_KEY_UNAVAILABLE' }); } };
      return { id: 'gemini-api', async complete() { fallbackCalled = true; return {}; } };
    },
  });

  await assert.rejects(provider.complete({ instruction: 'Review', context: {}, outputSchema: {} }), /bad key/);
  assert.equal(fallbackCalled, false);
});

test('route provider enforces its byte and cost contracts without inferring unverified price', async () => {
  const route = validateRoute({
    schemaVersion: 1, id: 'analysis-bounded', profile: 'analysis', primary: 'openrouter-main', fallbacks: [],
    allowedProviders: ['openrouter'], maxInputBytes: 4096, maxOutputBytes: 64, maxCostUsd: 1,
  }, { connections: ['openrouter-main'] });
  const provider = createRouteProvider({
    route, connections: new Map([['openrouter-main', { provider: 'openrouter' }]]),
    resolveProvider: () => ({ id: 'openrouter', async complete() { return { model: 'test', output: { summary: 'ok' }, usage: { inputTokens: 0, outputTokens: 1 } }; } }),
  });
  await assert.rejects(provider.complete({ instruction: 'x', context: {}, outputSchema: {} }), (error) => error.code === 'AI_BUDGET_UNVERIFIED');
  await assert.rejects(provider.complete({ instruction: 'x'.repeat(5000), context: {}, outputSchema: {} }), (error) => error.code === 'AI_REQUEST_TOO_LARGE');
  const uncappedRoute = validateRoute({ ...route, id: 'analysis-uncapped', maxCostUsd: null }, { connections: ['openrouter-main'] });
  const uncapped = createRouteProvider({
    route: uncappedRoute, connections: new Map([['openrouter-main', { provider: 'openrouter' }]]),
    resolveProvider: () => ({ id: 'openrouter', async complete() { return { model: 'test', output: { summary: 'x'.repeat(100) } }; } }),
  });
  await assert.rejects(uncapped.complete({ instruction: 'x', context: {}, outputSchema: {} }), (error) => error.code === 'AI_RESPONSE_TOO_LARGE');
});

test('route contract makes every egress and fallback explicit and bounded', () => {
  const route = validateRoute({
    schemaVersion: 1, id: 'review-standard', profile: 'review', primary: 'openrouter-main',
    fallbacks: ['gemini-main'], allowedProviders: ['openrouter', 'gemini-api'],
    maxInputBytes: 65536, maxOutputBytes: 131072, maxCostUsd: 1.5,
  }, { connections: ['openrouter-main', 'gemini-main'] });
  assert.equal(route.profile, 'review');
  assert.deepEqual(route.fallbacks, ['gemini-main']);
  assert.throws(() => validateRoute({ ...route, fallbacks: ['gemini-main', 'gemini-main'] }, { connections: ['openrouter-main', 'gemini-main'] }), /duplicate/i);
  assert.throws(() => validateRoute({ ...route, allowedProviders: [] }, { connections: ['openrouter-main', 'gemini-main'] }), /allowedProviders/i);
  assert.throws(() => validateRoute({ ...route, primary: 'missing' }, { connections: ['openrouter-main', 'gemini-main'] }), /unknown connection/i);
});

test('task profiles are read-only and receipts exclude prompt, output and secret content', () => {
  assert.deepEqual(Object.keys(TASK_PROFILES).sort(), ['analysis', 'plan', 'review']);
  for (const profile of Object.values(TASK_PROFILES)) {
    assert.equal(profile.tools.write, 'deny');
    assert.equal(profile.tools.shell, 'deny');
    assert.equal(profile.tools.database, 'deny');
  }
  const receipt = createReceipt({
    routeId: 'review-standard', attempt: 1, connectionId: 'openrouter-main', provider: 'openrouter', model: 'example/model',
    durationMs: 52, inputSha256: 'a'.repeat(64), outputSha256: 'b'.repeat(64), usage: { inputTokens: 10, outputTokens: 5 },
  });
  assert.equal(receipt.status, 'completed');
  assert.equal(JSON.stringify(receipt).match(/prompt|content|secret|apiKey/i), null);
  assert.throws(() => createReceipt({ ...receipt, prompt: 'must not persist' }), /unsupported receipt field/i);
});

test('connection manifest store persists only validated non-secret project data atomically', async () => {
  const files = new Map();
  const store = createConnectionManifestStore({
    workspace: 'C:\\workspace',
    validate(value) {
      assert.equal(JSON.stringify(value).includes('apiKey'), false);
      return value;
    },
    io: {
      async mkdir() {},
      async readFile(path) {
        if (!files.has(path)) throw Object.assign(new Error('not found'), { code: 'ENOENT' });
        return files.get(path);
      },
      async writeFile(path, value) { files.set(path, value); },
      async rename(from, to) { files.set(to, files.get(from)); files.delete(from); },
    },
  });
  assert.deepEqual(await store.read(), { schemaVersion: 1, connections: [], routes: [] });
  await store.write({ schemaVersion: 1, connections: [{ id: 'gemini', secretRef: 'gemini.main' }], routes: [] });
  assert.match(files.get(store.path), /secretRef/);
  assert.doesNotMatch(files.get(store.path), /apiKey|private-/);
});
