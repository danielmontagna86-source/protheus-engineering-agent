# QA Test Quality Review

**Date:** 2026-09-07
**Method:** `petrkindlmann/qa-skills` — `release-readiness` and `ai-qa-review`
**Decision:** local QA gate PASS; remote/public release remains NO-GO.

## Evidence

- Full Node test suite passed three consecutive executions with no retry and no skipped test.
- Critical-path smoke passed in well under the five-minute budget and exercised doctor, CodeGraph index, source review and MCP initialize/tool discovery.
- StrykerJS 10.0.0 mutation gate covered the policy and review cores: 366 mutants, 302 killed, 63 survived, 1 timed out; total score 82.79% against a 60% breaking threshold.
- Package audit reported 0 known vulnerabilities after pinning the vulnerable transitive `qs` range to 6.16.0.
- The first mutation run scored 36.19%. Stronger contract and boundary tests raised it without lowering the threshold.

## Reviewed files

| File | Scope | Result | Finding or evidence |
|---|---|---|---|
| `test/policy.test.mjs` | permissions, grants, environment matrices | PASS | exact policy and decision contracts; policy mutation score 98.48% |
| `test/review.test.mjs` | rule detection, masking, severity, bug impact | PASS after correction | new negative tests found and fixed metadata false positives in comments/strings; review mutation score 79.33% |
| `test/publication.test.mjs` | portability, secrets, license, metadata, CI | PASS | canonical brand/repository and public-file requirements are regression tested |
| `test/smoke.test.mjs` | runnable release critical path | PASS | subprocess exit, JSON schema, four named checks and duration budget asserted |

## Readability

PASS. Test names state behavior and condition. Fixtures are local and descriptive. The publication fixture is comparatively large but centralizes only the minimum valid public tree needed by negative tests.

## Reliability

PASS. Three full executions were green; there are no sleeps, network calls, retries or shared mutable project state in the reviewed tests. Temporary workspaces are generated per test or smoke run.

## Diagnostic value

PASS. Assertions compare explicit objects, rule identifiers, lines, counts, repository metadata and subprocess errors. The smoke includes stderr when a child process fails.

## Design

PASS. External boundaries use real local subprocesses where valuable and in-process functions elsewhere. No production implementation is mocked. Mutation testing is isolated to the policy and review cores to keep the gate bounded.

## AI-generated test risks

PASS WITH OBSERVATIONS. Tests and implementation were evolved in the same engineering session, so a closed-loop risk existed. Test-first failures and an external mutation engine provided an independent constraint. Surviving mutants remain backlog evidence for future strengthening; the 82.79% score is above the configured 60% release threshold.

## Coverage and remaining gaps

LOCAL PASS. Happy paths, denial paths, filesystem escapes, limits, concurrency, invalid manifests, secrets and process boundaries are covered. Real VS Code Extension Development Host, Hermes, GitHub Actions and Protheus infrastructure remain external/manual gates and are not represented as passing.

## Findings

| Severity | Finding | Resolution |
|---|---|---|
| High | Review could report direct system-table access when `DbSelectArea` appeared only in a comment or string. | Resolved with a lexical code-presence guard plus regression test. |
| Medium | Existing tests constrained only 36.19% of policy/review mutations. | Resolved for the alpha gate: exact contracts and boundary cases raised the score to 82.79%. |
| Medium | Mutation dependency initially resolved a vulnerable transitive `qs`. | Resolved with a 6.16.0 override; package audit now reports zero vulnerabilities. |
| Low | One generated Stryker mutant timed out. | Accepted as killed by timeout; the normal suite was green three times and no production test uses time-based waiting. |

No unresolved high-severity QA finding remains. This report does not waive the external evidence required by `RELEASE-v0.2.0-alpha.1.md`.
