---
goal: Build a public-ready premium Protheus Engineering Agent
version: 1.0
date_created: 2026-09-07
last_updated: 2026-09-07
owner: repository-maintainer
status: 'In progress'
tags: [product, architecture, vscode, advpl, tlpp, qa, release]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In_progress-yellow)

Machine-readable execution index for the canonical SDD feature in `.specs/features/premium-product-leadership/`.

## 1. Requirements & Constraints

- **REQ-001**: Deliver deterministic offline value through one installable VSIX.
- **REQ-002**: Keep runtime reusable through CLI and MCP.
- **REQ-003**: Integrate standard project skills with provenance and bounded trust.
- **REQ-004**: Apply a verified subset of official EngPro review guidance.
- **REQ-005**: Prove release quality with the complete installed QA battery.
- **SEC-001**: Deny unsafe resources, integrations, and publication when evidence or permission is missing.
- **CON-001**: Do not require Hermes or a model provider.
- **CON-002**: Do not replace VS Code/TDS editor, compile, debug, terminal, Git, or RPO functions.
- **CON-003**: Do not redistribute third-party corpora without compatible licensing and explicit provenance.
- **GUD-001**: Use RED-GREEN-REFACTOR and atomic commits.
- **PAT-001**: Follow EngPro Specify-Design-Tasks-Execute with validation inside every task.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Complete P0 public specialist foundation.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-001 | Freeze canonical spec, design, tasks, validation, and research |  |  |
| TASK-002 | Implement standard skill roots and provenance |  |  |
| TASK-003 | Implement native VS Code Problems diagnostics |  |  |
| TASK-004 | Configure unconditional mutation cleanup |  |  |
| TASK-005 | Add product skills and pinned EngPro provider catalog |  |  |
| TASK-006 | Expand deterministic EngPro rule subset |  |  |
| TASK-007 | Complete Marketplace metadata and onboarding |  |  |

### Implementation Phase 2

- GOAL-002: Deliver measurable P1 Protheus workflow differentiation.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-008 | Strengthen CodeGraph and bug-impact evidence |  |  |
| TASK-009 | Add read-only TDN and Dictionary adapters |  |  |
| TASK-010 | Complete supervised build contract |  |  |
| TASK-011 | Validate TDS coexistence and CP1252/LF workflows |  |  |
| TASK-012 | Run legal product-effectiveness benchmark |  |  |

### Implementation Phase 3

- GOAL-003: Validate and hand off an exact release candidate.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-013 | Run complete QA, security, mutation, VSIX, and UAT gates |  |  |
| TASK-014 | Complete final code review and exact-tree audit |  |  |
| TASK-015 | Push reviewed branch and await remote checks |  |  |
| TASK-016 | Await explicit external publication authorization |  |  |

## 3. Alternatives

- **ALT-001**: Fork LionCodeLabs; rejected because it duplicates IDE capabilities and carries unrelated Electron/provider complexity.
- **ALT-002**: Require Hermes; rejected because it narrows adoption and adds a nonessential install/credential dependency.
- **ALT-003**: Build a generic AI chat extension; rejected because mature competitors already own that surface and it does not create Protheus-specific defensibility.

## 4. Dependencies

- **DEP-001**: Node.js 22 or 24.
- **DEP-002**: VS Code 1.95 or newer for the supported line.
- **DEP-003**: Official TOTVS EngPro repository as a pinned, MIT-licensed standards provider.
- **DEP-004**: Existing repository QA/build dependencies locked in `package-lock.json`.
- **DEP-005**: Explicit maintainer authorization for external publication actions.

## 5. Files

- **FILE-001**: `.specs/features/premium-product-leadership/*` — canonical SDD contract.
- **FILE-002**: `packages/agent-resources/src/index.mjs` — safe standard skill discovery.
- **FILE-003**: `packages/review/src/index.mjs` — deterministic specialist rules.
- **FILE-004**: `apps/vscode-extension/*` — thin native VS Code adapter.
- **FILE-005**: `.agents/skills/*` and `config/skill-providers.json` — product skill layer and provenance.
- **FILE-006**: `test/*`, workflows, and release scripts — QA and supply-chain evidence.

## 6. Testing

- **TEST-001**: Unit and filesystem integration tests with non-decreasing count.
- **TEST-002**: CLI, MCP, and extension contract tests.
- **TEST-003**: Installed VSIX smoke on minimum and current VS Code.
- **TEST-004**: Mutation score at or above configured thresholds.
- **TEST-005**: npm audit plus remote OSV with no unresolved high/critical finding.
- **TEST-006**: Exact-clean-tree publication and artifact verification.
- **TEST-007**: Final code review and user-facing TDS coexistence UAT.

## 7. Risks & Assumptions

- **RISK-001**: Regex analysis can overstate coverage; mitigate with explicit rule boundaries and parser roadmap.
- **RISK-002**: Third-party skills can drift or contain unsafe instructions; mitigate with pins, provenance, manual updates, and untrusted-data handling.
- **RISK-003**: Trademark wording can imply TOTVS affiliation; mitigate with independent-product disclaimer and legal review.
- **RISK-004**: Generic AI productivity evidence may not transfer to mature ADVPL/TLPP work; mitigate with a domain benchmark.
- **RISK-005**: Local test residue can contaminate release evidence; mitigate with unconditional cleanup and exact-commit archive validation.
- **ASSUMPTION-001**: Target users already use VS Code and commonly TDS; validate through user interviews and compatibility tests.

## 8. Related Specifications / Further Reading

- `.specs/features/premium-product-leadership/spec.md`
- `.specs/features/premium-product-leadership/design.md`
- `.specs/features/premium-product-leadership/tasks.md`
- `.specs/features/premium-product-leadership/validation.md`
- `docs/reference-audit.md`
- `https://github.com/totvs/engpro-advpl-tlpp-skills`
