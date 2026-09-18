# Stable continuous execution v1 — Tasks

`DONE` is evidence for the named commit only. `READY` has a safe command or
protocol. `EXTERNAL` is intentionally non-fabricable.

| ID | Gates | Mode | Status | Depends on | Done condition |
| --- | --- | --- | --- | --- | --- |
| SCE-001 | G0/G3 | AUTO | READY | locked checkout | full deterministic candidate battery passes or fails with captured exit status |
| SCE-002 | G1/G2/G7/G8/G10 | AUTO | READY | SCE-001 | installed VSIX, localization, product contract and lifecycle checks are replayed on the exact candidate |
| SCE-003 | G9 | AUTO | READY | SCE-001 | dependency, secret, CodeQL/OSV evidence is reconciled to the exact commit |
| SCE-004 | G4/G5 | DETECT | READY | admitted official lab | preflight records image/digest/loopback/read-only prerequisites, or records unavailable without a false pass |
| SCE-005 | G6 | DETECT + EXTERNAL | READY | current local TDS session plus an approved disposable-RPO protocol | read-only health is detected automatically; a PEA-to-TDS compilation replay runs only against an explicitly identified disposable RPO under the laboratory protocol; label remains non-Stable unless lawful identity is supplied |
| SCE-006 | G7 | EXTERNAL | READY | declared WSL/SSH/Dev Container host | packaged VSIX remote Extension Host protocol is executed and receipt records the host location |
| SCE-007 | G8 | EXTERNAL | READY | reviewer + assistive technology | keyboard, reader, high-contrast, zoom and three clean-profile sessions are completed with raw results |
| SCE-008 | G10 | EXTERNAL | READY | release owner + candidate | support intake, withdrawal and rollback tabletop passes against the candidate artifact |
| SCE-009 | G11 | EXTERNAL | READY | consenting representative participants | preregistered pilot reports raw outcomes and limitations |
| SCE-010 | G4/G5/G6 | EXTERNAL | READY | lawful licensed inputs | authorized AppServer/RPO/DBAccess/dictionary matrix passes success, failure, include, lock, timeout/cancel and redaction |
| SCE-011 | G12 | RELEASE-BOUND | BLOCKED | SCE-001..010 | selected Stable commit has exact source, VSIX, SBOM, manifest, attestations, external receipts and downloaded-artifact verification |
| SCE-012 | G13 | EXTERNAL | BLOCKED | SCE-011 | publisher, terms and named authorization are recorded before immutable release/Marketplace action |

## Autonomous execution order

1. Independently review and integrate SCE-001 before selecting its clean commit
   as a candidate for SCE-002/SCE-003.
2. Run only the read-only preflight portion of SCE-004/SCE-005; do not pull,
   start or modify an unadmitted environment. Compilation needs the additional
   disposable-RPO protocol recorded by SCE-005.
3. Produce actionable readiness records for SCE-006..SCE-012 and keep them
   `READY`/`BLOCKED` until their real prerequisite appears.
4. Re-run SCE-001..SCE-005 after every candidate change. Re-run SCE-011 only
   after a clean versioned Stable candidate is selected.
