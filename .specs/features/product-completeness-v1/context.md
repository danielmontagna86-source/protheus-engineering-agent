# Product completeness v1 — Context

**Status:** Proposed after evidence-backed review
**Date:** 2026-09-08
**Decision owner:** repository maintainer
**Primary audience:** ADVPL/TLPP developers, reviewers, technical leads and QA teams
**Primary surface:** VS Code, with reusable CLI/MCP and CI outputs

## Why this feature exists

The repository already contains a well-tested deterministic runtime, CodeGraph, review rules, project context, permissions, build supervision and adapter contracts. The installed VS Code product, however, exposes only four commands: doctor, index, context and active-file review. Most differentiated capabilities are discoverable only through code, CLI or MCP.

At the same time, adjacent products already own mature surfaces:

- TDS-VSCode owns language services, compilation, debugging, server and RPO operations.
- General-purpose agents own chat, file editing, terminal, checkpoints, model selection and browser automation.
- Official EngPro skills provide curated ADVPL/TLPP guidance, while explicitly requiring human review.

The product should therefore not become another IDE, compiler or generic chat agent. Its defensible role is an **evidence and governance layer for Protheus engineering**: understand a change, relate it to project and domain knowledge, supervise risky operations and emit proof that humans and CI can inspect.

## Evidence labels

- **OBSERVED:** directly inspected in this repository or an executed artifact.
- **VERIFIED:** reproduced by a test or runtime execution.
- **SUPPORTED:** backed by a cited first-party source.
- **INFERENCE:** reasoned conclusion from observed/supported evidence.
- **UNPROVEN:** hypothesis requiring a representative user or live environment.

## Current product reality

| Area | Evidence | Assessment |
|---|---|---|
| Deterministic runtime | Unit/integration/CLI/MCP suites, mutation gate and release evidence | OBSERVED and VERIFIED strength |
| VS Code experience | Four offline commands and Problems diagnostics | OBSERVED; too narrow for the product promise |
| CodeGraph | Lexical graph with bounded performance and explicit ambiguity | VERIFIED baseline; not semantic completeness |
| Agent interoperability | MCP server plus skill discovery | VERIFIED baseline; custom MCP implementation creates protocol-drift risk |
| TDN/Dictionary/Oracle | Read-only adapter contracts and fixtures | VERIFIED contracts; live/onboarding path is incomplete |
| Build supervision | Governed process contract | VERIFIED contract; not exposed as a complete VS Code/MCP workflow and no live AppServer proof |
| Team workflow | JSON evidence and release scripts | OBSERVED; no first-class SARIF/GitHub Action/changed-files workflow |
| Product proof | Synthetic benchmark and technical QA | VERIFIED technical evidence; human outcome and market demand remain UNPROVEN |

## User jobs to be done

1. **Developer:** before changing a source, understand the symbol, callers, likely impact, applicable standards and relevant project memory.
2. **Developer:** after changing files, obtain deterministic findings, evidence and safe next actions without leaving VS Code.
3. **Reviewer:** review the Git diff as a unit, not one active file at a time, and see unresolved impact, validations and residual risks.
4. **Technical lead:** share rules, skills, environment policy and project memory through Git with traceable provenance.
5. **QA/release owner:** run the same checks in CI and receive stable findings, SARIF, build evidence and a fail-closed release decision.
6. **New user without Protheus:** install the extension, open a legal sample and experience the full offline value before configuring proprietary infrastructure.

## Competitive boundary

### What the product must complement

- VS Code editor, Explorer, Source Control, terminal, diff, Problems and testing UI.
- TDS-VSCode language services, compiler/debugger, AppServer/RPO and server management.
- Any user-selected model or agent host, including Copilot, Cline, Continue, Cursor-compatible MCP clients and Hermes.

### What the product must own

- ADVPL/TLPP change-impact evidence with honest confidence and limitations.
- Project Memory and Journal that are explicit, reviewable and versionable.
- Protheus-focused review and bug-review workflows using project diff and validation evidence.
- Versioned TDN/dictionary knowledge and safe database/build adapter contracts.
- Environment-scoped approvals, evidence ledger and deterministic CI parity.
- Portable agent skills/tools without requiring a bundled model or Hermes.

## Assumptions

- The initial market is Portuguese-speaking Protheus teams already using VS Code, commonly alongside TDS.
- A free Apache-2.0 community edition is the best initial adoption path; monetization is deferred until usage and willingness-to-pay are measured.
- Model assistance can improve convenience, but product correctness and first value must not depend on a model.
- No claim of productivity gain, official TOTVS affiliation or market leadership is permitted before representative evidence and legal review.

## Open evidence gates

- Representative interviews and a consenting pilot across developer, reviewer and lead roles.
- Live AppServer/RPO compilation in a customer-owned homologation environment.
- Live database validation for each supported dialect/profile.
- Accessibility and visual UAT of the expanded VS Code experience.
- Exact public-commit CI, OSV, public CodeQL and downloadable-artifact reproduction.
- Trademark/legal review before commercial promotion.
