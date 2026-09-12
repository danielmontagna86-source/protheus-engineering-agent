import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import * as evidence from '../packages/evidence/src/index.mjs';

const {
  exportChangeReview,
  findingFingerprint,
  stableStringify,
  toSarif,
} = evidence;

function reportAt(line = 4) {
  const finding = {
    ruleId: 'CA4000', severity: 'INFO', category: 'Clean Code', title: 'Inline conditional',
    guidance: 'Prefer an explicit conditional block.', line,
    evidence: { file: 'src/change.prw', line, symbol: 'Changed', excerpt: 'Iif(lOk, "private", "value")' },
  };
  return {
    schemaVersion: 1,
    kind: 'change-review',
    status: 'changed',
    repository: '.',
    scope: { kind: 'unstaged', baseRef: null },
    changedFiles: [{ path: 'src/change.prw', status: 'modified', binary: false }],
    reviews: [{
      schemaVersion: 1,
      file: 'src/change.prw',
      encoding: 'utf-8',
      findings: [finding, { ...finding }],
      counts: { CRITICAL: 0, MAJOR: 0, MINOR: 0, INFO: 2 },
      assessment: 'PASS WITH OBSERVATIONS',
    }],
    excluded: [],
    summary: { filesChanged: 1, filesReviewed: 1, findings: 2, assessment: 'PASS WITH OBSERVATIONS' },
    evidence: [{ type: 'scm-change-set', repository: '.', fileCount: 1 }],
    disclaimer: 'Deterministic review only.',
  };
}

test('stable review export redacts source excerpts and fingerprints survive line-only moves', () => {
  const first = exportChangeReview(reportAt(4));
  const moved = exportChangeReview(reportAt(40));

  assert.equal(first.reviews[0].findings[0].fingerprint, moved.reviews[0].findings[0].fingerprint);
  assert.match(first.reviews[0].findings[0].fingerprint, /^[a-f0-9]{64}$/);
  assert.equal('excerpt' in first.reviews[0].findings[0].evidence, false);
  assert.equal(stableStringify(first), stableStringify(structuredClone(first)));
  assert.equal(findingFingerprint(first.reviews[0].findings[0]), first.reviews[0].findings[0].fingerprint);
});

test('SARIF export is GitHub-compatible, deduplicated and path bounded', () => {
  const sarif = toSarif(reportAt(), { toolVersion: '0.4.0' });
  assert.equal(sarif.version, '2.1.0');
  assert.match(sarif.$schema, /sarif-2\.1\.0\.json$/);
  assert.equal(sarif.runs[0].tool.driver.name, 'Protheus Engineering Agent');
  assert.equal(sarif.runs[0].tool.driver.version, '0.4.0');
  assert.equal(sarif.runs[0].results.length, 1);
  assert.equal(sarif.runs[0].results[0].ruleId, 'CA4000');
  assert.equal(sarif.runs[0].results[0].level, 'note');
  assert.equal(sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri, 'src/change.prw');
  assert.match(sarif.runs[0].results[0].partialFingerprints.primaryLocationLineHash, /^[a-f0-9]{64}$/);

  const unsafe = reportAt();
  unsafe.reviews[0].file = 'C:\\private\\change.prw';
  assert.throws(() => exportChangeReview(unsafe), /workspace-relative/);
});

test('SARIF preserves distinct occurrences of the same rule and symbol while collapsing exact duplicates', () => {
  const report = reportAt(4);
  const second = structuredClone(report.reviews[0].findings[0]);
  second.line = 12;
  second.evidence.line = 12;
  report.reviews[0].findings.push(second);
  report.reviews[0].counts.INFO = 3;
  report.summary.findings = 3;

  const results = toSarif(report).runs[0].results;
  assert.deepEqual(results.map((result) => result.locations[0].physicalLocation.region.startLine), [4, 12]);
  assert.notEqual(
    results[0].partialFingerprints.primaryLocationLineHash,
    results[1].partialFingerprints.primaryLocationLineHash,
  );
});

