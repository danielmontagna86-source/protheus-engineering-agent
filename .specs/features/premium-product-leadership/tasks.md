# Tasks — Premium product leadership

**Execution rule:** Complete in order within each phase. Use RED → GREEN → REFACTOR for code. A task is complete only when its own gate passes and the commit contains only its declared scope.

## Phase 0 — Freeze the plan and evidence base

### T-000 — Create the complex feature specification

- **Status:** Complete
- **Files:** `.specs/features/premium-product-leadership/{context,spec,design,tasks,validation}.md`, `docs/plans/2026-09-07-premium-product-leadership.md`, `plan/architecture-premium-product-leadership-1.md`
- **Depends on:** Existing codebase map, LionCode audit, official EngPro SDD, QA strategy.
- **Done when:** P0/P1/P2 requirements, architecture, atomic tasks, validation matrix, risks, and publication boundary are traceable.
- **Gate:** Manual consistency review; no placeholder text.

### T-001 — Publish the evidence-backed market and product review

- **Status:** Complete
- **Files:** `docs/research/premium-product-leadership-review.md`, `docs/reference-audit.md`, `.specs/project/STATE.md`
- **Depends on:** T-000.
- **Reuses:** Official VS Code, TDS, GitHub, EngPro, competitor, DORA, METR, and controlled-study sources already researched.
- **Done when:** The document separates observed product evidence, source-backed market evidence, inference, and unknowns; includes competitor/differentiation and GitHub/Marketplace gaps.
- **Tests:** Link/source check plus publication audit.
- **Gate:** No unsupported market-leader or productivity claim.

## Phase 1 — P0 specialist product contracts

### T-010 — Support standard project skill roots

- **Status:** Complete; RED/GREEN evidence recorded and included in the full suite.
- **Files:** `packages/agent-resources/src/index.mjs`, `test/agent-resources.test.mjs`.
- **Depends on:** T-000.
- **Reuses:** EngPro project paths and current bounded resource loader.
- **Done when:** `.agents`, `.github`, and `.pea` skill roots have deterministic precedence, provenance, case-insensitive deduplication, and junction/symlink protection.
- **Tests:** Targeted resource suite, including duplicate names and escaping root.
- **Gate:** Targeted tests green; existing size/count/aggregate tests unchanged.

### T-011 — Add native VS Code Problems diagnostics

- **Status:** Complete; fake-host contracts and installed-VSIX host smokes verify native diagnostics.
- **Files:** `apps/vscode-extension/extension.cjs`, `apps/vscode-extension/package.json`, `test/vscode-extension.test.mjs`.
- **Depends on:** T-000.
- **Reuses:** Existing `review` JSON contract and VS Code DiagnosticCollection.
- **Done when:** Review publishes line diagnostics, maps severities, shows progress, keeps machine-readable output, and rejects malformed output safely.
- **Tests:** Fake-host contract plus installed-VSIX Extension Host smoke.
- **Gate:** Contract tests and minimum/current host tests green.

### T-012 — Make mutation cleanup fail-safe

- **Status:** Complete for controlled runs; unconditional cleanup is configured and the final elevated mutation run created no new residue. Older locked local sandboxes remain excluded from publishable trees, not silently deleted.
- **Files:** `stryker.config.mjs`, `test/publication.test.mjs`.
- **Depends on:** T-000.
- **Done when:** Stryker is configured to clean temporary state on every exit and publication continues to reject residue.
- **Tests:** Config contract and existing interrupted-sandbox rejection.
- **Gate:** Publication tests green; mutation run leaves no new sandbox.

### T-013 — Add product-owned skills and provider provenance

- **Status:** Complete
- **Files:** `.agents/skills/planning-protheus-engineering/SKILL.md`, `.agents/skills/protheus-evidence-review/SKILL.md`, `config/skill-providers.json`, `THIRD_PARTY_NOTICES.md`, `docs/skills.md`, `test/agent-resources.test.mjs`, `test/publication.test.mjs`.
- **Depends on:** T-010.
- **Reuses:** EngPro open Agent Skills layout; installed planning, QA, review, and validated-example practices.
- **Done when:** Two narrow product skills are discoverable; EngPro provider is pinned with MIT provenance; GPL corpus is explicitly not bundled; catalog validation fails on unpinned or malformed providers.
- **Tests:** Loader snapshot, provider schema, license/provenance publication tests.
- **Gate:** Tests green and no third-party corpus in VSIX/source artifact.

