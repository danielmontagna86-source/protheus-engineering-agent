---
goal: Productize the Protheus Engineering Evidence Layer through release 1.0
version: 1.0
date_created: 2026-09-08
last_updated: 2026-09-08
owner: repository-maintainer
status: 'Proposed'
tags: [product, specs, vscode, mcp, advpl, tlpp, ci, qa]
---

# Introduction

![Status: Proposed](https://img.shields.io/badge/status-Proposed-blue)

Machine-readable implementation index for `.specs/features/product-completeness-v1/`. The plan converts an existing tested runtime into a discoverable VS Code and CI product without duplicating TDS or a generic agent.

## 1. Requirements & Constraints

- **REQ-001**: Expose the specialist product through native VS Code journeys and reusable headless contracts.
- **REQ-002**: Review Git changes as a unit and emit equivalent JSON/SARIF evidence locally and in CI.
- **REQ-003**: Use standard agent surfaces: VS Code LM Tools, Agent Skills/plugin and official MCP SDK.
- **REQ-004**: Establish a versioned ADVPL/TLPP parser conformance corpus before claiming semantic depth.
- **REQ-005**: Productize Project Memory, Journal, TDN, Dictionary and supervised build with provenance and explicit capability state.
- **REQ-006**: Validate live environments, accessibility and user outcomes before a 1.0/leadership/productivity claim.
- **SEC-001**: Environment policy, not model instructions, decides risky actions.
- **SEC-002**: Credentials never enter versioned config, logs, evidence or distribution artifacts.
- **CON-001**: Do not duplicate VS Code/TDS editor, Git, terminal, compiler, debugger, RPO or server management.
- **CON-002**: Do not require Hermes, Copilot or another provider.
- **CON-003**: Do not ship proprietary TOTVS/customer artifacts or incompatible corpora.
- **GUD-001**: Implement code test-first and keep requirements, tasks and validation evidence traceable.
- **PAT-001**: Use one runtime operation envelope across VS Code, CLI, MCP and CI.

## 2. Implementation Steps

### Implementation Phase 1 — 0.4 usable product

- **GOAL-001**: Make existing value visible, change-centered and team-ready.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-001 | Add typed configuration, environment profiles and secret boundary |  |  |
| TASK-002 | Build native Engineering Center and role workflows |  |  |
| TASK-003 | Add legal sample and five-minute walkthrough |  |  |
| TASK-004 | Implement SCM-aware changed-files review |  |  |
| TASK-005 | Export stable JSON/SARIF and package GitHub Action |  |  |
| TASK-006 | Migrate MCP to official TypeScript SDK |  |  |
| TASK-007 | Expose VS Code LM tools and portable product skills/plugin |  |  |
| TASK-008 | Complete Docker-free supervised build surfaces; keep analyzer container in internal QA |  |  |
| TASK-009 | Localize pt-BR/en and validate journeys |  |  |

### Implementation Phase 2 — 0.5 semantic and knowledge depth

- **GOAL-002**: Improve domain fidelity without overstating compiler equivalence.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-010 | Create legal parser conformance corpus and versioned IR |  |  |
| TASK-011 | Implement tolerant incremental parsing and confidence evidence |  |  |
| TASK-012 | Evaluate optional documented TDS enrichment |  |  |
| TASK-013 | Build Project Memory and Journal lifecycle UX |  |  |
| TASK-014 | Productize TDN/Dictionary snapshot onboarding |  |  |
| TASK-015 | Generalize read-only named-query database adapters |  |  |
| TASK-016 | Enforce representative large-workspace performance budgets |  |  |

### Implementation Phase 3 — 1.0 assurance

- **GOAL-003**: Replace hypotheses with live, human and public-release evidence.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-017 | Run live AppServer/RPO and database homologation matrix |  |  |
| TASK-018 | Complete accessibility, visual and clean-profile UAT |  |  |
| TASK-019 | Run preregistered representative outcome pilot |  |  |
| TASK-020 | Publish compatibility/support/deprecation lifecycle |  |  |
| TASK-021 | Run exact 1.0 QA, security, supply-chain and artifact gates |  |  |
| TASK-022 | Await named external publication authorization |  |  |

## 3. Alternatives

- **ALT-001**: Build a full chat agent; rejected because generic agents already own the surface and deterministic value must remain provider-neutral.
- **ALT-002**: Replace TDS compile/debug/RPO workflows; rejected because TDS is the official mature owner and coexistence is more valuable.
- **ALT-003**: Require Hermes; rejected because it narrows adoption without strengthening the specialist core.
- **ALT-004**: Rewrite a complete parser before product UX; rejected because there is no conformance corpus or user proof and most current value is hidden.
- **ALT-005**: Use a large custom dashboard webview; rejected for P0 in favor of accessible native TreeView/Problems/SCM surfaces.

## 4. Dependencies

- **DEP-001**: Existing Node.js 22/24 monorepo and VS Code minimum/current test harness.
- **DEP-002**: Official Model Context Protocol TypeScript SDK after license/security audit.
- **DEP-003**: VS Code Tree View, SCM, Diagnostic, Code Action, SecretStorage and Language Model Tool APIs.
- **DEP-004**: GitHub SARIF/code-scanning contract and Action runtime.
- **DEP-005**: TDS/CLI interfaces for optional build integration; pinned TOTVS analyzer image is an internal QA dependency only.
- **DEP-006**: Customer-owned homologation assets and credentials for live 1.0 gates.
- **DEP-007**: Consenting representative Protheus users for discovery and outcome pilot.

## 5. Files

- **FILE-001**: `.specs/features/product-completeness-v1/*` — canonical context, requirements, design, tasks and validation.
- **FILE-002**: `apps/vscode-extension/*` — native product surface only.
- **FILE-003**: `packages/runtime`, `packages/review`, `packages/codegraph-advpl`, `packages/project-context` — shared operations and evidence.
- **FILE-004**: `packages/mcp` — official SDK transport and portable tools.
- **FILE-005**: `packages/build-supervisor`, `packages/integrations`, `packages/policy` — connected governed capabilities.
- **FILE-006**: `examples/sample-workspace`, `action.yml`, schemas and CI workflows — onboarding/team distribution.
- **FILE-007**: `test/*`, benchmark and release evidence — acceptance gates.

## 6. Testing

- **TEST-001**: Existing unit/integration/CLI/MCP/extension tests and ≥95% configured mutation gate.
- **TEST-002**: Installed VSIX on minimum/current VS Code with TDS coexistence and CP1252/LF preservation.
- **TEST-003**: Five-minute clean-profile sample journey in pt-BR and en.
- **TEST-004**: SCM scope equivalence and stable JSON/SARIF fingerprints.
- **TEST-005**: GitHub Action minimal-permission and public test-repository validation.
- **TEST-006**: MCP official SDK conformance, cancellation, progress, shutdown and adversarial input.
- **TEST-007**: Parser corpus accuracy, incremental equivalence and large-workspace budgets.
- **TEST-008**: Integration permission, timeout, redaction, poisoned-content and live-environment matrices.
- **TEST-009**: Keyboard, screen reader, contrast, zoom and visual UAT.
- **TEST-010**: Representative crossover outcome pilot with raw anonymized evidence.
- **TEST-011**: Exact public commit, CI, OSV, CodeQL, SBOM, hashes and downloaded-artifact reproduction.

## 7. Risks & Assumptions

- **RISK-001**: Product breadth can outrun usability; mitigate by finishing change review and first-value UX before new autonomous features.
- **RISK-002**: MCP/VS Code agent APIs evolve rapidly; mitigate with official SDKs, compatibility ranges and host tests.
- **RISK-003**: ADVPL/TLPP grammar complexity creates false semantic confidence; mitigate with corpus-scoped support and explicit unknowns.
- **RISK-004**: TDN/proprietary assets can create licensing risk; mitigate with provenance and non-redistribution gates.
- **RISK-005**: A second extension may conflict with TDS; mitigate with native API boundaries and coexistence tests each release.
- **RISK-006**: AI enthusiasm may not translate to better delivery; mitigate with deterministic evidence and a pilot allowed to fail.
- **RISK-007**: The name may imply TOTVS affiliation; mitigate with persistent disclaimer and qualified legal review.
- **ASSUMPTION-001**: Protheus teams value change evidence across VS Code and CI more than another model-specific chat.
- **ASSUMPTION-002**: A free open community release is the right adoption wedge; monetization is unproven.

## 8. Related Specifications / Further Reading

- `.specs/features/product-completeness-v1/context.md`
- `.specs/features/product-completeness-v1/spec.md`
- `.specs/features/product-completeness-v1/design.md`
- `.specs/features/product-completeness-v1/tasks.md`
- `.specs/features/product-completeness-v1/validation.md`
- `docs/research/competitive-product-completeness-review-2026-09-08.md`
- `docs/plans/2026-09-08-product-completeness-0.4-test-plan.md`
- `https://github.com/totvs/tds-vscode`
- `https://github.com/totvs/engpro-advpl-tlpp-skills`
- `https://code.visualstudio.com/docs/agents/concepts/customization`
- `https://github.com/modelcontextprotocol/typescript-sdk`
