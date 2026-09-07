# Validation Report

**Date:** 2026-09-07
**Environment:** Windows, Node.js 22.23.2
**Decision:** executable development MVP PASS; public release NO-GO.

## Latest clean gate

| Gate | Result | Evidence |
|---|---|---|
| Full automated suite | PASS | 83 tests, 83 passed, 0 failed, 0 skipped |
| Source/manifests | PASS | 39 JavaScript source files and 3 manifests syntax/structure checked |
| Development publication audit | PASS | 105 files inspected; 0 errors, 0 blockers |
| Critical-path smoke | PASS | doctor, index, review and MCP passed in under 1 second |
| Mutation testing | PASS | 82.79% overall; 98.48% policy; 79.33% review; breaking threshold 60% |
| Dependency audit | PASS | 0 known vulnerabilities after lockfile resolution |
| MCP stdio process | PASS | real child process initialized and listed tools using newline-delimited JSON-RPC |
| CLI/session contract | PASS | isolated Hermes, live Skills/Rules and Electron-as-Node propagation covered |
| Workspace containment | PASS | source symlink and `.pea` junction escape regressions covered |
| Local code/security review | IN PROGRESS | final diff review and candidate PR evidence are required before GO |
| Release publication audit | BLOCKED AS DESIGNED | candidate CI/OSV, clean-commit manifest, final reviews, downloaded-asset reproduction and named approval remain missing |
| `actionlint` | NOT RUN | executable is not installed in this environment |
| GitHub Actions live matrix | PASS ON BASE | latest `main` [run 34151775373](https://github.com/danielmontagna86-source/protheus-engineering-agent/actions/runs/34151775373); candidate branch matrix and OSV remain pending |
| Packaged VSIX fresh install | PASS LOCALLY | VSIX installed into isolated extension directories and four commands passed on VS Code 1.95.3 and 1.133.0; candidate CI remains pending |
| Hermes ACP probe | PASS | installed Hermes returned `Hermes ACP check OK` from an isolated temporary workspace and profile |
| External product integrations | NOT RUN BY DESIGN | compiler, AppServer, RPO, Oracle, TDN and Dictionary remain unconfigured/fail-closed |

## Review corrections now covered by regression tests

- The first private CI exposed a Windows-only assertion that assumed the environment key was spelled `PATH`; PR [#1](https://github.com/danielmontagna86-source/protheus-engineering-agent/pull/1) made the check case-insensitive and both the PR and merged `main` matrices passed.
- The thin VS Code extension runs its CLI through Electron-as-Node and carries that executable contract into the MCP descriptor used by Hermes.
- A multi-root VS Code window selects the folder that owns the active source file.
- Source review validates the real path before reading.
- Project Context, Skills/Rules and Hermes descriptors/probes reject `.pea` symlinks or junctions.
- Skills/Rules are limited per file, by count and by total payload; reads use a bounded file handle and identity check.
- The publication audit rejects local state, personal paths, secret material, symlinks, incomplete licenses and invalid repository metadata.
- The release gate requires planned-version alignment, fresh installation, three checksummed artifacts, and evidence bound to the exact checksummed release manifest and commit.
- MCP server version is derived from the product manifest.

## Reproduce

From the product root:

```sh
node --test
npm run smoke
npm run test:mutation
npm run package:extension
npm run test:vscode:host
npm run test:vscode:minimum
npm audit --audit-level=high
node scripts/check.mjs
node scripts/publication-check.mjs
node scripts/publication-check.mjs --release
```

The test, smoke, mutation, structural and development-publication commands must exit zero. The release command must remain non-zero until every external proof is real.

## Honest boundary

The CodeGraph remains lexical, review remains a deterministic pre-gate, and no AdvPL/TLPP compilation or external system integration is claimed. The VSIX is locally verified and fresh-installed but has not been published. Apache-2.0 is active, but this preparation must not be presented as a released alpha until the release audit reaches GO.
