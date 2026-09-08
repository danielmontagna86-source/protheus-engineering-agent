import test from 'node:test';
import assert from 'node:assert/strict';

import { createSubagentSupervisor } from '../packages/subagents/src/index.mjs';

test('bounded subagent records parent-child evidence and exact tool inheritance', async () => {
  const calls = [];
  const supervisor = createSubagentSupervisor({
    idFactory: () => 'child-001',
    clock: () => Date.parse('2026-09-07T12:00:00.000Z'),
    invoke: async (request) => { calls.push(request); return { findingCount: 2 }; },
  });

  const run = await supervisor.run({ role: 'reviewer', tool: 'review:file', input: { path: 'a.prw' } }, {
    parentId: 'parent-001', depth: 1, allowedTools: ['review:file'],
  });

  assert.equal(run.status, 'completed');
  assert.equal(run.id, 'child-001');
  assert.equal(run.parentId, 'parent-001');
  assert.equal(run.depth, 1);
  assert.deepEqual(run.allowedTools, ['review:file']);
  assert.deepEqual(run.output, { findingCount: 2 });
  assert.equal(calls[0].tool, 'review:file');
});

test('subagent denies unknown tools, excess depth and oversized input before invocation', async () => {
  let calls = 0;
  const supervisor = createSubagentSupervisor({
    maxDepth: 2, maxInputBytes: 32,
    invoke: async () => { calls += 1; return {}; },
  });

  assert.equal((await supervisor.run({ role: 'x', tool: 'shell:any', input: {} }, {
    parentId: 'p', depth: 1, allowedTools: ['review:file'],
  })).error.code, 'SUBAGENT_TOOL_DENIED');
  assert.equal((await supervisor.run({ role: 'x', tool: 'review:file', input: {} }, {
    parentId: 'p', depth: 3, allowedTools: ['review:file'],
  })).error.code, 'SUBAGENT_DEPTH_EXCEEDED');
  assert.equal((await supervisor.run({ role: 'x', tool: 'review:file', input: { text: 'x'.repeat(100) } }, {
    parentId: 'p', depth: 1, allowedTools: ['review:file'],
  })).error.code, 'SUBAGENT_INPUT_TOO_LARGE');
  assert.equal(calls, 0);
});

test('mutating subagent requires checkpoint and returns diff for human review', async () => {
  const supervisor = createSubagentSupervisor({
    idFactory: () => 'child-edit',
    invoke: async () => ({ changed: true }),
    checkpoint: async () => ({ id: 'cp-1', kind: 'worktree', reference: 'refs/pea/cp-1' }),
    diff: async () => ({ files: ['source.prw'], sha256: 'a'.repeat(64) }),
  });
  const run = await supervisor.run({
    role: 'fixer', tool: 'workspace:patch', input: { patch: 'bounded' }, mutating: true,
  }, { parentId: 'p', depth: 1, allowedTools: ['workspace:patch'] });

  assert.equal(run.status, 'awaiting-review');
  assert.equal(run.checkpoint.kind, 'worktree');
  assert.deepEqual(run.diff.files, ['source.prw']);

  const noCheckpoint = createSubagentSupervisor({ invoke: async () => ({}) });
  assert.equal((await noCheckpoint.run({ role: 'fixer', tool: 'workspace:patch', input: {}, mutating: true }, {
    parentId: 'p', depth: 1, allowedTools: ['workspace:patch'],
  })).error.code, 'SUBAGENT_CHECKPOINT_UNAVAILABLE');
});

test('subagent bounds output and fails closed on timeout and cancellation', async () => {
  const oversized = createSubagentSupervisor({
    maxOutputBytes: 32,
    invoke: async () => ({ text: 'x'.repeat(100) }),
  });
  const context = { parentId: 'p', depth: 1, allowedTools: ['review:file'] };
  assert.equal((await oversized.run({ role: 'x', tool: 'review:file', input: {} }, context)).error.code, 'SUBAGENT_OUTPUT_TOO_LARGE');

  const slow = createSubagentSupervisor({
    timeoutMs: 5,
    invoke: async () => new Promise(() => {}),
  });
  assert.equal((await slow.run({ role: 'x', tool: 'review:file', input: {} }, context)).error.code, 'SUBAGENT_TIMEOUT');

  const controller = new AbortController();
  controller.abort();
  assert.equal((await slow.run({ role: 'x', tool: 'review:file', input: {} }, {
    ...context, signal: controller.signal,
  })).error.code, 'SUBAGENT_CANCELLED');
});

test('failed mutating subagent rolls back its checkpoint and records recovery', async () => {
  const rollbacks = [];
  const supervisor = createSubagentSupervisor({
    invoke: async () => { throw new Error('provider failed'); },
    checkpoint: async () => ({ id: 'cp-2', kind: 'snapshot', reference: 'snapshot-2' }),
    diff: async () => ({ files: [] }),
    rollback: async (checkpoint) => { rollbacks.push(checkpoint.id); return { restored: true }; },
  });
  const run = await supervisor.run({ role: 'fixer', tool: 'workspace:patch', input: {}, mutating: true }, {
    parentId: 'p', depth: 1, allowedTools: ['workspace:patch'],
  });

  assert.equal(run.status, 'failed');
  assert.equal(run.error.code, 'SUBAGENT_INVOCATION_FAILED');
  assert.deepEqual(run.recovery, { attempted: true, restored: true });
  assert.deepEqual(rollbacks, ['cp-2']);
});

test('subagent enforces concurrency budget', async () => {
  let release;
  const supervisor = createSubagentSupervisor({
    maxConcurrent: 1,
    invoke: async () => new Promise((resolve) => { release = resolve; }),
  });
  const context = { parentId: 'p', depth: 1, allowedTools: ['review:file'] };
  const first = supervisor.run({ role: 'one', tool: 'review:file', input: {} }, context);
  await new Promise((resolve) => setImmediate(resolve));
  const second = await supervisor.run({ role: 'two', tool: 'review:file', input: {} }, context);
  assert.equal(second.error.code, 'SUBAGENT_CONCURRENCY_EXCEEDED');
  release({ ok: true });
  assert.equal((await first).status, 'completed');
});
