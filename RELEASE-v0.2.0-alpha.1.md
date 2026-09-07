# Release Readiness — v0.2.0-alpha.1

**Status:** DRAFT / NO-GO
**Prepared:** 2026-09-07

Machine-readable gate: `release-evidence/v0.2.0-alpha.1.json`. It must remain `NO-GO` until every external and manual proof below is real.

## Automated evidence

- [x] Local unit and integration suite passes.
- [x] Source/manifests structural check passes.
- [x] Development publication audit passes.
- [x] Dependency-free CLI/MCP release smoke passes locally in under five minutes.
- [x] Policy/review mutation score is 82.79%, above the 60% breaking threshold.
- [x] Locked development dependencies report zero known vulnerabilities.
- [x] Release audit reports explicit blockers instead of silently passing.
- [x] CLI session and MCP stdio smoke run without external integrations.
- [ ] GitHub Actions passes on Windows/Linux and Node.js 22/24.

## Product and governance

- [x] Portuguese and English READMEs.
- [x] Security, contribution, conduct, changelog, issue, and pull-request guidance.
- [x] Independent-project and trademark disclaimer.
- [x] Third-party reference/no-copy record.
- [x] Apache-2.0 selected and applied consistently.
- [x] Final GitHub owner and repository slug configured.

## Review and manual validation

- [x] Independent review of the current local tree has no blocking or high-severity finding; repeat on the release commit.
- [ ] VS Code Extension Development Host executes all four commands.
- [ ] Hermes session integration is exercised with an isolated profile on a supported installation.
- [ ] Release archive is audited and its SHA-256 is recorded.
- [ ] Fresh download reproduces the automated gate.

## Blocking decisions

1. Create the canonical GitHub repository and obtain a green CI matrix.
2. Complete live VS Code/Hermes smokes and immutable artifact evidence.
3. Repeat code/security review on the release commit and record approval.

No tag, GitHub Release, Marketplace package, or public repository visibility change is authorized by this draft.
