import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  testRunner: 'command',
  commandRunner: {
    command: 'node --test test/codegraph.test.mjs test/policy.test.mjs test/review.test.mjs',
  },
  coverageAnalysis: 'off',
  cleanTempDir: 'always',
  tempDirName: join(tmpdir(), 'pea-stryker-tmp'),
  mutate: [
    'packages/policy/src/index.mjs',
    'packages/review/src/index.mjs',
    'packages/codegraph-advpl/src/resolve.mjs',
  ],
  ignorePatterns: ['.vscode-test', 'dist', 'release-artifacts'],
  reporters: ['clear-text', 'progress'],
  thresholds: {
    high: 95,
    low: 90,
    break: 95,
  },
  concurrency: 1,
  timeoutMS: 10_000,
};

export default config;
