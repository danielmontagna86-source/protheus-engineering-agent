# Release Readiness — v0.2.0-alpha.1

**Status:** DRAFT / NO-GO
**Prepared:** 2026-09-07

Tracked machine-readable draft: `release-evidence/v0.2.0-alpha.1.json`. It remains `NO-GO`; the clean release build generates an ignored final-evidence template bound to the exact manifest and commit.

## Automated evidence

- [x] Local unit and integration suite passes: 83/83.
- [x] Source/manifests structural check passes.
- [x] Development publication audit passes.
- [x] Dependency-free CLI/MCP release smoke passes locally in under five minutes.
- [x] Policy/review mutation score is 82.79%, above the 60% breaking threshold.
- [x] Locked development dependencies report zero known npm vulnerabilities.
- [x] Self-contained VSIX builds and its contents pass allow-list verification.
- [x] The packaged VSIX installs and all four commands pass in isolated VS Code 1.95.3 and 1.133.0 hosts.
- [ ] OSV dependency gate passes on the release-candidate pull request.
- [x] Release audit reports explicit blockers instead of silently passing.
- [x] CLI session and MCP stdio smoke run without external integrations.
- [x] GitHub Actions passes on Windows/Linux and Node.js 22/24 for base `main` run 34151775373.

## Product and governance

- [x] Portuguese and English READMEs.
- [x] Security, contribution, conduct, changelog, issue, and pull-request guidance.
- [x] Independent-project and trademark disclaimer.
- [x] Third-party reference/no-copy record.
- [x] Apache-2.0 selected and applied consistently.
- [x] Final GitHub owner and repository slug configured.

## Review and manual validation

- [ ] Independent correctness/security review passes on the final release commit.
- [x] VS Code Extension Development Host executes all four commands on current stable.
- [x] Minimum supported VS Code 1.95.3 executes all four commands locally from the installed VSIX.
- [ ] Minimum supported VS Code line executes all four commands in candidate CI.
- [x] Hermes ACP integration probe passes with an isolated profile on the installed supported runtime.
- [ ] Clean-commit source ZIP, VSIX, CycloneDX SBOM, release manifest, and SHA-256 records verify.
- [x] Fresh isolated VSIX installation reproduces all four commands locally on minimum and current VS Code.
- [ ] Downloaded source and release assets reproduce the automated gates after GitHub upload.

## Blocking decisions

1. Obtain green candidate CI/OSV and final code/security review.
2. Build and verify artifacts from the exact clean candidate commit.
3. Reproduce the downloaded GitHub assets and record the rollback drill.
4. Reconcile the release-candidate commit and record named final approval in the external evidence file.

No tag, GitHub Release, Marketplace package, or public repository visibility change is authorized by this draft.
