# Stable 1.0 launch — Tasks

**Execution rule:** tasks are ordered by dependency, implementation is test-first, and no publication action is implied. Existing `PC-*` tasks remain canonical for capability implementation.

## Phase 0 — Organized baseline

### SL-000 — Freeze the three-track launch program

- **Status:** Complete in planning scope
- **Files:** this Specs directory; Docker/stable research; stable launch and QA plans
- **Done when:** competitive improvements, environment tiers, stable gates and owner inputs are traceable.
- **Verification:** requirement/task/gate coverage and `git diff --check`.

### SL-001 — Record architecture and claim decisions

- **Status:** Complete in planning scope
- **Files:** `.specs/project/STATE.md`, `.specs/project/ROADMAP.md`, `.specs/codebase/CONCERNS.md`
- **Depends on:** SL-000
- **Done when:** stable 1.0, Docker quarantine and external owner gates are explicit.

## Track A — Premium product

### SL-100 — Execute the complete native product surface

- **Status:** Automated implementation complete; human UAT and public Action execution remain
- **Delegates to:** PC-010..PC-019
- **Output:** typed config, Engineering Center, sample/walkthrough, changed-files review, JSON/SARIF/Action, official MCP SDK, native tools/skills, complete build surfaces and pt-BR/en journeys.
- **Gate:** all P0 automated and clean-profile journey tests pass.

### SL-110 — Execute semantic and knowledge depth

- **Status:** Automated implementation and Windows/Linux performance CI passed for code candidate 7123805; live-provider evidence remains
- **Delegates to:** PC-020..PC-026
- **Depends on:** SL-100
- **Output:** legal conformance corpus, honest incremental parser, optional TDS enrichment, Memory/Journal UX, TDN/dictionary onboarding, generic read-only DB adapters and performance budgets.
- **Gate:** per-construct accuracy and large-repository budgets are published; no compiler-equivalence claim.

### SL-120 — Complete product documentation and role journeys

- **Status:** Documentation and examples-as-tests complete; screenshots and timed human journey remain
- **Files:** `README.md`, `docs/getting-started.md`, `docs/workflows/*`, `docs/compatibility.md`, `docs/limitations.md`, samples and screenshots
- **Depends on:** SL-100, SL-110
- **Tests:** link checker, examples-as-tests, pt-BR/en review, clean-profile timed run.
- **Done when:** developer, reviewer, QA and release-owner journeys end in evidence, not a feature list.

## Track B — Internal Protheus QA lab

Nothing in this track is packaged as a user feature or required by the VSIX/runtime.

### SL-200 — Lock down Tier 0 virtualization

- **Status:** Complete for deterministic offline adapter contracts
- **Files:** `test/fixtures/*`, adapter contract tests, network-denial harness
- **Tests:** success/denied/malformed/unavailable/timeout/cancelled; no external network; stable golden evidence.
- **Done when:** deterministic CI has no Docker or credential prerequisite.

### SL-210 — Validate through the official analyzer lane

- **Status:** Partial; the 2026-09-09 direct rerun established the image's blank clean-result sentinel and a complete failing diagnostic. There is no product analyzer adapter or analyzer-parity claim; timeout/cancellation adapter evidence remains open.
- **Files:** test-only internal-lab evidence and docs; no analyzer adapter is packaged in the product
- **Depends on:** SL-200, PC-018
- **Tests:** clean/failing source, includes, config, JSON, exit mapping, timeout, cancellation, output limit and digest mismatch.
- **Gate:** full official image digest, bounded resources and redacted evidence.

### SL-220 — Validate through the official PostgreSQL lane

- **Status:** Partial; isolated environment/read/write-denial checks passed, live product dialect evidence remains capability-gated
- **Files:** opt-in Compose/test harness, named-query adapter fixtures, CI workflow, docs
- **Depends on:** SL-200, PC-025
- **Tests:** health/readiness, SX2/SX3 lookup, unknown query, injection, write denial, timeout, concurrent reads and teardown.
- **Gate:** loopback-only, ephemeral credentials, read-only account, no customer data and explicit development-only label.

### SL-230 — Build the private AppServer homologation harness

- **Status:** Partial; the authorized disposable laboratory has sanitized
  positive/negative PEA→TDS and direct TDS→AppServer receipts, and the owner
  attested on 2026-09-24 that its RPO was obtained from the official TOTVS
  portal. Commercial-license status is not a functional criterion for this
  private lab. Locked/unavailable RPO, live timeout/cancel and
  DBAccess/dictionary adapter coverage remain open.
