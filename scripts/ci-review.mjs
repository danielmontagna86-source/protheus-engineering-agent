#!/usr/bin/env node
import { appendFile, mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { isAbsolute, relative, resolve } from 'node:path';
import { createRequire } from 'node:module';

import { evaluateReviewGate, parseReviewPolicy, stableStringify, toSarif } from '../packages/evidence/src/index.mjs';
import { createRuntime } from '../packages/runtime/src/index.mjs';
import { assertNoLinkPath } from './path-safety.mjs';

const require = createRequire(import.meta.url);
const { version: productVersion } = require('../package.json');
const workspace = resolve(process.env.GITHUB_WORKSPACE ?? process.cwd());
const outputSetting = process.env.INPUT_OUTPUT_DIRECTORY || '.pea-results';
const outputDirectory = resolve(workspace, outputSetting);
const separator = process.platform === 'win32' ? '\\' : '/';
function assertWorkspaceRelative(path, label) {
  const relativePath = relative(workspace, path);
  if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${separator}`) || isAbsolute(relativePath)) {
    throw new Error(`${label} must stay inside the GitHub workspace`);
  }
}
assertWorkspaceRelative(outputDirectory, 'output-directory');

async function loadOptionalPolicy(policySetting) {
  const policyPath = resolve(workspace, policySetting);
  assertWorkspaceRelative(policyPath, 'policy-path');
  await assertNoLinkPath(workspace, policyPath);
  let handle;
  try {
    handle = await open(policyPath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  } catch (error) {
    if (error?.code === 'ENOENT') return { path: policyPath, policy: undefined };
    throw error;
  }
  try {
    const state = await handle.stat();
    if (!state.isFile()) throw new Error('policy-path must reference a regular file');
    if (state.size > 128 * 1024) throw new Error('review policy exceeds the 128 KiB limit');
    let parsed;
    try {
      parsed = JSON.parse(await handle.readFile({ encoding: 'utf8' }));
    } catch {
      throw new Error('review policy must contain valid JSON');
    }
    return { path: policyPath, policy: parseReviewPolicy(parsed) };
  } finally {
    await handle.close();
  }
}

let scope = process.env.INPUT_SCOPE || 'auto';
let baseRef = process.env.INPUT_BASE_REF || undefined;
if (scope === 'auto') {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error('automatic scope requires a GitHub event payload or an explicit scope');
  let event;
  try {
    event = JSON.parse(await readFile(eventPath, 'utf8'));
  } catch {
    throw new Error('automatic scope requires a readable GitHub event payload');
  }
  baseRef = event?.pull_request?.base?.sha ?? event?.before;
  if (!/^[0-9a-f]{40}$/i.test(baseRef ?? '') || /^0{40}$/.test(baseRef)) {
    throw new Error('automatic scope requires a valid pull-request base or push before commit');
  }
  scope = 'branch';
}
const failOn = process.env.INPUT_FAIL_ON || 'major';
if (!['critical', 'major', 'never'].includes(failOn)) throw new Error(`unsupported fail-on value: ${failOn}`);
const policySetting = process.env.INPUT_POLICY_PATH || '.pea/review-policy.json';
if (typeof policySetting !== 'string' || !policySetting.trim()) throw new Error('policy-path must be a non-empty workspace-relative path');

async function writeEvidenceAtomically(path, contents) {
  await assertNoLinkPath(workspace, path);
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, contents, { encoding: 'utf8', flag: 'wx' });
  try {
    await rm(path, { force: true });
    await rename(temporaryPath, path);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

await assertNoLinkPath(workspace, outputDirectory);
await mkdir(outputDirectory, { recursive: true });
const report = await createRuntime({ workspace }).reviewChanges({ scope, baseRef });
const policy = await loadOptionalPolicy(policySetting);
const gate = evaluateReviewGate(report, policy.policy, { failOn });
const sarif = toSarif(report, { toolVersion: productVersion });
const jsonPath = resolve(outputDirectory, 'review.json');
const sarifPath = resolve(outputDirectory, 'review.sarif');
const gatePath = resolve(outputDirectory, 'review-gate.json');
await Promise.all([
  writeEvidenceAtomically(jsonPath, stableStringify(report)),
  writeEvidenceAtomically(sarifPath, stableStringify(sarif)),
  writeEvidenceAtomically(gatePath, stableStringify(gate)),
]);

const outputFile = process.env.GITHUB_OUTPUT;
if (outputFile) {
  await appendFile(outputFile, [
    `json=${jsonPath}`,
    `sarif=${sarifPath}`,
    `gate=${gatePath}`,
    `assessment=${report.summary.assessment}`,
    `findings=${report.summary.findings}`,
    `blocked=${gate.summary.blocking}`,
    `waived=${gate.summary.waived}`,
    `expired=${gate.summary.expiredWaivers}`,
    `ambiguous=${gate.summary.ambiguousWaivers}`,
    '',
  ].join('\n'), 'utf8');
}

process.stdout.write(`${stableStringify({
  status: gate.status,
  assessment: report.summary.assessment,
  findings: report.summary.findings,
  json: jsonPath,
  sarif: sarifPath,
  gate: gatePath,
  policy: policy.policy === undefined ? 'absent' : 'applied',
  blocked: gate.summary.blocking,
  waived: gate.summary.waived,
  expired: gate.summary.expiredWaivers,
  ambiguous: gate.summary.ambiguousWaivers,
})}`);
if (gate.status === 'FAIL') process.exitCode = 1;
