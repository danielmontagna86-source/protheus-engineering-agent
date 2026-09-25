# Operational Release Gates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Close the technical support, monitoring, rollback, RPO contention and exact-artifact gaps while preserving fail-closed Stable publication.

**Architecture:** Add one bounded read-only public-release probe and a scheduled two-attempt workflow, reuse the installed VSIX lifecycle for rollback, exercise contention only in the authorized private lab, and generate artifacts through the existing reproducible release pipeline.

**Tech Stack:** Node.js 22/24, native `node:test`, GitHub Actions/API, VS Code Extension Host, TDS 2.1.4, AppServer 24.3.1.5, Docker Compose.

---

### Task 1: Public-release monitor

**Files:**
- Create: `scripts/monitor-public-release.mjs`
- Create: `test/operational-monitor.test.mjs`
- Create: `.github/workflows/operational-monitor.yml`
- Modify: `package.json`
- Modify: `test/publication.test.mjs`

1. Write tests for valid release assets, missing assets, digest mismatch, byte budget, workflow permissions/schedule and two-attempt confirmation.
2. Run the targeted tests and observe the expected missing-module/workflow failure.
3. Implement the smallest read-only probe and workflow.
4. Run targeted tests and a live probe against the public repository.

### Task 2: Support and rollback contract

**Files:**
- Create: `docs/operations/support-monitoring-rollback.md`
- Modify: `docs/support-policy.md`
- Modify: `docs/migration-and-rollback.md`
- Modify: `test/publication.test.mjs`

1. Add failing publication assertions for the operational runbook and support targets.
2. Record intake, severity, owner, response targets, monitoring response and rollback verification.
3. Run publication tests and development audit.

### Task 3: RPO contention laboratory

**Private files:**
- Create outside Git: `<private-lab>/pea-tds-homologation/run-rpo-contention.mjs`
- Create outside Git: `<private-lab>/pea-tds-homologation/rpo-contention-runner.cjs`
- Produce: sanitized private receipt outside Git

1. Record initial service health and SHA-256 of baseline/custom RPOs.
2. Reconnect two independent TDS sessions and release concurrent compilations from one barrier.
3. Bound the run, accept explicit lock rejection or safe serialization, and reject false success/timeout/corruption.
4. Re-run a clean compile, verify service health and compare hashes.
5. Add only sanitized outcome and receipt hash to the public QA report.

### Task 4: Exact artifacts and rollback drill

**Files:** existing release/lifecycle scripts and ignored `release-artifacts/` output.

1. Commit the reviewed source tree so the candidate has an exact identity.
2. Run `npm run build:release` and `npm run verify:release`.
3. Download and digest-verify the published v0.3.8 VSIX outside the source tree.
4. Run the installed lifecycle against the exact candidate on supported VS Code.
5. Record artifact hashes and rollback receipt without publishing a tag.

### Task 5: Full review and integration

**Files:** all changed files.

1. Run every mandatory gate in the feature validation matrix.
2. Perform pre-merge secret/path/diff review.
3. Open a PR and merge only after protected checks pass.
4. Verify post-merge workflows.
5. Dispatch provenance and operational-monitor workflows against merged `main` and verify their receipts.
6. Update the Stable ledger and issue #22; confirm release remains fail-closed for external gates.