- **Files:** test-only private-input manifest schema, preflight/admission scripts, build smoke and internal evidence docs; no proprietary artifacts
- **Depends on:** SL-210, SL-220
- **Tests:** missing/invalid provenance metadata, missing artifact, digest mismatch, compile success/failure, locked RPO, bad include, server unavailable, timeout/cancel and secret redaction.
- **Gate:** admitted image by digest plus lawful user-owned inputs and explicit owner authorization; nothing proprietary enters Git or public artifacts, and no result is presented as official TOTVS certification.

### SL-240 — Implement internal community-container admission without default execution

- **Status:** Owner-authorized isolated feliperaposo experiment executed on 2026-09-10; AppServer REST startup failed. Default admission policy remains unchanged; see the recorded negative compatibility evidence.
- **Files:** test-only admission schema/tool/tests and security decision record
- **Depends on:** SL-200
- **Tests:** reject unknown license, floating tag, root-required, broad ports, default password, missing SBOM/signature/readiness/teardown and proprietary payload ambiguity.
- **Gate:** reviewed projects remain `rejected` or `quarantine`; no product/default/sample/required workflow references them.

## Track C — Exit preview

### SL-300 — Freeze and document the 1.0 public contract

- **Status:** Complete in repository scope
- **Files:** schema docs, CLI/MCP/SARIF compatibility, support/deprecation/migration policy and changelog
- **Depends on:** SL-100, SL-110
- **Tests:** schema compatibility and migration/rollback fixtures.
- **Gate:** every supported surface has an owner and compatibility range.

### SL-310 — Prove install, upgrade, rollback and remote compatibility

- **Status:** Partial; fresh Windows minimum/current VSIX, TDS coexistence and complete Windows lifecycle/rollback passed locally. Commit `a1a4f4a` passed the GitHub-hosted Linux 1.95.3 installed-VSIX lifecycle (preview package build, install, upgrade, uninstall, reinstall and rollback); remote matrix remains.
- **Files:** VSIX smoke harness, CI matrices, migration tests, user rollback guide
- **Depends on:** SL-300
- **Tests:** clean install; upgrade from latest preview; uninstall/reinstall; rollback; minimum/current VS Code; Windows/Linux; local and declared remote modes; offline first value.
- **Gate:** actual packaged VSIX, not development host.

### SL-320 — Complete accessibility, localization and usability UAT

- **Status:** Automated localization coverage complete; assistive and three-user UAT not run
- **Files:** accessibility checklist/evidence, screenshots, UAT protocol/results, issue log
- **Depends on:** SL-120, SL-310
- **Tests:** keyboard, focus, screen reader, high contrast, zoom, pt-BR/en, three clean-profile first-value sessions.
- **Gate:** no blocker/high defect; median first value at or below five minutes.

### SL-330 — Complete live compatibility and effectiveness evidence

- **Status:** Partial for laboratory compatibility; representative effectiveness,
  support ownership and the final Stable artifact remain external / not
  complete
- **Delegates to:** PC-030..PC-033
- **Depends on:** SL-230, SL-320
- **Tests:** authorized AppServer/RPO/database/TDS matrix and preregistered representative pilot.
- **Gate:** supported matrix and claim table match raw evidence; unsupported combinations remain explicit.

### SL-340 — Harden public supply chain and release workflow

- **Status:** Local controls implemented, including pinned dependency review, history secret scan, provenance workflow, exact receipts and reproducibility checks; exact public executions remain external
- **Files:** protected GitHub workflows, Dependabot/dependency review, CodeQL, secret scan, SBOM, attestations, immutable-release and verification docs
- **Depends on:** SL-300
- **Tests:** clean-checkout reproducibility, least-privilege permissions, pinned actions, artifact/hash/attestation verification and tamper-negative tests.
- **Gate:** exact public commit is green; private-repository absence of public CodeQL is not waived.

### SL-350 — Run stable 1.0 promotion gate

- **Status:** NO-GO
- **Delegates to:** PC-034
- **Depends on:** SL-310, SL-320, SL-330, SL-340
- **Inputs:** final VSIX/source/SBOM/manifest/evidence, legal sign-off, support owner and approved claims.
- **Done when:** gate returns `GO` for the exact commit and artifacts.
- **External action:** GitHub visibility, tag/release, Marketplace publication and announcement occur only after named owner authorization.

## Critical path

`SL-100 -> SL-110 -> SL-120 -> SL-300 -> SL-310 -> SL-320 -> SL-330 -> SL-350`

Parallelizable after SL-100: `SL-200 -> SL-210/SL-220 -> SL-230`, and `SL-340` after the public contract freezes.

## Owner action lane

These items cannot be fabricated by repository work:

1. retain auditable provenance for the authorized AppServer/RPO/dictionary/include inputs without placing proprietary artifacts in Git;
2. approve a non-customer smoke project and test data;
3. recruit representative Protheus users for UAT/pilot;
4. establish Marketplace publisher/domain and legal/trademark review;
5. authorize repository visibility and each publication action.
