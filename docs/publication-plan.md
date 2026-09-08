# GitHub Publication Plan

**Current decision:** NO-GO until final-candidate evidence is reconciled. The canonical repository exists privately; the standalone VSIX runs on isolated VS Code 1.95.3/1.133.0 and coexists with installed official TDS 2.0.16 without Hermes. The exact final commit still needs green CI/OSV, clean artifacts, final review, assistive/visual UAT, downloaded-asset reproduction and named approval.

## Publication model

The first controlled public channel is a GitHub source release with an installable VSIX. Visual Studio Marketplace is the target discovery channel after the alpha contract and publisher identity are validated. npm publication is not planned; the repository remains `private: true` in npm metadata to prevent accidental package publication.

1. Confirm Apache-2.0 consistency in both manifests, `LICENSE.md` and contribution guidance. Completed.
2. Use the canonical GitHub URL `https://github.com/danielmontagna86-source/protheus-engineering-agent`.
3. Run `npm run validate`, `npm run smoke` and `npm run publication:release-check`.
4. Initialize a fresh Git repository from this product tree; do not import history, caches, credentials, `.pea`, or the LionCodeLabs/Hermes repositories.
5. Create the GitHub repository as private, push a preparation branch, and open a draft pull request. Completed on 2026-09-07.
6. Confirm all four CI matrix jobs on GitHub: Windows/Linux and Node.js 22/24. Completed for current `main` commit `14ef868` in [run 34151775373](https://github.com/danielmontagna86-source/protheus-engineering-agent/actions/runs/34151775373).
7. Fresh-install the packaged VSIX in isolated Extension Hosts without Hermes and record evidence. Minimum 1.95.3 and current 1.133.0 passed locally; official TDS 2.0.16 activation, zero command conflicts, multi-root and CP1252/LF preservation also passed.
8. Build and verify the self-contained VSIX. Local package and installation verification passed; final clean-commit artifact is pending.
9. Resolve code/security review findings, update the changelog, bump all version fields together, and rerun the release audit.
10. Build source ZIP, VSIX and CycloneDX SBOM from the exact clean commit; record `SHA256SUMS`, the release manifest and the generated fail-closed evidence template. Complete final evidence outside the tracked tree so it can bind to the exact commit without changing it.
11. With explicit owner approval, make the repository public, then enable branch rulesets, private vulnerability reporting, CodeQL/SARIF upload, and artifact attestations before accepting general contributions. These controls are unavailable on the current private GitHub Free repository.
12. Create the immutable tag and GitHub Release only after named approval, then verify the downloaded assets.

## Repository settings

- Default branch: `main`.
- Require pull request and at least one approving review.
- Require every CI matrix job and require branches to be up to date.
- Block force pushes and branch deletion.
- Enable private vulnerability reporting before accepting external reports.
- Do not expose Actions secrets to pull requests from forks.
- Enable Dependabot updates for GitHub Actions.
- Register and verify the final Visual Studio Marketplace publisher identifier before removing `private: true` from the extension manifest or attempting Marketplace publication. The publisher ID is immutable; use the owner's Microsoft/Azure DevOps identity and a narrowly scoped Marketplace `Manage` credential or supported federation.
- Treat private-to-public conversion as a disclosure event: source and prior Actions logs become visible, public forks become possible, and GitHub may disable push rulesets. Recreate and verify protection immediately after visibility changes.

## Release contents

- Source tree without runtime state or private material.
- `CHANGELOG.md` and completed `RELEASE-v0.3.0.md`.
- Third-party notices and the selected product license.
- Self-contained VSIX, source ZIP and CycloneDX SBOM with SHA-256 checksum for each artifact and a checksummed release manifest.
- Clear alpha limitations and independent-project disclaimer.

## Rollback

Before the first public release, keep the remote private or delete the unpublished preparation repository. After users may have consumed a tag, never rewrite it: withdraw the affected release, publish an advisory when applicable, and fix forward with a new version.

The exact owner-only checklist is in `docs/maintainer-release-handoff.md`.

Authoritative operational references: [VS Code extension publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) and [GitHub repository visibility changes](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility).