### T-014 — Expand deterministic EngPro review coverage

- **Status:** Complete for the declared high-confidence lexical subset
- **Files:** `packages/review/src/index.mjs`, `test/review.test.mjs`, `docs/rules.md`.
- **Depends on:** T-001.
- **Reuses:** Official EngPro code-review rule definitions and existing lexical masking.
- **Done when:** The selected high-confidence rules have positive, negative, comment/string, case, and line-evidence tests; uncertain semantic rules remain explicitly deferred.
- **Initial rule candidates:** CA2022, CA2023, CA2024, CA2025, CA2053, CA1002, CA1000, CA1003 `Type`, CA1004 `OutErr`.
- **Tests:** One contract table plus focused edge cases for every enabled rule.
- **Gate:** Review suite green and mutation score ≥95% overall with a 95% breaking threshold.

### T-015 — Complete Marketplace-safe metadata and onboarding

- **Status:** Automated scope complete; manual screenshots, accessibility inspection, and TDS coexistence remain in T-024 before public Marketplace submission.
- **Files:** `apps/vscode-extension/package.json`, `apps/vscode-extension/README.md`, `README.md`, `README.en.md`, `CHANGELOG.md`, `CITATION.cff`, icon/screenshots assets, `test/publication.test.mjs`.
- **Depends on:** T-011, T-014.
- **Done when:** Marketplace-compatible version, publisher, pricing, categories, keywords, icon, gallery, repository links, independent-project disclaimer, walkthrough, and five-minute path are validated.
- **Tests:** Manifest assertions, package contents, installed VSIX smoke, manual screenshot/accessibility review.
- **Gate:** No invalid prerelease SemVer for Marketplace and no unsupported claim.

## Phase 2 — P1 differentiated Protheus workflow

### T-020 — Strengthen CodeGraph and impact evidence

- **Status:** Complete; test-first impact evidence added with deterministic callers, dependencies, ambiguity, unresolved targets and explicit lexical limits.
- **Files:** `packages/codegraph-advpl/src/*`, `packages/review/src/index.mjs`, CodeGraph/review tests, `docs/codegraph.md`.
- **Depends on:** T-014.
- **Done when:** Callers, dependencies, ambiguity, unresolved targets, and limitations are explicit; large-fixture budget passes.
- **Gate:** Unit/determinism fixtures and the existing 5,000-symbol sub-second performance budget pass.

### T-021 — Implement versioned read-only TDN and Dictionary adapters

- **Status:** Complete; versioned local snapshot adapters are wired into runtime and MCP with provenance, SHA-256, timeout, bounded cache and explicit unavailable/error states.
- **Files:** `packages/integrations/src/*`, adapter fixtures/tests, `docs/integrations.md`.
- **Depends on:** T-013, T-020.
- **Done when:** Offline fixtures, provenance, timeout, cache, schema version, and unavailable state are tested; no credential is required for offline tests.
- **Gate:** Adapter, runtime and MCP contract/integration tests pass; no credential or network is used.

### T-022 — Complete bug-review evidence pipeline

- **Status:** Complete; report schema v2 reconciles findings, impact, changed files, validation, build proof, external evidence, uncertainty and residual risks through runtime and MCP.
- **Files:** `packages/review/src/*`, `packages/runtime/src/*`, tests, report schema docs.
- **Depends on:** T-020, T-021.
- **Done when:** One report reconciles findings, impact, changed files, tests, build evidence, uncertainty, and residual risk.
- **Gate:** Golden/negative report tests plus runtime and MCP integration tests pass; unproved completed builds are downgraded to unverified.

### T-023 — Implement supervised build contract

- **Status:** Complete for the product contract and safe process runner; live AppServer/RPO remains the separately authorized environment acceptance gate stated by this task.
- **Files:** `packages/build-supervisor/src/*`, policy/integration tests, `docs/build-supervisor.md`.
- **Depends on:** T-022.
- **Done when:** Approval, environment, command identity, timeout, logs, compiler result, and artifacts are captured; simulation and denial are fully testable offline.
- **Gate:** Unit/process integration, compiler-evidence, timeout, denial, named approval, cancellation and malformed-output tests pass. Real AppServer validation remains a separate authorized environment gate.

### T-024 — Verify TDS coexistence and first-value UX

