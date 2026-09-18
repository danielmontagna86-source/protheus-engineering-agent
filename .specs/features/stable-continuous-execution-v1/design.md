# Stable continuous execution v1 — Design

## Execution model

The existing release checker remains the sole Stable authority. This feature
does not add a second source of truth; it sequences the existing commands and
acceptance protocols by evidence class.

```text
isolated worktree
  -> AUTO: Node / VSIX / security / package checks
  -> DETECT: local TDS and admitted test-lab availability
  -> EXTERNAL: licensed host, remote host, accessibility, pilot, publisher
  -> RELEASE-BOUND: exact source + VSIX + SBOM + receipts
  -> publication-check --release
```

## Evidence rules

1. A command result is retained only for the commit and artifact it actually
   exercised.
2. A local community AppServer can improve engineering confidence, but cannot
   satisfy the licensed-AppServer gate.
3. Human UAT, assistive checks, publisher terms and named publication approval
   are evidence classes, not commands to fabricate.
4. A detector may announce a ready prerequisite. It may not invoke an unknown
   remote service, obtain credentials, or widen permissions.

## Gate modes

| Gates | Mode | Next executable action |
| --- | --- | --- |
| G0, G3 | AUTO | exact-candidate automated battery |
| G1, G2 | AUTO + EXTERNAL | installed journeys now; timed/provider proof later |
| G4, G5 | DETECT | admitted official-lab preflight, then bounded matrix |
| G6 | DETECT + EXTERNAL | read-only health preflight; any bridge replay requires an explicitly identified disposable RPO and approved lab protocol; licensed matrix only with lawful inputs |
| G7 | AUTO + EXTERNAL | package lifecycle; remote-host acceptance when a declared host exists |
| G8 | AUTO + EXTERNAL | localization/static checks; assistive and participant UAT |
| G9 | AUTO + RELEASE-BOUND | CI/security checks; exact Stable receipt only after candidate freeze |
| G10 | AUTO + EXTERNAL | documentation/contract checks; support drill and matrix confirmation |
| G11 | EXTERNAL | preregistered representative pilot |
| G12 | RELEASE-BOUND | clean exact-candidate build, download and verification |
| G13 | EXTERNAL | publisher terms and named authorization |
