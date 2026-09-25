# Full project quality review v1 — Context

## Confirmed state

- Baseline reviewed: `main` at `c354e980f71af082e0015b0bc435a6758d0ff34f`.
- Product remains a GitHub Preview; Stable/Marketplace is fail-closed.
- PR #47 records the live Protheus dictionary group `990`, TDS and database-adapter evidence.
- The runtime, MCP and VS Code extension remain the supported architecture; Hermes is optional.

## Source hierarchy

1. Current source, tests, GitHub checks and Docker/AppServer evidence.
2. `.specs/project`, stable gate ledger and exact release records.
3. Official MCP SDK release notes and TOTVS documentation.
4. Historical reports, explicitly labeled as historical.

## Review decisions

- Fix optional MCP progress notifications so transport loss cannot replace a valid tool result.
- Enforce coverage only for maintained product sources, excluding generated bundles and test code.
- Keep `@modelcontextprotocol/server` pinned to `2.0.0`: `2.1.0` failed the finite-stdio compatibility test by dropping asynchronous responses on EOF.
- Reconcile operational documentation without converting Preview into Stable.
- Defer decomposition of the 1,266-line VS Code adapter until it can be performed as a dedicated behavior-preserving refactor.
