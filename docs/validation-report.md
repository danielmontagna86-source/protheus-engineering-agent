# Validation Report

**Date:** 2026-09-10
**Environment:** Windows, Node.js 22.23.2
**Decision:** executable development MVP PASS; public release and Marketplace submission NO-GO.

## Latest clean gate

| Gate | Result | Evidence |
|---|---|---|
| Full automated suite | PASS | 311 tests passed, 0 failed, 0 skipped in the fresh local run on 2026-09-10 |
| Source/manifests | PASS | 57 source files and 16 manifests syntax/structure checked |
| Development publication audit | PASS | clean-checkout audit passed; the active worktree is intentionally re-audited before release |
| Critical-path smoke | PASS | doctor, index, review, source MCP and bundled MCP passed in 921 ms |
| Mutation testing | PASS | 889 mutants: 837 killed, 8 timeout, 44 survived, 0 errors; 95.05% overall; breaking threshold 95% |
| Dependency audit | PASS | 0 known vulnerabilities after lockfile resolution |
| MCP stdio process | PASS | real child process initialized and listed tools using newline-delimited JSON-RPC |
| Standalone core contract | PASS | CLI/MCP, live Skills/Rules and Electron-as-Node propagation covered without requiring Hermes |
| Workspace containment | PASS | source symlink and `.pea` junction escape regressions covered |
| Local code/security review | PASS WITH ACCEPTED PREVIEW LIMITS | Review found and fixed the `DbEval` loop-scope leak and unsafe colon-bearing changed-file boundary test-first; exact-commit audit and candidate PR evidence remain required before GO |
| Release publication audit | BLOCKED AS DESIGNED | isolated code candidate returned zero source errors and RELEASE_EVIDENCE_INCOMPLETE; final reviews, public security, UAT, live integrations and downloaded-asset receipts remain incomplete |
| `actionlint` | PASS | 1.7.12 official Windows binary, checksum and attestation verified; repository workflows exited zero on 2026-09-10 |
| GitHub Actions live matrix | PASS ON CODE CANDIDATE | PR [#4](https://github.com/danielmontagna86-source/protheus-engineering-agent/pull/4) revision `71238051a98458fab48c75321200050fd53e1c3c` passed the Windows/Linux × Node 22/24 matrix, mutation/dependency audit, installed VS Code host, OSV and verified-secret scans; later revisions require their own checks |
| Packaged VSIX fresh install | PASS LOCALLY | v0.3.0 installed without Hermes on VS Code 1.95.3 and 1.136.2; all 19 public commands registered and 7 invocations across 5 core commands passed |
| Package lifecycle | PASS LOCALLY | isolated 0.2.0-alpha.1 install, 0.3.0 upgrade, uninstall, reinstall and rollback passed on VS Code 1.136.2 |
| Official TDS coexistence | PASS LOCALLY | TDS 2.1.2 activated beside the packaged extension; zero command conflicts, multi-root selection and CP1252/LF preservation passed |
| Product benchmark | PASS WITH CLAIM LIMITS | Seven Apache-2.0 synthetic cases reached 1.0 precision/recall and symbol/call recall; productivity uplift and market leadership remain `NOT_PROVEN` pending the documented human pilot |
| Public CodeQL and dependency review | PENDING VISIBILITY | pinned workflows are present but correctly skipped while the repository remains private; no public scan result exists |
| Optional Hermes compatibility | PASS, NON-GATING | installed Hermes previously returned `Hermes ACP check OK` from an isolated temporary workspace and profile |
| ADVPL/TLPP corpus exploration | INCONCLUSIVE FOR ACCURACY | 955 candidates traversed in about six seconds; recovered corpus contamination prevents valid precision/recall claims |
| External product integrations | CONTRACT PASS / LIVE NOT RUN | TDN/Dictionary snapshots, Oracle allowlist, AI gateway, subagent and durable build contracts pass; real compiler, AppServer/RPO, customer Oracle and live provider remain unconfigured and fail-closed |

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
- Standard project skills use explicit precedence, case-insensitive identity, pinned provider provenance, bounded reads and junction/symlink rejection.
- Native VS Code diagnostics map deterministic rule severity and clear stale results when runtime output is malformed.
- `DbEval` is treated as a callback function rather than an open-ended loop block, preventing CA1003 scope leakage into following lines.
- The release gate requires planned-version alignment, fresh installation, three checksummed artifacts, and evidence bound to the exact checksummed release manifest and commit.
- MCP server version is derived from the product manifest.
- Stable gates require typed, checksummed, gate-specific receipts tied to the exact commit and release manifest; generic text, free-form URLs and unbound booleans cannot close a gate.
- Source archives byte-match the declared commit; VSIX files embed the source commit and must byte-match a rebuild from an isolated extraction of that archive after a clean `npm ci`; the CycloneDX SBOM reconciles every production package and npm-resolved graph edge from the exact lockfile.
- Security-control receipts are tied to GitHub API run identity, workflow, repository, exact commit and successful conclusion. The provenance workflow checks hashes and verifies attestations for all three artifacts, the manifest and `SHA256SUMS`.
- Productivity claims require the complete published paired-crossover evidence contract, including accepted tasks in both conditions, anonymized data, reviewed analysis and 95% confidence intervals.
- Integration cancellation is honored before a warm snapshot-cache return.

## Reproduce

The exact code-candidate VSIX hash, fresh installed VS Code/TDS/lifecycle checks and remaining production work are recorded in [the 2026-09-10 validation](qa/vscode-git-production-validation-2026-09-10.md).

From the product root:

```sh
node --test
npm run smoke
npm run test:mutation
npm run package:extension
npm run test:vscode:host
npm run test:vscode:minimum
npm run test:vscode:tds
npm run benchmark
npm audit --audit-level=moderate
node scripts/check.mjs
node scripts/publication-check.mjs
node scripts/publication-check.mjs --release
```

The test, smoke, mutation and structural commands must exit zero. The development-publication command must pass on the exact committed archive; the active development worktree may correctly reject old ignored local state. The release command must remain non-zero until every external proof is real. The current public-repository and Marketplace controls are recorded in [public launch operations](public-launch-operations.md).

## Honest boundary

The CodeGraph remains lexical, review remains a deterministic pre-gate, and no real AdvPL/TLPP compilation or customer-system integration is claimed. The VSIX is locally verified and fresh-installed but has not been published. Apache-2.0 is active, but this preparation must not be presented as a released preview until the release audit reaches GO.
