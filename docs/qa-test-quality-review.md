# QA Test Quality Review

**Date:** 2026-09-07
**Method:** `petrkindlmann/qa-skills` — `release-readiness` and `ai-qa-review`
**Decision:** local QA gate PASS; remote/public release remains NO-GO.

## Evidence

- The revised full Node test suite passed three consecutive times with 170/170 tests, no retry and no skipped test.
- Critical-path smoke passed in 496 ms and exercised doctor, CodeGraph index, source review and MCP initialize/tool discovery.
- StrykerJS 10.0.0 covered policy, review and CodeGraph resolution: 870 mutants, 820 killed, 42 survived, 8 timeout and 0 errors; total score 95.17% against the new 95% breaking threshold. Policy scored 99.07%, review 94.27% and the resolver 88.89%.
- Package audit reported 0 known vulnerabilities after pinning the vulnerable transitive `qs` range to 6.16.0.
- The first mutation run scored 36.19%. Stronger contract, state-machine, security-boundary and evidence tests raised it to 95.17%; the configured breaking threshold is now 95%.
- The packaged v0.3.0 VSIX was installed in isolated extension directories and exercised on VS Code 1.95.3 and 1.133.0, including native Problems diagnostics; the exact final hash is emitted outside Git by the release manifest to avoid changing the commit it attests.

## Reviewed files

| File | Scope | Result | Finding or evidence |
|---|---|---|---|
| `test/policy.test.mjs` | permissions, grants, environment matrices | PASS | exact policy, broker lifecycle, timeout/cancellation and decision contracts; policy mutation score 99.07% |
| `test/review.test.mjs` | rule detection, masking, severity, bug impact | PASS after correction | state-machine positions, evidence bounds, invalid paths, build proof and false-positive cases; review mutation score 94.27% |
| `test/publication.test.mjs` | portability, secrets, license, metadata, CI | PASS | canonical brand/repository and public-file requirements are regression tested |
| `test/agent-resources.test.mjs` | skill precedence, provenance, bounds and junctions | PASS | standard roots, pinned providers and fail-closed paths are asserted |
| `test/vscode-extension.test.mjs` | native diagnostics and malformed output | PASS | severity, line mapping, stale cleanup and host-smoke contract are asserted |
| `test/smoke.test.mjs` | runnable release critical path | PASS | subprocess exit, JSON schema, four named checks and duration budget asserted |
| `test/release-artifacts.test.mjs` | VSIX/source/SBOM integrity and provenance | PASS | deterministic bytes, writable permissions, containment, checksums and manifest-bound evidence |
| `test/codegraph.test.mjs` | parser correctness, resolution scope and scale | PASS | exact lines; same-file static/global/ambiguous cases; 5,000-symbol/call sub-second budget; resolver mutation 88.89% |

## Readability

PASS. Test names state behavior and condition. Fixtures are local and descriptive. The publication fixture is comparatively large but centralizes only the minimum valid public tree needed by negative tests.

## Reliability

PASS. The revised full execution is green; there are no sleeps, network calls, retries or shared mutable project state in the reviewed tests. Temporary workspaces are generated per test or smoke run.

## Diagnostic value

PASS. Assertions compare explicit objects, rule identifiers, lines, counts, repository metadata and subprocess errors. The smoke includes stderr when a child process fails.

## Design

PASS. External boundaries use real local subprocesses where valuable and in-process functions elsewhere. No production implementation is mocked. Mutation testing is isolated to policy, review and the CodeGraph resolution seam to keep the gate bounded.

## AI-generated test risks

PASS WITH OBSERVATIONS. Tests and implementation were evolved in the same engineering session, so a closed-loop risk existed. Test-first failures and an external mutation engine provided an independent constraint. Surviving mutants are mainly state-machine equivalences or defensive optional-access variants; the measured 95.17% exceeds the enforced 95% release threshold without narrowing the mutated production files.

## Coverage and remaining gaps

LOCAL PASS. Happy paths, denial paths, filesystem escapes, limits, concurrency, invalid manifests, secrets, process boundaries, CodeGraph ambiguity and standalone packaged VSIX installation are covered. Optional Hermes compatibility was probed in isolation but is not a gate. Candidate GitHub Actions/OSV, downloaded release assets and Protheus infrastructure remain external gates and are not represented as passing.

## Findings

| Severity | Finding | Resolution |
|---|---|---|
| High | Review could report direct system-table access when `DbSelectArea` appeared only in a comment or string. | Resolved with a lexical code-presence guard plus regression test. |
| Medium | Existing tests constrained only 36.19% of policy/review mutations. | Resolved for the preview gate: exact contracts and boundary cases raised the full focused scope to 95.17%, then the break threshold was raised to 95%. |
| Medium | Mutation dependency initially resolved a vulnerable transitive `qs`. | Resolved with a 6.16.0 override; package audit now reports zero vulnerabilities. |
| Low | Eight generated Stryker mutants timed out. | Accepted as killed by timeout under the standard mutation model; the 870-mutant run had 0 errors and passed its 95% threshold. |
| Medium | Treating `DbEval` as an open-ended loop leaked CA1003 into later code. | Resolved test-first; only the callback line is inspected lexically and the limitation is documented. |
| High | Deterministic ZIP normalization discarded write permissions, so VS Code could not install the VSIX on Windows. | Resolved by normalizing files to `0644`; fresh-install regression and host smoke pass on minimum/current versions. |
| High | Tracked final evidence would change the commit it was intended to attest. | Resolved with an ignored final-evidence template bound to a checksummed release manifest; the tracked file remains a fail-closed draft. |
| High | The release evidence schema required a real Hermes probe even though the product claimed Hermes was optional. | Resolved test-first: complete core evidence without a Hermes field now passes, while compatibility remains isolated and non-gating. |
| Medium | CodeGraph resolved duplicate symbols to the first file, including cross-file static functions. | Resolved with explicit same-file static precedence, inaccessible static rejection and ambiguous global output. |
| Low | Full CI ran twice for feature branches with open pull requests. | Resolved by limiting push CI to `main` and pull-request CI to changes targeting `main`. |

No unresolved high-severity QA finding remains. Automated TDS coexistence passes; assistive-technology inspection, final-candidate CI/OSV/public CodeQL, downloaded artifacts, live Protheus/Oracle acceptance and named release authorization remain external gates and are not waived by this report.
