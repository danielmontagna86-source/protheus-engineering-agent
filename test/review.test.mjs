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

test('review detects the high-confidence restricted and legacy EngPro rule subset', () => {
  const source = [
    'StaticCall   (Namespace, FunctionName)',
    'PTInternal  ("unsafe")',
    '__cUserID:="admin"',
    'cEmpAnt     := "01"',
    'CREATE     PROCEDURE CustomProcedure',
    'MSCREATE   ("TEMP", aFields)',
    'DBCREATE  ("TEMP", aFields)',
    'OutErr   ("legacy")',
  ].join('\n');

  const report = reviewSource(source, { file: 'restricted.prw' });

  assert.deepEqual(report.findings.map(({ ruleId, severity, line }) => ({
    ruleId, severity, line,
  })), [
    { ruleId: 'CA2022', severity: 'CRITICAL', line: 1 },
    { ruleId: 'CA2023', severity: 'CRITICAL', line: 2 },
    { ruleId: 'CA2024', severity: 'CRITICAL', line: 3 },
    { ruleId: 'CA2025', severity: 'CRITICAL', line: 4 },
    { ruleId: 'CA2053', severity: 'CRITICAL', line: 5 },
    { ruleId: 'CA1000', severity: 'MAJOR', line: 6 },
    { ruleId: 'CA1000', severity: 'MAJOR', line: 7 },
    { ruleId: 'CA1004', severity: 'MINOR', line: 8 },
  ]);
  assert.deepEqual(report.counts, { CRITICAL: 5, MAJOR: 2, MINOR: 1, INFO: 0 });
  assert.equal(report.assessment, 'FAIL');
  assert.equal(report.findings.every(({ category, title, guidance }) => (
    category.length > 0 && title.length > 0 && guidance.length > 0
  )), true);
});

test('review detects UI in transactions and Type inside loops without leaking scope', () => {
  const source = [
    'User Function Scoped()',
    '    Begin    Transaction',
    '        MsgAlert("locked")',
    '    End     Transaction',
    '    MsgInfo("outside")',
    '    While .T.',
    '        Type("A1_COD")',
    '        Exit',
    '    EndDo',
    '    Type("outside")',
    'Return',
  ].join('\n');

  const report = reviewSource(source, { file: 'scoped.prw' });

  assert.deepEqual(report.findings.map(({ ruleId, severity, line }) => ({ ruleId, severity, line })), [
    { ruleId: 'CA1002', severity: 'MAJOR', line: 3 },
    { ruleId: 'CA1003', severity: 'MAJOR', line: 7 },
  ]);
  assert.equal(report.findings.every(({ category, title, guidance }) => (
    category.length > 0 && title.length > 0 && guidance.length > 0
  )), true);
});

test('review treats DbEval as a callback function without leaking loop scope', () => {
  const source = [
    'DbEval({|| GetMV("MV_TEST")})',
    'cValue := GetMV("MV_TEST")',
  ].join('\n');

  const report = reviewSource(source, { file: 'dbeval.prw' });

  assert.deepEqual(report.findings.map(({ ruleId, line }) => ({ ruleId, line })), [
    { ruleId: 'CA1003', line: 1 },
  ]);
});

test('review ignores restricted rule text inside comments and string literals', () => {
  const source = [
    '// StaticCall() PTInternal() __cUserID := cEmpAnt :=',
    'cSql := "CREATE PROCEDURE Hidden"',
    "cLegacy := 'MSCREATE() DBCREATE() OutErr()'",
    '/* Begin Transaction MsgAlert() End Transaction */',
  ].join('\n');

  const report = reviewSource(source);

  assert.deepEqual(report.findings, []);
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

  assert.equal(report.schemaVersion, 2);
  assert.equal(report.status, 'diagnosed');
  assert.deepEqual(report.target, { name: 'SharedHelper', file: 'helper.prw', line: 9 });
  assert.deepEqual(report.impact, { callers: ['Alpha', 'Zulu'], callerCount: 2 });
  assert.deepEqual(report.changedFiles, []);
  assert.equal(report.validation.summary.allPassed, false);
  assert.equal(report.build.verified, false);
  assert.deepEqual(report.evidence, [
    { type: 'source-review', file: 'helper.prw', findingCount: 0 },
    { type: 'codegraph', targetFound: true, callerCount: 2 },
  ]);
});

