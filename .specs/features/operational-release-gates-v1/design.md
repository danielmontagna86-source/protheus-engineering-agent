# Operational release gates v1 — Design

## Components

1. `scripts/monitor-public-release.mjs` performs a read-only GitHub release probe with an injectable fetch boundary, byte budgets, required-asset allowlist and digest reconciliation.
2. `.github/workflows/operational-monitor.yml` schedules the probe and confirms a first failure with a second attempt before the job fails and GitHub notifies maintainers.
3. `docs/operations/support-monitoring-rollback.md` is the operational runbook for intake, severity, monitoring, rollback and escalation.
4. Existing `scripts/run-vscode-lifecycle.mjs` remains the authoritative installed rollback drill; duplication is avoided.
5. A private laboratory harness opens two independent TDS sessions, starts compilations together and records only sanitized outcomes/hashes. No private harness or token enters the repository.
6. Existing reproducible release scripts generate the exact candidate artifact set; the provenance workflow attests the merged commit.

## Failure handling

- Network, schema, size, missing-asset and digest failures are explicit non-zero probe results.
- One transient monitoring failure is recorded but does not fail the scheduled job; a confirming failure does.
- RPO contention has a bounded timeout and mandatory health/hash/post-compile recovery checks.
- Rollback runs only in an isolated VS Code user-data/extensions directory.
- Stable release evidence is not marked passed by these receipts alone.

## Security and permissions

- Scheduled monitoring has `contents: read` only and no repository write token.
- Downloads are bounded and written only to a disposable directory.
- Public reports contain no credentials, source contents, RPO bytes or server token.
- The operational workflow and provenance runner are pinned to Ubuntu 24.04 to avoid runner drift.
