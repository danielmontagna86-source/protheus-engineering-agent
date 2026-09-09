/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  testRunner: 'command',
  commandRunner: {
    command: 'node --test test/ai-gateway.test.mjs test/codegraph.test.mjs test/policy.test.mjs test/review.test.mjs test/runtime-cli.test.mjs test/subagents.test.mjs',
  },
  coverageAnalysis: 'off',
  cleanTempDir: 'always',
  mutate: [
    'packages/ai-gateway/src/index.mjs',
    'packages/policy/src/index.mjs',
    'packages/review/src/index.mjs',
    'packages/codegraph-advpl/src/resolve.mjs',
    'packages/runtime/src/index.mjs',
    'packages/subagents/src/index.mjs',
  ],
  ignorePatterns: ['.vscode-test', 'dist', 'release-artifacts'],
  reporters: ['clear-text', 'progress'],
  thresholds: {
    high: 95,
    low: 90,
    break: 95,
  },
  concurrency: 4,
  timeoutMS: 10_000,
};

export default config;
