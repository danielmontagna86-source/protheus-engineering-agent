---
goal: Evidence-led Docker validation and public distribution readiness
version: 1
date_created: 2026-09-10
last_updated: 2026-09-10
owner: Montagna
status: In progress
tags: [process, docker, github, marketplace, release]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-in%20progress-yellow)

This plan executes every release-preparation action possible from the repository and connected GitHub account, while keeping proprietary runtime, Marketplace identity and public-disclosure decisions explicit and fail-closed.

## 1. Requirements & Constraints

- **REQ-001**: The VSIX and runtime remain useful with no Docker, Hermes, model or customer credential.
- **REQ-002**: Community containers run only as isolated QA experiments and cannot satisfy the licensed AppServer release gate.
- **REQ-003**: Marketplace material must agree with the manifest, use an immutable publisher and never include a publishing secret in Git.
- **SEC-001**: Keep GitHub Actions read-only; enable Dependabot alerts; retain a versioned private-report route while GitHub private reporting is unavailable.
- **CON-001**: Public visibility, Marketplace publisher identity, final tag/release and Microsoft Entra setup cannot be performed without their external identities and disclosure authority.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Establish reproducible internal Docker evidence.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-001 | Verify the Docker Desktop engine and isolate a disposable official EngPro PostgreSQL run. | ✅ | 2026-09-10 |
| TASK-002 | Pull the owner-authorized `feliperaposo` images by digest and inspect the upstream compose topology. | ✅ | 2026-09-10 |
| TASK-003 | Execute staged PostgreSQL → License Server → DBAccess → AppServer startup and record positive and negative evidence. | ✅ | 2026-09-10 |
| TASK-004 | Remove every experiment container, anonymous volume and temporary network by exact name. | ✅ | 2026-09-10 |

### Implementation Phase 2

- GOAL-002: Complete repository-controlled public-distribution preparation.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-005 | Set truthful GitHub description/topics and enable Dependabot alerts. | ✅ | 2026-09-10 |
| TASK-006 | Add a size-checked 1280 × 640 social-preview source, exact license detection and launch-operation documentation. | ✅ | 2026-09-10 |
| TASK-007 | Re-run tests, structural checks, clean-checkout publication audit and exact candidate CI; code candidate 7123805 passed. Later release revisions must repeat their required checks. | ✅ | 2026-09-10 |
| TASK-008 | Make repository public, set protection, assign social preview and inspect public CodeQL/dependency-review runs. |  |  |

### Implementation Phase 3

- GOAL-003: Perform externally authenticated release only when its evidence exists.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-009 | Create/verify Marketplace publisher and Entra workload identity outside Git; grant least-privilege contributor access. |  |  |
| TASK-010 | Produce exact source ZIP, VSIX, SBOM, checksums, provenance and downloaded-asset verification receipts. |  |  |
| TASK-011 | Complete licensed AppServer/RPO, accessibility, clean-profile and representative-pilot gates. |  |  |
| TASK-012 | Dispatch final release only when G0–G13 are green for one commit and artifact set. |  |  |

## 3. Alternatives

- **ALT-001**: Use Docker community images as a public support path — rejected because the executed AppServer startup failed and it is not licensed-homologation evidence.
- **ALT-002**: Store a Marketplace PAT in GitHub — rejected; it creates a long-lived secret and is superseded by Entra workload identity.

## 4. Dependencies

- **DEP-001**: Docker Desktop and owner-authorized images for maintainer-only QA.
- **DEP-002**: GitHub public visibility for public CodeQL/dependency-review evidence and Free-plan branch rules.
- **DEP-003**: Microsoft Marketplace publisher and Entra/Azure identity for publication.
- **DEP-004**: Lawful AppServer/RPO/License Server/DBAccess artifacts and a representative developer pilot for stable claims.

## 5. Files

- **FILE-001**: `docs/research/docker-marketplace-and-publication-validation-2026-09-10.md` records reproducible findings.
- **FILE-002**: `docs/public-launch-operations.md` is the public launch checklist.
- **FILE-003**: `.specs/features/stable-1-0-launch/validation.md` remains the stable release ledger.

## 6. Testing

- **TEST-001**: `node --test`, `node scripts/check.mjs`, package/host smoke and clean-checkout publication audit.
- **TEST-002**: Installed VSIX on supported VS Code/TDS matrix and a no-Docker profile.
- **TEST-003**: Public CodeQL/dependency-review/secret/OSV checks after visibility; Marketplace downloaded-package install after publication.

## 7. Risks & Assumptions

- **RISK-001**: A passing container process is not Protheus functional proof; the current AppServer experiment explicitly failed its REST startup.
- **RISK-002**: Visibility is irreversible disclosure of source/history to forks; it must follow the exact release gate.
- **RISK-003**: Marketplace publisher verification takes time and domain ownership; it cannot be synthesized by code.
- **ASSUMPTION-001**: Docker images supplied by the owner are authorized for this isolated test only and are not redistributed by this repository.

## 8. Related Specifications / Further Reading

- `.specs/features/stable-1-0-launch/validation.md`
- `docs/public-launch-operations.md`
- [VS Code Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [GitHub security settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-security-and-analysis-settings-for-your-repository)
