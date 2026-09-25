# Operational release gates v1 — Validation

| Requirement | Gate | Expected evidence |
| --- | --- | --- |
| OR-001 | publication tests + runbook review | intake, severity, targets, owner, redaction and escalation present |
| OR-002 | monitor unit/integration tests + live public probe + scheduled workflow | required assets downloaded and SHA-256 reconciled; confirmation semantics enforced |
| OR-003 | installed lifecycle on minimum/current supported host | previous version restored in isolated profile |
| OR-004 | private TDS two-session harness | bounded outcomes, healthy services, preserved baseline RPO and post-test compile |
| OR-005 | `build:release`, `verify:release`, clean rebuild and provenance workflow | exact source/VSIX/SBOM/manifest/SHA256SUMS and attestations |
| OR-006 | `publication:release-check` | non-zero with named missing external gates |

## Mandatory full gates

- `npm run validate`
- `npm run smoke`
- `npm run benchmark` and `npm run benchmark:large`
- `npm audit --audit-level=moderate`
- `npm run test:mutation`
- VS Code minimum/current installed-host and lifecycle drills
- secret/path/diff pre-merge audit
- protected GitHub CI, CodeQL, OSV, secret and dependency checks

## Decision

This feature is technically `GO` only when every OR requirement has a reproducible receipt. Stable/Marketplace remains `NO-GO` until every unrelated G0–G13 blocker for the exact future Stable artifact is also green.
