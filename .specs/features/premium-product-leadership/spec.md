# Premium product leadership

**Status:** Accepted for ordered execution
**Date:** 2026-09-07
**Scope:** Complex
**Primary surface:** VS Code extension
**Canonical context:** `context.md`

## Problem

ADVPL/TLPP teams already have editing, language-server, compilation, debugging, Git, terminal, and generic AI-agent tools. Another chat window or IDE clone creates little durable value. The missing product layer is evidence-backed Protheus engineering: understanding project-specific impact, applying curated standards, supervising risky operations, and proving quality without requiring a particular model or personal orchestrator.

## Outcome

Deliver a public-ready product that gives a developer useful, deterministic Protheus feedback in under five minutes, integrates with the existing VS Code/TDS workflow, exposes reusable capabilities through MCP, and refuses unsafe or unproven operations by default.

## P0 — Publishable specialist foundation

- REQ-ORIGIN-001: The repository MUST retain the LionCodeLabs ZIP provenance, license audit, dependency audit, and adapt/reject matrix.
- REQ-ORIGIN-002: No LionCodeLabs implementation MAY be copied without file-level provenance and applicable MIT notice.
- REQ-VSC-001: A clean VSIX MUST run doctor, index, context, and active-file review without Hermes, Python, a model account, or network access.
- REQ-VSC-002: Review findings MUST appear in the native VS Code Problems surface with rule ID, severity, source file, line, title, and guidance.
- REQ-VSC-003: The extension MUST NOT duplicate editor, Explorer, terminal, Git, compile/debug, RPO, or server-management capabilities already provided by VS Code/TDS.
- REQ-SKL-001: Project skills MUST be discovered from `.agents/skills`, `.github/skills`, and `.pea/skills` with documented deterministic precedence.
- REQ-SKL-002: Every discovered skill MUST expose path, source/provider, digest, and untrusted-project-data trust classification.
- REQ-SKL-003: Symlinks/junctions escaping the workspace, oversized content, excess count, and excess aggregate payload MUST fail closed or be omitted with evidence.
- REQ-SKL-004: The repository MUST contain product-owned planning and evidence-review skills that add behavior not supplied by the upstream EngPro catalog.
- REQ-ENG-001: Official TOTVS EngPro MUST be recorded as a versioned upstream provider with license and source URL; imported content MUST preserve provenance.
- REQ-ENG-002: Deterministic review MUST cover a documented, tested subset of high-value EngPro/Sonar ADVPL/TLPP rules and MUST state that it is not a compiler or complete parser.
- REQ-QA-001: Every implementation task MUST follow test-first RED/GREEN/REFACTOR evidence unless the task is documentation-only.
- REQ-QA-002: Release validation MUST run the installed QA process: unit/integration, runtime/CLI, MCP, extension contract, installed VSIX on minimum/current VS Code, mutation, dependency security, publication audit, and code review.
- REQ-SUP-001: Mutation sandboxes MUST be removed after success or failure; local runtime residue MUST block publication rather than be silently ignored.
- REQ-PUB-001: GitHub and Marketplace metadata MUST be complete, consistent, trademark-safe, and compatible with Marketplace version rules.
- REQ-PUB-002: Publication MUST remain a fail-closed, human-authorized step separate from build and validation.

## P1 — Differentiated workflow value

- REQ-CG-001: CodeGraph MUST produce symbol, caller, dependency, ambiguity, and unresolved-target evidence with bounded performance and honest parser limitations.
- REQ-BUG-001: Bug review MUST reconcile source findings, graph impact, changed files, validation evidence, and residual risk in one traceable report.
- REQ-INT-001: TDN and dictionary access MUST use versioned, read-only adapters with provenance, caching rules, timeout, and offline degradation.
- REQ-BLD-001: Build supervision MUST model request, approval, execution, timeout, log capture, result, and artifact identity; it MUST NOT claim success without compiler evidence.
- REQ-TDS-001: A documented compatibility matrix MUST verify coexistence with the supported TDS-VSCode line and CP1252/LF projects.
- REQ-ONB-001: A new developer MUST reach the first deterministic review in no more than five minutes using README plus a native walkthrough or welcome action.
- REQ-BENCH-001: A legal, redistributable ADVPL/TLPP benchmark MUST measure time-to-verified-change, defect precision/recall, first-pass validation, and rework.
- REQ-MKT-001: Marketing claims MUST distinguish observed product behavior, external research, and unproven hypotheses.