test('repository ships a strict public change-review JSON schema', async () => {
  const schema = JSON.parse(await readFile(
    new URL('../schemas/change-review.schema.json', import.meta.url),
    'utf8',
  ));
  assert.equal(schema.$id, 'https://protheus-engineering-agent.dev/schemas/change-review.schema.json');
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, ['schemaVersion', 'kind', 'status', 'repository', 'scope', 'changedFiles', 'reviews', 'excluded', 'summary', 'evidence', 'disclaimer']);
  assert.equal(schema.properties.changedFiles.items.additionalProperties, false);
  assert.equal(schema.properties.reviews.items.additionalProperties, false);
  assert.equal(schema.properties.reviews.items.properties.findings.items.additionalProperties, false);
  assert.equal(schema.properties.reviews.items.properties.findings.items.properties.evidence.additionalProperties, false);
  assert.equal(schema.properties.summary.additionalProperties, false);
  assert.equal(schema.properties.evidence.items.additionalProperties, false);
});

test('repository ships strict public review policy and gate schemas', async () => {
  const [policy, gate] = await Promise.all([
    readFile(new URL('../schemas/review-policy.schema.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../schemas/review-gate.schema.json', import.meta.url), 'utf8').then(JSON.parse),
  ]);
  assert.equal(policy.$id, 'https://protheus-engineering-agent.dev/schemas/review-policy.schema.json');
  assert.equal(policy.additionalProperties, false);
  assert.deepEqual(policy.required, ['schemaVersion', 'waivers']);
  assert.equal(policy.properties.waivers.items.additionalProperties, false);
  assert.equal(gate.$id, 'https://protheus-engineering-agent.dev/schemas/review-gate.schema.json');
  assert.equal(gate.additionalProperties, false);
  assert.deepEqual(gate.required, ['schemaVersion', 'kind', 'status', 'threshold', 'review', 'policy', 'summary', 'blocked', 'waived', 'expiredWaivers', 'ambiguousWaivers', 'unusedWaivers']);
});

test('change-review exporter enforces enums, integer counts and reconciled summaries', () => {
  const invalidStatus = reportAt();
  invalidStatus.status = 'maybe';
  assert.throws(() => exportChangeReview(invalidStatus), /status/);

  const invalidScope = reportAt();
  invalidScope.scope.kind = 'all';
  assert.throws(() => exportChangeReview(invalidScope), /scope kind/);

  const invalidFileStatus = reportAt();
  invalidFileStatus.changedFiles[0].status = 'edited';
  assert.throws(() => exportChangeReview(invalidFileStatus), /file status/);

  const invalidCounts = reportAt();
  invalidCounts.reviews[0].counts.INFO = '2';
  assert.throws(() => exportChangeReview(invalidCounts), /review counts/);

  const inconsistentCounts = reportAt();
  inconsistentCounts.reviews[0].counts.INFO = 1;
  assert.throws(() => exportChangeReview(inconsistentCounts), /do not match findings/);

  const inconsistentSummary = reportAt();
  inconsistentSummary.summary.findings = 99;
  assert.throws(() => exportChangeReview(inconsistentSummary), /summary/);

  const invalidEvidenceScope = reportAt();
  invalidEvidenceScope.evidence[0].scope = { kind: 'everything', baseRef: null };
  assert.throws(() => exportChangeReview(invalidEvidenceScope), /scope kind/);
});

test('review gate blocks an in-scope major finding when no waiver exists', () => {
  assert.equal(typeof evidence.evaluateReviewGate, 'function');
  const report = reportAt();
  report.reviews[0].findings[0].severity = 'MAJOR';
  report.reviews[0].findings[1].severity = 'MAJOR';
  report.reviews[0].counts = { CRITICAL: 0, MAJOR: 2, MINOR: 0, INFO: 0 };

  const gate = evidence.evaluateReviewGate(report, undefined, {
    failOn: 'major', now: '2026-09-12T12:00:00.000Z',
  });

  assert.equal(gate.kind, 'review-gate');
  assert.equal(gate.status, 'FAIL');
  assert.equal(gate.blocked.length, 2);
  assert.equal(gate.waived.length, 0);
  assert.equal(gate.policy.status, 'absent');
});

