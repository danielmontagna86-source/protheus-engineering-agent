import test from 'node:test';
import assert from 'node:assert/strict';

import { createBugReview, reviewSource } from '../packages/review/src/index.mjs';

test('review emits evidence-backed findings with stable severity ordering', () => {
  const source = [
    '#include "protheus.ch"',
    'User Function Risky()',
    '    While .T.',
    '        cValue := GetMV("MV_TEST")',
    '        ConOut(cValue)',
    '        Exit',
    '    EndDo',
    'Return',
  ].join('\n');

  const report = reviewSource(source, { file: 'risky.prw' });

  assert.equal(report.findings[0].ruleId, 'CA1003');
  assert.deepEqual(report.findings.map((finding) => finding.line), [4, 1, 5]);
  assert.equal(report.assessment, 'PASS WITH OBSERVATIONS');
  assert.equal(report.findings.every((finding) => finding.evidence.file === 'risky.prw'), true);
  assert.deepEqual(report.counts, { CRITICAL: 0, MAJOR: 1, MINOR: 2, INFO: 0 });
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.file, 'risky.prw');
  assert.equal(
    report.disclaimer,
    'Deterministic pre-review only; compilation and release compatibility are not asserted.',
  );
});

test('bug review reconciles code findings and graph impact into one sheet', () => {
  const report = createBugReview({
    title: 'Shared helper regression',
    sourceReport: {
      file: 'helper.prw',
      findings: [{ ruleId: 'CA1004', severity: 'MINOR', line: 7 }],
    },
    graph: {
      nodes: [{ name: 'SharedHelper', file: 'helper.prw', line: 2 }],
      edges: [
        { from: 'CallerA', to: 'SharedHelper', resolved: true },
        { from: 'CallerB', to: 'SharedHelper', resolved: true },
      ],
    },
    targetSymbol: 'sharedhelper',
  });

  assert.equal(report.status, 'diagnosed');
  assert.deepEqual(report.impact.callers, ['CallerA', 'CallerB']);
  assert.equal(report.evidence.length, 2);
});

test('review ignores rule-like text inside line comments, block comments and strings', () => {
  const source = [
    'User Function Safe()',
    '    // ConOut(GetMV("MV_TEST"))',
    '    cDouble := "IIF(DbSelectArea(\'SX1\'))"',
    "    cSingle := 'ConOut(GetMV(\"MV_TEST\"))'",
    '    /* DbSelectArea("SX2")',
    '       IIF(GetMV("MV_TEST"), .T., .F.) */',
    'Return',
  ].join('\n');

  const report = reviewSource(source);

  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.counts, { CRITICAL: 0, MAJOR: 0, MINOR: 0, INFO: 0 });
  assert.equal(report.assessment, 'PASS');
  assert.equal(report.file, '<memory>');
});

test('review emits the complete contract for every supported deterministic rule', () => {
  const source = [
    '#include <protheus.ch>',
    'User Function Contract()',
    '    IIF(.T., ConOut("ok"), Nil)',
    '    DbSelectArea("SX3")',
    'Return',
  ].join('\n');

  const report = reviewSource(source, { file: 'contract.prw' });

  assert.deepEqual(report.findings, [
    {
      ruleId: 'CA2000',
      severity: 'CRITICAL',
      category: 'Metadata',
      title: 'Direct system-table access',
      line: 4,
      guidance: 'Use a validated framework metadata API; do not access SX-family tables directly.',
      evidence: { file: 'contract.prw', line: 4, excerpt: 'DbSelectArea("SX3")' },
    },
    {
      ruleId: 'CA3001',
      severity: 'MINOR',
      category: 'Legacy',
      title: 'Obsolete include',
      line: 1,
      guidance: 'Use the project-approved modern include after validating compatibility.',
      evidence: { file: 'contract.prw', line: 1, excerpt: '#include <protheus.ch>' },
    },
    {
      ruleId: 'CA1004',
      severity: 'MINOR',
      category: 'Legacy',
      title: 'Console output API',
      line: 3,
      guidance: 'Route diagnostics through the project logging abstraction.',
      evidence: { file: 'contract.prw', line: 3, excerpt: 'IIF(.T., ConOut("ok"), Nil)' },
    },
    {
      ruleId: 'CA4000',
      severity: 'INFO',
      category: 'Clean Code',
      title: 'Inline conditional',
      line: 3,
      guidance: 'Prefer an explicit conditional block for maintainability.',
      evidence: { file: 'contract.prw', line: 3, excerpt: 'IIF(.T., ConOut("ok"), Nil)' },
    },
  ]);
  assert.deepEqual(report.counts, { CRITICAL: 1, MAJOR: 0, MINOR: 2, INFO: 1 });
  assert.equal(report.assessment, 'FAIL');
});

test('review tracks loop boundaries and escalates more than three major findings', () => {
  const source = [
    'User Function LoopContract()',
    '    GetMV("BEFORE")',
    '    For nItem := 1 To 4',
    '        GetMV("ONE")',
    '        SuperGetMV("TWO")',
    '        ExistBlock("THREE")',
    '        Pergunte("FOUR")',
    '    Next',
    '    GetMV("AFTER")',
    'Return',
  ].join('\n');

  const report = reviewSource(source, { file: 'loops.prw' });

  assert.deepEqual(report.findings.map((finding) => finding.line), [4, 5, 6, 7]);
  assert.deepEqual(report.counts, { CRITICAL: 0, MAJOR: 4, MINOR: 0, INFO: 0 });
  assert.equal(report.assessment, 'NEEDS REVISION');
});

test('bug review filters unresolved and unrelated edges, deduplicates callers and sorts them', () => {
  const report = createBugReview({
    title: 'Impact contract',
    sourceReport: { file: 'helper.prw', findings: [] },
    graph: {
      nodes: [{ name: 'SharedHelper', file: 'helper.prw', line: 9 }],
      edges: [
        { from: 'Zulu', to: 'SharedHelper', resolved: true },
        { from: 'Alpha', to: 'SharedHelper', resolved: true },
        { from: 'Alpha', to: 'SharedHelper', resolved: true },
        { from: 'IgnoredUnresolved', to: 'SharedHelper', resolved: false },
        { from: 'IgnoredTarget', to: 'OtherHelper', resolved: true },
      ],
    },
    targetSymbol: 'SHAREDHELPER',
  });

  assert.deepEqual(report, {
    schemaVersion: 1,
    title: 'Impact contract',
    status: 'diagnosed',
    target: { name: 'SharedHelper', file: 'helper.prw', line: 9 },
    impact: { callers: ['Alpha', 'Zulu'], callerCount: 2 },
    findings: [],
    evidence: [
      { type: 'source-review', file: 'helper.prw', findingCount: 0 },
      { type: 'codegraph', targetFound: true, callerCount: 2 },
    ],
  });
});

test('bug review returns needs-evidence when the target symbol is absent', () => {
  const report = createBugReview({
    title: 'Missing target',
    sourceReport: { file: 'missing.prw', findings: [{ ruleId: 'CA1004' }] },
    graph: { nodes: [], edges: [] },
  });

  assert.deepEqual(report, {
    schemaVersion: 1,
    title: 'Missing target',
    status: 'needs-evidence',
    target: null,
    impact: { callers: [], callerCount: 0 },
    findings: [{ ruleId: 'CA1004' }],
    evidence: [
      { type: 'source-review', file: 'missing.prw', findingCount: 1 },
      { type: 'codegraph', targetFound: false, callerCount: 0 },
    ],
  });
});
