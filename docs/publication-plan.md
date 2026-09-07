# GitHub Publication Plan

**Current decision:** NO-GO for public release. The canonical repository exists privately, prior `main` CI and the isolated Hermes probe passed, and the packaged VSIX now installs and runs all four commands locally on isolated VS Code 1.95.3 and 1.133.0 hosts. Candidate CI/OSV, clean-commit artifacts, final reviews, downloaded-asset reproduction and named approval are still missing.

## Publication model

The first public channel is a GitHub source release. VS Code Marketplace and npm publication are deferred until the alpha contract stabilizes.

1. Confirm Apache-2.0 consistency in both manifests, `LICENSE.md` and contribution guidance. Completed.
2. Use the canonical GitHub URL `https://github.com/danielmontagna86-source/protheus-engineering-agent`.
3. Run `npm run validate`, `npm run smoke` and `npm run publication:release-check`.
4. Initialize a fresh Git repository from this product tree; do not import history, caches, credentials, `.pea`, or the LionCodeLabs/Hermes repositories.
5. Create the GitHub repository as private, push a preparation branch, and open a draft pull request. Completed on 2026-09-07.
6. Confirm all four CI matrix jobs on GitHub: Windows/Linux and Node.js 22/24. Completed for current `main` commit `14ef868` in [run 34151775373](https://github.com/danielmontagna86-source/protheus-engineering-agent/actions/runs/34151775373).
7. Fresh-install the packaged VSIX in isolated Extension Hosts and record evidence. Minimum 1.95.3 and current 1.133.0 passed locally; minimum CI remains pending.
8. Build and verify the self-contained VSIX. Local package and installation verification passed; final clean-commit artifact is pending.
9. Resolve code/security review findings, update the changelog, bump all version fields together, and rerun the release audit.
10. Build source ZIP, VSIX and CycloneDX SBOM from the exact clean commit; record `SHA256SUMS`, the release manifest and the generated fail-closed evidence template. Complete final evidence outside the tracked tree so it can bind to the exact commit without changing it.
11. Make the repository public, then enable branch rulesets, private vulnerability reporting, CodeQL/SARIF upload, and artifact attestations before accepting general contributions. These controls are unavailable on the current private GitHub Free repository.
12. Create the immutable tag and GitHub Release only after named approval, then verify the downloaded assets.

## Repository settings

- Default branch: `main`.
- Require pull request and at least one approving review.
- Require every CI matrix job and require branches to be up to date.
- Block force pushes and branch deletion.
- Enable private vulnerability reporting before accepting external reports.
- Do not expose Actions secrets to pull requests from forks.
- Enable Dependabot updates for GitHub Actions.

## Release contents

- Source tree without runtime state or private material.
- `CHANGELOG.md` and completed `RELEASE-v0.2.0-alpha.1.md`.
- Third-party notices and the selected product license.
- Self-contained VSIX, source ZIP and CycloneDX SBOM with SHA-256 checksum for each artifact and a checksummed release manifest.
- Clear alpha limitations and independent-project disclaimer.

## Rollback

Before the first public release, keep the remote private or delete the unpublished preparation repository. After users may have consumed a tag, never rewrite it: withdraw the affected release, publish an advisory when applicable, and fix forward with a new version.
