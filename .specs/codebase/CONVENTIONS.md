# Code Conventions

## JavaScript

- ESM `.mjs` by default; CommonJS `.cjs` only where VS Code requires it.
- Node standard library before adding dependencies.
- Dependency injection for subprocesses and external adapters.
- JSON contracts carry `schemaVersion` when persisted or exposed.
- Errors fail closed at integration and permission boundaries.
- Paths returned to callers use `/` for stable relative identifiers.

## Tests

- Node built-in `node:test` and strict assertions.
- Behavior-focused tests; temporary workspaces for filesystem tests.
- Every production behavior is introduced RED→GREEN.
- No tests read production credentials, Hermes profile or external databases.

## ADVPL/TLPP

- Product analysis rules prefer `totvs.ch`, explicit `If/Else`, `FWLogMsg`, safe SQL and no slow metadata calls inside loops.
- Physical test sources are synthetic and must not claim framework signatures without corpus/TDN validation.
- Real legacy source edits require Windows-1252/LF verification and compilation only when authorized.
