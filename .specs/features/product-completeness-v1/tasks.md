# Product completeness v1 — Tasks

**Execution rule:** test-first for code, atomic scope per task, no external publication without named authorization. A phase is not complete while its validation gate is open.

## Phase 0 — Baseline and decision freeze

### PC-000 — Freeze competitive and product evidence

- **Status:** Complete in planning scope
- **Files:** `docs/research/competitive-product-completeness-review-2026-09-08.md`, this Specs directory, `plan/feature-product-completeness-v1-1.md`
- **Done when:** observed code, first-party competitor evidence, gaps, positioning, requirements and deferred claims are traceable.
- **Tests:** link/manual source review; requirements-to-task traceability; `git diff --check`.
- **Gate:** no unsupported leadership/productivity claim.

### PC-001 — Record architecture decisions and release boundaries

- **Status:** Complete in planning scope
- **Files:** `.specs/project/STATE.md`, `.specs/project/ROADMAP.md`, `.specs/codebase/CONCERNS.md`, ADRs if introduced
- **Depends on:** PC-000
- **Done when:** Evidence Layer positioning, native UX, official MCP SDK evaluation, parser staging and 0.4/0.5/1.0 boundaries are explicit.
- **Tests:** documentation consistency checks.

## Phase 1 — P0 complete usable surface (0.4)

### PC-010 — Add typed configuration and environment profiles

- **Status:** Implemented; automated contract complete
- **Files:** `schemas/pea-config.schema.json`, `packages/project-context/src/*`, `apps/vscode-extension/package.json`, tests and docs
- **Depends on:** PC-001
- **Done when:** versioned non-secret config, pt-BR/en descriptions, profile validation and SecretStorage boundary exist.
- **Tests:** valid/invalid/migration/secret-redaction/multi-root cases.
- **Gate:** malformed or secret-bearing config fails closed.

### PC-011 — Build the native Engineering Center

- **Status:** Implemented; automated host coverage complete, human accessibility gate remains
- **Files:** `apps/vscode-extension/src/*` or modularized equivalent, manifest, extension tests
- **Depends on:** PC-010
- **Done when:** Workspace, Change Review, Memory, Integrations and Environment views render runtime state and deep-link to native surfaces.
- **Tests:** fake-host unit contracts, Extension Host smoke, keyboard/focus/high-contrast exploratory checks.
- **Gate:** no custom editor/terminal/Git/compile UI duplication.

### PC-012 — Add legal sample and five-minute walkthrough

- **Status:** Implemented; scripted installed-VSIX journey complete, timed human check remains
- **Files:** `examples/sample-workspace/*`, walkthrough metadata, `docs/getting-started.md`, tests
- **Depends on:** PC-011
- **Done when:** a clean offline user can index, introduce/use a known change, review it and inspect evidence in five minutes.
- **Tests:** fresh-profile installed-VSIX scripted smoke plus timed human check.
- **Gate:** sample provenance/license and no proprietary source.

### PC-013 — Implement SCM-aware changed-files review

- **Status:** Implemented; automated contract complete
- **Files:** runtime Git abstraction, review pipeline, extension command, CLI/MCP handlers, tests
- **Depends on:** PC-011
- **Done when:** staged/unstaged/branch selection feeds one traceable bug-review report and refuses ambiguous multi-repository selection.
- **Tests:** rename/delete/binary/untracked/multi-root/no-Git/escaping-path/empty-diff cases.
- **Gate:** UI, CLI and MCP produce equivalent normalized scope.

### PC-014 — Export stable JSON and SARIF

- **Status:** Implemented; automated contract complete
- **Files:** evidence/SARIF package, schemas, review CLI, tests and docs
- **Depends on:** PC-013
- **Done when:** fingerprints remain stable across unchanged runs and GitHub accepts fixture output.
- **Tests:** schema/golden/dedup/path/redaction/invalid-result tests.
- **Gate:** no duplicate alert from a line-only move when symbol evidence is stable.

