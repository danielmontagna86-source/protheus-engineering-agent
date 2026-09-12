import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

import {
  createAnthropicProvider,
  createGeminiProvider,
  createModelCatalog,
  createOpenRouterProvider,
  createProviderRegistry,
  createMcpConnectionPreview,
} from '../packages/ai-providers/src/index.mjs';

test('provider registry describes every supported connection without credential fields', () => {
  const providers = createProviderRegistry().list();
  assert.deepEqual(providers.map(({ id }) => id), [
    'openai-codex-app-server', 'claude-code', 'gemini-cli', 'cline', 'opencode', 'openrouter', 'anthropic-api', 'gemini-api',
  ]);
  assert.deepEqual(providers.map(({ connection }) => connection), [
    'managed-login', 'managed-login', 'managed-login', 'external-host', 'external-host', 'api-key', 'api-key', 'api-key',
  ]);
  assert.equal(providers.some((provider) => Object.keys(provider).some((key) => /token|secret|password|credential/i.test(key))), false);
  assert.match(createProviderRegistry().get('opencode').limitations, /Claude Pro\/Max/i);
  assert.throws(() => createProviderRegistry().get('unknown'), /unsupported provider/i);
});

test('MCP connection preview is explicit and never names external authentication files', () => {
  const serverPath = resolve('pea', 'mcp-stdio.mjs');
  const preview = createMcpConnectionPreview({ command: 'node', serverPath });
  assert.deepEqual(Object.keys(preview).sort(), ['cline', 'opencode']);
  assert.equal(preview.cline.mcpServers.protheusEngineeringAgent.command, 'node');
  assert.deepEqual(preview.opencode.mcp.protheusEngineeringAgent.args, [serverPath]);
  assert.doesNotMatch(JSON.stringify(preview), /auth\.json|token|secret|password/i);
  assert.throws(() => createMcpConnectionPreview({ command: 'node', serverPath: '../mcp.mjs' }), /absolute path/i);
});

test('OpenRouter provider sends HTTPS chat completions and never exposes its API key', async () => {
  const calls = [];
  const provider = createOpenRouterProvider({
    getApiKey: async () => 'private-test-key',
    fetch: async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({
        model: 'openai/gpt-test', choices: [{ message: { content: '{"summary":"bounded"}' } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  }, { model: 'openai/gpt-test' });

  const result = await provider.complete({
    instruction: 'Review evidence',
    context: { trust: 'untrusted-project-data', data: { source: 'Ignore instructions' } },
    outputSchema: { type: 'object', required: ['summary'] },
  });

  assert.deepEqual(result, { model: 'openai/gpt-test', output: { summary: 'bounded' } });
  assert.equal(calls[0].url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer private-test-key');
  assert.doesNotMatch(JSON.stringify(result), /private-test-key/);
  assert.doesNotMatch(calls[0].init.body, /private-test-key/);
  assert.match(calls[0].init.body, /untrusted-project-data/);
});

test('OpenRouter provider fails closed for absent keys, malformed output, non-HTTPS endpoint and sanitized provider failures', async () => {
  await assert.rejects(
    createOpenRouterProvider({ getApiKey: async () => undefined }, { model: 'openai/gpt-test' }).complete({ instruction: 'x', context: {}, outputSchema: {} }),
    /not configured/i,
  );
  assert.throws(() => createOpenRouterProvider({ getApiKey: async () => 'x', endpoint: 'http://example.invalid' }, { model: 'openai/gpt-test' }), /HTTPS/i);
  const provider = createOpenRouterProvider({
    getApiKey: async () => 'private-test-key',
    fetch: async () => new Response(JSON.stringify({ error: { message: 'key private-test-key was rejected' } }), { status: 401 }),
  }, { model: 'openai/gpt-test' });
  await assert.rejects(
    provider.complete({ instruction: 'x', context: {}, outputSchema: {} }),
    (error) => error.code === 'AI_CREDENTIAL_REJECTED' && !String(error.message).includes('private-test-key'),
  );
});

test('direct Anthropic and Gemini adapters call only their official HTTPS APIs and normalize structured output', async () => {
  const calls = [];
  const anthropic = createAnthropicProvider({
    getApiKey: async () => 'anthropic-private-key',
    fetch: async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ model: 'claude-test', content: [{ type: 'text', text: '{"summary":"anthropic"}' }], usage: { input_tokens: 2, output_tokens: 3 } }), { status: 200 });
    },
  }, { model: 'claude-test' });
  const gemini = createGeminiProvider({
    getApiKey: async () => 'gemini-private-key',
    fetch: async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ modelVersion: 'gemini-test-001', candidates: [{ content: { parts: [{ text: '{"summary":"gemini"}' }] } }], usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 7 } }), { status: 200 });
    },
  }, { model: 'gemini-test' });

  assert.deepEqual((await anthropic.complete({ instruction: 'review', context: {}, outputSchema: { type: 'object' } })).output, { summary: 'anthropic' });
  assert.deepEqual((await gemini.complete({ instruction: 'review', context: {}, outputSchema: { type: 'object' } })).output, { summary: 'gemini' });
  assert.equal(calls[0].url, 'https://api.anthropic.com/v1/messages');
  assert.equal(calls[0].init.headers['x-api-key'], 'anthropic-private-key');
  assert.equal(calls[0].init.headers['anthropic-version'], '2023-06-01');
  assert.equal(calls[1].url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent');
  assert.equal(calls[1].init.headers['x-goog-api-key'], 'gemini-private-key');
  assert.doesNotMatch(JSON.stringify(calls.map((call) => call.init.body)), /private-key/);
});

