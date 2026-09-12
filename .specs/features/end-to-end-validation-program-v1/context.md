# Context — End-to-end validation program v1

## Purpose

Turn the existing Stable 1.0 promotion ledger into one executable, evidence-first
validation program. It supplements — and does not replace —
`stable-1-0-launch`: that specification remains the canonical promotion contract.

## Confirmed product decisions

| Decision | Status | Consequence |
|---|---|---|
| VS Code is the cockpit; the runtime/CLI/MCP are reusable. | Confirmed | Do not build a parallel Electron IDE or make Docker a user dependency. |
| `extensionKind: ["workspace"]` is intentional. | Observed | Remote validation must prove the packaged VSIX in a remote extension host, not only Node code inside a container. |
| Hermes is an optional adapter. | Confirmed | No Hermes install, account, or model is a release prerequisite. |
| Docker is internal QA infrastructure. | Confirmed | It may validate admitted analyzer/Postgres contracts, but cannot prove a licensed AppServer or become a shipped prerequisite. |
| EngPro is an upstream standards provider in reference mode. | Observed | Keep the exact MIT provider revision; do not silently vendor or treat skills as proof of correctness. |
| Stable promotion is fail-closed. | Confirmed | A missing live, human, legal, publisher, or authorization gate is `NO-GO`, never a partial pass. |

## Current evidence baseline (2026-09-11)

- **VERIFIED:** commit `2e0f9e635a68967038584422ef94029548682dcd` has a successful hosted GitHub Actions run, including Windows/Linux Node 22/24, mutation, OSV, secrets, installed Extension Host and Linux preview-to-current VSIX lifecycle.
- **VERIFIED:** the same commit passed clean-checkout structural and development-publication checks in an isolated worktree.
- **OBSERVED:** the current remote is private; its default branch API reports no recognized license because the license-bearing change is not yet the default branch.
- **OBSERVED:** private-repository CodeQL, dependency policy and public attestations are not available under the current repository/plan configuration; the CI marks the former checks skipped.
- **UNPROVEN:** remote Extension Host behavior, assistive-technology and representative-user acceptance, licensed AppServer/RPO compilation, live database compatibility, publisher verification, legal/trademark review, and release-owner approval.

## Source hierarchy

1. Exact source, lockfile, artifacts, tests and hosted checks at the candidate commit.
2. Canonical Stable 1.0 spec and existing QA/evidence documents.
3. Official VS Code, GitHub, TOTVS/EngPro and Marketplace documentation, captured in `docs/research/end-to-end-validation-research-2026-09-11.md`.
4. Controlled inference, explicitly labeled and never promoted to live proof.

## External decisions deliberately not assumed

- Legal right and configuration for a licensed AppServer/RPO/dictionary/DBAccess environment.
- Test users, accessible technology and representative pilot participants.
- Publisher identity, owned domain, legal/trademark approval and repository visibility.
- Named authorization at the moment of merge, tag, GitHub Release, Marketplace publication and public announcement.
