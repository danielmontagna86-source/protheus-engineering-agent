import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  composeProjectContextBlock,
  createProjectContext,
  loadProjectConfiguration,
  validateProjectConfiguration,
} from '../packages/project-context/src/index.mjs';

test('project configuration defaults safely when .pea/config.json is absent', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-config-default-'));

  const result = await loadProjectConfiguration({ workspace });

  assert.equal(result.source, 'default');
  assert.deepEqual(result.config, {
    schemaVersion: 1,
    locale: 'pt-BR',
    activeProfile: 'default',
    profiles: { default: { environment: 'development' } },
  });
});

test('project configuration validates typed profiles and rejects unknown fields', async () => {
  const result = validateProjectConfiguration({
    schemaVersion: 1,
    locale: 'en',
    activeProfile: 'ci',
    profiles: {
      ci: {
        environment: 'test',
        tdnSnapshotPath: '.pea/cache/tdn.json',
        dictionarySnapshotPath: '.pea/cache/dictionary.json',
      },
    },
  });

  assert.equal(result.activeProfile, 'ci');
  assert.equal(result.profiles.ci.environment, 'test');
  assert.throws(
    () => validateProjectConfiguration({
      schemaVersion: 1,
      locale: 'pt-BR',
      activeProfile: 'default',
      profiles: { default: { environment: 'development', surprise: true } },
    }),
    /unknown profile field: surprise/,
  );
  assert.throws(
    () => validateProjectConfiguration({
      schemaVersion: 1,
      locale: 'pt-BR',
      activeProfile: 'toString',
      profiles: { default: { environment: 'development' } },
    }),
    /active profile is not declared/,
  );
});

test('project configuration migrates explicit schema zero without preserving secrets', async () => {
  const migrated = validateProjectConfiguration({
    schemaVersion: 0,
    language: 'en',
    environment: 'test',
  });

  assert.deepEqual(migrated, {
    schemaVersion: 1,
    locale: 'en',
    activeProfile: 'default',
    profiles: { default: { environment: 'test' } },
  });
  assert.throws(
    () => validateProjectConfiguration({
      schemaVersion: 1,
      locale: 'pt-BR',
      activeProfile: 'default',
      profiles: { default: { environment: 'development', apiToken: 'secret' } },
    }),
    /secret-bearing field is not allowed: apiToken/,
  );
});

test('project configuration loads a bounded regular JSON file and fails closed when malformed', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-config-load-'));
  await mkdir(join(workspace, '.pea'));
  await writeFile(join(workspace, '.pea', 'config.json'), JSON.stringify({
    schemaVersion: 1,
    locale: 'pt-BR',
    activeProfile: 'homolog',
    profiles: { homolog: { environment: 'homologation' } },
  }));

  const loaded = await loadProjectConfiguration({ workspace });
  assert.equal(loaded.source, 'workspace');
  assert.equal(loaded.config.profiles.homolog.environment, 'homologation');

  await writeFile(join(workspace, '.pea', 'config.json'), '{broken');
  await assert.rejects(loadProjectConfiguration({ workspace }), /invalid project config JSON/);
});

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

test('journal lock preserves writes across independent context instances', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-journal-cross-instance-'));
  const first = createProjectContext({ workspace, maxJournalEntries: 20 });
  const second = createProjectContext({ workspace, maxJournalEntries: 20 });

  await Promise.all(Array.from({ length: 20 }, (_, index) => (
    (index % 2 === 0 ? first : second).recordJournal({ kind: 'parallel', summary: `item-${index}`, at: index })
  )));
  const snapshot = await first.read();
  const names = await readdir(join(workspace, '.pea'));
  assert.equal(snapshot.journal.length, 20);
  assert.equal(new Set(snapshot.journal.map((entry) => entry.summary)).size, 20);
  assert.equal(names.includes('.context.lock'), false);
});

test('structured memory preserves attribution, links and an auditable promotion preview', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-memory-records-'));
  const context = createProjectContext({ workspace, clock: () => new Date('2026-09-08T12:00:00.000Z') });

  await context.recordJournal({
    id: 'journal-review-1',
    kind: 'review',
    summary: 'Use branch evidence before release.',
    attribution: { actor: 'reviewer', source: 'human-review' },
    links: [{ kind: 'file', target: 'src/release.prw' }],
  });
  const preview = await context.previewPromotion('journal-review-1', { actor: 'maintainer' });

  assert.equal(preview.status, 'ready');
  assert.equal(preview.proposed.sourceJournalId, 'journal-review-1');
  assert.equal(preview.proposed.attribution.actor, 'maintainer');
  assert.match(preview.patch, /^\+ /);
  assert.match(preview.beforeSha256, /^[a-f0-9]{64}$/);
  assert.match(preview.afterSha256, /^[a-f0-9]{64}$/);
});

test('journal promotion is idempotent and expiry removes only elapsed structured memory', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-memory-lifecycle-'));
  const context = createProjectContext({ workspace, clock: () => new Date('2026-09-08T12:00:00.000Z') });
  await context.recordJournal({ id: 'keep', kind: 'decision', summary: 'Keep offline mode.' });
  await context.recordJournal({ id: 'expire', kind: 'decision', summary: 'Temporary migration note.' });

  await context.promoteJournal('keep', { actor: 'maintainer' });
  await context.promoteJournal('keep', { actor: 'maintainer' });
  await context.appendMemory({
    id: 'temporary',
    summary: 'Temporary migration note.',
    attribution: { actor: 'maintainer', source: 'manual' },
    expiresAt: '2026-09-09T00:00:00.000Z',
  });
  const expired = await context.expireMemory('2026-09-10T00:00:00.000Z');
  const snapshot = await context.read();

  assert.equal(expired.removed, 1);
  assert.equal(snapshot.memoryEntries.length, 1);
  assert.equal(snapshot.memoryEntries[0].sourceJournalId, 'keep');
  assert.match(snapshot.memory, /Keep offline mode/);
  assert.equal((await readFile(join(workspace, '.pea', 'memory.jsonl'), 'utf8')).split('\n').filter(Boolean).length, 1);
});

test('journal promotion supports the maximum public journal id without exceeding memory id bounds', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-memory-long-id-'));
  const context = createProjectContext({ workspace });
  const journalId = `j${'a'.repeat(119)}`;
  await context.recordJournal({ id: journalId, kind: 'decision', summary: 'Keep bounded identifiers.' });

  const preview = await context.previewPromotion(journalId, { actor: 'maintainer' });
  const promoted = await context.promoteJournal(journalId, { actor: 'maintainer' });

  assert.equal(preview.proposed.id.length <= 120, true);
  assert.equal(promoted.record.id, preview.proposed.id);
  assert.equal(promoted.record.sourceJournalId, journalId);
});

test('structured memory rejects an invalid explicit timestamp with a stable validation error', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-memory-invalid-date-'));
  const context = createProjectContext({ workspace });

  await assert.rejects(context.appendMemory({
    summary: 'Invalid date must not be persisted.',
    at: 'not-a-date',
  }), /memory at must be an ISO date/);
});

test('structured context recovers from corrupt JSONL records without treating them as memory', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-memory-corrupt-'));
  await mkdir(join(workspace, '.pea'));
  await writeFile(join(workspace, '.pea', 'memory.jsonl'), '{broken\n', 'utf8');
  const context = createProjectContext({ workspace });

  const snapshot = await context.read();

  assert.deepEqual(snapshot.memoryEntries, []);
  assert.ok(snapshot.anomalies.some((item) => item.file === 'memory.jsonl'));
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
