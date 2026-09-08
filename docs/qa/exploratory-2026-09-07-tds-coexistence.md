# Exploratory session — TDS coexistence

**Charter:** Explore the packaged Protheus Engineering Agent with official TDS-VSCode,
multi-root and CP1252/LF fixtures to discover contribution conflicts, contaminated evidence and
legacy-source corruption.

**Environment:** Windows x64; VS Code 1.133.0; TDS-VSCode 2.0.16; candidate 0.3.0; isolated
extensions, user-data and workspace directories; no AppServer/RPO/server profile copied.

## Session log (America/Sao_Paulo)

| Time | Tag | Observation |
|---|---|---|
| 21:49 | NOTE | Installed the newly packaged VSIX and copied the locally installed official TDS extension into an isolated extension directory. |
| 21:50 | NOTE | TDS activated without a product command-ID collision; product doctor/context/review commands loaded. |
| 21:50 | BUG | TDS generated `.vscode/.advpl/_binary_*.prw`; the product index incorrectly included those files as user sources. |
| 21:51 | NOTE | Added a focused regression that reproduced the contamination, then excluded the VS Code metadata tree from CodeGraph discovery. |
| 21:52 | NOTE | Regression passed; repeated the full packaged UAT from a fresh temporary profile. |
| 21:52 | NOTE | Second run passed: TDS active, 0 command conflicts, 2 workspace roots, CP1252 accent readable, LF and original CP1252 bytes preserved, native product diagnostic published. |
| 21:52 | RISK | The combined VS Code/TDS host attempted unauthenticated GitHub checks. The product itself has no telemetry/network path; combined TDS activation is therefore not described as offline. |

## Debrief

- Covered: isolated installation, official TDS activation, command namespace, first-value
  commands, TDS-generated state, multi-root routing, CP1252 reading, LF preservation and native
  diagnostics.
- Bug found: `TDS-GEN-001`, medium functional risk, fixed and converted to
  `workspace index excludes TDS generated sources under .vscode`.
- Unexplored in this session: authenticated AppServer compilation, RPO artifact validation,
  NVDA/JAWS announcements and subjective Marketplace screenshot quality.
- Release impact: coexistence/encoding automation is green; live compiler and assistive-
  technology checks retain separate evidence states.
