import { createHash } from 'node:crypto';

const SEVERITY_LEVEL = Object.freeze({ CRITICAL: 'error', MAJOR: 'warning', MINOR: 'note', INFO: 'note' });
const CHANGE_STATUSES = new Set(['added', 'copied', 'deleted', 'modified', 'renamed', 'type-changed', 'unmerged', 'unknown', 'broken-pair', 'untracked']);
const REVIEW_STATUSES = new Set(['clean', 'changed']);
const SCOPE_KINDS = new Set(['staged', 'unstaged', 'working-tree', 'branch']);
const ENCODINGS = new Set(['utf-8', 'utf-16le', 'windows-1252']);

function record(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value;
}

function relativePath(value) {
  const path = String(value ?? '').replaceAll('\\', '/');
  if (!path || path.startsWith('/') || /^[a-z]:/i.test(path) || path.split('/').includes('..')) {
    throw new TypeError('review paths must be workspace-relative');
  }
  return path;
}

function boundedText(value, label, max = 2_000) {
  if (typeof value !== 'string' || value.length === 0 || value.length > max || value.includes('\0')) {
    throw new TypeError(`${label} must be a bounded non-empty string`);
  }
  return value;
}

function enumValue(value, allowed, label) {
  if (!allowed.has(value)) throw new TypeError(`unsupported ${label}: ${String(value)}`);
  return value;
}

function nonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${label} must be a non-negative integer`);
  return value;
}

function exportScope(value, label = 'scope') {
  const scope = record(value, label);
  const kind = enumValue(scope.kind, SCOPE_KINDS, `${label} kind`);
  const baseRef = scope.baseRef === null || scope.baseRef === undefined
    ? null
    : boundedText(scope.baseRef, `${label} baseRef`, 128);
  if (kind === 'branch' && baseRef === null) throw new TypeError(`${label} baseRef is required for branch scope`);
  if (kind !== 'branch' && baseRef !== null) throw new TypeError(`${label} baseRef is allowed only for branch scope`);
  return { kind, baseRef };
}

function exportCounts(value) {
  const counts = record(value, 'review counts');
  if (Object.keys(counts).sort().join(',') !== 'CRITICAL,INFO,MAJOR,MINOR') {
    throw new TypeError('review counts must contain exactly CRITICAL, MAJOR, MINOR and INFO');
  }
  return Object.fromEntries(Object.keys(SEVERITY_LEVEL).map((severity) => [
    severity,
    nonNegativeInteger(counts[severity], `review counts.${severity}`),
  ]));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function stableStringify(value, space = 2) {
  return `${JSON.stringify(canonicalize(value), null, space)}\n`;
}

export function findingFingerprint(finding) {
  const evidence = record(finding.evidence, 'finding evidence');
  const identity = stableStringify({
    file: relativePath(evidence.file),
    ruleId: boundedText(finding.ruleId, 'finding ruleId', 80),
    symbol: typeof evidence.symbol === 'string' && evidence.symbol.trim()
      ? evidence.symbol.trim().toLowerCase()
      : null,
    title: boundedText(finding.title, 'finding title', 240),
  }, 0);
  return createHash('sha256').update(identity).digest('hex');
}

function exportFinding(finding, reviewFile) {
  record(finding, 'finding');
  const evidence = record(finding.evidence, 'finding evidence');
  const file = relativePath(evidence.file ?? reviewFile);
  if (file !== reviewFile) throw new TypeError('finding evidence file does not match its review');
  if (!Number.isSafeInteger(finding.line) || finding.line < 1) throw new TypeError('finding line must be positive');
  if (!SEVERITY_LEVEL[finding.severity]) throw new TypeError(`unsupported finding severity: ${finding.severity}`);
  const exported = {
    ruleId: boundedText(finding.ruleId, 'finding ruleId', 80),
    severity: finding.severity,
    category: boundedText(finding.category, 'finding category', 120),
    title: boundedText(finding.title, 'finding title', 240),
    guidance: boundedText(finding.guidance, 'finding guidance'),
    line: finding.line,
    evidence: {
      file,
      line: finding.line,
      ...(typeof evidence.symbol === 'string' && evidence.symbol.trim()
        ? { symbol: boundedText(evidence.symbol.trim(), 'finding symbol', 240) }
        : {}),
    },
  };
  return { ...exported, fingerprint: findingFingerprint(exported) };
}

export function exportChangeReview(value) {
  const report = record(value, 'change review');
  if (report.kind !== 'change-review' || report.schemaVersion !== 1) {
    throw new TypeError('unsupported change review contract');
  }
  const repository = report.repository === '.' ? '.' : relativePath(report.repository);
  const scope = exportScope(report.scope, 'change review scope');
  const changedFiles = (report.changedFiles ?? []).map((file) => {
    record(file, 'changed file');
    return {
      path: relativePath(file.path),
      ...(file.previousPath ? { previousPath: relativePath(file.previousPath) } : {}),
      status: enumValue(file.status, CHANGE_STATUSES, 'changed file status'),
      binary: file.binary === true,
    };
  });
  const reviews = (report.reviews ?? []).map((review) => {
    record(review, 'file review');
    const file = relativePath(review.file);
    const findings = (review.findings ?? []).map((finding) => exportFinding(finding, file));
    const counts = exportCounts(review.counts);
    for (const severity of Object.keys(SEVERITY_LEVEL)) {
      if (counts[severity] !== findings.filter((finding) => finding.severity === severity).length) {
        throw new TypeError('review counts do not match findings');
      }
    }
    return {
      schemaVersion: 1,
      file,
      encoding: enumValue(review.encoding, ENCODINGS, 'review encoding'),
      findings,
      counts,
      assessment: boundedText(review.assessment, 'review assessment', 80),
    };
  });
  const excluded = (report.excluded ?? []).map((item) => ({
    path: relativePath(item.path),
    reason: boundedText(item.reason, 'exclusion reason', 80),
  }));
  const summary = record(report.summary, 'change review summary');
  const evidence = (report.evidence ?? []).map((item) => ({
    type: boundedText(item.type, 'evidence type', 80),
    ...(item.repository !== undefined ? { repository: item.repository === '.' ? '.' : relativePath(item.repository) } : {}),
    ...(item.scope !== undefined ? { scope: exportScope(item.scope, 'evidence scope') } : {}),
    ...(item.fileCount !== undefined ? { fileCount: nonNegativeInteger(item.fileCount, 'evidence fileCount') } : {}),
  }));
  const filesChanged = nonNegativeInteger(summary.filesChanged, 'summary.filesChanged');
  const filesReviewed = nonNegativeInteger(summary.filesReviewed, 'summary.filesReviewed');
  const findings = nonNegativeInteger(summary.findings, 'summary.findings');
  if (filesChanged !== changedFiles.length
    || filesReviewed !== reviews.length
    || findings !== reviews.reduce((total, review) => total + review.findings.length, 0)) {
    throw new TypeError('change review summary does not match exported records');
  }
  const status = enumValue(report.status, REVIEW_STATUSES, 'change review status');
  if ((status === 'clean') !== (changedFiles.length === 0)) {
    throw new TypeError('change review status does not match changed files');
  }
  return {
    schemaVersion: 1,
    kind: 'change-review',
    status,
    repository,
    scope: {
      ...scope,
    },
    changedFiles,
    reviews,
    excluded,
    summary: {
      filesChanged,
      filesReviewed,
      findings,
      assessment: boundedText(summary.assessment, 'summary assessment', 80),
    },
    evidence,
    disclaimer: boundedText(report.disclaimer, 'change review disclaimer'),
  };
}

export function toSarif(value, options = {}) {
  const report = exportChangeReview(value);
  const allFindings = report.reviews.flatMap((review) => review.findings);
  const findings = [...new Map(allFindings.map((finding) => [
    `${finding.fingerprint}\0${finding.evidence.file}\0${finding.line}`,
    finding,
  ])).values()];
  const fingerprintCounts = new Map();
  for (const finding of findings) {
    fingerprintCounts.set(finding.fingerprint, (fingerprintCounts.get(finding.fingerprint) ?? 0) + 1);
  }
  const fingerprintOccurrences = new Map();
  const rules = [...new Map(findings.map((finding) => [finding.ruleId, {
    id: finding.ruleId,
    name: finding.title.replace(/[^A-Za-z0-9]+/g, ''),
    shortDescription: { text: finding.title },
    fullDescription: { text: finding.guidance },
    defaultConfiguration: { level: SEVERITY_LEVEL[finding.severity] },
    properties: { category: finding.category, severity: finding.severity },
  }])).values()].sort((left, right) => left.id.localeCompare(right.id));
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: { driver: {
        name: 'Protheus Engineering Agent',
        version: boundedText(options.toolVersion ?? '0.0.0', 'tool version', 80),
        informationUri: 'https://github.com/danielmontagna86-source/protheus-engineering-agent',
        rules,
      } },
      results: findings.map((finding) => {
        const occurrence = fingerprintOccurrences.get(finding.fingerprint) ?? 0;
        fingerprintOccurrences.set(finding.fingerprint, occurrence + 1);
        const sarifFingerprint = fingerprintCounts.get(finding.fingerprint) === 1
          ? finding.fingerprint
          : createHash('sha256').update(`${finding.fingerprint}\0${occurrence}`).digest('hex');
        return {
          ruleId: finding.ruleId,
          level: SEVERITY_LEVEL[finding.severity],
          message: { text: `${finding.title}: ${finding.guidance}` },
          locations: [{ physicalLocation: {
            artifactLocation: { uri: finding.evidence.file, uriBaseId: '%SRCROOT%' },
            region: { startLine: finding.line },
          } }],
          partialFingerprints: { primaryLocationLineHash: sarifFingerprint },
          properties: {
            severity: finding.severity,
            category: finding.category,
            ...(finding.evidence.symbol ? { symbol: finding.evidence.symbol } : {}),
          },
        };
      }),
    }],
  };
}
