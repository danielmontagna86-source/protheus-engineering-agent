# Public GitHub Release Validation

**Date:** 2026-09-07
**Decision:** Local development gate PASS; public release NO-GO.

Latest clean run: 59/59 tests passed, 28 source files and 2 manifests checked, 79 publication files inspected with zero development errors. The dependency-free CLI/MCP smoke passed in 681 ms, the prior 58-test suite passed three consecutive executions, package audit reported zero vulnerabilities, and the focused mutation score reached 82.79%. Independent review reported no unresolved blocking or high-severity finding.

## Requirement traceability

| Requirement | Automated evidence | External/manual evidence | Status |
|---|---|---|---|
| PUB-001 | publication scanner, fail-closed integrations, realpath and junction tests | fresh release archive review | LOCAL PASS |
| PUB-002 | README/legal content and canonical-brand regression test | formal commercial trademark clearance | LOCAL PASS / legal review advised |
| PUB-003 | workflow structural test | first GitHub matrix run | LOCAL PASS / EXTERNAL PENDING |
| PUB-004 | governance required-file audit | enable private vulnerability reporting | LOCAL PASS / EXTERNAL PENDING |
| PUB-005 | Apache-2.0 manifest/license/full-text checks | owner selected Apache-2.0 | PASS |
| PUB-006 | versioned JSON evidence and recalculated artifact hash | protected branch, live CI, approver | BLOCKED |
| PUB-007 | thin adapter, Electron/Node and multi-root tests | Extension Development Host smoke | AUTOMATED PASS / MANUAL PENDING |
| PUB-008 | isolated descriptors and `.pea` junction rejection | supported Hermes installation probe | AUTOMATED PASS / MANUAL PENDING |
| PUB-009 | Portuguese/English README and limitation checks | editorial review | LOCAL PASS |
| PUB-010 | `release-evidence/v0.2.0-alpha.1.json` fail-closed schema | fill only with real release evidence | BLOCKED |

## Security/code review regressions

- VS Code Electron execution now propagates a valid MCP Node command.
- Reviews reject source symlinks escaping the workspace.
- `.pea` junctions are rejected by Context, Skills/Rules and Hermes session/probe boundaries.
- Skills/Rules are limited to 64 KiB each, 64 discovered resources and 256 KiB total response.
- Resource reads use a fixed-size handle and identity check.
- Publication rejects local state, publishable symlinks, high-confidence secret material and personal paths.
- Release evidence must match the planned version and a real artifact checksum.

## Deliberately unavailable evidence

- `actionlint` is not installed locally.
- GitHub Actions cannot be observed before a remote/draft PR exists.
- Extension Development Host and live Hermes session smokes have not been executed for this candidate.
- No compiler, AppServer, RPO, Oracle, TDN or Dictionary integration was configured or invoked.

The release audit must remain non-zero until CI, manual smokes, release-commit review, artifact checksum and approval evidence are complete.
