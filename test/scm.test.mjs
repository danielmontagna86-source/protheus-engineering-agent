import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

import {
  createGitScm,
  parseNameStatus,
  selectRepository,
} from '../packages/scm/src/index.mjs';

test('SCM parser preserves rename, delete and binary evidence and rejects escaping paths', () => {
  assert.deepEqual(parseNameStatus('M\0src/main.prw\0R100\0old.prw\0new.prw\0D\0gone.tlpp\0'), [
    { path: 'src/main.prw', status: 'modified' },
    { path: 'new.prw', previousPath: 'old.prw', status: 'renamed' },
    { path: 'gone.tlpp', status: 'deleted' },
  ]);
  assert.throws(() => parseNameStatus('M\0../outside.prw\0'), /workspace-relative/);
  assert.throws(() => parseNameStatus('M\0C:\\outside.prw\0'), /workspace-relative/);
  assert.throws(() => parseNameStatus('R100\0only-old.prw\0'), /malformed/);
});

test('SCM repository selection refuses no-Git and ambiguous multi-repository scopes', () => {
  const one = resolve('repo-one');
  const two = resolve('repo-two');
  assert.throws(() => selectRepository([]), /no Git repository/);
  assert.throws(() => selectRepository([one, two]), /ambiguous Git repository/);
  assert.equal(selectRepository([one]), one);
  assert.equal(selectRepository([one, two], two), two);
  assert.throws(() => selectRepository([one], resolve('unknown')), /not one of the available/);
});

test('SCM adapter integrates explicit multi-repository selection into every scope', async () => {
  const workspace = resolve('multi-workspace');
  const one = join(workspace, 'one');
  const two = join(workspace, 'two');
  const scm = createGitScm({
    workspace,
    repositories: [one, two],
    execute: async (_cwd, args) => ({ stdout: args.includes('--show-toplevel') ? `${two}\n` : '', stderr: '' }),
    realpathImpl: async (path) => resolve(path),
    inspectFile: async () => ({ binary: false }),
  });

  await assert.rejects(scm.changes(), /ambiguous Git repository selection/);
  assert.equal((await scm.changes({ repository: two })).repository, 'two');
});

test('SCM staged, unstaged and branch scopes produce one normalized bounded contract', async () => {
  const workspace = resolve('fixture-workspace');
  const calls = [];
  const execute = async (cwd, args) => {
    calls.push({ cwd, args });
    if (args.includes('--show-toplevel')) return { stdout: `${workspace}\n`, stderr: '' };
    if (args.includes('show')) return { stdout: Buffer.from('User Function Scoped()\nReturn\n'), stderr: Buffer.alloc(0) };
    if (args.includes('--others')) return { stdout: 'untracked.prw\0binary.prw\0', stderr: '' };
    if (args.includes('--cached')) return { stdout: 'A\0staged.prw\0', stderr: '' };
    if (args.some((arg) => arg === 'origin/main...HEAD')) return { stdout: 'R087\0old.prw\0renamed.prw\0', stderr: '' };
    return { stdout: 'M\0unstaged.prw\0', stderr: '' };
  };
  const scm = createGitScm({
    workspace,
    execute,
    realpathImpl: async (path) => resolve(path),
    inspectFile: async (path) => ({ binary: path.endsWith('binary.prw') }),
  });

  assert.deepEqual((await scm.changes({ scope: 'staged' })).files, [
    { path: 'staged.prw', status: 'added', binary: false },
  ]);
  assert.deepEqual((await scm.changes({ scope: 'unstaged' })).files, [
    { path: 'binary.prw', status: 'untracked', binary: true },
    { path: 'unstaged.prw', status: 'modified', binary: false },
    { path: 'untracked.prw', status: 'untracked', binary: false },
  ]);
  const branch = await scm.changes({ scope: 'branch', baseRef: 'origin/main' });
  assert.deepEqual(branch.scope, { kind: 'branch', baseRef: 'origin/main' });
  assert.deepEqual(branch.files, [
    { path: 'renamed.prw', previousPath: 'old.prw', status: 'renamed', binary: false },
  ]);
  assert.ok(calls.every((call) => call.cwd === workspace));
  assert.ok(calls.every((call) => !call.args.includes('--shell')));
});

test('SCM empty diffs are explicit and refs/options are fail-closed', async () => {
  const workspace = resolve('empty-workspace');
  const scm = createGitScm({
    workspace,
    execute: async (_cwd, args) => ({
      stdout: args.includes('--show-toplevel') ? `${workspace}\n` : '',
      stderr: '',
    }),
    realpathImpl: async (path) => resolve(path),
    inspectFile: async () => ({ binary: false }),
  });

  const result = await scm.changes({ scope: 'working-tree' });
  assert.equal(result.status, 'clean');
  assert.deepEqual(result.files, []);
  await assert.rejects(() => scm.changes({ scope: 'branch' }), /baseRef is required/);
  await assert.rejects(() => scm.changes({ scope: 'branch', baseRef: '--output=x' }), /invalid baseRef/);
  await assert.rejects(() => scm.changes({ scope: 'unknown' }), /unsupported SCM scope/);
});

test('SCM discovers multiple real repositories and requires an explicit selection', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-scm-multi-'));
  const one = join(workspace, 'one');
  const two = join(workspace, 'two');
  await Promise.all([mkdir(one), mkdir(two)]);
  execFileSync('git', ['init', one], { windowsHide: true });
  execFileSync('git', ['init', two], { windowsHide: true });
  const scm = createGitScm({ workspace });

  await assert.rejects(scm.changes(), /ambiguous Git repository selection/);
  assert.equal((await scm.changes({ repository: one, scope: 'staged' })).repository, 'one');
});

test('SCM reads staged source up to the declared 20 MiB limit', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-scm-large-staged-'));
  execFileSync('git', ['init', workspace], { windowsHide: true });
  const contents = `User Function Large()\n// ${'x'.repeat(2 * 1024 * 1024)}\nReturn\n`;
  await writeFile(join(workspace, 'large.prw'), contents, 'utf8');
  execFileSync('git', ['-C', workspace, 'add', 'large.prw'], { windowsHide: true });

  const bytes = await createGitScm({ workspace }).readSource({ path: 'large.prw', scope: 'staged' });

  assert.equal(bytes.length, Buffer.byteLength(contents));
});
