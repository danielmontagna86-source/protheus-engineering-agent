# ADR 0001: keep TDS semantic enrichment optional and disabled

**Status:** Accepted on 2026-09-08

## Decision

The stable offline CodeGraph does not call private TDS language-client objects or undocumented LSP messages. TDS remains the supported owner of compile, debug, RPO, formatting, navigation and its own language-server behavior. Protheus Engineering Agent coexists with it and may consume a future documented, versioned public semantic API through an optional adapter.

The official extension currently exports selected compatibility methods such as PPO generation, RPO-token handling, server creation and TLPP tools. Its source also registers build commands. Those surfaces do not provide a documented semantic graph contract or the checksummed compiler-evidence envelope required by this product. Calling internal `languageClient` state would couple releases and violate the fail-closed boundary.

## Consequences

- Offline analysis remains usable without TDS or a Protheus installation.
- The parser labels macro, preprocessor, inheritance, overload and framework uncertainty instead of borrowing undocumented results.
- Installed-VSIX tests continue to cover minimum/current VS Code and TDS coexistence.
- A future adapter requires public API documentation, version negotiation, timeout/malformed/unavailable tests and an offline fallback.

## Primary evidence

- https://github.com/totvs/tds-vscode
- https://github.com/totvs/tds-vscode/blob/master/src/extension.ts
