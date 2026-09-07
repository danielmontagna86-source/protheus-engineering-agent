# QA Test Quality Review

**Date:** 2026-09-07
**Method:** `petrkindlmann/qa-skills` — `release-readiness` and `ai-qa-review`
**Decision:** local QA gate PASS; remote/public release remains NO-GO.

## Evidence

- The revised full Node test suite passed with 90/90 tests, no retry and no skipped test.
- Critical-path smoke passed in well under the five-minute budget and exercised doctor, CodeGraph index, source review and MCP initialize/tool discovery.
- StrykerJS 10.0.0 mutation gate covered policy, review and the new CodeGraph resolver: 403 mutants, 337 killed, 65 survived and no timeout; total score 83.83% against a 60% breaking threshold. The resolver scored 94.59%.
- Package audit reported 0 known vulnerabilities after pinning the vulnerable transitive `qs` range to 6.16.0.
- The first mutation run scored 36.19%. Stronger contract and boundary tests raised it without lowering the threshold.
- The packaged VSIX was installed in isolated extension directories and exercised on VS Code 1.95.3 and 1.133.0; this caught and resolved non-writable normalized ZIP entries.

## Reviewed files

| File | Scope | Result | Finding or evidence |
|---|---|---|---|
| `test/policy.test.mjs` | permissions, grants, environment matrices | PASS | exact policy and decision contracts; policy mutation score 98.48% |
| `test/review.test.mjs` | rule detection, masking, severity, bug impact | PASS after correction | new negative tests found and fixed metadata false positives in comments/strings; review mutation score 79.33% |
| `test/publication.test.mjs` | portability, secrets, license, metadata, CI | PASS | canonical brand/repository and public-file requirements are regression tested |
| `test/smoke.test.mjs` | runnable release critical path | PASS | subprocess exit, JSON schema, four named checks and duration budget asserted |
| `test/release-artifacts.test.mjs` | VSIX/source/SBOM integrity and provenance | PASS | deterministic bytes, writable permissions, containment, checksums and manifest-bound evidence |
| `test/codegraph.test.mjs` | parser correctness, resolution scope and scale | PASS | exact lines; same-file static/global/ambiguous cases; 5,000-symbol/call sub-second budget; resolver mutation 94.59% |

## Readability

PASS. Test names state behavior and condition. Fixtures are local and descriptive. The publication fixture is comparatively large but centralizes only the minimum valid public tree needed by negative tests.

## Reliability

PASS. The revised full execution is green; there are no sleeps, network calls, retries or shared mutable project state in the reviewed tests. Temporary workspaces are generated per test or smoke run.

## Diagnostic value

PASS. Assertions compare explicit objects, rule identifiers, lines, counts, repository metadata and subprocess errors. The smoke includes stderr when a child process fails.

## Design

PASS. External boundaries use real local subprocesses where valuable and in-process functions elsewhere. No production implementation is mocked. Mutation testing is isolated to policy, review and the CodeGraph resolution seam to keep the gate bounded.

## AI-generated test risks

PASS WITH OBSERVATIONS. Tests and implementation were evolved in the same engineering session, so a closed-loop risk existed. Test-first failures and an external mutation engine provided an independent constraint. Surviving mutants remain backlog evidence for future strengthening; the 83.83% score is above the configured 60% release threshold.

## Coverage and remaining gaps

LOCAL PASS. Happy paths, denial paths, filesystem escapes, limits, concurrency, invalid manifests, secrets, process boundaries, CodeGraph ambiguity and standalone packaged VSIX installation are covered. Optional Hermes compatibility was probed in isolation but is not a gate. Candidate GitHub Actions/OSV, downloaded release assets and Protheus infrastructure remain external gates and are not represented as passing.

## Findings

| Severity | Finding | Resolution |
|---|---|---|
| High | Review could report direct system-table access when `DbSelectArea` appeared only in a comment or string. | Resolved with a lexical code-presence guard plus regression test. |
| Medium | Existing tests constrained only 36.19% of policy/review mutations. | Resolved for the alpha gate: exact contracts and boundary cases raised the focused score to 83.83%. |
| Medium | Mutation dependency initially resolved a vulnerable transitive `qs`. | Resolved with a 6.16.0 override; package audit now reports zero vulnerabilities. |
| Low | One generated Stryker mutant errored while 0 timed out. | Recorded as a tooling anomaly; the 403-mutant run still passed its 60% threshold and the normal suite uses no time-based waiting. |
| High | Deterministic ZIP normalization discarded write permissions, so VS Code could not install the VSIX on Windows. | Resolved by normalizing files to `0644`; fresh-install regression and host smoke pass on minimum/current versions. |
| High | Tracked final evidence would change the commit it was intended to attest. | Resolved with an ignored final-evidence template bound to a checksummed release manifest; the tracked file remains a fail-closed draft. |
| High | The release evidence schema required a real Hermes probe even though the product claimed Hermes was optional. | Resolved test-first: complete core evidence without a Hermes field now passes, while compatibility remains isolated and non-gating. |
| Medium | CodeGraph resolved duplicate symbols to the first file, including cross-file static functions. | Resolved with explicit same-file static precedence, inaccessible static rejection and ambiguous global output. |
| Low | Full CI ran twice for feature branches with open pull requests. | Resolved by limiting push CI to `main` and pull-request CI to changes targeting `main`. |

No unresolved high-severity QA finding remains. This report does not waive the external evidence required by `RELEASE-v0.2.0-alpha.1.md`.
