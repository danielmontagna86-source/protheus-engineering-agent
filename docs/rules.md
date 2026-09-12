# Deterministic ADVPL/TLPP review rules

The review engine implements a deliberately bounded lexical subset of the official TOTVS EngPro code-review guidance. It masks comments and string literals before matching, produces file/line evidence, and never claims compiler or complete-parser coverage.

| Rule | Severity | Deterministic trigger |
|---|---|---|
| CA1000 | MAJOR | `MSCREATE()` or `DBCREATE()` legacy ISAM creation |
| CA1002 | MAJOR | Blocking UI API inside `Begin Transaction` / `End Transaction` |
| CA1003 | MAJOR | `GetMV`, `SuperGetMV`, `ExistBlock`, `AllUsers`, `Type`, or `Pergunte` inside `While`/`For`, or on the same lexical line as `DbEval` |
| CA1004 | MINOR | `ConOut()` or `OutErr()` console output |
| CA2000 | CRITICAL | Direct `DbSelectArea()` on recognized Protheus system tables |
| CA2022 | CRITICAL | `StaticCall()` restricted dynamic call |
| CA2023 | CRITICAL | `PTInternal()` prohibited internal API |
| CA2024 | CRITICAL | Assignment to `__cUserID` |
| CA2025 | CRITICAL | Assignment to `cEmpAnt` |
| CA2053 | CRITICAL | Direct `CREATE PROCEDURE` statement outside a string |
| CA3001 | MINOR | Obsolete `protheus.ch` include |
| CA4000 | INFO | Inline `IIF()` conditional |

Primary source: [official EngPro code-review skill](https://github.com/totvs/engpro-advpl-tlpp-skills/tree/main/skills/advpl-tlpp/code-review), pinned for this product in `config/skill-providers.json`.

## Known limits

- This is lexical review, not the full ADVPL/TLPP grammar or Sonar analyzer.
- Transaction and `While`/`For` scope follows recognizable source blocks and may not model preprocessing or macro expansion. `DbEval` callback inspection is intentionally limited to its lexical line so it cannot leak loop state into unrelated code.
- SQL injection, data flow, documentation completeness, authentication, framework compatibility, and cloud readiness require semantic analysis or human review and are not reported automatically yet.
- A clean report means only that no enabled deterministic pattern matched. It does not mean the source is correct, secure, compilable, or production-ready.

Every newly enabled rule requires positive, negative, comment/string, case, line-evidence, and mutation-resistant tests. Rules whose safe fix depends on an unverified Protheus API must describe the gap instead of inventing a replacement.
