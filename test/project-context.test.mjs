import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  composeProjectContextBlock,
  createProjectContext,
} from '../packages/project-context/src/index.mjs';

test('memory writes are bounded and returned as untrusted context data', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-context-'));
  const context = createProjectContext({ workspace, maxMemoryBytes: 80 });

  await context.writeMemory('Owner decision: keep the build offline.');
  const snapshot = await context.read();
  const block = composeProjectContextBlock(snapshot);

  assert.match(snapshot.memory, /keep the build offline/);
  assert.match(block, /UNTRUSTED PROJECT DATA/);
  await assert.rejects(
    context.writeMemory('x'.repeat(81)),
    /memory exceeds 80 bytes/,
  );
});

test('journal serializes concurrent writes, rotates entries, and leaves no temp files', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-journal-'));
  const context = createProjectContext({ workspace, maxJournalEntries: 5 });

  await Promise.all(Array.from({ length: 12 }, (_, index) =>
    context.recordJournal({ kind: 'review', summary: `entry-${index}`, at: index }),
  ));

  const snapshot = await context.read();
  const names = await readdir(join(workspace, '.pea'));
  assert.equal(snapshot.journal.length, 5);
  assert.deepEqual(snapshot.journal.map((entry) => entry.summary), [
    'entry-7', 'entry-8', 'entry-9', 'entry-10', 'entry-11',
  ]);
  assert.equal(names.some((name) => name.endsWith('.tmp')), false);
});

test('state directory collision with a regular file fails closed', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-collision-'));
  await writeFile(join(workspace, '.pea'), 'not a directory');
  const context = createProjectContext({ workspace });

  await assert.rejects(context.writeMemory('fact'), /state path is not a directory/);
});

test('context reads reject a .pea junction that escapes the workspace', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-context-junction-workspace-'));
  const externalState = await mkdtemp(join(tmpdir(), 'pea-context-junction-target-'));
  await writeFile(join(externalState, 'memory.md'), 'external memory\n', 'utf8');
  await symlink(externalState, join(workspace, '.pea'), 'junction');
  const context = createProjectContext({ workspace });

  await assert.rejects(context.read(), /state path must not be a symlink/);
});