## P2 — Safe agentic engineering

- REQ-AI-001: Model-assisted features MUST be opt-in, provider-neutral, observable, and usable without granting environment mutation.
- REQ-PERM-001: Permissions MUST be scoped by action and environment (`local`, `development`, `homologation`, `production`) and deny on timeout, missing policy, or malformed response.
- REQ-SUB-001: Subagents via MCP MUST have bounded tools, inputs, duration, output size, and auditable parent/child evidence.
- REQ-CHK-001: Mutating workflows MUST provide a checkpoint or worktree boundary before changes and a reviewable diff before acceptance.
- REQ-HER-001: Hermes MAY consume the same MCP/runtime contracts, but its absence MUST never block P0/P1 use or release.
- REQ-TEL-001: Any telemetry MUST be opt-in, documented, redacted, and MUST NOT transmit source code, credentials, business data, or paths by default.

## User stories and acceptance criteria

### US-001 — First useful review

As an ADVPL/TLPP developer, I want a native review in my existing editor so I can act on findings without learning another IDE.

1. WHEN a trusted workspace and supported source are open THEN the review command publishes line-addressable Problems diagnostics and a machine-readable report.
2. WHEN the runtime emits malformed output THEN no stale or fabricated diagnostic is published and an actionable error is shown.
3. WHEN no external service is configured THEN all P0 commands still operate.

### US-002 — Trusted specialist guidance

As a maintainer, I want project skills and official standards to be traceable so that advice is reviewable and updatable.

1. WHEN duplicate skill names exist THEN `.agents/skills` wins over `.github/skills`, which wins over `.pea/skills`.
2. WHEN a skill is loaded THEN source, path, digest, size limits, and trust classification are present.
3. WHEN a third-party skill provider is referenced THEN repository, license, version/commit, import policy, and update policy are documented.

### US-003 — Safe release

As a public user, I want verifiable artifacts so that installation does not depend on trusting an undocumented local build.

1. WHEN a release candidate is assessed THEN all QA gates run against the exact commit and packaged VSIX.
2. WHEN local residue, missing evidence, version mismatch, unreviewed dependency, or failed test exists THEN the result is NO-GO.
3. WHEN publication has not been explicitly authorized THEN no repository visibility, tag, release, Marketplace listing, or merge is changed.

### US-004 — Proven developer gain

As a buyer or team lead, I want evidence that the product improves Protheus work rather than generic AI claims.

1. WHEN product-effectiveness claims are published THEN each claim links to either a product benchmark/pilot or is clearly labeled external/contextual.
2. WHEN the benchmark runs THEN expert and less-experienced cohorts, task complexity, assistance condition, correctness, time, and rework are recorded separately.
3. WHEN evidence is insufficient THEN the product says so and does not infer market leadership from downloads, stars, or generic coding studies.

## Non-functional requirements

- NFR-SEC-001: Workspace content and skills are untrusted data, never executable instructions by default.
- NFR-PERF-001: P0 index/review budgets MUST remain bounded and have regression tests.
- NFR-COMP-001: CI MUST pass on Windows and Linux with Node.js 22 and 24.
- NFR-ACC-001: User-visible surfaces SHOULD use native VS Code accessible components before webviews.
- NFR-PRIV-001: Offline P0 behavior MUST make no network call and collect no telemetry.
- NFR-MAINT-001: Runtime packages MUST remain independently testable outside the Extension Host.

## Explicit non-goals

- Reimplementing a general coding agent, IDE shell, TDS language services, or full ADVPL/TLPP compiler.
- Bundling TOTVS proprietary assets, a private corpus, user credentials, or the GPL validated-example corpus.
- Claiming official TOTVS affiliation, production correctness, or measurable productivity gain before evidence exists.
- Requiring Hermes or selecting one model provider as the product identity.
