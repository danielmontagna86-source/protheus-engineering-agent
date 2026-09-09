# Production Readiness Tasks

**Design:** `.specs/features/production-readiness/design.md`
**Status:** In Progress

## Execution plan

```text
T1 -> T2 -> T3
 |     |    |
 +-> T4 -> T5
 +-> T6 -> T7 -> T8
```

## Task breakdown

### T1: Make publication audits worktree-safe — Done

**Where:** `scripts/publication-check.mjs`, `test/publication.test.mjs`
**Requirement:** PROD-001
**Done when:** root Git metadata is ignored, nested Git metadata is rejected, and focused tests pass.
**Tests:** publication unit/integration tests.
**Gate:** `node --test test/publication.test.mjs`

### T2: Build and verify a self-contained VSIX — Done

**Where:** extension manifest/entry point and build/package/verify scripts.
**Depends on:** T1
**Requirement:** PROD-002
**Done when:** bundled runtime and MCP are present, forbidden content is absent, and repeated builds have an identical hash.
**Tests:** extension contracts, archive verification, real packaging.
**Gate:** `npm run package:extension`

### T3: Exercise all commands in a real Extension Host — Done locally

**Where:** `integration/vscode-host/index.cjs`, `scripts/run-vscode-smoke.mjs`, CI.
**Depends on:** T2
**Requirement:** PROD-003
**Done when:** four commands pass with isolated workspace, user data, extensions, and no Hermes probe.
**Tests:** packaged fresh install on current stable and minimum supported; minimum-supported CI remains pending.
**Gate:** `npm run test:vscode:host` and `npm run test:vscode:minimum`

### T4: Add supply-chain security gates — Done locally

**Where:** security workflow, Dependabot, security documentation, lockfile.
**Depends on:** T1
**Requirement:** PROD-004
**Done when:** npm audit is clean, OSV is fail-closed in CI, Actions are pinned, and OWASP coverage is explicit.
**Tests:** workflow contract tests and live candidate OSV run.
**Gate:** `npm audit --audit-level=moderate` plus GitHub OSV job.

### T5: Build auditable release artifacts — Done locally

**Where:** release build/verify scripts and evidence schema.
**Depends on:** T2, T4
**Requirement:** PROD-005
**Done when:** source ZIP, deterministic VSIX, CycloneDX SBOM, sizes, hashes, commit, and verification results are recorded from a clean commit.
**Tests:** artifact unit tests and clean-commit release build.
**Gate:** `npm run build:release && npm run verify:release`

### T6: Enforce a CodeGraph performance budget — Done

**Where:** `packages/codegraph-advpl/src/index.mjs`, `test/codegraph.test.mjs`
**Requirement:** PROD-004
**Done when:** 5,000 synthetic functions/calls parse in under 1 second and reported line numbers remain exact.
**Tests:** deterministic performance and correctness regression.
**Gate:** `node --test test/codegraph.test.mjs`

### T7: Bound the MCP request surface — Done

**Where:** MCP handler/stdio and protocol tests; extension process timeout.
**Depends on:** T6
**Requirement:** PROD-004
**Done when:** unknown fields are rejected, stdio is capped at 1 MiB while preserving the next request, and extension CLI calls time out after 120 seconds.
**Tests:** MCP subprocess and extension contract tests.
**Gate:** `node --test test/mcp.test.mjs test/vscode-extension.test.mjs`

### T8: Complete candidate review and GitHub evidence — In Progress

**Where:** all branch changes, validation report, release evidence, GitHub PR.
**Depends on:** T3, T5, T7
**Requirement:** PROD-001 through PROD-005
**Done when:** suite passes three times, mutation/security/package/host gates pass, code review has no unresolved high finding, candidate CI/OSV are green, and the exact clean commit artifacts verify.
**Tests:** full release-candidate gate.
**Gate:** release remains `NO-GO` until named human approval.
