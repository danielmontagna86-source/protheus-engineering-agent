# Public GitHub Release Tasks

**Spec:** `.specs/features/public-github-release/spec.md`
**Design:** `.specs/features/public-github-release/design.md`

| ID | Task | Depends on | Done when | Gate | Status |
|---|---|---|---|---|---|
| T1 | Add isolated Hermes ACP/MCP descriptors in `packages/hermes-adapter` and `packages/runtime`. | none | adapter, runtime and CLI tests pass | quick | COMPLETE |
| T2 | Add live Skills/Rules snapshots in `packages/agent-resources`. | none | live reload, size limit and incomplete-folder tests pass | quick | COMPLETE |
| T3 | Expose engineering context through MCP and VS Code. | T1, T2 | MCP/extension integration tests pass | full | COMPLETE |
| T4 | Add `.specs` project, codebase and release documents. | T1-T3 | required SDD files exist and match observed code | docs | COMPLETE |
| T5 | Implement publication auditor and tests. | T4 | auditor detects release blockers and private paths | full | COMPLETE |
| T6 | Add public repository policies and portable README. | T4 | governance/docs checks pass | docs | COMPLETE |
| T7 | Add least-privilege GitHub CI matrix. | T5 | workflow passes structural check and first draft PR run | full | IN PROGRESS: local contract passes; GitHub run pending |
| T8 | Select/apply license and repository owner metadata. | owner decision | SPDX metadata and URL are consistent | release | COMPLETE: Apache-2.0 and canonical repository configured |
| T9 | Execute code review, automated/manual smokes and release checklist. | T5-T8 | no blocking findings and signed GO | release | IN PROGRESS: local code/security review and CLI/MCP smoke PASS; manual/external gates pending |
| T10 | Publish `v0.3.1` as a Marketplace pre-release only after explicit authorization. | T9 | protected main, tag, release notes, artifacts and checksums exist | release | PLANNED |
| T11 | Close public discovery and launch-operations contract. | T6, T9 | truthful discovery checklist is audited with Marketplace metadata; GitHub topics/social preview/security controls and real product media are evidenced at launch | release | IN PROGRESS: tracked contract and static checks complete; live public settings and real accessible captures pending |

## Atomic Verification

- T1: `node --test test/adapters-supervisor.test.mjs test/runtime-cli.test.mjs`
- T2: `node --test test/agent-resources.test.mjs`
- T3: `node --test test/mcp.test.mjs test/vscode-extension.test.mjs`
- T5-T7: `node --test` and `node scripts/check.mjs`; run `actionlint` when available.
- T9: `npm run smoke`, pre-merge audit and Extension Development Host smoke.
- T10: inspect GitHub Actions run, branch protection and downloaded release artifacts.
