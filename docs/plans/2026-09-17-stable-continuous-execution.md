# Stable Continuous Execution Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Continuously execute every safe Stable 1.0 validation action while
keeping the remaining gates honest, evidence-bound and ready to run.

**Architecture:** The Stable ledger in `stable-1-0-launch` remains canonical.
This plan adds no release bypass: it runs existing deterministic commands in an
isolated worktree, detects optional local test prerequisites, and routes human,
licensed and publisher proof to their existing acceptance protocols.

**Tech Stack:** Node.js 22/24, npm lockfile, VS Code Extension Host, TDS test
lab when already configured, GitHub Actions and the existing release verifier.

---

### Task 1: Record the execution taxonomy

**Files:**
- Create: `.specs/features/stable-continuous-execution-v1/spec.md`
- Create: `.specs/features/stable-continuous-execution-v1/design.md`
- Create: `.specs/features/stable-continuous-execution-v1/tasks.md`
- Create: `docs/plans/2026-09-17-stable-continuous-execution.md`

**Step 1:** Map G0..G13 to `AUTO`, `DETECT`, `EXTERNAL` or `RELEASE-BOUND`.

**Step 2:** Verify no task calls an unlicensed environment, creates a publisher,
or promotes a Preview asset.

Run: `git diff --check`

Expected: exit code 0.

### Task 2: Review and integrate the planning baseline

**Files:** four planning/specification files created in Task 1.

**Step 1:** Run targeted specification/release tests.

Run: `node --test --test-concurrency=1 test/project-context.test.mjs test/release-artifacts.test.mjs test/publication.test.mjs`

Expected: all tests pass.

**Step 2:** Run static validation.

Run: `node scripts/check.mjs && node scripts/publication-check.mjs`

Expected: both commands pass in development mode.

**Step 3:** Obtain independent pre-merge review. Correct any finding before
commit.

**Step 4:** Commit the documentation/specification change, open a pull request,
wait for required checks, merge only when green, and repeat the main-branch CI
observation.

### Task 3: Establish the exact-candidate automated baseline

**Files:** no tracked source change.

**Step 1:** In a fresh worktree at the merged planning commit, confirm a clean
tree and record the exact candidate commit. `verify-release` must reject a
dirty tree; an uncommitted plan is not a valid candidate.

Run: `git status --porcelain=v1 --untracked-files=all && git rev-parse HEAD`

Expected: empty status output and one exact commit hash.

**Step 2:** Run the deterministic release-candidate battery from that clean
worktree.

Run: `npm run validate:release-candidate`

Expected: all executable checks pass, or the first real failure is preserved as
a blocker. This does not run `publication:release-check` as a Stable promotion.

**Step 3:** Run the fail-closed Stable checker.

Run: `node scripts/publication-check.mjs --release`

Expected: `BLOCKED` with `RELEASE_EVIDENCE_INCOMPLETE` until all exact receipts
exist. Any `GO` without real evidence is a defect.

### Task 4: Detect optional local Protheus QA readiness

**Files:**
- Read: `docs/qa/live-appserver-tds-homologation-2026-09-13.md`
- Read: `docs/qa/appserver-homologation-acceptance.md`
- Read: `docs/qa/internal-docker-validation-2026-09-09.md`

**Step 1:** Inspect the existing local test lab, TDS version and loopback health
without reading credentials or changing configuration.

**Step 2:** Do not compile during automatic detection. A bridge replay is
allowed only after the lab protocol identifies a disposable RPO, its reset
method, the allowed fixtures and the authorization record.

Expected: a result may improve local integration evidence only. It must retain
the `PARTIAL` label for G6 unless the acceptance protocol supplies licensed
identity, RPO, DBAccess and all required cases.

### Task 5: Prepare external gates without faking their outcome

**Files:**
- Read: `docs/qa/remote-extension-host-acceptance.md`
- Read: `docs/qa/accessibility-review-2026-09-07.md`
- Read: `docs/qa/appserver-homologation-acceptance.md`
- Read: `docs/public-launch-operations.md`

**Step 1:** Verify that each gate has a test protocol, a receipt target and a
clear pass/fail rule.

**Step 2:** Record missing prerequisites as `EXTERNAL` instead of adding
self-declared evidence.

Expected: no Stable gate changes to pass.

### Task 6: Continuous operating rule

After every product-candidate change, automatically repeat Task 3 and the
read-only preflight in Task 4. A compilation replay remains blocked until its
disposable-RPO protocol is satisfied. When a lawful test host, remote host,
assistive reviewer, representative participant or Marketplace publisher is
actually available, execute its matching protocol without weakening the
acceptance rule. Stable publication remains impossible until Task 3's
`publication-check --release` returns `GO` for one exact Stable artifact set.
