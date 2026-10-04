# Validation

Baseline: SDK 2.1 official MCP 24/25, smoke FAIL; SDK 2.0 base MCP25/25/smokePASS. Head full coverage368/371; two EOF failures plus waiver fixture expired on 2026-10-01. Pre-change CI28September369/371. Local environment Windows/Node24.19.0.

Required gates: lifecycle tests, MCP25+ tests, fixed-clock CI tests, source/bundle standard and finite smoke, build, complete coverage and structural/publication development checks, benchmark. Independent review before delivering the local commit. Capture command exit codes in external evidence; no generated/personal logs committed.

No GO for publication from local-only checks. Windows/Linux Node22/24 protected CI and existing release/external gates remain separate requirements. Clock changes are test-only. MCTB and production are outside scope.

## Completed local validation - 2026-10-04, America/Sao_Paulo

The final functional tree was validated before local commit on Windows, Node 24.19.0, npm 11.17.0, based on PR head `9f0e933ea4a6caebc28a1177d0bc055411159f6d`. The final full gate finished at 11:22. Subsequent changes update only this validation record and task status; functional files retain their independently reviewed hashes.

| Check | Result | External evidence filename |
|---|---|---|
| Initial failing regression suite | RED before runtime changes | fix-red.log |
| Blocked SDK send cleanup regression | RED then GREEN after the reviewed fix | fix-review-red.log; fix-review-green.log |
| Cancellation request shape regression | RED then GREEN; requests cannot retire another request as notifications | fix-cancel-shape-red.log; fix-lifecycle-final.log |
| Final lifecycle and real-process cancellation/deadline | 14/14 PASS (12 lifecycle + 2 real process) | fix-lifecycle-final.log |
| Final npm run validate | PASS, exit 0; 386/386 tests; coverage 91.09% lines / 74.80% branches / 90.20% functions; 72 sources / 18 manifests; publication development PASS, 330 files, no errors/blockers | fix-validate-final.log |
| npm run benchmark; npm run benchmark:large | PASS | fix-benchmark.log; fix-benchmark-large.log |
| Source/bundle standard and finite-input smoke | PASS; external harness repeats every mode three times with all expected IDs | repro-fixed-source.json; repro-fixed-bundle.json; fix-focused-final.log |
| Independent review | No remaining functional blocker; reproduced cleanup finding resolved; final cancellation guard reviewed; lifecycle independently 12/12 PASS and real process 2/2 PASS | review-final.md |
| npm audit --audit-level=moderate | FAIL: 2 vulnerable dev dependencies (1 high, 1 moderate), already present in the base lockfile | fix-audit.log |
| npm audit --omit=dev --audit-level=moderate | PASS: 0 reported runtime vulnerabilities | fix-audit-runtime.log |

The full audit is not clean. Installed dev-only `brace-expansion` 5.0.9 has three advisories: GHSA-q2hr-2g5m-vwhr (moderate CPU denial of service; patched 5.0.12), GHSA-qhr7-859c-m2p7 (high stack exhaustion; patched 5.0.11), and GHSA-6j4f-fj2g-mc7p (high stack exhaustion; patched 5.0.10). Version 5.0.12 covers all three. Installed dev-only `fast-uri` 3.1.7 has GHSA-hrr3-gc8f-f4qj (moderate host normalization inconsistency; patched 3.1.8). npm reports fixes available; no dependency remediation or lockfile change is included here.

The CI job `Mutation and dependency audit` runs the full audit before mutation testing, and `validate:release-candidate` also requires the full audit. With this lockfile and the current advisory database, that gate is expected to fail independently of the MCP regression. Windows/Linux Node22/24 CI, mutation, VS Code Host, release artifacts and applicable external gates have not been rerun for this correction. Existing CI success from September 28 does not qualify the current dependency audit; these advisory records were published to the GitHub database on September 29.

Advisory sources: [quadratic expansion](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr), [nested brace recursion](https://github.com/advisories/GHSA-qhr7-859c-m2p7), [comma parsing recursion](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p), [fast-uri host normalization](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj). Dependency paths and installed/base versions are retained in external evidence. Exploitability within this project's QA tooling has not been demonstrated; dev-only status does not waive its audit gate.

Logs and reviewer reports remain outside the repository, preserving the public-tree restrictions on personal paths and generated evidence. No push, merge, deployment, global installation or production/MCTB action is part of this local completion.
