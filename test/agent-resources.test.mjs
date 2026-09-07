import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

test('agent resources discover standard project skill roots with deterministic precedence', async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-standard-skills-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const roots = [
    ['.agents', 'agents'],
    ['.github', 'github'],
    ['.pea', 'pea'],
  ];
  for (const [root, marker] of roots) {
    const directory = join(workspace, root, 'skills', 'review');
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'SKILL.md'), `# Review\n${marker}`, 'utf8');
  }
  const additional = join(workspace, '.github', 'skills', 'compile');
  await mkdir(additional, { recursive: true });
  await writeFile(join(additional, 'SKILL.md'), '# Compile\n', 'utf8');

  const snapshot = await snapshotAgentResources({ workspace });

  assert.deepEqual(snapshot.skills.map(({ name, path, source }) => ({ name, path, source })), [
    {
      name: 'review',
      path: '.agents/skills/review/SKILL.md',
      source: 'agents-standard',
    },
    {
      name: 'compile',
      path: '.github/skills/compile/SKILL.md',
      source: 'github-standard',
    },
  ]);
  assert.match(snapshot.skills[0].content, /agents/);
});

test('agent resources reject a standard skill root junction that escapes the workspace', async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-standard-junction-workspace-'));
  const external = await mkdtemp(join(tmpdir(), 'pea-standard-junction-target-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  t.after(() => rm(external, { recursive: true, force: true }));
  await mkdir(join(workspace, '.agents'), { recursive: true });
  await symlink(external, join(workspace, '.agents', 'skills'), 'junction');

  await assert.rejects(
    snapshotAgentResources({ workspace }),
    /skill root must not be a symlink/,
  );
});

test('agent resources expose pinned external skill provider provenance', async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-provider-catalog-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  await mkdir(join(workspace, 'config'), { recursive: true });
  await writeFile(join(workspace, 'config', 'skill-providers.json'), JSON.stringify({
    schemaVersion: 1,
    providers: [{
      id: 'totvs-engpro',
      repository: 'https://github.com/totvs/engpro-advpl-tlpp-skills',
      license: 'MIT',
      revision: '93e2f81ba71e3e132fa112a99e35162c2176f62b',
      mode: 'reference',
      allowedSkills: ['advpl-tlpp-sdd', 'code-review'],
    }],
  }), 'utf8');

  const snapshot = await snapshotAgentResources({ workspace });

  assert.deepEqual(snapshot.providers, [{
    id: 'totvs-engpro',
    repository: 'https://github.com/totvs/engpro-advpl-tlpp-skills',
    license: 'MIT',
    revision: '93e2f81ba71e3e132fa112a99e35162c2176f62b',
    mode: 'reference',
    allowedSkills: ['advpl-tlpp-sdd', 'code-review'],
    trust: 'untrusted-project-data',
  }]);
});

test('agent resources reject an unpinned external skill provider', async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-unpinned-provider-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  await mkdir(join(workspace, 'config'), { recursive: true });
  await writeFile(join(workspace, 'config', 'skill-providers.json'), JSON.stringify({
    schemaVersion: 1,
    providers: [{
      id: 'totvs-engpro',
      repository: 'https://github.com/totvs/engpro-advpl-tlpp-skills',
      license: 'MIT',
      revision: 'main',
      mode: 'reference',
      allowedSkills: [],
    }],
  }), 'utf8');

  await assert.rejects(
    snapshotAgentResources({ workspace }),
    /skill provider revision must be pinned/,
  );
});

test('repository ships narrow product skills and pinned official EngPro provenance', async () => {
  const workspace = fileURLToPath(new URL('..', import.meta.url));

  const snapshot = await snapshotAgentResources({ workspace });

  assert.deepEqual(snapshot.skills.map(({ name, source }) => ({ name, source })), [
    { name: 'planning-protheus-engineering', source: 'agents-standard' },
    { name: 'protheus-evidence-review', source: 'agents-standard' },
  ]);
  assert.deepEqual(snapshot.providers.map(({ id, license, mode, revision }) => ({
    id, license, mode, revision,
  })), [{
    id: 'totvs-engpro',
    license: 'MIT',
    mode: 'reference',
    revision: '93e2f81ba71e3e132fa112a99e35162c2176f62b',
  }]);
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
