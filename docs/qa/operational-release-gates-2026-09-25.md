# Operational release gates — 2026-09-25

## Decision

The operational controls below are technically verified for the preview channel. They improve release readiness but do not convert the product to Stable: representative developer UAT, pilot evidence, Marketplace publisher operations, and the remaining Stable ledger gates are still external or incomplete.

## Public artifact monitoring

- **VERIFIED:** the monitor fetched the current public release `v0.3.9` and verified all five assets.
- **VERIFIED:** source ZIP, VSIX, and CycloneDX SBOM also matched `SHA256SUMS` and the release manifest.
- **VERIFIED:** unit tests reject missing, altered, oversized, malformed, and inconsistent inputs.
- **VERIFIED:** the scheduled workflow retries once after a possible transient failure and then fails closed.

## Installed rollback

- **VERIFIED:** isolated VS Code `1.95.3` lifecycle completed with extension `danielmontagna86-source.protheus-engineering-agent`.
- **VERIFIED:** previous `0.3.8` installed, candidate `0.3.9` upgraded, uninstalled, reinstalled, and rolled back to `0.3.8`.
- **VERIFIED:** the previous public VSIX SHA-256 was `c26a9aea9a4fc1a92bf549c101685a3547817cfbf6a866efbb00046f54118362`.
- **UNPROVEN:** Marketplace withdrawal cannot be exercised until a real publisher/channel exists.

## RPO contention and recovery

- **VERIFIED:** two independent authenticated TDS `2.1.4` sessions compiled two valid sources concurrently against the disposable local AppServer.
- **VERIFIED:** both compilations succeeded (3,326 ms and 6,492 ms), followed by a mandatory clean compile (2,994 ms).
- **VERIFIED:** all four Docker services remained healthy and WebApp returned HTTP 200.
- **VERIFIED:** baseline `tttm120.rpo` remained `5bb8b29c9944b2fb018723cf7f5bf89a92e418873fa112476c2b221be998ed96` before and after.
- **EXPECTED MUTATION:** `custom.rpo` changed from `8898cc51d008d49308bb60b7cb162e2493c37cbb9ab105c5a066c0f41df43a00` to `c6a6bed742cd45cb3b9e01b1ca2332842443f634d97fce0541d6635f1c20d666` because the test committed valid compilations.
- **PRIVATE RECEIPT:** sanitized receipt SHA-256 `f494c699188f2bd5ca614fd145e6113266306d473b8b1b06d7fbca0455483dca`; credentials, tokens, RPO bytes, and proprietary packages remain outside Git.

## Remaining release boundary

This evidence is operational and environment-specific. It is not official TOTVS certification, a commercial support SLA, a production customer pilot, Marketplace publication, or authorization to declare Stable. The release audit remains fail-closed until every Stable-only gate is bound to one exact commit and artifact set.

## Public merged-main receipts

- **VERIFIED:** protected PRs [#52](https://github.com/danielmontagna86-source/protheus-engineering-agent/pull/52) and [#53](https://github.com/danielmontagna86-source/protheus-engineering-agent/pull/53) completed with all required checks green.
- **VERIFIED:** [operational monitor run 36095362613](https://github.com/danielmontagna86-source/protheus-engineering-agent/actions/runs/36095362613) passed against public v0.3.9.
- **VERIFIED:** [provenance run 36095361023](https://github.com/danielmontagna86-source/protheus-engineering-agent/actions/runs/36095361023) rebuilt, checksummed, attested, and re-verified exact merged-main artifacts.
- **VERIFIED:** issue [#22](https://github.com/danielmontagna86-source/protheus-engineering-agent/issues/22) now closes only the support/monitoring/rollback item; assistive UAT, representative pilot, Marketplace publisher identity, and Marketplace-downloaded installation remain open.

## Repository QA

- **VERIFIED:** 371/371 automated tests passed.
- **VERIFIED:** covered product sources reached 90.99% lines, 74.82% branches, and 90.22% functions.
- **VERIFIED:** development publication audit passed 322 files with zero errors or blockers.
- **VERIFIED:** offline smoke passed and dependency audit reported zero vulnerabilities.
- **VERIFIED:** mutation score reached 95.05% (837 killed, 8 timed out, 44 survived), meeting the 95% fail-closed threshold.
- **VERIFIED:** the reproducible 0.3.9 source ZIP, VSIX, SBOM, manifest, and checksum set were built and verified against one exact clean commit; final public provenance is produced again from merged `main`.
