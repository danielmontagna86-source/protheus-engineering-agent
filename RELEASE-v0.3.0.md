# Release record — v0.3.0 GitHub preview

**Status:** published GitHub preview; **not** a Stable or Marketplace release.
**Published:** 2026-09-12
**Exact commit:** `cb5b6cd0240c6224b4c51a4eb5344ab4f8614878`
**Release:** <https://github.com/danielmontagna86-source/protheus-engineering-agent/releases/tag/v0.3.0>

This file is a historical record. The earlier tracked draft at
`release-evidence/v0.3.0.json` deliberately remains `NO-GO`, because it does
not contain a complete, exact-commit set of independently verified external
gate receipts. That fail-closed state must not be changed merely because the
preview assets were uploaded.

Published preview assets and GitHub-reported SHA-256 digests:

| Asset | SHA-256 |
| --- | --- |
| `protheus-engineering-agent-v0.3.0-source.zip` | `4cad48c374d0d56f6483e9ec863d13271617b5da2667c219afc8734a0cde4825` |
| `protheus-engineering-agent-v0.3.0.cdx.json` | `7cb049ff53e174f5dc27117743b78b65a35f35ec4035933d49f03bf90035ccf2` |
| `protheus-engineering-agent-v0.3.0.vsix` | `5f8e1d70e07fa35009ee45c977d25e1295bce811b304e2edab8441ba948f7449` |
| `release-manifest-v0.3.0.json` | `2f39e3deb8dfd153134817de10c91431c607c293213df72e0960bb0caffdfe65` |
| `SHA256SUMS` | `49c3ce2bbbdeec8a4abdd7536b4906aa90dc425c8965893c96aa470d49b13d2d` |

The next candidate is `v0.3.1`; its evidence must be generated again from its
own immutable commit and assets. Do not reuse these receipts for it.

## Evidence recorded before preview publication

- [x] Final local unit and integration suite passes three consecutive times on the revised candidate.
- [x] Source/manifests structural check passes.
- [x] Development publication audit recorded explicit blockers instead of silently passing.
- [x] Dependency-free CLI/MCP release smoke passes locally in under five minutes.
- [x] Policy/review/CodeGraph resolver mutation score meets the configured thresholds.
- [x] Locked development dependencies report zero unresolved high/critical npm vulnerabilities.
- [x] Self-contained VSIX builds and its contents pass allow-list verification.
- [x] The packaged VSIX installs and all four commands plus native Problems diagnostics pass in isolated minimum and current VS Code hosts.
- [x] CI, OSV, verified-secret and public CodeQL gates passed for the reviewed preview candidate.
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

- [x] Governed correctness/security review policy and its automated enforcement landed before the current candidate line.
- [x] Minimum and current VS Code execute all commands from the newly packaged VSIX.
- [ ] Native Problems navigation and five-minute walkthrough pass clean-profile UAT.
- [x] TDS 2.0.16 coexistence, multi-root behavior and CP1252/LF fixture pass locally.
- [ ] Clean-commit source ZIP, VSIX, CycloneDX SBOM, release manifest, and SHA-256 records verify.
- [ ] Downloaded source and release assets reproduce the automated gates after GitHub upload.

## Remaining Stable/Marketplace blockers

1. Build and verify a new exact-commit `v0.3.1` candidate, including the full
   P0 battery after every correction.
2. Reproduce every downloaded `v0.3.1` asset and record the rollback drill.
3. Complete clean-profile accessibility and installed-product UAT.
4. Complete representative live Protheus/AppServer acceptance; Oracle stays
   optional unless that integration is enabled for the release.
5. Create/verify the immutable Visual Studio Marketplace publisher identity,
   accept its terms and use a scoped publication credential outside Git.
6. Complete the legal/trademark decision and named final approval in the
   ignored final evidence file.

No Stable tag, Stable GitHub Release or Marketplace submission is implied by
this preview. The `v0.3.0` tag and GitHub pre-release are immutable historical
artifacts and must never be rewritten.
