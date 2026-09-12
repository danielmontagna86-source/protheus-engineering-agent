# GitHub Publication Plan

**Current decision:** the public GitHub `v0.3.0` pre-release is available as a
preview. Stable and Marketplace are `NO-GO` for the next candidate until its
own exact-commit evidence is complete. The standalone VSIX runs without
Hermes and coexists with official TDS; public CodeQL, OSV, secret scanning and
the cross-platform CI matrix are active on `main`. The remaining gates are
clean candidate artifacts, downloaded-asset reproduction, accessibility/UAT,
live Protheus acceptance, Marketplace identity, legal review and named GO.

## Publication model

The first controlled public channel is a GitHub source release with an installable VSIX. Visual Studio Marketplace is the target discovery channel after the alpha contract and publisher identity are validated. npm publication is not planned; the repository remains `private: true` in npm metadata to prevent accidental package publication.

1. Confirm Apache-2.0 consistency in both manifests, `LICENSE.md` and contribution guidance. Completed.
2. Use the canonical GitHub URL `https://github.com/danielmontagna86-source/protheus-engineering-agent`.
3. Run `npm run validate`, `npm run smoke`, `npm run build:release`, `npm run verify:release` and finally `npm run publication:release-check`; the last command repeats `verify:release` by design so a GO cannot bypass the isolated source-archive rebuild with a clean locked dependency install.
4. Initialize a fresh Git repository from this product tree; do not import history, caches, credentials, `.pea`, or the LionCodeLabs/Hermes repositories.
5. Create the GitHub repository and use protected pull requests. Completed; the repository is public and the historical GitHub preview is [v0.3.0](https://github.com/danielmontagna86-source/protheus-engineering-agent/releases/tag/v0.3.0).
6. Confirm all four CI matrix jobs on the exact new candidate and public CodeQL/OSV/secret checks before each promotion. Do not inherit a prior commit's green checks.
7. Fresh-install the packaged VSIX in isolated Extension Hosts without Hermes and record evidence. Minimum 1.95.3 and current 1.136.2 passed locally; official TDS 2.1.2 activation, zero command conflicts, multi-root and CP1252/LF preservation also passed.
8. Build and verify the self-contained VSIX. Local package and installation verification passed; final clean-commit artifact is pending.
9. Resolve code/security review findings, update the changelog, bump all version fields together, and rerun the release audit.
10. Build source ZIP, VSIX and CycloneDX SBOM from the exact clean commit; require the VSIX to embed and byte-rebuild from that commit, reconcile the full production lock graph, and record `SHA256SUMS`, the release manifest and the generated fail-closed evidence template. Complete final evidence outside the tracked tree so it can bind to the exact commit without changing it.
11. Capture each security control from the GitHub API with its run ID, attempt, workflow path, repository, exact head SHA and successful conclusion. Attest and independently verify the three payloads, release manifest and `SHA256SUMS` before filling G9/G12.
12. The repository is public. Keep the pinned CodeQL workflow, private vulnerability reporting, artifact attestations and branch rules active; verify their successful runs for the exact candidate.
13. After named approval, create the immutable tag and GitHub Release, then download and verify every uploaded asset. Submit the exact same verified VSIX to Marketplace only after the Marketplace identity gate passes.

## Repository settings

- Default branch: `main`.
- Require pull requests, conversation resolution and all required status checks. The documented single-maintainer merge mode uses zero required approving reviews because one owner cannot independently approve their own work; it is not a substitute for the external evidence gates.
- Require every CI matrix job and require branches to be up to date.
- Block force pushes and branch deletion.
- Enable private vulnerability reporting before accepting external reports.
- Do not expose Actions secrets to pull requests from forks.
- Enable Dependabot updates for GitHub Actions.
- Register and verify the final Visual Studio Marketplace publisher identifier before removing `private: true` from the extension manifest or attempting Marketplace publication. The publisher ID is immutable; use the owner's Microsoft/Azure DevOps identity and a narrowly scoped Marketplace `Manage` credential or supported federation.
- Treat private-to-public conversion as a disclosure event: source and prior Actions logs become visible, public forks become possible, and GitHub may disable push rulesets. Recreate and verify protection immediately after visibility changes.

## Release contents

- Source tree without runtime state or private material.
- `CHANGELOG.md` and a completed release record for the exact version.
- Third-party notices and the selected product license.
- Self-contained VSIX, source ZIP and CycloneDX SBOM with SHA-256 checksum for each artifact and a checksummed release manifest.
- Clear alpha limitations and independent-project disclaimer.

## Rollback

Before the first public release, keep the remote private or delete the unpublished preparation repository. After users may have consumed a tag, never rewrite it: withdraw the affected release, publish an advisory when applicable, and fix forward with a new version.

The exact owner-only checklist is in `docs/maintainer-release-handoff.md`.

Authoritative operational references: [VS Code extension publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) and [GitHub repository visibility changes](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility).
