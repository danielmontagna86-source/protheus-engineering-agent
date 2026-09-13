# Maintainer release handoff

This document separates completed engineering from actions that require the product owner's identity, legal decision or Protheus infrastructure.

## What the repository automates

- source, integration, negative, security-contract and regression tests;
- deterministic benchmark and claim decision;
- CLI/MCP and installed-VSIX smoke;
- minimum/current VS Code plus installed official TDS coexistence UAT;
- dependency audit, mutation testing and publication-tree audit;
- commit-stamped and independently rebuilt VSIX, exact-commit source ZIP, full-production-graph CycloneDX SBOM, SHA-256 manifest and verification;
- pinned CI, dependency-review, OSV, full-history secret-scan, CodeQL and artifact-attestation workflows; the workflow checks hashes and verifies attestations for the three payloads, manifest and checksum set, while exact public executions remain external.

## Owner actions that cannot be manufactured by the build

1. **Name and trademark:** the responsible owner confirmed the legal review for the descriptive `Protheus Engineering Agent` name as approved on 2026-09-12; the scoped record is in `docs/governance/legal-trademark-clearance-2026-09-12.md`. Retain the independent-project disclaimer and obtain a new review before a material change of name, territory, commercial model or campaign.
2. **Real Protheus acceptance:** a disposable `Protheus Lab Local` AppServer/RPO produced positive and controlled-negative TDS evidence on 2026-09-13; see `docs/qa/live-appserver-tds-homologation-2026-09-13.md`. Next, run the same matrix through the PEA build supervisor and retain its sanitized, correlated artifact hash. Production/RPO deploy is outside the preview.
3. **Accessibility/screenshots:** perform the keyboard/screen-reader/high-contrast checklist in `docs/qa/accessibility-review-2026-09-07.md` and capture screenshots from the real installed VSIX.
4. **GitHub publication:** after the exact candidate CI and OSV runs are green, explicitly approve changing the repository from private to public. Confirm the first CodeQL `security-extended` run, enable private vulnerability reporting, and recreate/verify branch rules immediately because GitHub may disable push rulesets during a private-to-public visibility change; remember that code and Actions history become public.
5. **Marketplace identity:** create or confirm the immutable Visual Studio Marketplace publisher ID through the owner's Microsoft/Azure DevOps identity, accept Marketplace terms and use a narrowly scoped Marketplace `Manage` credential or supported federated identity. Never commit the token. Upload the already verified VSIX as a pre-release.
6. **Named GO:** put the approver identity and timestamp in the ignored final evidence file generated with the release artifacts. Then rerun the release audit against that file before tag/release/upload.

## Optional adoption gates

Live Oracle access needs a customer-owned driver, secret handling and an approved catalog of named read-only queries. Productivity marketing needs the consenting human pilot in `docs/effectiveness-methodology.md`. Neither is required to install and use the offline VSIX, and neither may be advertised as validated before its own evidence exists.

## Safe publication order

Merge the reviewed candidate, build artifacts from the exact clean merge commit, change visibility, restore protection, obtain green CI/dependency/secret/CodeQL runs and a verified provenance attestation, complete the typed gate receipts, create the immutable version tag and GitHub Release, download every asset and verify it again, then submit that same verified VSIX to Marketplace in the approved channel. If any hash or downloaded check differs, stop and rebuild under a new candidate commit; never rewrite a consumed tag.
