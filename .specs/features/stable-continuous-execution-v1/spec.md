# Stable continuous execution v1 — Specification

**Status:** In execution
**Scope:** Automate every safe Stable 1.0 validation action and preserve a
fail-closed path for environment, participant, publisher and release-owner
evidence.
**Depends on:** `.specs/features/stable-1-0-launch/` and
`.specs/features/end-to-end-validation-program-v1/`.

## Requirements

- **REQ-SCE-001:** Every G0..G13 gate SHALL have one current execution mode:
  `AUTO`, `DETECT`, `EXTERNAL`, or `RELEASE-BOUND`.
- **REQ-SCE-002:** `AUTO` actions SHALL run from an isolated worktree using
  locked dependencies and SHALL record their real exit status.
- **REQ-SCE-003:** `DETECT` actions SHALL inspect an available local test
  environment before acting and SHALL report unavailable prerequisites without
  changing any Stable gate to passed.
- **REQ-SCE-004:** `EXTERNAL` actions SHALL have a ready protocol, evidence
  schema and acceptance rule, but SHALL never be simulated or self-attested as
  a replacement for the required environment, participant or publisher.
- **REQ-SCE-005:** `RELEASE-BOUND` actions SHALL run only after a selected,
  clean, exact candidate commit and SHALL bind source, VSIX, SBOM, manifest and
  evidence to that one commit.
- **REQ-SCE-006:** A failed, unavailable or incomplete action SHALL keep its
  gate `PARTIAL`/`UNPROVEN` and create no release artifact or Marketplace
  publication.

## Non-goals

- Do not create a Marketplace publisher, accept terms, publish a VSIX, tag a
  Stable release or change repository visibility.
- Do not distribute or infer a licensed Protheus/AppServer/RPO entitlement.
- Do not treat the community Docker lab, local fixtures, CI or a Preview asset
  as evidence for a Stable candidate.