### PC-015 — Publish a reusable GitHub Action contract

- **Status:** Implemented locally; public consumer-repository execution remains external
- **Files:** `action.yml`, `scripts/ci-review.mjs`, `.github/workflows/examples/*`, docs and tests
- **Depends on:** PC-014
- **Done when:** consumers can pin an immutable release/ref, run offline review and upload artifacts/SARIF with minimal permissions.
- **Tests:** actionlint, local fixture execution, permissions inspection, public test repository before stable release.
- **Gate:** action does not require write token for analysis-only use.

### PC-016 — Migrate MCP to the official SDK

- **Status:** Implemented; automated conformance complete
- **Files:** `packages/mcp/*`, lockfile, MCP tests, SBOM/notices
- **Depends on:** PC-001
- **Done when:** stdio tools/resources initialize through the official SDK with preserved schemas and bounded output.
- **Tests:** conformance, malformed JSON, unknown tool, invalid args, cancellation, progress, shutdown, 1 MiB boundary and host compatibility.
- **Gate:** dependency/license/security review green and no protocol regression.

### PC-017 — Expose VS Code LM tools and portable skills

- **Status:** Implemented; automated policy/tool/skill contracts complete
- **Files:** extension manifest/runtime adapter, `.agents/skills/*`, optional Agent Plugin package, docs and tests
- **Depends on:** PC-016
- **Done when:** read-only analysis tools are usable by VS Code agents; risky tools route through policy; skills are portable and Hermes remains optional.
- **Tests:** no-model deterministic path, mock LM tool invocation, permission denial, plugin/skill manifest validation.
- **Gate:** no bundled provider key or autonomous mutation grant.

### PC-018 — Complete supervised build surfaces

- **Status:** Implemented; deterministic adapter matrix complete. The official analyzer image was direct-cross-checked for its clean sentinel and one failing diagnostic, but no product adapter or analyzer-parity claim exists.
- **Files:** build adapter package, runtime/CLI/MCP/VS Code integrations, tests and user documentation
- **Depends on:** PC-010, PC-016
- **Done when:** prepare/run/status/cancel/evidence are consistent without a Docker prerequisite; official analyzer validation remains an internal QA lane.
- **Tests:** clean/diagnostic/timeout/cancel/image-unavailable/untrusted-args/redaction/resource-limit cases.
- **Gate:** fixture adapters never count as real compiler evidence.

### PC-019 — Localize and complete role journeys

- **Status:** Implemented; automated key/journey coverage complete, human locale UAT remains
- **Files:** VS Code l10n resources, commands, `docs/workflows/*`, tests
- **Depends on:** PC-012, PC-013, PC-017, PC-018
- **Done when:** developer/reviewer/lead/QA workflows are documented and usable in pt-BR and en.
- **Tests:** manifest/l10n key completeness and walkthrough smoke in both locales.

## Phase 2 — P1 semantic and knowledge depth (0.5)

### PC-020 — Create the parser conformance corpus and IR

- **Status:** Implemented for the declared legal corpus
- **Files:** `packages/codegraph-advpl/grammar-corpus/*`, schemas, tests, licensing docs
- **Depends on:** PC-000
- **Done when:** legal fixtures cover declared ADVPL/TLPP constructs and expected syntax/edge evidence.
- **Tests:** corpus runner, malformed/incomplete/preprocessor/encoding cases.
- **Gate:** corpus origin and license are auditable.

### PC-021 — Implement tolerant incremental parsing

- **Status:** Implemented for the published construct set; compiler equivalence is explicitly excluded
- **Files:** CodeGraph parser/tokenizer/cache modules and tests
- **Depends on:** PC-020
- **Done when:** versioned IR, confidence and invalidation replace regex-only primary analysis for supported constructs.
- **Tests:** per-construct precision/recall, edit invalidation, corrupted cache, deterministic cross-platform output.
- **Gate:** unsupported constructs remain explicit; no compiler-equivalence claim.

