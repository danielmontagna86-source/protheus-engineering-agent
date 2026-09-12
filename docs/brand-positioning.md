# Brand and Market Positioning

**Decision date:** 2026-09-07
**Public name:** Protheus Engineering Agent
**Repository:** `danielmontagna86-source/protheus-engineering-agent`
**Category:** standalone open-source VS Code extension for ADVPL/TLPP engineering

## Naming decision

The selected name wins on immediate comprehension and search intent: a Protheus developer can identify the audience, purpose and product category without learning an invented brand. Searches on GitHub and the public web found adjacent projects around Protheus agents, specialists and skills, but no repository or product with the exact name on the decision date.

Alternatives considered:

| Name | Clarity | Scope | Differentiation | Main drawback |
|---|---:|---:|---:|---|
| Protheus Engineering Agent | High | High | Medium | Uses a third-party product mark prominently |
| ADVPL Engineering Agent | High | Medium | Medium | Understates TLPP, runtime and broader engineering scope |
| PEA | Low | High | Low | Generic acronym with weak searchability |

The repository slug remains descriptive. `PEA` may be used only as a technical shorthand in commands and internal identifiers, never as the sole public identity.

## Positioning model

**Audience:** ADVPL/TLPP developers, consultants, maintainers and QA teams working with Protheus customizations.

**Problem:** engineering knowledge, source context, reviews and execution controls are fragmented across IDE actions, documentation, scripts and individual experience.

**Promise:** bring evidence-backed code understanding and supervised engineering workflows into the VS Code environment teams already use.

**Positioning statement:** Protheus Engineering Agent is an independent, open-source VS Code extension for ADVPL/TLPP teams that brings project memory, code analysis, reviews, skills and controlled integrations into the editor, with a reusable MCP-compatible runtime underneath.

**Proof pillars:**

1. One-VSIX start, engine-agnostic and independently useful; no replacement IDE.
2. Evidence before automation: file/line findings, checksums and explicit release gates.
3. Protheus-specific context: ADVPL/TLPP CodeGraph, rules and integration ports.
4. Safe adoption: external capabilities are fail-closed and permissions are environment-scoped.
5. Portable foundation: Node.js standard-library runtime with no mandatory npm runtime dependencies in the alpha.

## Public messaging guardrails

- Always describe the project as independent and community maintained.
- Never use TOTVS visual identity, imply endorsement, or call the project an official Protheus product.
- Prefer “for ADVPL/TLPP projects” and “for teams working with Protheus” over ownership language.
- Mark unavailable adapters, compiler integration and full ACP chat as planned or unverified.
- Treat generated findings as engineering assistance that requires human review.

`Protheus` and `TOTVS` are third-party marks. The README, NOTICE and repository description must retain the independent-project disclaimer. This positioning review is not a trademark clearance or legal opinion; a formal commercial launch should obtain professional trademark review.

## Launch message

**Headline:** Engineering context for ADVPL/TLPP, inside VS Code.

**One-line description:** A standalone open-source VS Code extension for evidence-backed ADVPL/TLPP CodeGraph, project context, reviews and controlled integrations.

**Initial call to action:** Clone the alpha, run the local gate, and help validate real ADVPL/TLPP workflows before Marketplace distribution.
