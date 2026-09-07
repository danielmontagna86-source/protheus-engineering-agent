/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  testRunner: 'command',
  commandRunner: {
    command: 'node --test test/codegraph.test.mjs test/policy.test.mjs test/review.test.mjs',
  },
  coverageAnalysis: 'off',
  cleanTempDir: 'always',
  mutate: [
    'packages/policy/src/index.mjs',
    'packages/review/src/index.mjs',
    'packages/codegraph-advpl/src/resolve.mjs',
  ],
  ignorePatterns: ['.vscode-test', 'dist', 'release-artifacts'],
  reporters: ['clear-text', 'progress'],
  thresholds: {
    high: 80,
    low: 60,
    break: 60,
  },
  concurrency: 1,
  timeoutMS: 10_000,
};

export default config;
