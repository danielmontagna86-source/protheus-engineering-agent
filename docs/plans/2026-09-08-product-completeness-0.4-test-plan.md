# Release test plan — Productized Evidence Layer 0.4

**Status:** Planned
**Scope:** PC-010 through PC-019
**Release channel:** internal VSIX → invited pilot → GitHub pre-release → Marketplace pre-release → stable
**Go/no-go owner:** repository maintainer
**Independent evidence reviewer:** required before public pre-release

## Entry criteria

- Each task has passing targeted tests and a reviewed atomic diff.
- Existing 170-test baseline is green before integration begins.
- Legal sample, configuration schema and test environments are available.
- Minimum/current VS Code and supported TDS versions are pinned in the matrix.
- All new dependencies have license, security and lockfile review.
- No unresolved P0/P1 defect from the implementation phase.

## Scope and test depth

| Workstream | Risk | Required depth | Owner role |
|---|---:|---|---|
| Configuration, profiles and secrets | High | unit, integration, adversarial, migration | developer + security reviewer |
| Engineering Center and localization | High | component contract, installed host, accessibility, exploratory | developer + independent QA |
| Sample/walkthrough | Medium | clean-profile E2E, timed manual | independent QA |
| Git changed-files review | Critical | unit, integration, golden, multi-root/concurrency/edge | developer + independent reviewer |
| JSON/SARIF/GitHub Action | Critical | schema, dedup, permissions, public-repo integration | developer + release reviewer |
| Official MCP SDK migration | Critical | protocol conformance, negative, compatibility, soak/shutdown | developer + security reviewer |
| VS Code LM tools/skills | High | mock host, permission denial, no-model fallback | developer + independent QA |
| Build supervisor | Critical | process integration, timeout/cancel/redaction; analyzer container only as internal QA oracle | developer + environment reviewer |
| Full release | Critical | regression, mutation, supply chain, fresh install, rollback | release reviewer |

## Requirements-to-test coverage

| Requirement | Automated evidence | Manual/external evidence | Status |
|---|---|---|---|
| REQ-UX-001..004 | view/command/fake-host + installed host tests | keyboard/focus/exploratory charter | Planned |
| REQ-REV-001..004 | Git matrix + report golden + Code Action encoding cases | reviewer usability session | Planned |
| REQ-AGT-001..004 | LM tool/mock host + permission/no-model tests | supported-host exploratory session | Planned |
| REQ-ONB-001..004 | fresh-profile/l10n/SecretStorage contracts | timed pt-BR/en walkthrough | Planned |
| REQ-CI-001..004 | action/SARIF/build integration without a Docker prerequisite | public test repository plus separate internal Docker QA lane | Planned |
| REQ-MCP-001 | official SDK conformance/negative suite | host compatibility matrix | Planned |
| REQ-TDS-001..002 | installed TDS coexistence smoke | compile ownership/conflict exploratory check | Planned |

There are no unexplained coverage gaps. AppServer compiler proof, live database support, representative productivity and 1.0 accessibility sign-off are intentionally deferred to the external gates in the canonical validation matrix; 0.4 shall not make those claims.

## Scenario decomposition

Every workstream must cover:

- happy path with deterministic evidence;
- invalid/missing configuration and unavailable integration;
- timeout, cancellation and malformed external output;
- boundary sizes, Unicode and CP1252/LF source preservation;
- concurrent Journal/build/review operations where state exists;
- multi-root, multiple Git repositories, rename/delete/untracked/binary changes;
- permission denial and credential/redaction adversarial inputs;
- upgrade from 0.3 and clean uninstall/reinstall.

## Effort and capacity model

Planning assumption: one primary developer and one independent reviewer/QA contributor over four two-week iterations. Hours are planning ranges and must be recalibrated after iteration 1.

| Activity | Planned hours |
|---|---:|
| Unit/contract test authoring and review | 48–64 |
| Integration, MCP, Git and Action tests | 48–64 |
| Installed VSIX/E2E and test data setup | 28–40 |
| Accessibility/exploratory/localization | 20–28 |
| Security/supply-chain/release verification | 20–28 |
| Bug verification and regression reserve | 44–56 |
| **Total** | **208–280** |

