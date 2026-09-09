#!/usr/bin/env node
import { appendFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { isAbsolute, relative, resolve } from 'node:path';
import { createRequire } from 'node:module';

import { stableStringify, toSarif } from '../packages/evidence/src/index.mjs';
import { createRuntime } from '../packages/runtime/src/index.mjs';
import { assertNoLinkPath } from './path-safety.mjs';

const require = createRequire(import.meta.url);
const { version: productVersion } = require('../package.json');
const workspace = resolve(process.env.GITHUB_WORKSPACE ?? process.cwd());
const outputSetting = process.env.INPUT_OUTPUT_DIRECTORY || '.pea-results';
const outputDirectory = resolve(workspace, outputSetting);
const relativeOutput = relative(workspace, outputDirectory);
const separator = process.platform === 'win32' ? '\\' : '/';
if (!relativeOutput || relativeOutput === '..' || relativeOutput.startsWith(`..${separator}`) || isAbsolute(relativeOutput)) {
  throw new Error('output-directory must stay inside the GitHub workspace');
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
const sarif = toSarif(report, { toolVersion: productVersion });
const jsonPath = resolve(outputDirectory, 'review.json');
const sarifPath = resolve(outputDirectory, 'review.sarif');
await Promise.all([
  writeEvidenceAtomically(jsonPath, stableStringify(report)),
  writeEvidenceAtomically(sarifPath, stableStringify(sarif)),
]);

const outputFile = process.env.GITHUB_OUTPUT;
if (outputFile) {
  await appendFile(outputFile, [
    `json=${jsonPath}`,
    `sarif=${sarifPath}`,
    `assessment=${report.summary.assessment}`,
    `findings=${report.summary.findings}`,
    '',
  ].join('\n'), 'utf8');
}

process.stdout.write(`${stableStringify({
  status: 'PASS',
  assessment: report.summary.assessment,
  findings: report.summary.findings,
  json: jsonPath,
  sarif: sarifPath,
})}`);

const severities = report.reviews.flatMap((review) => review.findings.map((finding) => finding.severity));
if ((failOn === 'critical' && severities.includes('CRITICAL'))
  || (failOn === 'major' && severities.some((severity) => severity === 'CRITICAL' || severity === 'MAJOR'))) {
  process.exitCode = 1;
}
