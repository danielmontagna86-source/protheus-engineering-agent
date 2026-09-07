# Public GitHub Release Validation

**Date:** 2026-09-07
**Decision:** Local development gate PASS; public release NO-GO.

Latest local run: 84/84 tests passed, 39 source files and 3 manifests checked, and 105 publication files were inspected with zero development errors. The CLI/MCP smoke passed in under one second, npm audit reported zero vulnerabilities, and the focused mutation score reached 82.79%. The packaged VSIX was installed into isolated profiles and all four commands passed on VS Code 1.95.3 and 1.133.0. Candidate CI/OSV and clean-commit reconciliation remain pending.

## Requirement traceability

| Requirement | Automated evidence | External/manual evidence | Status |
|---|---|---|---|
| PUB-001 | publication scanner, fail-closed integrations, realpath and junction tests | fresh release archive review | LOCAL PASS |
| PUB-002 | README/legal content and canonical-brand regression test | formal commercial trademark clearance | LOCAL PASS / legal review advised |
| PUB-003 | workflow structural test | final `main` run 34150665239 passed on Windows/Linux and Node.js 22/24 | PASS |
| PUB-004 | governance required-file audit | enable private vulnerability reporting | LOCAL PASS / EXTERNAL PENDING |
| PUB-005 | Apache-2.0 manifest/license/full-text checks | owner selected Apache-2.0 | PASS |
| PUB-006 | versioned draft plus external final JSON evidence bound to release manifest | candidate CI, clean artifacts and approver pending | PARTIAL / BLOCKED |
| PUB-007 | thin adapter, Electron/Node, multi-root, packaged install tests | minimum/current VS Code fresh install passed locally | LOCAL PASS / CI PENDING |
| PUB-008 | isolated descriptors and `.pea` junction rejection | installed Hermes returned `Hermes ACP check OK` from an isolated profile | PASS |
| PUB-009 | Portuguese/English README and limitation checks | editorial review | LOCAL PASS |
| PUB-010 | fail-closed evidence schema with fresh-install and manifest binding | candidate CI, artifact upload and approval pending | PARTIAL / BLOCKED |

## Security/code review regressions

- VS Code Electron execution now propagates a valid MCP Node command.
- Reviews reject source symlinks escaping the workspace.
- `.pea` junctions are rejected by Context, Skills/Rules and Hermes session/probe boundaries.
- Skills/Rules are limited to 64 KiB each, 64 discovered resources and 256 KiB total response.
- Resource reads use a fixed-size handle and identity check.
- Publication rejects local state, publishable symlinks, high-confidence secret material and personal paths.
- Release evidence must match the planned version, fresh-install proof, three artifact checksums, and the exact release manifest/commit.

## Deliberately unavailable evidence

- `actionlint` is not installed locally.
- Candidate GitHub CI/OSV and downloaded-asset reproduction have not yet executed.
- No compiler, AppServer, RPO, Oracle, TDN or Dictionary integration was configured or invoked.

The release audit must remain non-zero until manual smokes, release-candidate reconciliation, artifact checksum and approval evidence are complete.
