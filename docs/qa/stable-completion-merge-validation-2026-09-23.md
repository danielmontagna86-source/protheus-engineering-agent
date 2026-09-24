# Stable completion merge validation — 2026-09-23

## Scope

This record covers the repository and automated release-candidate work merged
by PR #42 into public `main` as
`3a2c0c622fcca883ee4f641467b9ead28c5df5a5`. It is not a Stable 1.0 approval
and does not replace licensed Protheus, remote-host, accessibility, human pilot,
publisher or named-release evidence.

## Public GitHub result

The protected pull-request matrix passed before merge. The merge commit then
passed public CI, CodeQL, OSV/dependency security and full-history secret scan:

- CI run `35944543935`;
- CodeQL run `35944543945`;
- Dependency Security run `35944543967`;
- Secret scan run `35944543966`.

## Clean local merge result

A new detached worktree was created from `origin/main`, followed by `npm ci`
and `npm run validate:release-candidate`:

- 357/357 Node tests passed;
- structural and development-publication audits passed for 297 files;
- benchmark precision/recall on declared synthetic fixtures remained 1.0,
  while productivity and market-leadership claims remained `NOT_PROVEN`;
- CLI/MCP smoke passed;
- npm audit reported zero vulnerabilities;
- VS Code 1.139.0 and minimum 1.95.3 installed-host tests passed;
- TDS 2.1.4 coexistence, CP1252/LF and multi-root passed;
- mutation score was 95.05% (837 killed, 8 timeout, 44 survived), above the
  configured 95% break threshold.

The npm-safe lifecycle command then proved isolated install, upgrade from
0.3.8 to 0.3.9, uninstall, reinstall and rollback on VS Code 1.95.3.

## Exact local artifacts

| Artifact | SHA-256 |
| --- | --- |
| source ZIP | `dda570918e14c1cdc37c6e2a7d756001fbf86b79543c1cfa2faa7de2c183e54b` |
| VSIX | `bf1b28763c7b3791588e65c60db99c4836abd3074dd50b73774f2cd70e0561cd` |
| CycloneDX SBOM | `61ae5978fc8aeaff61feae753a915393e97c66aa3185c6c2c72afa19a621da3b` |

Source archive, VSIX, source-commit binding, clean-source rebuild,
reproducibility, SBOM and lockfile verification all returned `PASS`.

## Release decision

`node scripts/publication-check.mjs --release` returned `BLOCKED` only with
`RELEASE_EVIDENCE_INCOMPLETE`. This is the expected fail-closed result: the
repository phase is complete, but the current version is not promoted to
Stable or republished as 0.3.9. External gates remain governed by the Stable
ledger and must bind to one future immutable artifact set.
