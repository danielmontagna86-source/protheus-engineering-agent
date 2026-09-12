# Specification — End-to-end validation program v1

## Problem

The repository has strong automated evidence, but a premium public release also
needs proof at the product boundary: installed extension behavior, remote hosts,
authorized Protheus integration, accessibility, governance, reproducibility and
publisher readiness. Treating these as a single generic test run would create
false confidence.

## Outcome

Maintain a versioned validation program that maps every Stable 1.0 release
requirement to an executable check or a named external acceptance gate, records
exact evidence, and makes a deterministic GO/NO-GO decision.

## Requirements

| ID | Priority | Requirement | Acceptance criterion |
|---|---:|---|---|
| EV-001 | P0 | Preserve executable baseline evidence. | WHEN a candidate is built from a clean checkout, THEN tests, structural check, smoke, artifacts and dependency audit pass on the exact commit. |
| EV-002 | P0 | Validate distributed VSIX lifecycle. | WHEN the VSIX is installed on supported Windows/Linux current and minimum VS Code, THEN fresh install, upgrade, uninstall/reinstall and rollback pass. |
| EV-003 | P0 | Validate security and publication hygiene. | WHEN the source is checked from a clean archive, THEN the development publication audit passes and no secret, policy, lockfile, license, artifact or portable-path violation remains. |
| EV-004 | P0 | Keep external systems fail-closed. | WHEN a TDN, dictionary, Oracle, subagent or build provider is absent or denied, THEN the product returns a bounded, redacted diagnostic without mutation. |
| EV-005 | P1 | Validate remote execution honestly. | WHEN a declared Remote/WSL/Dev Container environment is available, THEN the packaged VSIX is installed in its remote extension host and its running location plus critical commands are recorded. |
| EV-006 | P1 | Validate Protheus integration lawfully. | WHEN a licensed AppServer/RPO/dictionary/DBAccess lab is supplied, THEN success, failure, include, lock, timeout/cancel and evidence-redaction cases pass through the product adapter. |
| EV-007 | P1 | Validate accessibility and localization. | WHEN keyboard, screen reader, contrast/zoom and pt-BR/en journeys are exercised by a reviewer, THEN all P0 tasks complete without blocker and findings are retained. |
| EV-008 | P1 | Validate real developer value. | WHEN a preregistered representative pilot completes, THEN first-value time, task success, false-positive burden and qualitative feedback are measured without an outcome claim being assumed. |
| EV-009 | P1 | Enforce public supply-chain controls. | WHEN the repository is made public or receives the necessary paid security entitlement, THEN CodeQL, dependency policy, branch protection, SBOM/hash, provenance/attestation and negative verification evidence pass for the release commit. |
| EV-010 | P1 | Establish support and rollback readiness. | WHEN a release candidate is staged, THEN an owner can reproduce install, withdrawal/rollback, support intake and incident communication from documented procedures. |
| EV-011 | P2 | Meet Marketplace publisher and listing requirements. | WHEN a publisher/domain/legal approval exists, THEN listing metadata, screenshots, icon, pricing/Q&A, support route and numeric release/pre-release version plan are approved before upload. |
| EV-012 | P2 | Control the release action boundary. | WHEN every required gate names the same commit and artifact hashes, THEN only a named owner may authorize visibility, merge, tag, GitHub Release, Marketplace publication and announcement. |

## Non-functional requirements

- Evidence contains the commit SHA, command or manual protocol, environment/version, timestamp, result and redacted artifact location.
- Docker, Hermes, paid models and external providers remain optional to the distributed product.
- A simulated, fixture or contract result must never be presented as AppServer, database, accessibility, pilot or Marketplace proof.
- Every `UNPROVEN` row has a smallest next action and accountable role.

## Non-goals

- Replacing TDS compile/debug/RPO operations, VS Code UI, Git UI, terminal or explorer.
- Publishing, changing visibility, tagging, merging, uploading a VSIX or accepting marketplace terms without a separate action-boundary authorization.
- Using unlicensed community images as Protheus validation evidence.
