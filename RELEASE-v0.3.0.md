# Release Readiness — v0.3.0 Marketplace pre-release

**Status:** DRAFT / NO-GO
**Prepared:** 2026-09-07

Tracked machine-readable draft: `release-evidence/v0.3.0.json`. It remains `NO-GO`; the clean release build generates an ignored final-evidence template bound to the exact manifest and commit. The numeric version is published to Marketplace with its pre-release flag only after explicit authorization.

## Automated evidence

- [x] Final local unit and integration suite passes three consecutive times on the revised candidate.
- [x] Source/manifests structural check passes.
- [ ] Development publication audit passes from an exact clean commit archive.
- [x] Dependency-free CLI/MCP release smoke passes locally in under five minutes.
- [x] Policy/review/CodeGraph resolver mutation score meets the configured thresholds.
- [x] Locked development dependencies report zero unresolved high/critical npm vulnerabilities.
- [x] Self-contained VSIX builds and its contents pass allow-list verification.
- [x] The packaged VSIX installs and all four commands plus native Problems diagnostics pass in isolated minimum and current VS Code hosts.
- [ ] CI and OSV gates pass on the revised release-candidate pull request.
- [x] Release audit reports explicit blockers instead of silently passing.
- [x] Core CLI/MCP paths require no external integration.

## Product and governance

- [x] Portuguese and English READMEs.
- [x] Security, contribution, conduct, changelog, issue, and pull-request guidance.
- [x] Independent-project and trademark disclaimer.
- [x] LionCodeLabs, Hermes, EngPro, and validated-corpus provenance/no-copy boundaries.
- [x] Apache-2.0 selected and applied consistently.
- [x] Final GitHub owner and repository slug configured.
- [x] Marketplace version format changed to numeric `0.3.0`; pre-release status remains a publication flag.

## Review and manual validation

- [ ] Independent correctness/security review passes on the final release commit.
- [x] Minimum and current VS Code execute all commands from the newly packaged VSIX.
- [ ] Native Problems navigation and five-minute walkthrough pass clean-profile UAT.
- [ ] TDS coexistence and CP1252/LF fixture pass or are disclosed as deferred from this preview.
- [ ] Clean-commit source ZIP, VSIX, CycloneDX SBOM, release manifest, and SHA-256 records verify.
- [ ] Downloaded source and release assets reproduce the automated gates after GitHub upload.

## Blocking decisions

1. Complete the current P0 implementation and full QA battery.
2. Obtain green final-candidate CI/OSV and final code/security review.
3. Build and verify artifacts from the exact clean candidate commit.
4. Reproduce downloaded assets and record the rollback drill.
5. Record named final approval in the external evidence file.

No merge, tag, GitHub Release, Marketplace submission, or public repository visibility change is authorized by this draft.
