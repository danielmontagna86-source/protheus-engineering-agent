# Premium Product Leadership Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Turn the existing Protheus Engineering Agent foundation into a public-ready, evidence-backed VS Code product with specialist ADVPL/TLPP value and measurable quality.

**Architecture:** Keep VS Code as the primary cockpit and bundle a modular deterministic runtime in one VSIX. Expose host-neutral functions over CLI/MCP, integrate official EngPro standards through a provenance-controlled skill layer, and keep external systems and Hermes behind fail-closed optional adapters.

**Tech Stack:** Node.js 22/24 ESM, VS Code Extension API, MCP stdio, built-in Node test runner, Stryker, VSCE, GitHub Actions, CycloneDX SBOM.

---

## Ordered execution contract

The canonical requirements and acceptance criteria are in `.specs/features/premium-product-leadership/spec.md`. The architecture is in `design.md`; atomic status and dependencies are in `tasks.md`; evidence is written only to `validation.md` after commands run.

### Task 1: Freeze specs and research

**Files:**

- Create: `.specs/features/premium-product-leadership/context.md`
- Create: `.specs/features/premium-product-leadership/spec.md`
- Create: `.specs/features/premium-product-leadership/design.md`
- Create: `.specs/features/premium-product-leadership/tasks.md`
- Create: `.specs/features/premium-product-leadership/validation.md`
- Create: `docs/research/premium-product-leadership-review.md`

**Steps:**

1. Reconcile repository evidence, LionCode audit, official EngPro/TDS/VS Code/GitHub sources, competitors, and empirical productivity studies.
2. Classify every statement as observed, externally supported, inference, or unknown.
3. Verify all spec IDs map to tasks and validation gates.
4. Commit only planning/research files.

### Task 2: Implement the standard skill supply chain using TDD

**Files:**

- Modify: `test/agent-resources.test.mjs`
- Modify: `packages/agent-resources/src/index.mjs`
- Create: `.agents/skills/planning-protheus-engineering/SKILL.md`
- Create: `.agents/skills/protheus-evidence-review/SKILL.md`
- Create: `config/skill-providers.json`
- Create: `docs/skills.md`

**Steps:**

1. Write failing tests for standard roots, precedence, case-insensitive duplicate identity, provenance, malformed provider, and escaping junction.
2. Run `node --test test/agent-resources.test.mjs`; confirm the new cases fail for the intended reason.
3. Implement only the minimal bounded loader and provider schema needed by the tests.
4. Run the targeted suite; require 0 failures.
5. Run `npm test`; require no regression and a non-decreasing test count.
6. Review third-party license/provenance and commit this isolated feature.

### Task 3: Publish review findings in native VS Code UX using TDD

**Files:**

- Modify: `test/vscode-extension.test.mjs`
- Modify: `apps/vscode-extension/extension.cjs`
- Modify: `apps/vscode-extension/package.json`

**Steps:**

1. Write failing fake-host tests for severity mapping, line mapping, progress, replacement/clear behavior, malformed JSON, and empty findings.
2. Run the targeted test and capture RED evidence.
3. Add one DiagnosticCollection and a review presenter; retain runtime logic outside the extension.
4. Run targeted tests and then package the VSIX.
5. Run both installed-host smokes; record VS Code versions and VSIX hash.
6. Commit extension adapter and tests only.

### Task 4: Expand high-confidence EngPro review rules using TDD

**Files:**

- Modify: `test/review.test.mjs`
- Modify: `packages/review/src/index.mjs`
- Create: `docs/rules.md`

**Steps:**

1. Verify each selected rule against the official EngPro code-review references.
2. Add positive and negative tests, including comments, strings, casing, nesting, and evidence lines.
3. Confirm RED for each rule before implementation.
4. Implement only lexically reliable rules; defer taint/semantic checks explicitly.
5. Run review tests, full tests, and mutation; require configured thresholds.
6. Commit rule catalog and evidence docs.

### Task 5: Close Marketplace, onboarding, and release metadata gaps

**Files:**

- Modify: `apps/vscode-extension/package.json`
- Modify: `apps/vscode-extension/README.md`
- Modify: root READMEs, changelog, publication docs and tests
- Create: `CITATION.cff` and reviewed visual assets

**Steps:**

1. Add failing publication assertions for valid Marketplace versioning and required metadata/assets.
2. Replace SemVer suffix publication strategy with a valid numeric preview version and document `--pre-release` use.
3. Add native walkthrough and a five-minute deterministic first-value path.
4. Package and inspect VSIX contents; run clean-profile user-facing UAT.
5. Commit metadata only after package and UAT pass.

### Task 6: Complete P1 specialist workflow

Execute T-020 through T-025 from `.specs/features/premium-product-leadership/tasks.md` in dependency order. Each subfeature receives its own failing tests, minimal implementation, full gate, atomic commit, and updated validation evidence. Do not implement real write/deploy access in this phase.

### Task 7: Run complete QA and pre-publication review

**Files:**

- Update: `.specs/features/premium-product-leadership/validation.md`
- Update: `.specs/project/{ROADMAP,STATE}.md`
- Update: `.specs/codebase/{TESTING,CONCERNS}.md`
- Update: PR description/evidence after the reviewed commit is pushed

**Steps:**

1. Run every gate listed in `validation.md` against the exact candidate commit.
2. Record counts, versions, hashes, mutation score, skips, failures, and remediation.
3. Perform code review of the complete diff and fix every blocker/high finding with a regression test.
4. Run the publication audit from an exact clean `git archive` tree so ignored local state cannot contaminate evidence.
5. Push the reviewed branch and wait for remote CI/OSV.
6. Declare GO or NO-GO. Do not make the repository public, merge, tag, release, or publish to Marketplace without explicit maintainer authorization.
