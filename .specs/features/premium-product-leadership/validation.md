# Validation — Premium product leadership

**Date opened:** 2026-09-07
**Spec:** `.specs/features/premium-product-leadership/spec.md`
**Status:** LOCAL AUTOMATED PASS — public release remains NO-GO

## Baseline

- Pre-feature unit/integration baseline: 90 passed, 0 failed.
- Current candidate: 170 passed, 0 failed, 0 skipped in three consecutive full-suite runs.
- Structural check: 47 source files and 3 manifests passed.
- Active-worktree publication check fails correctly only because three older locked ignored `.stryker-tmp` directories exist. They are not part of Git and are not deleted by broad process termination.
- RED evidence was observed for standard skill discovery, root-junction rejection, native Problems diagnostics, malformed/stale review output, unconditional mutation cleanup, Marketplace media staging, and `DbEval` loop-scope leakage before their implementations passed.
- No publication, merge, tag, release, repository visibility change, or Marketplace submission is authorized by this document.

## Per-task evidence template

| Task | Commit | RED evidence | GREEN evidence | Files reviewed | Status |
|---|---|---|---|---|---|
| T-010 | final candidate pending | targeted discovery/junction failures recorded | targeted + full suite PASS | loader/tests/docs | Complete |
| T-011 | final candidate pending | missing/malformed diagnostics failures recorded | contract + VS Code 1.95.3/1.133.0 PASS | extension/host/tests | Complete |
| T-012 | final candidate pending | cleanup contract failure recorded | 95.17% mutation PASS with 95% break gate; no new sandbox | config/publication tests | Complete |
| T-013 | final candidate pending | provider/owned-skill failures recorded | discovery/provenance/publication tests PASS | skills/catalog/notices/docs | Complete |
| T-014 | final candidate pending | expanded-rule and path-boundary failures recorded | focused review suite PASS; mutation review 94.27% | review/tests/rule catalog | Complete |
| T-015 | final candidate pending | Marketplace version/icon/staging failures recorded | package + manifests + host smoke PASS | manifests/media/docs/scripts | Automated scope complete |
| T-020 | current working candidate | missing `analysis` contract failed 2 focused tests | 11/11 CodeGraph tests PASS; 5,000-symbol fixture remains under 1 second | CodeGraph resolver/index/tests/docs | Complete |
| T-021 | current working candidate | missing adapter/runtime/MCP exports failed focused tests | adapter 7/7 and runtime/MCP 17/17 PASS | adapters/runtime/MCP/tests/docs | Complete |
| T-022 | current working candidate | bug-review v2 and runtime/MCP tool failed focused tests before implementation | review/runtime/MCP focused suites PASS | review/runtime/MCP/tests/docs | Complete |
| T-023 | current working candidate | compiler proof, timeout and cancellation tests failed before implementation | 11/11 adapter/supervisor tests PASS, including a real shell-free child process and artifact hash | build supervisor/process runner/tests/docs | Contract complete; live AppServer pending environment gate |
| T-024 | current working candidate | first real TDS run found generated `.vscode/.advpl` sources contaminating the index | regression 12/12 PASS; repeated packaged UAT PASS on VS Code 1.133.0 + official TDS 2.0.16, 0 command conflicts, multi-root + CP1252/LF PASS | VS Code host/smoke/CodeGraph/compatibility/session log | Complete for coexistence; live compile remains external |

## Complete QA battery

| Gate | Command/evidence | Required result |
|---|---|---|
| Unit + integration | `npm test` | PASS three consecutive times: 170/170, 0 failed, 0 skipped |
| Structural/lint-like check | `npm run check` | PASS: 47 source files, 3 manifests |
| CLI/MCP smoke | `npm run smoke` | PASS: doctor/index/review/MCP in 496 ms |
| Development publication audit | active tree, then exact clean commit archive | Active tree FAIL as designed only on old `.stryker-tmp`; exact-commit audit pending commit |
| Extension package | `npm run package:extension` | PASS: v0.3.0, 10 entries, 54,060 compressed bytes |
| VS Code current host | `npm run test:vscode:host` | PASS on 1.133.0, 4 commands + native CA4000 diagnostic |
| VS Code minimum host | `npm run test:vscode:minimum` | PASS on 1.95.3, same VSIX and behavior |
| Dependency audit | `npm audit --audit-level=moderate` and remote OSV | Local PASS: 0 vulnerabilities; remote OSV pending final commit |
| Mutation | `npm run test:mutation` | PASS: 95.17%, 820 killed, 8 timeout, 42 survived, 0 errors; enforced break threshold 95%; no new temp directory |
| Supply chain | release artifact/SBOM/checksum tests | PASS for exact commit |
| Code review | evidence review + pre-merge audit | PASS WITH ACCEPTED ALPHA LIMITS; one `DbEval` scope leak found and fixed test-first |
| Remote GitHub | PR CI Windows/Linux Node 22/24, OSV and public CodeQL | Pending final push; CodeQL activates after public visibility |
| User-facing UAT | clean-profile install, first review, Problems navigation, TDS coexistence | Automated install/review/Problems/TDS PASS; visual/accessibility assistive-technology pass pending |

## Requirement traceability

| Requirement group | Tasks | Current result |
|---|---|---|
| ORIGIN | T-001, T-041 | Preserved and reviewed; final diff audit pending |
| VSC | T-011, T-015, T-024 | Automated PASS including TDS; visual/accessibility manual evidence remains external |
| SKL/ENG | T-010, T-013, T-014 | P0 PASS |
| QA/SUP/PUB | T-012, T-015, T-040, T-041, T-042 | Local automated gates PASS/in progress; external authorization intentionally pending |
| CG/BUG/INT/BLD/TDS | T-020 through T-024 | Implemented and contract-tested; live build infrastructure external |
| BENCH/MKT | T-001, T-025 | Synthetic benchmark implemented; human productivity pilot external |
| AI/PERM/SUB/CHK/HER/TEL | T-030 through T-032 | Provider-neutral fail-closed contracts implemented; real providers optional and external |

## Release decision rule

- **GO:** Every selected-milestone requirement is verified, every blocking gate is green on the exact commit, artifacts are bound by hash, user-facing UAT passes, and explicit publication authorization is recorded.
- **NO-GO:** Any failed/omitted blocking test, unreviewed dependency, missing evidence, incompatible Marketplace version, local/private content, unresolved high-risk review finding, or absent authorization.
- **Deferred:** P1/P2 functionality may be deferred from an alpha only when README, Marketplace metadata, roadmap, and release notes state the limitation unambiguously.
