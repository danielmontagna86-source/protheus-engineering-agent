# Tasks — End-to-end validation program v1

Status labels: `DONE` means evidence exists for the named scope only; `READY`
means executable without a new product change; `EXTERNAL` requires a legitimate
environment, participant or owner action.

## P0 — deterministic, package and governance baseline

| ID | Status | Work and bounded files | Depends on | Done condition / validation |
|---|---|---|---|---|
| EVT-001 | DONE | Preserve CI matrix and clean-checkout verification; `.github/workflows/ci.yml`, `scripts/check.mjs`. | Locked dependencies | Hosted Windows/Linux Node 22/24 checks, OSV, secrets and mutation succeed at `2e0f9e6`. |
| EVT-002 | DONE | Package and verify VSIX/source ZIP/SBOM; `scripts/build-release.mjs`, `scripts/verify-release.mjs`. | EVT-001 | Exact artifact verification passes from a clean candidate checkout. |
| EVT-003 | DONE | Exercise installed VSIX lifecycle; `scripts/run-vscode-lifecycle.mjs`, CI workflow. | EVT-002 | Windows local and hosted Linux preview-to-current/rollback evidence exists. |
| EVT-004 | DONE | Audit development publication hygiene; `scripts/publication-check.mjs`. | EVT-001 | Clean checkout passes; ignored local state is correctly rejected in a contaminated worktree. |
| EVT-005 | DONE | Consolidate evidence/research/spec traceability; this feature and `docs/research/end-to-end-validation-research-2026-09-11.md`. | EVT-001..004 | Every EV requirement maps to a task and validation row. |
| EVT-006 | READY | Repeat exact-candidate P0 battery after this documentation commit. | EVT-005 | Fresh clean checkout passes `npm ci`, `node --test`, `npm run check`, `npm run smoke`, `npm audit --audit-level=high`, build/verify, host tests and mutation. |

## P1 — environments and people

| ID | Status | Work and bounded files | Depends on | Done condition / validation |
|---|---|---|---|---|
| EVT-101 | EXTERNAL | Remote extension-host protocol; `docs/qa/remote-extension-host-acceptance.md`. | Packaged VSIX, Remote/WSL/Dev Container host | Remote host records running extension location and critical journey for each declared mode. |
| EVT-102 | EXTERNAL | Licensed AppServer matrix; `docs/qa/appserver-homologation-acceptance.md`. The limited community-lab evidence is retained separately in `docs/qa/community-appserver-lab-validation-2026-09-12.md`. | User-owned legal artifacts | Adapter proves success/failure/include/lock/cancel/redaction with exact licensed lab identity. |
| EVT-103 | EXTERNAL | Accessibility/UAT and locale evidence; `docs/qa/accessibility-review-2026-09-07.md`. | Reviewer and assistive tech | Keyboard, reader, zoom/contrast and pt-BR/en evidence has no unresolved P0/P1 issue. |
| EVT-104 | EXTERNAL | Preregistered developer pilot; `docs/research/premium-product-leadership-review.md`. | Consenting representative participants | Publish measured task outcomes and limitations, not a pre-decided uplift claim. |
| EVT-105 | EXTERNAL | Public security/policy evidence. | Visibility change or paid entitlement | CodeQL/dependency policy/branch controls/attestation pass on candidate commit. |
| EVT-106 | EXTERNAL | Support and rollback tabletop. | Release owner | Reproduce support route, withdrawal procedure and incident template on a candidate artifact. |

## P2 — distribution action boundary

| ID | Status | Work and bounded files | Depends on | Done condition / validation |
|---|---|---|---|---|
| EVT-201 | EXTERNAL | Marketplace publisher/domain/listing review; `docs/public-launch-operations.md`. | Domain/legal/publisher account | Numeric version, listing assets, support and publisher review are approved. |
| EVT-202 | EXTERNAL | Exact release evidence generation and independent verification. | EVT-101..106, EVT-201 | `publication:release-check` passes with evidence that binds commit and all artifact SHA-256 values. |
| EVT-203 | EXTERNAL | Visibility/merge/tag/release/Marketplace/announcement. | EVT-202 and named authorization | Actions occur in order and public download/install verification is attached. |