test('review gate keeps raw findings and admits only a current, documented fingerprint waiver', () => {
  assert.equal(typeof evidence.evaluateReviewGate, 'function');
  assert.equal(typeof evidence.parseReviewPolicy, 'function');
  const report = reportAt();
  report.reviews[0].findings[0].severity = 'MAJOR';
  report.reviews[0].findings = [report.reviews[0].findings[0]];
  report.reviews[0].counts = { CRITICAL: 0, MAJOR: 1, MINOR: 0, INFO: 0 };
  report.summary.findings = 1;
  const exported = exportChangeReview(report);
  const policy = evidence.parseReviewPolicy({
    schemaVersion: 1,
    waivers: [{
      fingerprint: exported.reviews[0].findings[0].fingerprint,
      reason: 'False positive confirmed against the supported compiler behavior.',
      approvedBy: 'release-manager@example.invalid',
      expiresAt: '2026-10-01T00:00:00.000Z',
    }],
  });

  const gate = evidence.evaluateReviewGate(report, policy, {
    failOn: 'major', now: '2026-09-12T12:00:00.000Z',
  });

  assert.equal(exportChangeReview(report).reviews[0].findings.length, 1);
  assert.equal(gate.status, 'PASS');
  assert.equal(gate.blocked.length, 0);
  assert.equal(gate.waived.length, 1);
  assert.equal(gate.waived[0].reason, policy.waivers[0].reason);
  assert.equal(gate.waived[0].approvedBy, policy.waivers[0].approvedBy);
});

test('review gate fails closed when a waiver fingerprint identifies multiple findings', () => {
  assert.equal(typeof evidence.evaluateReviewGate, 'function');
  const report = reportAt();
  report.reviews[0].findings[0].severity = 'MAJOR';
  report.reviews[0].findings[1].severity = 'MAJOR';
  report.reviews[0].counts = { CRITICAL: 0, MAJOR: 2, MINOR: 0, INFO: 0 };
  const fingerprint = exportChangeReview(report).reviews[0].findings[0].fingerprint;
  const policy = evidence.parseReviewPolicy({
    schemaVersion: 1,
    waivers: [{
      fingerprint,
      reason: 'One occurrence was reviewed; multiple matching findings require separate remediation.',
      approvedBy: 'reviewer@example.invalid',
      expiresAt: '2026-10-01T00:00:00.000Z',
    }],
  });

  const gate = evidence.evaluateReviewGate(report, policy, {
    failOn: 'major', now: '2026-09-12T12:00:00.000Z',
  });
  assert.equal(gate.status, 'FAIL');
  assert.equal(gate.blocked.length, 2);
  assert.equal(gate.waived.length, 0);
  assert.deepEqual(gate.ambiguousWaivers, [policy.waivers[0]]);
});

test('review gate reports expired waivers and fails closed for malformed policy data', () => {
  assert.equal(typeof evidence.evaluateReviewGate, 'function');
  assert.equal(typeof evidence.parseReviewPolicy, 'function');
  const report = reportAt();
  report.reviews[0].findings[0].severity = 'CRITICAL';
  report.reviews[0].findings[1].severity = 'CRITICAL';
  report.reviews[0].counts = { CRITICAL: 2, MAJOR: 0, MINOR: 0, INFO: 0 };
  const fingerprint = exportChangeReview(report).reviews[0].findings[0].fingerprint;
  const expired = evidence.parseReviewPolicy({
    schemaVersion: 1,
    waivers: [{
      fingerprint,
      reason: 'Temporary exception awaiting vendor patch.',
      approvedBy: 'security@example.invalid',
      expiresAt: '2026-09-01T00:00:00.000Z',
    }],
  });

  const gate = evidence.evaluateReviewGate(report, expired, {
    failOn: 'critical', now: '2026-09-12T12:00:00.000Z',
  });
  assert.equal(gate.status, 'FAIL');
  assert.equal(gate.expiredWaivers.length, 1);
  assert.equal(gate.blocked.length, 2);

  assert.throws(() => evidence.parseReviewPolicy({ schemaVersion: 1, waivers: [{
    fingerprint, reason: 'x', approvedBy: 'owner', expiresAt: 'invalid',
  }] }), /expiresAt/);
  assert.throws(() => evidence.parseReviewPolicy({ schemaVersion: 1, waivers: [{
    fingerprint, reason: 'valid reason', approvedBy: 'owner', expiresAt: '2026-10-01T00:00:00.000Z',
  }, {
    fingerprint, reason: 'valid reason', approvedBy: 'owner', expiresAt: '2026-10-02T00:00:00.000Z',
  }] }), /duplicate/);
  assert.throws(() => evidence.parseReviewPolicy({ schemaVersion: 1, waivers: [], bypassAll: true }), /unsupported fields/);
});
