# Maintainer release handoff

This document separates completed engineering from actions that require the product owner's identity, legal decision or Protheus infrastructure.

## What the repository automates

- source, integration, negative, security-contract and regression tests;
- deterministic benchmark and claim decision;
- CLI/MCP and installed-VSIX smoke;
- minimum/current VS Code plus installed official TDS coexistence UAT;
- dependency audit, mutation testing and publication-tree audit;
- reproducible VSIX, source ZIP, CycloneDX SBOM, SHA-256 manifest and verification;
- CI/OSV checks on the candidate pull request.

## Owner actions that cannot be manufactured by the build

1. **Name and trademark:** obtain the desired legal review for public/commercial use of the descriptive `Protheus Engineering Agent` name and retain the independent-project disclaimer. Rename before the first public tag if counsel rejects it.
2. **Real Protheus acceptance:** provide a disposable homologation AppServer/RPO, the approved compiler command/identity and temporary credentials through the host secret store—not Git. Run one representative compile and retain the supervisor artifact hash. Production/RPO deploy is outside the preview.
3. **Accessibility/screenshots:** perform the keyboard/screen-reader/high-contrast checklist in `docs/qa/accessibility-review-2026-09-07.md` and capture screenshots from the real installed VSIX.
4. **GitHub publication:** after the exact candidate CI and OSV runs are green, explicitly approve changing the repository from private to public. Recreate/verify branch rules immediately because GitHub may disable push rulesets during a private-to-public visibility change; remember that code and Actions history become public.
5. **Marketplace identity:** create or confirm the immutable Visual Studio Marketplace publisher ID through the owner's Microsoft/Azure DevOps identity, accept Marketplace terms and use a narrowly scoped Marketplace `Manage` credential or supported federated identity. Never commit the token. Upload the already verified VSIX as a pre-release.
6. **Named GO:** put the approver identity and timestamp in the ignored final evidence file generated with the release artifacts. Then rerun the release audit against that file before tag/release/upload.

## Optional adoption gates

Live Oracle access needs a customer-owned driver, secret handling and an approved catalog of named read-only queries. Productivity marketing needs the consenting human pilot in `docs/effectiveness-methodology.md`. Neither is required to install and use the offline VSIX, and neither may be advertised as validated before its own evidence exists.

## Safe publication order

Merge the reviewed candidate, build artifacts from the exact clean merge commit, complete the external evidence, change visibility, restore protection, create the immutable `v0.3.0` tag and GitHub Release, download every asset and verify it again, then submit the same VSIX to Marketplace as a pre-release. If any hash or downloaded check differs, stop and rebuild under a new candidate commit; never rewrite a consumed tag.
