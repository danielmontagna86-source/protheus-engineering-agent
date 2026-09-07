import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  decodeSource,
  indexWorkspace,
  parseAdvplSource,
} from '../packages/codegraph-advpl/src/index.mjs';

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
  assert.deepEqual(graph.calls.map((item) => [item.caller, item.callee]), [
    ['EntryPoint', 'Helper'],
  ]);
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
    'Static Function SharedHelper()\nReturn\n',
  );
  await writeFile(join(root, 'src', 'ignored.txt'), 'User Function NotSource()\nReturn\n');

  const graph = await indexWorkspace(root);

  assert.equal(graph.nodes.length, 2);
  assert.equal(graph.edges.length, 1);
  assert.equal(graph.edges[0].resolved, true);
  assert.equal(graph.edges[0].to, 'SharedHelper');
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
