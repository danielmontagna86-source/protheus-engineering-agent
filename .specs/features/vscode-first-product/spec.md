# VS Code-first standalone product

**Status:** Accepted for implementation
**Date:** 2026-09-07

## Problem

The product is intended for the public ADVPL/TLPP community. Requiring Hermes before the user can obtain value narrows distribution, adds a second installation and credential surface, and conflicts with the thin-extension promise.

## Requirements

- REQ-VSC-001: The packaged VSIX MUST provide doctor, workspace indexing, project context and active-file review without Hermes, a model account, network access or a separate runtime installation.
- REQ-VSC-002: Domain behavior MUST remain in reusable runtime packages bundled into the extension; the extension host MUST remain an interface adapter.
- REQ-VSC-003: MCP MUST remain a supported reusable boundary for other hosts and integrations.
- REQ-VSC-004: Hermes MUST be an optional, experimental adapter. Its absence MUST NOT block installation, normal commands, CI or a core release.
- REQ-VSC-005: A real Hermes compatibility probe MAY be recorded, but MUST be isolated and MUST NOT be a core release gate.
- REQ-VSC-006: P1 AI interaction SHOULD use VS Code-native extension tools first. MCP is preferred when the capability must also work outside VS Code. A dedicated orchestrator is optional.
- REQ-VSC-007: The product MUST complement the official TDS extension and MUST NOT reimplement language editing, compilation, debugging, terminal, Explorer or Git UI.
- REQ-VSC-008: CodeGraph MUST resolve same-file static functions before global symbols and MUST leave ambiguous or inaccessible targets unresolved.
- REQ-VSC-009: Feature-branch pushes with an open pull request MUST NOT duplicate the full CI workflow.

## Acceptance criteria

- A clean VSIX runs all four commands on the minimum and current supported VS Code versions without Hermes.
- Release validation accepts complete core evidence with no Hermes field.
- A Hermes result, when present in documentation, is labelled optional compatibility evidence.
- CodeGraph tests cover same-file static shadowing, inaccessible cross-file static functions and ambiguous global targets.
- CI runs for pull requests into `main` and direct pushes to `main`, but not twice for each feature-branch update.

## Non-goals

- Building a second IDE, chat shell or generic coding agent.
- Bundling Hermes or any model provider.
- Replacing TDS-VSCode compilation, debugging, LSP or DAP features.
- Claiming parser completeness or production effectiveness without a representative benchmark.