### PC-022 — Evaluate optional TDS enrichment

- **Status:** Complete; no unsupported TDS API is required and offline analysis remains independent
- **Files:** research/ADR, optional adapter, contract tests
- **Depends on:** PC-021
- **Done when:** only documented/stable TDS capabilities are used, or the adapter is rejected with evidence.
- **Tests:** TDS absent/version mismatch/timeout/malformed result/coexistence.
- **Gate:** offline analysis remains independent.

### PC-023 — Build Memory and Journal UX

- **Status:** Implemented; automated durability, boundary and promotion contracts complete
- **Files:** project-context runtime, extension views/commands, schemas, docs, tests
- **Depends on:** PC-011
- **Done when:** append, link, diff, promote, expire and review flows preserve attribution and Git-friendly data.
- **Tests:** concurrent append, corruption recovery, size limits, expiry, promotion diff, symlink escape.
- **Gate:** no opaque automatic personal memory.

### PC-024 — Productize TDN and Dictionary onboarding

- **Status:** Implemented for permitted versioned snapshots; live/provider redistribution is excluded
- **Files:** integration importers/index, capability UI, snapshot docs/tests
- **Depends on:** PC-010, PC-011
- **Done when:** users can validate/import/update a permitted snapshot and search it offline with provenance.
- **Tests:** checksum, schema migration, stale/offline/timeout/licensing metadata and poisoned-content cases.
- **Gate:** no unauthorized TDN redistribution.

### PC-025 — Generalize read-only database adapters

- **Status:** Implemented at the generic contract layer; each live dialect remains capability-gated
- **Files:** generic named-query port, Oracle/Postgres fixture adapters, policy/docs/tests
- **Depends on:** PC-010
- **Done when:** dialect is separate from policy/catalog and only allowlisted parameterized reads can execute.
- **Tests:** DDL/DML/raw SQL, bind mismatch, row/field limits, timeout, secret redaction, permission denial.
- **Gate:** each dialect remains unavailable until its own live gate passes.

### PC-026 — Establish large-repository performance gates

- **Status:** Implemented and passed locally on Windows; exact-commit Linux evidence remains a public CI gate
- **Files:** benchmark generator/authorized fixtures, CI budget config, results docs
- **Depends on:** PC-021, PC-023, PC-024
- **Done when:** cold/incremental time, peak memory and UI responsiveness have repeatable budgets on Windows/Linux.
- **Tests:** multiple sizes, cancellation, low-memory and cache-invalidated runs.

## Phase 3 — P2 1.0 assurance

### PC-030 — Run live homologation matrix

- **Status:** External / blocked on lawful licensed environment and owner inputs
- **Depends on:** PC-018, PC-022, PC-025
- **External needs:** customer-owned AppServer/RPO/includes/dictionary, disposable database credentials and authorization
- **Done when:** exact versions, inputs, logs, artifacts, failures and cleanup are recorded.

### PC-031 — Complete accessibility and visual QA

- **Status:** Manual / not complete
- **Depends on:** PC-019
- **Done when:** keyboard, screen reader, contrast, zoom and screenshots pass on minimum/current VS Code.

### PC-032 — Run representative outcome pilot

- **Status:** External / not run
- **Depends on:** P0 stable and PC-026
- **Done when:** consenting participants complete baseline/product crossover tasks and raw anonymized results support an honest claim decision.

### PC-033 — Establish compatibility and support lifecycle

- **Status:** Public contracts documented; live support drill and final compatibility evidence remain
- **Done when:** supported VS Code/TDS/Node/MCP/Protheus versions, deprecation window and issue-response policy are public.

### PC-034 — Execute exact 1.0 release gates

- **Status:** NO-GO; external, public-CI and human gates remain
- **Depends on:** PC-030..PC-033
- **Done when:** validation matrix is green and named publication authorization exists.
- **Gate:** otherwise NO-GO; do not make public, tag, release or submit to Marketplace.
