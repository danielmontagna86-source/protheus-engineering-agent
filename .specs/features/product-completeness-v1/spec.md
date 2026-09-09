# Product completeness v1 — Specification

**Status:** Proposed
**Scope:** Complex, multi-release
**Canonical context:** `context.md`

## Product outcome

Turn the existing specialist runtime into a complete, discoverable Protheus engineering workflow across VS Code, agent hosts and CI while preserving deterministic offline value and fail-closed control of external systems.

## P0 — Usable product surface and team parity (target: 0.4)

### Native workflow surface

- **REQ-UX-001:** WHEN a workspace containing ADVPL/TLPP is opened, THEN the extension SHALL present a native Engineering Center with Environment, Change Review, CodeGraph, Memory and Integrations status without using a replacement IDE shell.
- **REQ-UX-002:** WHEN the Engineering Center has no index or configuration, THEN it SHALL show a guided first-value action and explain which capabilities work offline.
- **REQ-UX-003:** WHEN a user selects an evidence item, THEN the extension SHALL navigate to the native editor, diff or Problems location and SHALL keep the machine-readable evidence accessible.
- **REQ-UX-004:** WHEN the user chooses a workflow, THEN progress, cancellation, completion and failure SHALL be visible and SHALL not block the Extension Host.

### Change-centered review

- **REQ-REV-001:** WHEN a Git workspace has changed files, THEN `Review Changed Files` SHALL derive the file set from the selected repository and SHALL never silently review an empty set.
- **REQ-REV-002:** WHEN a review completes, THEN one report SHALL reconcile diff scope, deterministic findings, CodeGraph impact, validation/build evidence, uncertainty and residual risk.
- **REQ-REV-003:** WHEN a result is exported, THEN JSON and SARIF SHALL use stable fingerprints so repeated CI runs do not create duplicate findings.
- **REQ-REV-004:** WHEN a finding can be corrected without semantic ambiguity or encoding risk, THEN the extension MAY offer a deterministic Code Action; otherwise it SHALL offer guidance only.

### Agent and skill distribution

- **REQ-AGT-001:** WHEN VS Code supports extension-contributed language-model tools, THEN the extension SHALL expose read-only specialist tools natively and SHALL keep MCP as the portable host-neutral surface.
- **REQ-AGT-002:** WHEN the product is installed, THEN reusable Protheus skills SHALL be discoverable by supported Agent Skills locations or a standards-compliant agent plugin without requiring Hermes.
- **REQ-AGT-003:** WHEN an agent requests mutation, execution, network, database or deployment, THEN the existing environment-scoped permission broker SHALL decide and record the action; model instructions alone SHALL NOT be treated as enforcement.
- **REQ-AGT-004:** WHEN no model or agent host is available, THEN all deterministic P0 workflows SHALL remain functional.

### Configuration and first value

- **REQ-ONB-001:** WHEN a user installs the VSIX in a clean profile, THEN a walkthrough SHALL reach an offline changed-files review in five minutes or less using a bundled legal sample workspace.
- **REQ-ONB-002:** WHEN environment configuration is incomplete, THEN Doctor SHALL render actionable statuses and fixes in native UI without exposing secrets.
- **REQ-ONB-003:** WHEN credentials are required, THEN they SHALL be stored in VS Code SecretStorage or supplied at runtime and SHALL never be written to project config, logs or evidence artifacts.
- **REQ-ONB-004:** WHEN language is selected, THEN user-facing commands, walkthrough and status text SHALL support pt-BR and en.

### CI and official tool adapters

- **REQ-CI-001:** WHEN the same repository is reviewed in CI, THEN a supported GitHub Action SHALL execute the headless runtime and produce JSON, SARIF and a human-readable summary from the same rules/configuration used locally.
- **REQ-CI-002:** WHEN the product is installed or the supported GitHub Action runs, THEN Docker SHALL NOT be a prerequisite for the standard product workflow.
- **REQ-CI-003:** WHEN official analyzer or database containers are used by maintainers, THEN they SHALL remain internal QA fixtures and SHALL NOT become product configuration, bundled artifacts or user-facing requirements.
- **REQ-CI-004:** WHEN a supervised build is requested through VS Code, CLI or MCP, THEN request, approval, run, cancel, status and evidence SHALL share one runtime contract.

### Protocol and compatibility

- **REQ-MCP-001:** WHEN MCP is upgraded, THEN the server SHALL use the official TypeScript SDK or document a reviewed exception, preserve stdio compatibility and pass protocol conformance/negative tests.
- **REQ-TDS-001:** WHEN TDS-VSCode is installed, THEN the product SHALL avoid command, language, compile, debug, server and RPO ownership conflicts.
- **REQ-TDS-002:** WHEN optional TDS enrichment is unavailable or changes, THEN specialist analysis SHALL degrade without blocking offline workflows.

## P1 — Semantic depth and connected knowledge (target: 0.5)

### Parser and CodeGraph

