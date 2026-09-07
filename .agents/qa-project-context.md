# QA Project Context

**team_maturity:** startup
**product_stage:** pre-public alpha
**ci_platform:** GitHub Actions
**runtime:** Node.js 22 and 24
**supported_os:** Windows and Linux

## Test Layers

- Unit: policy, parser, review, adapters and registries.
- Integration: filesystem context, CLI, MCP stdio and VS Code adapter boundary.
- Security regression: lexical/real-path containment, `.pea` junction rejection, secret/path scanning and release checksum verification.
- Manual smoke: VS Code Extension Development Host.
- External-system tests: deferred until isolated TDN, Dictionary, Hermes and Protheus environments exist.

## Gate Commands

| Gate | Command |
|---|---|
| Quick | `node --test <target files>` |
| Full | `node --test` |
| Structural | `node scripts/check.mjs` |
| Critical path | `npm run smoke` |
| Mutation quality | `npm run test:mutation` |
| Dependency security | `npm audit --audit-level=high` |
| Publication | `node scripts/publication-check.mjs --release` |

## CI Contract

- Push and PR: full + structural + critical-path smoke on Windows/Linux and Node 22/24.
- Ubuntu/Node 22 additionally runs the dependency audit and focused mutation gate.
- No retries that hide flakes.
- Fork PR receives no secrets and read-only repository permissions.
- Release remains manual until public alpha gates are proven on GitHub.
