import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

import { createIncrementalParser, indexWorkspace } from '../packages/codegraph-advpl/src/index.mjs';

const moduleRoot = dirname(fileURLToPath(import.meta.url));

function graphHash(graph) {
  return createHash('sha256').update(JSON.stringify({
    files: graph.files,
    encodings: graph.encodings,
    nodes: graph.nodes,
    edges: graph.edges,
  })).digest('hex');
}

function validateSize(size) {
  const required = ['id', 'symbols', 'maxColdMs', 'maxWarmMs', 'maxChangedMs', 'maxPeakRssDeltaMiB'];
  if (!size || typeof size !== 'object' || required.some((key) => size[key] === undefined)) {
    throw new TypeError('performance size requires id, symbols and all budgets');
  }
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(size.id) || !Number.isInteger(size.symbols) || size.symbols < 1) {
    throw new TypeError('performance size id or symbol count is invalid');
  }
  for (const key of required.slice(2)) {
    if (!Number.isFinite(size[key]) || size[key] <= 0) throw new TypeError(`performance budget is invalid: ${key}`);
  }
  return size;
}

async function createFixture(root, symbols) {
  const perFile = 100;
  const files = [];
  for (let start = 0; start < symbols; start += perFile) {
    const path = join(root, `module-${String(files.length).padStart(4, '0')}.prw`);
    const end = Math.min(symbols, start + perFile);
    const source = Array.from({ length: end - start }, (_, offset) => {
      const index = start + offset;
      return `Static Function Perf${index}()\nReturn ${index}\n`;
    }).join('\n');
    await writeFile(path, source, 'utf8');
    files.push(path);
  }
  return files;
}

async function measuredIndex(root, parser) {
  const rssBefore = process.memoryUsage().rss;
  let peakRss = rssBefore;
  const sample = () => {
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
  };
  const sampler = setInterval(sample, 1);
  sampler.unref();
  const startedAt = performance.now();
  let graph;
  try {
    graph = await indexWorkspace(root, { incrementalParser: parser });
  } finally {
    sample();
    clearInterval(sampler);
  }
  const durationMs = performance.now() - startedAt;
  const peakRssDeltaMiB = Math.max(0, peakRss - rssBefore) / (1024 * 1024);
  return {
    durationMs,
    peakRssDeltaMiB,
    graphSha256: graphHash(graph),
    cacheHits: graph.analysis.cache.hits,
    cacheMisses: graph.analysis.cache.misses,
    graph,
  };
}

export async function runLargeRepositoryBenchmark(options = {}) {
  const sizes = (options.sizes ?? []).map(validateSize);
  if (sizes.length === 0) throw new TypeError('at least one performance size is required');
  const results = [];
  for (const size of sizes) {
    const root = await mkdtemp(join(tmpdir(), `pea-large-${size.id}-`));
    try {
      const files = await createFixture(root, size.symbols);
      const parser = createIncrementalParser({ maxEntries: Math.max(2_000, files.length + 10) });
      const cold = await measuredIndex(root, parser);
      const warm = await measuredIndex(root, parser);
      await writeFile(files[0], `${await readFile(files[0], 'utf8')}\n// one-file invalidation\n`, 'utf8');
      const changed = await measuredIndex(root, parser);
      const checks = {
        symbolCount: cold.graph.nodes.length === size.symbols,
        warmEquivalent: cold.graphSha256 === warm.graphSha256,
        oneFileInvalidated: changed.cacheMisses === 1 && changed.cacheHits === files.length - 1,
        coldTime: cold.durationMs <= size.maxColdMs,
        warmTime: warm.durationMs <= size.maxWarmMs,
        changedTime: changed.durationMs <= size.maxChangedMs,
        sampledPeakRss: Math.max(
          cold.peakRssDeltaMiB,
          warm.peakRssDeltaMiB,
          changed.peakRssDeltaMiB,
        ) <= size.maxPeakRssDeltaMiB,
      };
      const trim = ({ graph, ...measurement }) => measurement;
      results.push({
        id: size.id,
        symbols: size.symbols,
        files: files.length,
        budgets: {
          maxColdMs: size.maxColdMs,
          maxWarmMs: size.maxWarmMs,
          maxChangedMs: size.maxChangedMs,
          maxPeakRssDeltaMiB: size.maxPeakRssDeltaMiB,
        },
        cold: trim(cold),
        warm: trim(warm),
        changed: trim(changed),
        checks,
        status: Object.values(checks).every(Boolean) ? 'passed' : 'failed',
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    results,
    status: results.every((item) => item.status === 'passed') ? 'passed' : 'failed',
    limitations: [
      'Synthetic generated sources measure the declared index/cache budgets, not compiler correctness.',
      'Memory is a 1 ms sampled peak RSS delta for the Node.js process, not an operating-system-enforced hard cap.',
      'Release evidence must be regenerated on both Windows and Linux for the exact candidate commit.',
    ],
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const profile = process.argv[2] ?? 'ci';
  const budgets = JSON.parse(await readFile(join(moduleRoot, 'performance-budgets.json'), 'utf8'));
  if (!Array.isArray(budgets.profiles?.[profile])) throw new Error(`unknown performance profile: ${profile}`);
  const report = await runLargeRepositoryBenchmark({ sizes: budgets.profiles[profile] });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status !== 'passed') process.exitCode = 1;
}
