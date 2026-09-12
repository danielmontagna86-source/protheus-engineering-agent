# Compatibility matrix

| Surface | Supported contract | Evidence status |
|---|---|---|
| VS Code | 1.95.3 minimum through current stable | Installed code-candidate 7123805 VSIX passed 1.95.3 and 1.136.2 on 2026-09-10; later release artifacts require their own checks |
| Node.js | 22 and 24 | CI matrix; bundled extension runtime uses VS Code's Node host |
| Windows | Windows 10/11 x64 | Primary local QA platform; current worktree host matrix passed |
| Linux | Current GitHub-hosted Ubuntu | Code candidate 7123805 passed Node 22/24, large-repository budgets and installed minimum VS Code host CI; full lifecycle remains open |
| TDS-VSCode | Coexistence, no private API dependency | 2.1.2 passed local activation, zero command conflicts, multi-root and CP1252/LF on 2026-09-10; its Copilot-configuration dialog warning remains recorded |
| MCP | Official TypeScript SDK server; negotiated protocol | Conformance and host smoke required per release |
| ADVPL/TLPP | Extensions listed by CodeGraph; lexical support table in `docs/codegraph.md` | Corpus-scoped, not compiler equivalence |
| Protheus/AppServer/RPO | Host-owned homologation only | No public stable claim until licensed live matrix passes |
| Oracle/PostgreSQL | Allowlisted, parameterized, read-only adapter contract | Official PostgreSQL image passed isolated SX2/SX3 reads and write denial; dialects remain unavailable until a host driver passes end to end |
| Official code analyzer | Internal QA cross-check only | Direct 2026-09-09 checks established the blank clean-result sentinel and failing diagnostic; product adapter parity/timeout/cancellation remain unproved |

Remote SSH/WSL/container workspaces are supported only when the workspace extension host can execute the bundled Node runtime and access Git files locally. Docker is not required by the installed product.

Support for a released minor line lasts until the next minor has been available for 90 days. Security fixes may shorten this window when continued support would be unsafe.