Per person/iteration, allocate at most 75% of available delivery hours to planned work and reserve 25% for defect investigation, retest and environment failures. If only one person is available, do not remove the independent review gates; extend the schedule or recruit a reviewer.

## Risk × effort priority

| Order | Tests | Reason |
|---|---|---|
| Do first | secret redaction, Git path/scope, SARIF fingerprint, MCP invalid input, permission denial | critical/high risk and relatively low effort |
| Do second | installed Engineering Center, sample journey, no-model fallback, TDS coexistence | high user impact with moderate effort |
| Do third | public Action integration and cross-host MCP; run official analyzer separately as internal QA | high risk and environment/setup intensive |
| Defer to 0.5 | parser semantic corpus, large authorized repository, Memory promotion UX | declared later scope; lexical limits remain explicit |
| Defer to 1.0 | live AppServer/database, full accessibility sign-off, outcome pilot | requires external people/infrastructure |

No critical/high-risk P0 test may be cut to preserve the target date. Lower-risk copy/gallery polish moves first.

## Test environments and data

- Windows: minimum and current VS Code, Node 22/24, official supported TDS line, CP1252/LF and multi-root fixtures.
- Linux CI: headless runtime/CLI/MCP/Action, Node 22/24.
- Internal QA only: pinned official TOTVS analyzer and official Postgres development image; neither is packaged, configured or required by the product, and neither is full Protheus proof.
- Public test repository: synthetic/legal source only, minimal token permissions, code-scanning/SARIF enabled.
- No customer RPO, dictionary, credentials or production source in automated/public fixtures.

## Critical smoke suite (target: under five minutes)

1. Install the exact VSIX in a clean profile and activate it.
2. Open the legal sample and render Engineering Center capability status.
3. Index the sample and navigate from a graph/evidence item to source.
4. Review the prepared Git change and publish Problems diagnostics.
5. Export equivalent JSON/SARIF and validate their schemas/fingerprints.
6. Invoke one read-only agent tool/MCP tool and confirm no-model deterministic fallback.
7. Request a denied risky build/integration action and verify visible fail-closed evidence.

Any smoke failure is NO-GO.

## Exit criteria

- 100% P0 requirement-to-test mapping with no unexplained GAP.
- All targeted and full suites green; mutation remains at or above 95% in configured scope.
- Windows/Linux Node matrix, minimum/current VS Code and TDS coexistence green.
- No open P0/P1 defect or unresolved blocker/high code/security finding.
- JSON/SARIF parity and public test-repository Action run verified.
- Accessibility automated/manual preview checks show no blocking issue.
- Exact VSIX/source/SBOM hashes, fresh-install smoke and rollback artifact recorded.
- Independent reviewer signs the evidence; maintainer records GO. Otherwise status is NO-GO.

## Staged distribution and rollback

| Ring | Promotion evidence | Observation |
|---|---|---|
| Local/internal VSIX | full automated battery + smoke | minimum one working day |
| Invited pilot | no P0/P1, install/core-flow success, support channel active | minimum three working days |
| GitHub pre-release | exact artifact/hashes/public CI/CodeQL green | minimum seven days or sufficient usage evidence |
| Marketplace pre-release | listing, screenshots, accessibility and install telemetry available | minimum seven days |
| Stable | no unresolved regression; stable-launch criteria met | monitor 24 hours after promotion |

Rollback trigger: install/activation failure, corrupted source/encoding, permission bypass, secret exposure, duplicated/invalid critical findings, or a new P0/P1 defect. Rollback means stop promotion, mark/deprecate the affected pre-release where supported, keep the prior VSIX available, publish a concise advisory and verify reinstall of the previous version in a clean profile. Security/secret exposure also triggers credential rotation and incident handling.

## Post-release verification

- Re-download and reinstall the public artifact; verify hashes and critical smoke.
- Inspect new issues for install, activation, source corruption, false positives and TDS conflict.
- Confirm Action/SARIF example remains green against the public release ref.
- Review dependency and CodeQL alerts.
- Record adoption and workflow outcomes only as observed metrics; do not infer productivity.
- Decide promote, hold or rollback at each ring with named evidence.