test('bug review returns needs-evidence when the target symbol is absent', () => {
  const report = createBugReview({
    title: 'Missing target',
    sourceReport: { file: 'missing.prw', findings: [{ ruleId: 'CA1004' }] },
    graph: { nodes: [], edges: [] },
  });

  assert.equal(report.schemaVersion, 2);
  assert.equal(report.status, 'needs-evidence');
  assert.equal(report.target, null);
  assert.deepEqual(report.impact, { callers: [], callerCount: 0 });
  assert.deepEqual(report.findings, [{ ruleId: 'CA1004' }]);
  assert.deepEqual(report.residualRisks.map((risk) => risk.code), [
    'TARGET_NOT_FOUND',
    'VALIDATION_INCOMPLETE',
    'BUILD_NOT_VERIFIED',
  ]);
});

test('bug review reconciles changed files, validation, build proof, uncertainty and residual risk', () => {
  const report = createBugReview({
    title: 'Verified change',
    targetSymbol: 'SharedHelper',
    sourceReport: { file: 'src/helper.prw', findings: [] },
    graph: {
      nodes: [{ id: 'src/helper.prw#sharedhelper', name: 'SharedHelper', file: 'src/helper.prw', line: 2 }],
      edges: [{
        fromId: 'src/caller.prw#caller', from: 'Caller', toId: 'src/helper.prw#sharedhelper',
        to: 'SharedHelper', file: 'src/caller.prw', line: 3, resolved: true,
      }],
    },
    changedFiles: ['src/helper.prw', 'src/caller.prw', 'src/helper.prw'],
    validation: [
      { name: 'unit', status: 'passed', evidence: '12/12' },
      { name: 'compile', status: 'not-run', evidence: 'AppServer unavailable' },
    ],
    buildEvidence: { status: 'not-run', reason: 'No homologation server configured' },
    externalEvidence: [{ type: 'tdn', sha256: 'a'.repeat(64), source: 'snapshot:v1' }],
    uncertainty: ['Dynamic calls are not resolved.'],
  });

  assert.equal(report.schemaVersion, 2);
  assert.deepEqual(report.changedFiles, [
    { path: 'src/caller.prw', status: 'modified' },
    { path: 'src/helper.prw', status: 'modified' },
  ]);
  assert.deepEqual(report.validation.summary, { passed: 1, failed: 0, notRun: 1, allPassed: false });
  assert.equal(report.build.verified, false);
  assert.deepEqual(report.uncertainty.items, ['Dynamic calls are not resolved.']);
  assert.deepEqual(report.residualRisks.map((risk) => risk.code), [
    'VALIDATION_INCOMPLETE',
    'BUILD_NOT_VERIFIED',
    'OPEN_UNCERTAINTY',
  ]);
  assert.equal(report.evidence.some((item) => item.type === 'tdn'), true);
});

test('bug review only verifies a completed build with compiler and artifact evidence', () => {
  const base = {
    title: 'Build contract',
    targetSymbol: 'Entry',
    sourceReport: { file: 'entry.prw', findings: [] },
    graph: { nodes: [{ id: 'entry.prw#entry', name: 'Entry', file: 'entry.prw', line: 1 }], edges: [] },
    validation: [{ name: 'tests', status: 'passed', evidence: 'green' }],
  };
  const unproved = createBugReview({ ...base, buildEvidence: { status: 'completed' } });
  const proved = createBugReview({
    ...base,
    buildEvidence: {
      status: 'completed',
      compiler: { exitCode: 0, identity: 'tds-cli@2.0.16' },
      artifact: { sha256: 'b'.repeat(64), path: 'build/entry.ptm' },
    },
  });

  assert.equal(unproved.build.status, 'unverified');
  assert.equal(unproved.build.verified, false);
  assert.equal(proved.build.status, 'completed');
  assert.equal(proved.build.verified, true);
  assert.equal(proved.residualRisks.some((risk) => risk.code === 'BUILD_NOT_VERIFIED'), false);
});

