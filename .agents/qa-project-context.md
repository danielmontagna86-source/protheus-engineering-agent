# QA Project Context

**team_maturity:** startup
**product_stage:** release-candidate preview
**ci_platform:** GitHub Actions
**runtime:** Node.js 22 and 24
**supported_os:** Windows and Linux

## Test Layers

- Unit: policy and approval broker, lexical ADVPL/TLPP parser, review and bug evidence, AI gateway, subagent supervisor, Oracle allowlist, adapters and registries.
- Integration: atomic Project Memory/Journal, versioned TDN/Dictionary snapshots, durable build resume, CLI, MCP stdio and VS Code adapter boundary.
- Security regression: lexical/real-path containment, alternate-stream/path rejection, `.pea` junction rejection, prompt-injection isolation, secret redaction/scanning, read-only Oracle enforcement and release checksum verification.
- System: packaged VSIX fresh-installed in isolated minimum/current VS Code Extension Hosts and alongside the official TDS extension.
- Product evidence: deterministic seven-case benchmark with explicit `SUPPORTED`/`NOT_PROVEN` claim decisions.
- External-system tests: live Protheus compiler/AppServer/RPO, customer Oracle/Dictionary, TDN network snapshot refresh, accessibility assistive-technology pass and Marketplace install remain named release-owner gates.

## Gate Commands

| Gate | Command |
|---|---|
| Quick | `node --test <target files>` |
| Full | `node --test` |
| Structural | `node scripts/check.mjs` |
| Critical path | `npm run smoke` |
| Mutation quality | `npm run test:mutation` |
| VS Code current | `npm run test:vscode:host` |
| VS Code minimum | `npm run test:vscode:minimum` |
| Dependency security | `npm audit --audit-level=high` |
| TDS coexistence | `npm run test:vscode:tds` |
| Product benchmark | `npm run benchmark` |
| Exact artifacts | `npm run build:release && npm run verify:release` |
| Publication | `node scripts/publication-check.mjs --release` |

## CI Contract

- Push and PR: full + structural + critical-path smoke on Windows/Linux and Node 22/24.
- Ubuntu/Node 22 additionally runs the dependency audit and focused mutation gate with a 95% breaking threshold.
- No retries that hide flakes.
- Fork PR receives no secrets and read-only repository permissions.
- MCP stdio input is capped at 1 MiB and exact tool argument contracts are regression tested.
- Deterministic integrations do not require Hermes; AI, Oracle and subagents are unavailable until a host injects an approved adapter.
- Release remains manual until candidate GitHub checks and the named external gates are proven.