- **Status:** Complete for reproducible installed-profile UAT on Windows: official TDS 2.0.16 activates with VS Code 1.133.0, no command conflict, multi-root routing works and CP1252/LF bytes are preserved. Live compile stays in the T-023 environment gate.
- **Files:** compatibility fixtures, VS Code host integration, README/walkthrough, validation report.
- **Depends on:** T-015, T-023.
- **Done when:** Supported TDS line, Windows-1252/LF fixture, multi-root workspace, and five-minute onboarding are exercised without command or contribution conflicts.
- **Gate:** Installed clean-profile Windows UAT plus regression/CI-capable standalone smoke; exploratory finding `TDS-GEN-001` is fixed test-first.

### T-025 — Build and run the product-effectiveness benchmark

- **Status:** Reproducible synthetic benchmark complete; representative human pilot remains an external marketing-claim gate.
- **Files:** `benchmark/*`, `docs/effectiveness-methodology.md`, `docs/effectiveness-results.md`.
- **Depends on:** T-020, T-022, T-024.
- **Done when:** Legal fixtures, preregistered metrics, paired/crossover protocol, raw anonymized results, limitations, and claim decision exist.
- **Gate:** Reproducible benchmark execution and independent results review; no marketing uplift number before this gate.

## Phase 3 — P2 safe agentic extensions

### T-030 — Add environment-scoped permission broker

- **Status:** Complete; local/development/test/homologation/production matrices and correlated async approvals fail closed on missing handler, denial, malformed response, timeout and cancellation.
- **Depends on:** P1 validated.
- **Done when:** Read/write/execute/network/database/deploy capabilities and local/dev/homologation/production policies deny fail-closed.
- **Gate:** Security and policy mutation tests.

### T-031 — Add bounded MCP subagents and checkpoints

- **Status:** Complete as a host-neutral/MCP runtime contract; no provider or autonomous shell access is bundled.
- **Depends on:** T-030.
- **Done when:** Tool/input/time/output bounds, parent-child evidence, checkpoint/worktree, diff review, cancellation, and rollback are tested.
- **Gate:** Adversarial, timeout, cancellation, and recovery tests.

### T-032 — Add provider-neutral AI and optional Hermes compatibility

- **Status:** Complete as an injected, governed provider contract; deterministic features remain standalone and Hermes remains non-gating.
- **Depends on:** T-031.
- **Done when:** Deterministic P0/P1 remains functional without AI; model/provider and Hermes paths use the same governed runtime/MCP contracts.
- **Gate:** AI regression/evaluation suite, privacy review, and isolated Hermes probe; Hermes is non-gating.

### T-033 — Add allowlisted Oracle read-only adapter

- **Status:** Contract complete; live customer database validation remains an explicitly authorized environment gate.
- **Depends on:** T-030.
- **Done when:** Only trusted named SELECT queries and exact binds execute; DDL/DML/raw SQL, excess rows, sensitive fields, timeout and permission denial fail closed.
- **Gate:** Adapter/MCP negative tests pass; live query requires a disposable homologation database, customer-owned catalog and credentials.

## Phase 4 — Release validation and publication handoff

### T-040 — Run complete QA release battery

- **Status:** Complete for the local automated candidate; external/visual gates remain explicit NO-GO items in `validation.md`.
- **Depends on:** All selected milestone tasks complete.
- **Reuses:** Installed QA skills for bootstrap, unit/API/contract/security/coverage/release readiness plus pre-merge review.
- **Done when:** `validation.md` contains exact commands, commit, counts, pass/fail/skip, mutation score, audit results, VSIX hash, host versions, and defects.
- **Gate:** All blocking gates green; otherwise NO-GO.

### T-041 — Final code review and exact-tree audit

- **Status:** In progress; local diff review passed with accepted alpha limits and exact-commit archive/remote CI remain.
- **Depends on:** T-040.
- **Done when:** Diff review has no unresolved blocker/high finding; publication checker passes against an archive of exact HEAD; PR description and evidence match the commit.
- **Gate:** Clean tracked tree, reviewed commit, remote CI/OSV green, then public CodeQL green after visibility change.

### T-042 — Await explicit publication authorization

- **Status:** Planned and intentionally external.
- **Depends on:** T-041.
- **Done when:** Maintainer explicitly authorizes the requested external action.
- **Gate histórico:** antes da autorização de 2026-09-12, o repositório deveria
  permanecer privado e não haver merge/tag/release/Marketplace. O repositório
  agora é público e há GitHub preview; Stable/Marketplace continuam dependentes
  dos gates externos documentados.
