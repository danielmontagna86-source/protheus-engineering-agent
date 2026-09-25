# Full Project Quality Review Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Correct review findings that can be safely closed now and preserve an auditable backlog for changes requiring isolated validation.

**Architecture:** Keep the VS Code-first ports-and-adapters architecture. Harden the MCP boundary, enforce native coverage for maintained sources, and reconcile operational evidence without weakening Stable gates.

**Tech Stack:** Node.js 22/24, native `node:test`, MCP TypeScript Server SDK, VS Code Extension Host, GitHub Actions.

---

### Task 1: MCP progress resilience

**Files:** `test/mcp.test.mjs`, `packages/mcp/src/server.mjs`

1. Add a tool-handler test whose progress notifier throws.
2. Run it and confirm failure originates from the notifier.
3. Make progress notification best-effort without changing tool errors.
4. Run the complete MCP test file.

### Task 2: Core-source coverage gate

**Files:** `test/publication.test.mjs`, `package.json`, `.github/workflows/ci.yml`

1. Add a failing repository-contract test for the coverage command and thresholds.
2. Add `test:coverage` with 85/70/80 line/branch/function floors.
3. Use it in local validation and the OS/Node CI matrix.
4. Run the exact command and record the measured totals.

### Task 3: Dependency compatibility

**Files:** `package.json`, `package-lock.json`, `test/mcp.test.mjs`

1. Install the current MCP SDK candidate exactly.
2. Run the real stdio process suite.
3. Retain the update only if every response is drained and all tests pass.
4. Otherwise restore the prior exact version and record the incompatibility.

### Task 4: Evidence reconciliation

**Files:** `.specs/project/STATE.md`, `.specs/features/stable-1-0-launch/validation.md`, `docs/maintainer-release-handoff.md`, `docs/qa/full-project-review-2026-09-25.md`

1. Remove statements superseded by PR #47.
2. Preserve all external/human gates and Preview status.
3. Record findings, coverage, dependency experiment and residual risks.

### Task 5: Full verification and integration

**Files:** all changed files

1. Run full validation, audit, smoke, benchmark, mutation and VSIX checks.
2. Run pre-merge secret/path/diff audit.
3. Open a PR, wait for protected checks, merge only when green.
4. Verify the post-merge `main` checks and update issue #22 with the exact result.
