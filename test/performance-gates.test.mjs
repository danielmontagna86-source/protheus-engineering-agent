import test from 'node:test';
import assert from 'node:assert/strict';

import { runLargeRepositoryBenchmark } from '../benchmark/large-repository.mjs';
import { indexWorkspace } from '../packages/codegraph-advpl/src/index.mjs';

test('large-repository benchmark proves cold, warm and one-file invalidation equivalence', async () => {
  const report = await runLargeRepositoryBenchmark({
    sizes: [{ id: 'test-100', symbols: 100, maxColdMs: 5_000, maxWarmMs: 5_000, maxChangedMs: 5_000, maxPeakRssDeltaMiB: 256 }],
  });

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.platform, process.platform);
  assert.equal(report.results[0].status, 'passed');
  assert.equal(report.results[0].symbols, 100);
  assert.equal(report.results[0].cold.graphSha256, report.results[0].warm.graphSha256);
  assert.equal(report.results[0].warm.cacheHits > 0, true);
  assert.equal(report.results[0].changed.cacheMisses, 1);
  assert.equal(Number.isFinite(report.results[0].cold.peakRssDeltaMiB), true);
  assert.equal(report.results[0].cold.peakRssDeltaMiB >= 0, true);
  assert.equal('heapMiB' in report.results[0].cold, false);
  assert.equal(report.limitations.some((item) => /sampled peak RSS/i.test(item)), true);
});

test('workspace indexing observes pre-cancelled work without returning partial evidence', async () => {
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(indexWorkspace(process.cwd(), { signal: controller.signal }), /cancelled/i);
});
