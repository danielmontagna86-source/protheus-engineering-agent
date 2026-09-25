# Operational release gates v1 — Specification

## Outcome

Close the technical support, monitoring, rollback, RPO-contention and exact-artifact gaps without fabricating human or Marketplace proof.

## Requirements

### OR-001 — Support ownership and incident contract

WHEN a supported release incident is reported or detected,
THEN the repository MUST identify the public intake, severity, response target, owner, escalation, evidence-redaction and recovery procedure.

### OR-002 — Continuous public-release integrity

WHEN the scheduled operational probe runs,
THEN it MUST validate the latest declared Preview release, required assets and every downloadable SHA-256 within bounded time and size, without modifying GitHub or user data.

WHEN the first probe attempt fails,
THEN the workflow MUST confirm the failure before producing an alerting failure.

### OR-003 — Rollback rehearsal

WHEN a candidate is prepared,
THEN an isolated VS Code profile MUST prove install, upgrade, uninstall, reinstall and rollback to a previously published verified VSIX.

### OR-004 — RPO contention

WHEN two authenticated TDS sessions request compilation concurrently against the disposable laboratory,
THEN the outcome MUST be bounded, recorded and followed by a successful clean compile, healthy services and unchanged baseline-RPO hash.

### OR-005 — Exact candidate artifacts

WHEN the reviewed tree is committed,
THEN source ZIP, VSIX, CycloneDX SBOM, manifest and checksum set MUST be reproduced and verified from that exact commit; public attestation MUST be run after merge.

### OR-006 — Fail-closed promotion

WHEN technical operational gates pass but human/publisher evidence is absent,
THEN Stable and Marketplace MUST remain `NO-GO`.

## Non-goals

- Promise 24x7 staffed support or a contractual SLA.
- Publish, tag or upload a Stable/Marketplace release.
- Read, store or expose TDS credentials or RPO contents.
- Redistribute Docker, Protheus, RPO or database assets.
