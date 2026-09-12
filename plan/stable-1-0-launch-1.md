# Implementation Plan: Stable 1.0 launch

**Status:** ready  
**Canonical tasks:** `.specs/features/stable-1-0-launch/tasks.md`  
**Canonical validation:** `.specs/features/stable-1-0-launch/validation.md`

## 1. Requirements and constraints

- Complete the existing `product-completeness-v1` P0/P1 requirements before stable promotion.
- Keep VS Code as the primary interface and the runtime reusable/headless.
- Keep Hermes/model hosts optional and TDS as compile/debug/RPO owner.
- Keep Docker as internal QA only; no installed product or standard CI dependency.
- Do not ship proprietary TOTVS/customer assets or use community images as homologation proof.
- Treat missing evidence and skipped required checks as failures.
- Require explicit authorization for GitHub visibility, release and Marketplace publication.

## 2. Work breakdown

| Order | Task | Depends on | Completion signal |
|---:|---|---|---|
| 1 | SL-100 / PC-010..019 premium P0 | planning baseline | complete native offline/CI journey passes |
| 2 | SL-200 Tier 0 internal QA | planning baseline | zero-network success/error matrix passes |
| 3 | SL-210 official analyzer internal QA | SL-200, PC-018 | digest-bound cross-check passes |
| 4 | SL-110 / PC-020..026 semantic P1 | SL-100 | accuracy/performance/knowledge gates pass |
| 5 | SL-220 official Postgres internal QA | SL-200, PC-025 | isolated read-only DB matrix passes |
| 6 | SL-120 product docs/journeys | SL-100, SL-110 | tested pt-BR/en role journeys pass |
| 7 | SL-300 public API freeze | SL-100, SL-110 | compatibility/migration/deprecation contract approved |
| 8 | SL-310 VSIX lifecycle | SL-300 | install/upgrade/uninstall/rollback matrix passes |
| 9 | SL-320 accessibility/UAT | SL-120, SL-310 | no blocker/high issue and first-value gate passes |
| 10 | SL-230 licensed AppServer harness | SL-210, SL-220 | lawful live test is reproducible and redacted |
| 11 | SL-330 live matrix/pilot | SL-230, SL-320 | support/claims evidence approved |
| 12 | SL-340 public supply chain | SL-300 | exact public commit artifacts verify |
| 13 | SL-350 stable promotion | all above | final ledger `GO` plus named authorization |

## 3. Test-first implementation loop

For each code task:

1. add or identify the failing acceptance test;
2. implement the smallest vertical slice across runtime and thin adapter;
3. run targeted unit/integration tests;
4. run package-level lint/type/build/tests;
5. update evidence, documentation and requirement traceability;
6. request independent code review before closing the task.

## 4. Dependencies

- Node/npm lockfile and existing workspace tooling.
- Official MCP TypeScript SDK after dependency/license review.
- VS Code stable/minimum test runtimes and TDS supported version.
- Internal-only official TOTVS analyzer/Postgres image digests.
- External licensed AppServer/RPO/dictionary/include and test connectivity for live gate.
- Public GitHub repository for final CodeQL/attestations and Marketplace publisher for release.

## 5. Verification commands

Use repository scripts as the source of truth. At minimum the final pipeline runs the existing validation/release scripts, full tests, mutation threshold, publication audit, installed-VSIX smoke and exact-artifact verification. Docker QA commands remain separate, opt-in maintainer jobs and are not documented as product usage.

## 6. Rollback and recovery

- Feature work is isolated in reviewable commits; migrations are additive and tested backward/forward.
- Candidate artifacts are immutable; a bad candidate is replaced by a new version, not overwritten.
- Stable rollback reinstalls the last supported VSIX and follows documented config/memory migration constraints.
- Publication workflows start from draft and require named approval at the final external step.

## 7. Open external inputs

- lawful live Protheus environment/artifacts;
- representative users;
- legal/trademark and Marketplace publisher setup;
- final publication authorization.
