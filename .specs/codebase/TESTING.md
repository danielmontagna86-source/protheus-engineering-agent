# Testing Infrastructure

## Framework

- Node.js built-in test runner; no test dependency installation.
- Temporary filesystem fixtures for UTF-8, Windows-1252, atomic writes and MCP sessions.

## Coverage Matrix

| Layer | Test type | Command |
|---|---|---|
| Domain modules | unit | `node --test` |
| Filesystem context/resources | integration | `node --test test/project-context.test.mjs test/agent-resources.test.mjs` |
| Runtime/CLI | process integration | `node --test test/runtime-cli.test.mjs` |
| MCP | protocol integration | `node --test test/mcp.test.mjs` |
| VS Code adapter | contract | `node --test test/vscode-extension.test.mjs` |
| Public repository | static/release | `node scripts/check.mjs` and publication checker |

## Parallelism

Tests create independent temporary directories and are parallel-safe. No test may share Hermes, Oracle, AppServer, RPO or network state.

## Gate Checks

- Quick: targeted test file.
- Full: `node --test`.
- Build/publication: full tests, structural check, publication audit, manual VS Code smoke and GitHub CI evidence.

Current baseline before public-release work: 28 tests, all passing. Earlier P0 baseline: 21 tests.
