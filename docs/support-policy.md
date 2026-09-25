# Support and security lifecycle

Operational ownership, severity definitions, response targets, artifact monitoring, containment, and the exercised rollback command are defined in [`operations/support-monitoring-rollback.md`](operations/support-monitoring-rollback.md).

The repository uses four severities: S0 for active security or destructive exposure, S1 for release blockers, S2 for material degradation with a workaround, and S3 for minor defects or enhancements. Best-effort initial response targets are respectively 1 business day (private security channel), 2 business days, 5 business days, and backlog review; they are not a commercial SLA.

- Bugs and feature requests use the repository issue forms; include product/VS Code/Node/TDS versions, operating system, redacted logs, and a minimal legal fixture.
- Security reports follow `SECURITY.md` and must not disclose customer code, credentials, RPOs, dictionaries, or proprietary packages.
- Blocker/high regressions in supported deterministic paths block release. Connected adapters block only their own claim unless the failure affects the offline core or security boundary.
- Deprecations are announced in the changelog for at least one minor release and 90 days when security permits.
- The maintainers publish only evidence-backed support combinations. Unlisted AppServer/TDS/database combinations are unsupported, not assumed compatible.
- A release owner can roll back by marking the GitHub release, restoring the last verified VSIX/hash, and opening a public incident issue without exposing sensitive evidence. Marketplace withdrawal is performed only when a publisher account and that distribution channel exist.
