import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { link, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse as parseYaml } from 'yaml';

const execFileAsync = promisify(execFile);
const productRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const script = join(productRoot, 'scripts', 'ci-review.mjs');

test('CI review runner creates stable JSON and SARIF without a network or write token', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-action-workspace-'));
  const outputs = join(workspace, 'github-output.txt');
  const source = join(workspace, 'changed.prw');
  await writeFile(source, 'User Function Changed()\nReturn\n');
  await execFileAsync('git', ['init', workspace]);
  await execFileAsync('git', ['-C', workspace, 'add', 'changed.prw']);
  await execFileAsync('git', [
    '-C', workspace, '-c', 'user.name=PEA Tests', '-c', 'user.email=pea@example.invalid',
    'commit', '-m', 'fixture',
  ]);
  await writeFile(source, 'User Function Changed()\n    Iif(.T., 1, 0)\nReturn\n');

  const run = await execFileAsync(process.execPath, [script], {
    env: {
      ...process.env,
      GITHUB_WORKSPACE: workspace,
      GITHUB_OUTPUT: outputs,
      INPUT_SCOPE: 'unstaged',
      INPUT_OUTPUT_DIRECTORY: '.pea-results',
      INPUT_FAIL_ON: 'major',
    },
  });

  assert.match(run.stdout, /PASS WITH OBSERVATIONS/);
  const json = JSON.parse(await readFile(join(workspace, '.pea-results', 'review.json'), 'utf8'));
  const sarif = JSON.parse(await readFile(join(workspace, '.pea-results', 'review.sarif'), 'utf8'));
  const actionOutputs = await readFile(outputs, 'utf8');
  assert.equal(json.kind, 'change-review');
  assert.equal(sarif.version, '2.1.0');
  assert.match(actionOutputs, /json=.*review\.json/);
  assert.match(actionOutputs, /sarif=.*review\.sarif/);
  assert.match(actionOutputs, /assessment=PASS WITH OBSERVATIONS/);
});

test('CI review runner atomically replaces linked output files without overwriting their target', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-action-linked-output-'));
  const outside = join(await mkdtemp(join(tmpdir(), 'pea-action-outside-')), 'evidence.json');
  const outputDirectory = join(workspace, '.pea-results');
  await mkdir(outputDirectory);
  await writeFile(outside, 'preserve-me', 'utf8');
  await link(outside, join(outputDirectory, 'review.json'));
  await writeFile(join(workspace, 'baseline.prw'), 'User Function Baseline()\nReturn\n', 'utf8');
  await execFileAsync('git', ['init', workspace]);
  await execFileAsync('git', ['-C', workspace, 'add', 'baseline.prw']);
  await execFileAsync('git', [
    '-C', workspace, '-c', 'user.name=PEA Tests', '-c', 'user.email=pea@example.invalid',
    'commit', '-m', 'fixture',
  ]);

  await execFileAsync(process.execPath, [script], {
    env: {
      ...process.env,
      GITHUB_WORKSPACE: workspace,
      INPUT_SCOPE: 'working-tree',
      INPUT_OUTPUT_DIRECTORY: '.pea-results',
      INPUT_FAIL_ON: 'major',
    },
  });
  assert.equal(await readFile(outside, 'utf8'), 'preserve-me');
  assert.equal(JSON.parse(await readFile(join(outputDirectory, 'review.json'), 'utf8')).kind, 'change-review');
});

test('GitHub Action contract is composite, offline and permission neutral', async () => {
  const action = await readFile(join(productRoot, 'action.yml'), 'utf8');
  assert.match(action, /using:\s*["']?composite/);
  assert.match(action, /scripts\/ci-review\.mjs/);
  assert.match(action, /default:\s*["']?auto/);
  assert.match(action, /actions\/setup-node@820762786026740c76f36085b0efc47a31fe5020/);
  assert.match(action, /default:\s*["']?major/);
  assert.doesNotMatch(action, /github\.token|GITHUB_TOKEN|npm (?:ci|install)|curl|wget|Invoke-WebRequest/i);
  assert.doesNotMatch(action, /security-events:\s*write|contents:\s*write/);
  assert.equal(parseYaml(action).runs.using, 'composite');
  for (const name of ['advpl-review.yml', 'advpl-review-sarif.yml']) {
    const workflow = parseYaml(await readFile(join(productRoot, '.github', 'workflows', 'examples', name), 'utf8'));
    assert.equal(workflow.permissions.contents, 'read');
  }
});

test('automatic Action scope reviews the event base and fails closed without one', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pea-action-auto-scope-'));
  const source = join(workspace, 'changed.prw');
  const eventPath = join(workspace, 'event.json');
  await execFileAsync('git', ['init', workspace]);
  await writeFile(source, 'User Function Changed()\nReturn\n');
  await execFileAsync('git', ['-C', workspace, 'add', 'changed.prw']);
  await execFileAsync('git', [
    '-C', workspace, '-c', 'user.name=PEA Tests', '-c', 'user.email=pea@example.invalid',
    'commit', '-m', 'baseline',
  ]);
  const { stdout: base } = await execFileAsync('git', ['-C', workspace, 'rev-parse', 'HEAD']);
  await writeFile(source, 'User Function Changed()\n    Iif(.T., 1, 0)\nReturn\n');
  await execFileAsync('git', ['-C', workspace, 'add', 'changed.prw']);
  await execFileAsync('git', [
    '-C', workspace, '-c', 'user.name=PEA Tests', '-c', 'user.email=pea@example.invalid',
    'commit', '-m', 'change',
  ]);
  await writeFile(eventPath, JSON.stringify({ pull_request: { base: { sha: base.trim() } } }), 'utf8');

  await execFileAsync(process.execPath, [script], {
    env: {
      ...process.env,
      GITHUB_WORKSPACE: workspace,
      GITHUB_EVENT_PATH: eventPath,
      INPUT_SCOPE: 'auto',
      INPUT_OUTPUT_DIRECTORY: '.pea-results',
      INPUT_FAIL_ON: 'never',
    },
  });
  const report = JSON.parse(await readFile(join(workspace, '.pea-results', 'review.json'), 'utf8'));
  assert.deepEqual(report.scope, { kind: 'branch', baseRef: base.trim() });
  assert.equal(report.summary.filesReviewed, 1);

  await assert.rejects(execFileAsync(process.execPath, [script], {
    env: {
      ...process.env,
      GITHUB_WORKSPACE: workspace,
      GITHUB_EVENT_PATH: '',
      INPUT_SCOPE: 'auto',
      INPUT_OUTPUT_DIRECTORY: '.pea-results-missing',
      INPUT_FAIL_ON: 'never',
    },
  }), /automatic scope requires/);
});