- **REQ-CG-101:** WHEN the parser encounters supported ADVPL/TLPP constructs, THEN it SHALL emit a versioned syntax/semantic model validated by a legal conformance corpus covering functions, methods, classes, namespaces, includes, macros, entry points and preprocessor branches.
- **REQ-CG-102:** WHEN syntax is incomplete or unsupported, THEN graph evidence SHALL include confidence, parser diagnostics and unresolved edges instead of fabricating a relation.
- **REQ-CG-103:** WHEN a file changes, THEN indexing SHALL be incremental and SHALL invalidate only affected files and dependency edges.
- **REQ-CG-104:** WHEN a maintained third-party grammar is considered, THEN license, activity, corpus accuracy and packaging SHALL pass an explicit adoption gate; no suitable grammar is assumed today.
- **REQ-CG-105:** WHEN TDS/LSP or RPO inspection can enrich evidence through a stable supported interface, THEN provenance SHALL distinguish that evidence from product-owned parsing.

### Memory and knowledge

- **REQ-MEM-101:** WHEN a user records Journal evidence, THEN entries SHALL be append-only, timestamped, attributed and linkable to files, symbols, issue/build identifiers and validation artifacts.
- **REQ-MEM-102:** WHEN Journal knowledge is promoted to Project Memory, Rule or Spec, THEN the product SHALL show a reviewable diff and preserve source provenance.
- **REQ-MEM-103:** WHEN a memory becomes stale, THEN owner, review date and expiry SHALL be visible; the product SHALL not silently inject expired memory.
- **REQ-KNW-101:** WHEN TDN or dictionary data is imported, THEN version, source, retrieval date, digest and supported product release SHALL be recorded and queryable offline.
- **REQ-KNW-102:** WHEN a database profile is configured, THEN the core SHALL use a generic read-only named-query port and dialect adapters; Oracle SHALL not be hard-coded as the only future database architecture.

### Performance and privacy

- **REQ-PERF-101:** WHEN indexing a representative authorized large repository, THEN budgets for cold index, incremental index, memory and UI responsiveness SHALL be measured and enforced by release gates.
- **REQ-PRV-101:** WHEN product analytics are disabled, THEN no source, prompt, repository metadata or usage event SHALL leave the machine.
- **REQ-PRV-102:** WHEN a user opts into local outcome measurement, THEN only documented, reviewable metrics SHALL be exported and source contents SHALL remain excluded.

## P2 — Production assurance and validated outcomes (target: 1.0)

- **REQ-VAL-201:** WHEN a 1.0 release is proposed, THEN live homologation evidence SHALL cover AppServer/RPO build, at least one supported database profile, TDS coexistence, Windows CP1252/LF and the public downloadable VSIX.
- **REQ-VAL-202:** WHEN accessibility UAT is executed, THEN keyboard navigation, focus order, screen-reader labels, high contrast and zoom SHALL meet the documented WCAG 2.2 AA-aligned extension checklist.
- **REQ-OUT-201:** WHEN marketing states a time, quality or rework improvement, THEN the claim SHALL be supported by a preregistered representative pilot with raw anonymized evidence, limitations and an approved claim decision.
- **REQ-GOV-201:** WHEN a team shares policies, THEN policy packs SHALL be versioned, reviewable, signed or digest-pinned and separable from user-local secrets.
- **REQ-LIFE-201:** WHEN VS Code, TDS, Node, MCP or Protheus support changes, THEN a compatibility matrix, support window and deprecation notice SHALL be updated before release.
- **REQ-PUB-201:** WHEN publication is requested, THEN exact-commit CI, OSV, public CodeQL, SBOM, artifact hashes, fresh-install smoke, screenshots, legal review and named authorization SHALL all be present or publication SHALL fail closed.

## Cross-cutting constraints

- **CON-001:** Do not implement an Electron IDE, terminal, Explorer, Git client, generic model chooser or TDS compiler/debugger replacement.
- **CON-002:** Do not bundle proprietary TOTVS artifacts, customer source, credentials or the GPL validation corpus.
- **CON-003:** Do not require Hermes, Copilot or any single model/provider.
- **CON-004:** Preserve ADVPL/TLPP source bytes and configured encoding; no Code Action may save a source under an unintended encoding.
- **CON-005:** Marketing and documentation SHALL label OBSERVED, VERIFIED, SUPPORTED, INFERENCE and UNPROVEN statements consistently.

## Success metrics

Technical acceptance precedes outcome claims:

- 100% of P0 journeys available from native VS Code commands/views and headless CLI where applicable.
- Local/CI rule parity on the same fixture and configuration.
- Stable SARIF fingerprints across unchanged runs.
- No secret in VSIX, source archive, logs or evidence artifacts.
- No regressions below the existing 95% mutation threshold in the configured scope.
- Five-minute first-value walkthrough measured on a clean profile.
- Representative pilot metrics reported without a predetermined uplift target.

## Explicit non-goals

- Full compiler equivalence or guaranteed semantic completeness in 0.4/0.5.
- Autonomous production deployment.
- Automatic capture of opaque personal memory.
- Gamification, leaderboards or developer surveillance.
- Paid/team tier before product-market evidence.
