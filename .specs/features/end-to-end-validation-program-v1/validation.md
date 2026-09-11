# Validation ledger — End-to-end validation program v1

## Requirement traceability

| Requirement | Tasks | Automated evidence | Manual/external evidence | Current decision |
|---|---|---|---|---|
| EV-001 | EVT-001, EVT-006 | CI matrix, clean checkout, tests, smoke, audit, mutation | None | VERIFIED for `2e0f9e6`; repeat after changes. |
| EV-002 | EVT-002, EVT-003, EVT-006 | Package, artifact verification, host/lifecycle scripts | Normal-user install confirmation | VERIFIED Windows/local and Linux/hosted; current/minimum host rerun is required per exact candidate. |
| EV-003 | EVT-001, EVT-004, EVT-005 | OSV, secret scan, check, publication audit | Public security controls | VERIFIED local scope; public controls UNPROVEN. |
| EV-004 | EVT-001, EVT-006 | Contract/security regression suite | Licensed providers when enabled | VERIFIED contract only. |
| EV-005 | EVT-101 | None may substitute for host proof | Remote Extension Host protocol | UNPROVEN. |
| EV-006 | EVT-102 | Existing fail-closed contracts | Licensed AppServer/RPO/DBAccess matrix | UNPROVEN. |
| EV-007 | EVT-103 | Localization/static checks | Keyboard, screen reader, zoom, contrast and UAT | UNPROVEN. |
| EV-008 | EVT-104 | Pilot instrumentation/protocol only | Representative study | UNPROVEN. |
| EV-009 | EVT-105 | Current CI logs show skipped lanes | Public/entitled GitHub evidence | UNPROVEN. |
| EV-010 | EVT-106 | Procedure/document lint where applicable | Owner tabletop | UNPROVEN. |
| EV-011 | EVT-201 | Manifest/package metadata checks | Publisher/domain/legal decision | UNPROVEN. |
| EV-012 | EVT-202, EVT-203 | Fail-closed release checker | Named authorization | UNPROVEN. |

## P0 execution protocol

Run in an empty temporary worktree at the candidate SHA, never in a directory
containing ignored test artifacts:

```powershell
npm ci
node --test
npm run check
npm run smoke
npm audit --audit-level=high
npm run build:release
npm run verify:release
npm run test:vscode:host
npm run test:vscode:minimum
npm run test:vscode:tds
npm run test:mutation
node scripts/publication-check.mjs
```

Record versions, duration, exit code, VSIX/SBOM/source ZIP SHA-256 and hosted
run URLs. Repeat failures only to diagnose a documented root cause; retries do
not turn a flaky test into a pass.

## GO / NO-GO

- **P0 development candidate:** PASS only if every executed P0 command is green
  in the clean exact checkout.
- **Stable 1.0:** GO only if every `EV-001..EV-012` is supported by the same
  exact release evidence and the release owner authorizes the action.
- Otherwise: **NO-GO**, with no exception for skipped, stale, simulated or
  contaminated evidence.
