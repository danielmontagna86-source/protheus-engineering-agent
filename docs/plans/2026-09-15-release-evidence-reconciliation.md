# Release Evidence Reconciliation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Align public release documentation with the immutable `v0.3.9` Preview while preserving fail-closed Stable gates.

**Architecture:** Store the historical artifact receipt in a new versioned release record; keep promotion policy in the Stable ledger and link users directly to the current GitHub Release.

**Tech Stack:** Markdown, GitHub Release API, repository publication validator.

---

### Task 1: Record the immutable Preview receipt

**Files:**
- Create: `RELEASE-v0.3.9.md`

1. Copy tag, commit and asset SHA-256 values from the GitHub Release API.
2. State that Preview is not Stable or Marketplace evidence.
3. Verify each value against the API response.

### Task 2: Fix the user-facing release route

**Files:**
- Modify: `README.md`

1. Replace only the two old Preview links with the `v0.3.9` GitHub Release URL.
2. Preserve the current claim boundaries.
3. Inspect rendered Markdown links.

### Task 3: Reconcile policy documents

**Files:**
- Modify: `.specs/project/STATE.md`
- Modify: `.specs/features/stable-1-0-launch/validation.md`
- Modify: `docs/public-launch-operations.md`

1. Record verified Preview and post-merge security facts with exact commits.
2. Retain `NO-GO` for publisher, human UAT, pilot and final authorization.
3. Do not alter a release checker or Marketplace state.

### Task 4: Verify and review

1. Run `npm run validate`.
2. Review `git diff --check` and the full documentation diff.
3. Commit only after both checks pass.
