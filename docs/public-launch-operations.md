# Public launch operations

**Status:** Prepared repository contract; public launch is blocked until the exact release gate is green.

This is the operating checklist for turning the repository and VS Code listing into a credible public product. It does not change the current `NO-GO` decision, create an endorsement, or authorize a release by itself.

## Current observed state

- The canonical GitHub repository is private. Its About description is `Engenharia para Protheus ADVPL/TLPP no VS Code, baseada em evidências: CodeGraph, revisão, memória de projeto e integrações governadas.` It has 15 capability-specific topics, a 100% Community Profile and Dependabot alerts enabled. The homepage remains blank until there is a verified product site, rather than linking the repository to itself. A reviewed 1280 × 640 source social-preview asset is versioned at [`media/social-preview.png`](../media/social-preview.png), but it has not yet been assigned in GitHub's repository settings. It has no branch protection/ruleset or public CodeQL result.
- Private vulnerability reporting is unavailable for this private repository under the current GitHub plan: its API endpoint returned `404` on 2026-09-10. The versioned `SECURITY.md` private-report route remains the disclosure path until a supported GitHub reporting URL can be verified.
- CI, OSV scanning, workflow-based secret scanning, local release-artifact verification and isolated VSIX smoke evidence exist for the candidate branch. GitHub-native secret scanning and code scanning are unavailable on the current private plan; the public-only CodeQL and dependency-review workflows correctly skip while the repository is private.
- Every external GitHub Action is pinned to a full commit SHA and the repository now requires SHA-pinned Actions. This is verified against the active workflow set; local actions remain allowed.
- The Marketplace extension identifier and publisher identity have not been verified as a live Marketplace listing. No Marketplace version is claimed as published.

These observations must be refreshed immediately before every visibility or release decision. GitHub visibility exposes source and Actions history, disables push rulesets, and permits public forks; it is a disclosure event, not a cosmetic setting.

## Public repository baseline

Before changing visibility, the release owner must verify these exact GitHub settings and record the API/UI evidence in the release receipt:

1. Keep the repository description in Portuguese and focused on the verified scope: `Engenharia para Protheus ADVPL/TLPP no VS Code, baseada em evidências: CodeGraph, revisão, memória de projeto e integrações governadas.` Keep only capability-specific GitHub topics: `advpl`, `tlpp`, `protheus`, `totvs`, `vscode-extension`, `visual-studio-code`, `developer-tools`, `code-review`, `static-analysis`, `codegraph`, `model-context-protocol`, `mcp`, `developer-productivity`, `software-quality`, and `local-first`.
2. Upload the reviewed [`media/social-preview.png`](../media/social-preview.png) source (1280 × 640 PNG, under 1 MB) as the repository social preview. Its abstract engineering graphic deliberately has no fabricated UI, vendor logo, “official” statement or implied TOTVS endorsement. Verify the rendered public card after visibility changes.
3. Confirm README, `README.en.md`, `LICENSE.md`, `NOTICE`, third-party notices, `SECURITY.md`, `SUPPORT.md`, contribution guide, governance, issue forms, pull-request template, changelog, citation and Code Owners are present and link correctly from the default branch.
4. Keep Dependabot alerts enabled. Enable private vulnerability reporting where GitHub supports it, then verify the Security reporting URL works before inviting public reports. If the endpoint remains unavailable, retain the versioned private-report route in `SECURITY.md`; do not claim a GitHub security-reporting form exists.
5. After visibility changes, restore a `main` ruleset or branch protection requiring an up-to-date pull request, one approval, resolution of review conversations, the CI matrix, mutation/dependency audit, VS Code host, OSV, secret scan, CodeQL and dependency review. Block force-push and branch deletion.
6. Keep Actions default permissions read-only, require SHA-pinned Actions and do not expose secrets to fork-origin pull requests. The release workflow remains manually dispatched and uses GitHub artifact attestations.

## Marketplace listing contract

The Marketplace page is a product surface. Its first pre-release may be submitted only after the public repository baseline and the release evidence gate pass.

- **Name:** Protheus Engineering Agent
- **Short description:** Ferramentas independentes de engenharia para projetos ADVPL/TLPP no VS Code, com evidências reproduzíveis.
- **Category/keywords:** retain the current `Linters` and `Testing` categories; publish only the manifest keywords that describe shipped capabilities.
- **Channel:** numeric `0.x.y` with the Marketplace pre-release flag while preview is true. A stable listing uses a distinct `1.0.0` or later version with preview disabled.
- **Publisher:** create or confirm the immutable Marketplace publisher under the release owner's Microsoft identity. Store no token in Git; use federated publishing where available rather than a long-lived credential.
- **Media:** upload real, sanitized captures of the installed VSIX: Engineering Center, an offline changed-files review in Problems/Output, and the first-value walkthrough. Validate keyboard focus, high contrast, 200% zoom and screen-reader labels in the same supported VS Code matrix before calling them production-ready.
- **Claims:** state only that deterministic, offline capabilities are available without Hermes or a model. Do not claim compilation, production safety, support by TOTVS, productivity improvement, defect prevention, market leadership, or compatibility beyond the published evidence.

Marketplace submission is a separate action from a GitHub Release. Package and inspect the exact VSIX first; publish that checksum-identical file; then re-download the Marketplace package and record its identity/version.

## Adoption plan toward 1,000 stars

**1,000 stars is an adoption target, not a release gate, quality metric, or promise.** Stars can signal discoverability, but they do not establish product effectiveness, active usage, security, or market leadership.

The growth plan is therefore a series of evidence-led loops:

1. **First value:** make the documented five-minute offline walkthrough reproducible from a clean VS Code profile and publish the measured outcome, caveats and supported matrix.
2. **Proof:** publish one small legal sample and a short screen recording from the real VSIX showing index → changed-files review → native Problems. Link the source, version, command and limitations.
3. **Community:** triage issues with the existing bug/feature forms, label `good first issue` only after a reproducer and expected outcome are defined, and publish a monthly changelog/release note with resolved evidence gaps.
4. **Distribution:** publish bilingual technical articles and targeted demonstrations for ADVPL/TLPP communities, TDS users and maintainers. Each article leads to one verified workflow rather than generic AI claims.
5. **Retention:** invite representative users to the preregistered pilot, publish aggregate findings and limitations, and prioritize the top reproducible friction points. Do not solicit stars in exchange for access, support or product claims.

Track impressions, clone-to-install conversion, first-value completion, retained weekly users, issue response time, reproducible bug rate, review false-positive rate and qualitative pilot feedback. Report stars and Marketplace installs separately as dated adoption proxies.

## Ordered release procedure

1. Merge only the reviewed candidate after all required CI checks pass for its exact `main` commit.
2. Build source ZIP, VSIX, SBOM, manifest and checksums from that clean commit; execute fresh-install, lifecycle, TDS coexistence and required human UAT.
3. Complete external compatibility, legal/trademark, security-reporting, accessibility and pilot gates; record named owner approval in the ignored final release evidence.
4. Make the repository public, immediately restore/verify protection, trigger and inspect public CodeQL/dependency review, and verify the public repository contents and social preview.
5. Dispatch provenance, verify its attestation, create the immutable tag and GitHub Release, download every asset and verify all hashes again.
6. Submit the same verified VSIX as the approved Marketplace channel, verify the public listing/install, then publish the bilingual announcement with the exact version, limitations and support path.

Any failed hash, scan, download, review, UAT or authorization stops the sequence. Withdraw or fix forward; never rewrite a consumed tag or silently replace a Marketplace build.
