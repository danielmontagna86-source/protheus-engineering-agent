import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseAdvplSource } from '../packages/codegraph-advpl/src/index.mjs';
import { reviewSource } from '../packages/review/src/index.mjs';
import { codegraphCases, reviewCases } from './cases.mjs';

function ratio(numerator, denominator) {
  return denominator === 0 ? 1 : Number((numerator / denominator).toFixed(4));
}

function intersectionSize(left, right) {
  const expected = new Set(right);
  return [...new Set(left)].filter((item) => expected.has(item)).length;
}

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
}

export function evaluateBenchmark(options = {}) {
  const clock = options.clock ?? (() => performance.now());
  const durations = [];
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  let exactCases = 0;

  const reviewResults = reviewCases.map((fixture) => {
    const startedAt = clock();
    const report = reviewSource(fixture.source, { file: `${fixture.id}.prw` });
    const durationMs = Math.max(0, clock() - startedAt);
    durations.push(durationMs);
    const actual = report.findings.map((finding) => `${finding.ruleId}:${finding.line}`).sort();
    const expected = [...fixture.expected].sort();
    const tp = intersectionSize(actual, expected);
    const fp = actual.length - tp;
    const fn = expected.length - tp;
    truePositive += tp;
    falsePositive += fp;
    falseNegative += fn;
    if (fp === 0 && fn === 0) exactCases += 1;
    return { id: fixture.id, expected, actual, exact: fp === 0 && fn === 0, durationMs };
  });

  let expectedSymbols = 0;
  let foundSymbols = 0;
  let expectedCalls = 0;
  let foundCalls = 0;
  const codegraphResults = codegraphCases.map((fixture) => {
    const startedAt = clock();
    const graph = parseAdvplSource(fixture.source, { file: `${fixture.id}.prw` });
    const durationMs = Math.max(0, clock() - startedAt);
    durations.push(durationMs);
    const symbols = graph.symbols.map((symbol) => symbol.name).sort();
    const calls = graph.calls.map((call) => `${call.caller}->${call.callee}`).sort();
    const symbolsFound = intersectionSize(symbols, fixture.expectedSymbols);
    const callsFound = intersectionSize(calls, fixture.expectedCalls);
    expectedSymbols += fixture.expectedSymbols.length;
    foundSymbols += symbolsFound;
    expectedCalls += fixture.expectedCalls.length;
    foundCalls += callsFound;
    return { id: fixture.id, symbols, calls, durationMs };
  });

  return {
    schemaVersion: 1,
    dataset: {
      id: 'pea-synthetic-benchmark-v1',
      license: 'Apache-2.0 synthetic fixtures',
      reviewCases: reviewCases.length,
      codegraphCases: codegraphCases.length,
    },
    review: {
      truePositive,
      falsePositive,
      falseNegative,
      precision: ratio(truePositive, truePositive + falsePositive),
      recall: ratio(truePositive, truePositive + falseNegative),
      firstPassRate: ratio(exactCases, reviewCases.length),
      reworkItems: falsePositive + falseNegative,
      cases: reviewResults,
    },
    codegraph: {
      symbolRecall: ratio(foundSymbols, expectedSymbols),
      callRecall: ratio(foundCalls, expectedCalls),
      cases: codegraphResults,
    },
    performance: {
      totalMs: durations.reduce((total, value) => total + value, 0),
      medianCaseMs: percentile(durations, 0.5),
      p95CaseMs: percentile(durations, 0.95),
    },
    claimDecision: {
      deterministicFixtureAccuracy: falsePositive === 0 && falseNegative === 0 ? 'SUPPORTED' : 'NOT_SUPPORTED',
      productivityUplift: 'NOT_PROVEN',
      marketLeadership: 'NOT_PROVEN',
    },
    limitations: [
      'Synthetic fixtures measure deterministic contract accuracy, not complete ADVPL/TLPP correctness.',
      'No human developer cohort, crossover timing, live compiler or representative consenting project is included.',
      'Productivity and market-leadership claims require the separately documented human pilot.',
    ],
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${JSON.stringify({
    generatedAt: new Date().toISOString(),
    ...evaluateBenchmark(),
  }, null, 2)}\n`);
}