test('bug review reports exact validation, build, uncertainty, risk and evidence contracts', () => {
  const report = createBugReview({
    title: 'Exact evidence',
    targetSymbol: 'Entry',
    sourceReport: { file: 'entry.prw', findings: [{ ruleId: 'CA1004', line: 2 }] },
    graph: { nodes: [{ name: 'Entry', file: 'entry.prw', line: 1 }], edges: [] },
    changedFiles: [{ path: 'entry.prw', status: 'added' }],
    validation: [
      { name: 'unit', status: 'passed', evidence: '10/10' },
      { name: 'compile', status: 'failed' },
      { name: 'uat', status: 'not-run', evidence: null },
    ],
    buildEvidence: {
      status: 'completed', compiler: { exitCode: 0, identity: 'compiler@1' },
      artifact: { sha256: 'c'.repeat(64), path: 'build/entry.ptm' },
    },
    uncertainty: ['', 'dynamic call', 'dynamic call'],
    externalEvidence: [{ type: 'dictionary', snapshot: 'v1' }],
  });

  assert.deepEqual(report.validation, {
    checks: [
      { name: 'unit', status: 'passed', evidence: '10/10' },
      { name: 'compile', status: 'failed', evidence: null },
      { name: 'uat', status: 'not-run', evidence: null },
    ],
    summary: { passed: 1, failed: 1, notRun: 1, allPassed: false },
  });
  assert.deepEqual(report.build, {
    status: 'completed', compiler: { exitCode: 0, identity: 'compiler@1' },
    artifact: { sha256: 'c'.repeat(64), path: 'build/entry.ptm' }, verified: true,
  });
  assert.deepEqual(report.uncertainty, { items: ['dynamic call'], hasOpenQuestions: true });
  assert.deepEqual(report.residualRisks, [
    { code: 'VALIDATION_FAILED', severity: 'critical', detail: '1 validation check(s) failed.' },
    { code: 'VALIDATION_INCOMPLETE', severity: 'major', detail: 'Not every declared validation check passed.' },
    { code: 'OPEN_UNCERTAINTY', severity: 'minor', detail: '1 uncertainty item(s) remain open.' },
  ]);
  assert.deepEqual(report.evidence, [
    { type: 'source-review', file: 'entry.prw', findingCount: 1 },
    { type: 'codegraph', targetFound: true, callerCount: 0 },
    { type: 'changed-files', count: 1 },
    { type: 'validation', passed: 1, failed: 1, notRun: 1, allPassed: false },
    { type: 'build', status: 'completed', verified: true },
    { type: 'dictionary', snapshot: 'v1' },
  ]);
});

test('bug review rejects malformed validation and never verifies partial compiler evidence', () => {
  const base = {
    title: 'Strict evidence', targetSymbol: 'Entry',
    sourceReport: { file: 'entry.prw', findings: [] },
    graph: { nodes: [{ name: 'Entry', file: 'entry.prw', line: 1 }], edges: [] },
    validation: [{ name: 'tests', status: 'passed' }],
  };
  for (const validation of [[{ status: 'passed' }], [{ name: 'x', status: 'unknown' }]]) {
    assert.throws(() => createBugReview({ ...base, validation }), /validation checks require/);
  }
  for (const buildEvidence of [
    { status: 'completed', compiler: { exitCode: 1, identity: 'compiler' }, artifact: { sha256: 'd'.repeat(64), path: 'x' } },
    { status: 'completed', compiler: { exitCode: 0, identity: '' }, artifact: { sha256: 'd'.repeat(64), path: 'x' } },
    { status: 'completed', compiler: { exitCode: 0, identity: 'compiler' }, artifact: { sha256: `x${'d'.repeat(64)}`, path: 'x' } },
    { status: 'completed', compiler: { exitCode: 0, identity: 'compiler' }, artifact: { sha256: 'd'.repeat(64), path: '' } },
  ]) {
    const report = createBugReview({ ...base, buildEvidence });
    assert.equal(report.build.status, 'unverified');
    assert.equal(report.build.verified, false);
    assert.equal(report.residualRisks.at(-1).code, 'BUILD_NOT_VERIFIED');
  }
});