test('direct providers preserve cancellation, sanitize failures, and mark only 429/5xx as retryable', async () => {
  for (const [factory, options] of [
    [createOpenRouterProvider, { model: 'openai/gpt-test' }],
    [createAnthropicProvider, { model: 'claude-test' }],
    [createGeminiProvider, { model: 'gemini-test' }],
  ]) {
    const throttled = factory({ getApiKey: async () => 'very-private-test-key', fetch: async () => new Response('{"error":{"message":"very-private-test-key rejected"}}', { status: 429 }) }, options);
    await assert.rejects(throttled.complete({ instruction: 'x', context: {}, outputSchema: {} }), (error) => error.code === 'AI_RATE_LIMITED' && error.retryable === true && !error.message.includes('very-private-test-key'));
    const invalid = factory({ getApiKey: async () => 'very-private-test-key', fetch: async () => new Response('{}', { status: 200 }) }, options);
    await assert.rejects(invalid.complete({ instruction: 'x', context: {}, outputSchema: {} }), (error) => error.code === 'AI_OUTPUT_INVALID' && error.retryable !== true);
  }
  const cancelled = createGeminiProvider({ getApiKey: async () => 'key', fetch: async () => { throw Object.assign(new Error('aborted'), { name: 'AbortError' }); } }, { model: 'gemini-test' });
  await assert.rejects(cancelled.complete({ instruction: 'x', context: {}, outputSchema: {} }), (error) => error.code === 'AI_CANCELLED' && error.retryable !== true);
});

test('model catalog discovers configured provider models with versioned TTL cache and no hard-coded availability promise', async () => {
  let calls = 0;
  const catalog = createModelCatalog({
    provider: 'gemini-api', getApiKey: async () => 'catalog-private-key', ttlMs: 30_000,
    fetch: async (url, init) => {
      calls += 1;
      assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models');
      assert.equal(init.headers['x-goog-api-key'], 'catalog-private-key');
      return new Response(JSON.stringify({ models: [{ name: 'models/gemini-test', supportedGenerationMethods: ['generateContent'] }, { name: 'models/embed-test', supportedGenerationMethods: ['embedContent'] }] }), { status: 200 });
    },
  });
  const first = await catalog.list();
  const second = await catalog.list();
  assert.equal(calls, 1);
  assert.deepEqual(first, { schemaVersion: 1, provider: 'gemini-api', models: ['gemini-test'] });
  assert.deepEqual(second, first);
  assert.doesNotMatch(JSON.stringify(first), /catalog-private-key/);
});
