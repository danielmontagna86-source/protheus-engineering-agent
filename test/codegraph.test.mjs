import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { performance } from 'node:perf_hooks';

import {
  decodeSource,
  indexWorkspace,
  parseAdvplSource,
} from '../packages/codegraph-advpl/src/index.mjs';
import { resolveCallTarget } from '../packages/codegraph-advpl/src/resolve.mjs';

test('call resolver defaults to an unresolved result with no candidates', () => {
  assert.deepEqual(resolveCallTarget({ file: 'entry.prw' }), {
    target: null,
    resolution: 'unresolved',
    candidateCount: 0,
  });
});

test('call resolver does not mistake a same-file global for a static symbol', () => {
  const global = { name: 'Shared', file: 'entry.prw', kind: 'user-function' };
  const otherStatic = { name: 'Shared', file: 'other.prw', kind: 'static-function' };

  assert.deepEqual(
    resolveCallTarget({ file: 'entry.prw' }, [global, otherStatic]),
    { target: global, resolution: 'global', candidateCount: 1 },
  );
});

test('parser finds functions and real calls without matching comments or strings', () => {
  const source = [
    '#include "totvs.ch"',
    'User Function EntryPoint()',
    '    Local cText := "FakeCall()"',
    '    // IgnoredCall()',
    '    Helper()',
    'Return',
    '',
    'Static Function Helper()',
    'Return',
  ].join('\n');

  const graph = parseAdvplSource(source, { file: 'sample.prw' });

  assert.deepEqual(graph.symbols.map((item) => item.name), ['EntryPoint', 'Helper']);
  assert.deepEqual(graph.symbols.map((item) => item.line), [2, 8]);
  assert.deepEqual(graph.calls.map((item) => [item.caller, item.callee]), [
    ['EntryPoint', 'Helper'],
  ]);
  assert.deepEqual(graph.calls.map((item) => item.line), [5]);
});

test('workspace index resolves case-insensitive calls across source files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pea-graph-'));
  await mkdir(join(root, 'src'));
  await writeFile(
    join(root, 'src', 'entry.PRW'),
    'User Function Start()\n    sharedHelper()\nReturn\n',
  );
  await writeFile(
    join(root, 'src', 'helper.tlpp'),
    'User Function SharedHelper()\nReturn\n',
  );
  await writeFile(join(root, 'src', 'ignored.txt'), 'User Function NotSource()\nReturn\n');

  const graph = await indexWorkspace(root);

  assert.equal(graph.nodes.length, 2);
  assert.equal(graph.edges.length, 1);
  assert.equal(graph.edges[0].resolved, true);
  assert.equal(graph.edges[0].to, 'SharedHelper');
  assert.equal(graph.edges[0].resolution, 'global');
  assert.equal(graph.edges[0].candidateCount, 1);
});

test('workspace index resolves duplicate static helpers to the caller file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pea-graph-static-'));
  await writeFile(
    join(root, 'first.prw'),
    'User Function First()\n    LocalHelper()\nReturn\nStatic Function LocalHelper()\nReturn\n',
  );
  await writeFile(
    join(root, 'second.prw'),
    'User Function Second()\n    LocalHelper()\nReturn\nStatic Function LocalHelper()\nReturn\n',
  );

  const graph = await indexWorkspace(root);
  const calls = graph.edges.filter((edge) => edge.to === 'LocalHelper');

  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((edge) => edge.targetFile), ['first.prw', 'second.prw']);
  assert.ok(calls.every((edge) => edge.resolved));
  assert.ok(calls.every((edge) => edge.resolution === 'same-file-static'));
  assert.ok(calls.every((edge) => edge.candidateCount === 1));
});

test('workspace index does not expose a static helper to another source file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pea-graph-private-'));
  await writeFile(join(root, 'entry.prw'), 'User Function Entry()\n    PrivateHelper()\nReturn\n');
  await writeFile(join(root, 'helper.prw'), 'Static Function PrivateHelper()\nReturn\n');

  const graph = await indexWorkspace(root);

  assert.equal(graph.edges[0].resolved, false);
  assert.equal(graph.edges[0].resolution, 'unresolved');
  assert.equal(graph.edges[0].candidateCount, 0);
  assert.equal(graph.edges[0].targetFile, null);
});

test('workspace index leaves duplicate global targets ambiguous', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pea-graph-ambiguous-'));
  await writeFile(join(root, 'entry.prw'), 'User Function Entry()\n    SharedName()\nReturn\n');
  await writeFile(join(root, 'one.prw'), 'User Function SharedName()\nReturn\n');
  await writeFile(join(root, 'two.prw'), 'Function SharedName()\nReturn\n');

  const graph = await indexWorkspace(root);

  assert.equal(graph.edges[0].resolved, false);
  assert.equal(graph.edges[0].resolution, 'ambiguous');
  assert.equal(graph.edges[0].candidateCount, 2);
  assert.equal(graph.edges[0].targetFile, null);
});

test('source decoding falls back to Windows-1252 without corrupting accents', () => {
  const bytes = Buffer.from([
    ...Buffer.from('// Fun'),
    0xe7,
    0xe3,
    ...Buffer.from('o\nUser Function Accent()\nReturn\n'),
  ]);

  const decoded = decodeSource(bytes);

  assert.equal(decoded.encoding, 'windows-1252');
  assert.match(decoded.text, /Função/);
});

test('parser stays within the large-source performance budget', () => {
  const source = Array.from({ length: 5_000 }, (_, index) => [
    `Static Function Perf${index}()`,
    `    Perf${Math.max(0, index - 1)}()`,
    'Return',
  ].join('\n')).join('\n');

  const startedAt = performance.now();
  const graph = parseAdvplSource(source, { file: 'large.prw' });
  const durationMs = performance.now() - startedAt;

  assert.equal(graph.symbols.length, 5_000);
  assert.equal(graph.calls.length, 5_000);
  assert.ok(durationMs < 1_000, `large-source parse took ${durationMs.toFixed(1)} ms`);
});
