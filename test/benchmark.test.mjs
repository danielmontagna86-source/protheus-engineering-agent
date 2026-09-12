import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateBenchmark } from '../benchmark/run.mjs';

test('product benchmark reports correctness, first-pass, rework and bounded timing honestly', () => {
  let tick = 0;
  const result = evaluateBenchmark({ clock: () => (tick += 2) });

  assert.equal(result.schemaVersion, 1);
  assert.equal(result.dataset.license, 'Apache-2.0 synthetic fixtures');
  assert.equal(result.review.precision, 1);
  assert.equal(result.review.recall, 1);
  assert.equal(result.review.firstPassRate, 1);
  assert.equal(result.review.reworkItems, 0);
  assert.equal(result.codegraph.symbolRecall, 1);
  assert.equal(result.codegraph.callRecall, 1);
  assert.ok(result.performance.totalMs > 0);
  assert.equal(result.claimDecision.productivityUplift, 'NOT_PROVEN');
  assert.match(result.limitations.join(' '), /human/i);
});
