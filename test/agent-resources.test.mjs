import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let snapshotAgentResources;
try {
  ({ snapshotAgentResources } = await import('../packages/agent-resources/src/index.mjs'));
} catch {
  // The first TDD run intentionally reaches the assertion below before the module exists.
}

test('agent resources are rediscovered on every session snapshot', async (t) => {
  assert.equal(typeof snapshotAgentResources, 'function');
  const workspace = await mkdtemp(join(tmpdir(), 'pea-resources-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const skillDir = join(workspace, '.pea', 'skills', 'review');
  const rulesDir = join(workspace, '.pea', 'rules');
  await mkdir(skillDir, { recursive: true });
  await mkdir(rulesDir, { recursive: true });
  await writeFile(join(skillDir, 'SKILL.md'), '# Review\nFirst version', 'utf8');
  await writeFile(join(rulesDir, 'quality.md'), '# Quality\nEvidence required', 'utf8');

  const first = await snapshotAgentResources({ workspace });
  await writeFile(join(skillDir, 'SKILL.md'), '# Review\nSecond version', 'utf8');
  const second = await snapshotAgentResources({ workspace });

  assert.equal(first.schemaVersion, 1);
  assert.deepEqual(first.skills.map(({ name, path }) => ({ name, path })), [
    { name: 'review', path: '.pea/skills/review/SKILL.md' },
  ]);
  assert.deepEqual(first.rules.map(({ name, path }) => ({ name, path })), [
    { name: 'quality', path: '.pea/rules/quality.md' },
  ]);
  assert.equal(first.skills[0].content, '# Review\nFirst version');
  assert.equal(second.skills[0].content, '# Review\nSecond version');
  assert.notEqual(first.skills[0].sha256, second.skills[0].sha256);
});

test('oversized project resources are excluded from the agent snapshot', async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-resource-limit-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const rulesDir = join(workspace, '.pea', 'rules');
  await mkdir(rulesDir, { recursive: true });
  await writeFile(join(rulesDir, 'oversized.md'), 'x'.repeat(64 * 1024 + 1), 'utf8');

  const snapshot = await snapshotAgentResources({ workspace });

  assert.deepEqual(snapshot.rules, []);
});

test('incomplete skill directories do not break the session snapshot', async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-incomplete-skill-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  await mkdir(join(workspace, '.pea', 'skills', 'unfinished'), { recursive: true });

  const snapshot = await snapshotAgentResources({ workspace });

  assert.deepEqual(snapshot.skills, []);
});

test('agent resource snapshots enforce an aggregate payload limit', async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-resource-aggregate-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const rulesDir = join(workspace, '.pea', 'rules');
  await mkdir(rulesDir, { recursive: true });
  for (let index = 0; index < 10; index += 1) {
    await writeFile(join(rulesDir, `rule-${index}.md`), 'x'.repeat(40 * 1024), 'utf8');
  }

  const snapshot = await snapshotAgentResources({ workspace });
  const totalBytes = snapshot.rules.reduce(
    (total, resource) => total + Buffer.byteLength(resource.content, 'utf8'),
    0,
  );

  assert.ok(totalBytes <= 256 * 1024);
  assert.ok(snapshot.omitted.aggregateLimit > 0);
});

test('agent resource discovery caps the number of files read into a snapshot', async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-resource-count-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const rulesDir = join(workspace, '.pea', 'rules');
  await mkdir(rulesDir, { recursive: true });
  await Promise.all(Array.from({ length: 70 }, (_, index) => (
    writeFile(join(rulesDir, `rule-${String(index).padStart(2, '0')}.md`), '# Rule\n', 'utf8')
  )));

  const snapshot = await snapshotAgentResources({ workspace });

  assert.equal(snapshot.rules.length, 64);
  assert.equal(snapshot.omitted.discoveryLimit, 6);
});

test('agent resources reject a .pea junction that escapes the workspace', async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-resource-junction-workspace-'));
  const externalState = await mkdtemp(join(tmpdir(), 'pea-resource-junction-target-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  t.after(() => rm(externalState, { recursive: true, force: true }));
  const skillDir = join(externalState, 'skills', 'external');
  await mkdir(skillDir, { recursive: true });
  await writeFile(join(skillDir, 'SKILL.md'), '# External\n', 'utf8');
  await symlink(externalState, join(workspace, '.pea'), 'junction');

  await assert.rejects(
    snapshotAgentResources({ workspace }),
    /state path must not be a symlink/,
  );
});
