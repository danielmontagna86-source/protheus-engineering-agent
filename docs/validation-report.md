# Validation Report

**Date:** 2026-09-07
**Environment:** Windows, Node.js 22.23.2
**Decision:** executable development MVP PASS; public release NO-GO.

## Latest clean gate

| Gate | Result | Evidence |
|---|---|---|
| Full automated suite | PASS | 90 tests, 90 passed, 0 failed, 0 skipped |
| Source/manifests | PASS | 40 JavaScript source files and 3 manifests syntax/structure checked |
| Development publication audit | PASS ON SOURCE | 115 publishable files inspected in the candidate tree; 0 source errors or blockers. Clean-worktree rerun is required after commit because Stryker left an ignored locked sandbox in the active Windows worktree. |
| Critical-path smoke | PASS | doctor, index, review and MCP passed in under 1 second |
| Mutation testing | PASS | 83.83% overall; 98.48% policy; 79.26% review; 94.59% CodeGraph resolver; breaking threshold 60% |
| Dependency audit | PASS | 0 known vulnerabilities after lockfile resolution |
| MCP stdio process | PASS | real child process initialized and listed tools using newline-delimited JSON-RPC |
| Standalone core contract | PASS | CLI/MCP, live Skills/Rules and Electron-as-Node propagation covered without requiring Hermes |
| Workspace containment | PASS | source symlink and `.pea` junction escape regressions covered |
| Local code/security review | IN PROGRESS | final diff review and candidate PR evidence are required before GO |
| Release publication audit | BLOCKED AS DESIGNED | candidate CI/OSV, clean-commit manifest, final reviews, downloaded-asset reproduction and named approval remain missing |
| `actionlint` | NOT RUN | executable is not installed in this environment |
| GitHub Actions live matrix | PASS ON BASE | latest `main` [run 34151775373](https://github.com/danielmontagna86-source/protheus-engineering-agent/actions/runs/34151775373); candidate branch matrix and OSV remain pending |
| Packaged VSIX fresh install | PASS LOCALLY | VSIX SHA-256 `890b06521f8da6f5ddd2c33813de72a5ff8b261878cc9fd94eb68d65c4474164` installed into isolated directories; four commands passed without Hermes on VS Code 1.95.3 and 1.133.0; revised candidate CI remains pending |
| Optional Hermes compatibility | PASS, NON-GATING | installed Hermes previously returned `Hermes ACP check OK` from an isolated temporary workspace and profile |
| ADVPL/TLPP corpus exploration | INCONCLUSIVE FOR ACCURACY | 955 candidates traversed in about six seconds; recovered corpus contamination prevents valid precision/recall claims |
| External product integrations | NOT RUN BY DESIGN | compiler, AppServer, RPO, Oracle, TDN and Dictionary remain unconfigured/fail-closed |

## Review corrections now covered by regression tests

- The first private CI exposed a Windows-only assertion that assumed the environment key was spelled `PATH`; PR [#1](https://github.com/danielmontagna86-source/protheus-engineering-agent/pull/1) made the check case-insensitive and both the PR and merged `main` matrices passed.
- The thin VS Code extension runs its CLI through Electron-as-Node and carries that executable contract into the MCP descriptor used by Hermes.
- A multi-root VS Code window selects the folder that owns the active source file.
- Source review validates the real path before reading.
- Project Context, Skills/Rules and Hermes descriptors/probes reject `.pea` symlinks or junctions.
- CodeGraph resolves same-file static functions first, rejects cross-file static visibility, and reports duplicate global targets as ambiguous instead of choosing the first declaration.
- Complete core release evidence no longer requires a Hermes installation or probe.
- GitHub Flow triggers avoid duplicate full CI runs for feature branches with open pull requests.
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
