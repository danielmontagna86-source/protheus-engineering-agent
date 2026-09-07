# GitHub Publication Plan

**Current decision:** NO-GO for public release. Apache-2.0 and `danielmontagna86-source/protheus-engineering-agent` are configured, but the remote CI and external release evidence are still missing.

## Publication model

The first public channel is a GitHub source release. VS Code Marketplace and npm publication are deferred until the alpha contract stabilizes.

1. Confirm Apache-2.0 consistency in both manifests, `LICENSE.md` and contribution guidance.
2. Use the canonical GitHub URL `https://github.com/danielmontagna86-source/protheus-engineering-agent`.
3. Run `npm run validate`, `npm run smoke` and `npm run publication:release-check`.
4. Initialize a fresh Git repository from this product tree; do not import history, caches, credentials, `.pea`, or the LionCodeLabs/Hermes repositories.
5. Create the GitHub repository as private, push a preparation branch, and open a draft pull request.
6. Confirm all four CI matrix jobs on GitHub: Windows/Linux and Node.js 22/24.
7. Run the VS Code Extension Development Host smoke and record evidence in the release checklist.
8. Resolve code/security review findings, update the changelog, bump all version fields together, and rerun the release audit.
9. Protect `main` with pull-request review and required CI checks.
10. Make the repository public, create the immutable tag, publish the GitHub Release, upload the source snapshot and SHA-256, then verify a fresh download.

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
- SHA-256 checksum for every uploaded archive.
- Clear alpha limitations and independent-project disclaimer.

## Rollback

Before the first public release, keep the remote private or delete the unpublished preparation repository. After users may have consumed a tag, never rewrite it: withdraw the affected release, publish an advisory when applicable, and fix forward with a new version.
