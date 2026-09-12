# Product completeness v1 — Validation

## Traceability matrix

| Requirement family | Tasks | Evidence gate |
|---|---|---|
| REQ-UX, REQ-ONB | PC-010..PC-012, PC-019 | installed VSIX + timed walkthrough + accessibility |
| REQ-REV | PC-013..PC-015 | changed-files parity + JSON/SARIF golden and CI |
| REQ-AGT | PC-016..PC-017 | MCP conformance + LM tool/skill tests + denied mutation |
| REQ-CI | PC-015, PC-018 | Docker-free GitHub Action + supervised build evidence; internal analyzer cross-check |
| REQ-MCP, REQ-TDS | PC-016, PC-018, PC-022 | protocol/host/TDS matrix |
| REQ-CG | PC-020..PC-022, PC-026 | conformance, precision/recall, incremental and performance |
| REQ-MEM, REQ-KNW | PC-023..PC-025 | provenance, concurrency, expiry, dialect negative tests |
| REQ-PERF, REQ-PRV | PC-026 plus release suite | size budgets + zero-network/default privacy tests |
| REQ-VAL, REQ-OUT, REQ-GOV, REQ-LIFE, REQ-PUB | PC-030..PC-034 | live matrix + UAT + pilot + exact release evidence |

The actionable P0 scope, risk/effort prioritization, 25% defect buffer, role allocation, entry/exit criteria, sub-five-minute smoke, staged distribution and rollback are defined in `docs/plans/2026-09-08-product-completeness-0.4-test-plan.md`.

## P0 automated battery

The existing release battery remains mandatory and gains these suites:

1. Configuration schema/migration/secret-redaction.
2. Native Tree View and command contracts.
3. Installed-VSIX five-minute sample walkthrough.
4. SCM diff scope and multi-root repository selection.
5. JSON/SARIF schema, stable fingerprint and GitHub upload fixture.
6. GitHub Action minimal-permission execution.
7. Official MCP SDK initialize/list/call/error/cancel/progress/shutdown.
8. VS Code LM tool registration and policy-denied mutation.
9. Internal official-analyzer cross-check clean/failure/timeout/cancel/unavailable; no Docker requirement in the installed product.
10. pt-BR/en contribution and walkthrough key completeness.

Existing non-regression gates:

- unit/integration/runtime/CLI/MCP/extension suites;
- installed VSIX on minimum and current VS Code;
- Windows/Linux and Node 22/24 CI;
- mutation score at or above the configured 95% threshold;
- dependency audit, OSV, SBOM and publication audit;
- `git diff --check`, clean source artifact and exact artifact hashes.

## P1 automated battery

- Parser corpus coverage by declared construct.
- Precision/recall fixture report with versioned expected evidence.
- Incremental-vs-cold graph equivalence.
- CP1252/LF byte-preservation tests.
- Large-workspace time/memory/cancellation budgets.
- Journal concurrent append, crash recovery, promotion and expiry.
- Snapshot poisoning/provenance/license/checksum tests.
- Database negative security matrix for each dialect.

## Manual/external gates

| Gate | Environment | Blocking release | Current status |
|---|---|---:|---|
| First-value timed UAT | clean Windows VS Code profile | 0.4 | Scripted installed journey passed; timed human UAT not run |
| Keyboard/screen reader/high contrast | minimum/current VS Code | Marketplace | NOT RUN |
| Official TDS coexistence | supported TDS line | each release | PASS locally with packaged candidate and TDS 2.1.2; exact final artifact rerun required |
| AppServer/RPO compile | customer homologation | 1.0/build claim | EXTERNAL / NOT AVAILABLE |
| Live DB named queries | disposable homologation DB | dialect support claim | Official isolated Postgres image checked; product live-dialect evidence remains external |
| Representative human pilot | consenting Protheus teams | productivity claim | UNPROVEN |
| Public CodeQL and exact public CI | public GitHub commit | public release | BLOCKED until authorized visibility change |
| Trademark/legal | qualified human review | commercial promotion | NOT COMPLETE |

## Acceptance by release

### 0.4 internal product milestone

- All PC-010..PC-019 automated gates green.
- Installed sample walkthrough and TDS coexistence complete.
- No claim beyond offline specialist analysis, governed tools and CI parity.

### 0.5 internal connected milestone

- All PC-020..PC-026 gates green.
- Parser support table and performance results published with limitations.
- Each connected adapter clearly labels fixture-only vs live-validated status.

### 1.0

- PC-030..PC-034 green.
- No unresolved blocker/high security or review finding.
- Public artifact reproduced after download from the exact release.
- Named maintainer authorization recorded.

## Claim policy

- Technical fixture success may be described as VERIFIED only for its declared fixture/scope.
- Repository and Marketplace counts are adoption proxies, not quality or effectiveness proof.
- External AI productivity results do not transfer automatically to ADVPL/TLPP users.
- “Complete”, “production-ready”, “leader” and quantified improvement claims require their explicit gates; otherwise use “preview”, “candidate”, “hypothesis” or the measured narrower statement.
