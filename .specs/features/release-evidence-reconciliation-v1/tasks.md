# Release evidence reconciliation v1 — Tasks

| ID | Task | Files | Gate | Status |
| --- | --- | --- | --- | --- |
| RER-01 | Reconcile immutable release facts from GitHub API. | `RELEASE-v0.3.9.md` | API values checked | COMPLETE |
| RER-02 | Point the public Preview path at the current release. | `README.md` | Markdown link review | COMPLETE |
| RER-03 | Update release operations and Stable ledger. | `docs/public-launch-operations.md`, `.specs/project/STATE.md`, `.specs/features/stable-1-0-launch/validation.md` | `publication:check` | COMPLETE |
| RER-04 | Re-run repository validation and review the documentation diff. | repository | `npm run validate` and diff audit | COMPLETE |
