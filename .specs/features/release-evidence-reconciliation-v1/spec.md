# Release evidence reconciliation v1 — Specification

**Status:** Implemented documentation reconciliation

## Requirements

| ID | Requirement |
| --- | --- |
| RER-001 | Public installation links SHALL resolve to the current GitHub Preview, not a superseded preview record. |
| RER-002 | The release record SHALL bind `v0.3.9` to its exact commit and GitHub-reported SHA-256 digests. |
| RER-003 | The Stable ledger SHALL distinguish verified Preview controls from proof required for a future Stable candidate. |
| RER-004 | The public-launch checklist SHALL describe the observed public baseline without claiming Marketplace publication. |
| RER-005 | Missing publisher, human UAT, pilot and named authorization evidence SHALL remain `NO-GO`. |

## Acceptance criteria

- WHEN a user selects the Preview installation link, THEN it opens the `v0.3.9`
  GitHub Release.
- WHEN a maintainer reads the release record, THEN asset names, commit and hashes
  match the GitHub Release API.
- WHEN a reader evaluates Stable readiness, THEN no preview record is presented
  as final release evidence.
