# Validation Report

**Date:** 2026-09-07
**Environment:** Windows, Node.js 22.23.2
**Decision:** executable development MVP PASS; public release NO-GO.

## Latest clean gate

| Gate | Result | Evidence |
|---|---|---|
| Full automated suite | PASS | 59 tests, 59 passed, 0 failed, 0 skipped; the prior 58-test suite passed three consecutive executions and the final 59-test suite passed cleanly |
| Source/manifests | PASS | 28 JavaScript source files and 2 manifests syntax/structure checked |
| Development publication audit | PASS | 79 files inspected; 0 errors, 0 blockers |
| Critical-path smoke | PASS | doctor, index, review and MCP passed in 681 ms |
| Mutation testing | PASS | 82.79% overall; 98.48% policy; 79.33% review; breaking threshold 60% |
| Dependency audit | PASS | 0 known vulnerabilities after lockfile resolution |
| MCP stdio process | PASS | real child process initialized and listed tools using newline-delimited JSON-RPC |
| CLI/session contract | PASS | isolated Hermes, live Skills/Rules and Electron-as-Node propagation covered |
| Workspace containment | PASS | source symlink and `.pea` junction escape regressions covered |
| Independent code/security review | PASS | no blocking or high-severity finding remains after three correction passes |
| Release publication audit | BLOCKED AS DESIGNED | only completed external release evidence is missing |
| `actionlint` | NOT RUN | executable is not installed in this environment |
| GitHub Actions live matrix | PASS | final `main` [run 34150665239](https://github.com/danielmontagna86-source/protheus-engineering-agent/actions/runs/34150665239): Windows/Linux, Node.js 22/24, smoke, dependency audit and mutation gate |
| VS Code Extension Development Host | NOT RUN | interactive smoke remains mandatory before release |
| External product integrations | NOT RUN BY DESIGN | Hermes live session, compiler, AppServer, RPO, Oracle, TDN and Dictionary remain unconfigured/fail-closed |

## Review corrections now covered by regression tests

- The first private CI exposed a Windows-only assertion that assumed the environment key was spelled `PATH`; PR [#1](https://github.com/danielmontagna86-source/protheus-engineering-agent/pull/1) made the check case-insensitive and both the PR and merged `main` matrices passed.
- The thin VS Code extension runs its CLI through Electron-as-Node and carries that executable contract into the MCP descriptor used by Hermes.
- A multi-root VS Code window selects the folder that owns the active source file.
- Source review validates the real path before reading.
- Project Context, Skills/Rules and Hermes descriptors/probes reject `.pea` symlinks or junctions.
- Skills/Rules are limited per file, by count and by total payload; reads use a bounded file handle and identity check.
- The publication audit rejects local state, personal paths, secret material, symlinks, incomplete licenses and invalid repository metadata.
- The release gate requires planned-version alignment and machine-readable evidence for CI, review, smokes, commit, approver and a recalculated artifact SHA-256.
- MCP server version is derived from the product manifest.

## Reproduce

From the product root:

```sh
node --test
npm run smoke
npm run test:mutation
node scripts/check.mjs
node scripts/publication-check.mjs
node scripts/publication-check.mjs --release
```

The test, smoke, mutation, structural and development-publication commands must exit zero. The release command must remain non-zero until every external proof is real.

## Honest boundary

The CodeGraph remains lexical, review remains a deterministic pre-gate, and no AdvPL/TLPP compilation or external system integration is claimed. Apache-2.0 is active, but this preparation must not be presented as a released alpha until the release audit reaches GO.
