# Production Readiness Code Review

**Date:** 2026-09-07

**Scope:** complete `production-readiness` diff against `main`

**Local decision:** PASS WITH ACCEPTED ALPHA LIMITS; candidate GitHub CI/OSV remains mandatory before merge or release.

## Review outcome

No unresolved blocker or high-severity code/security finding remains in the local diff. Review covered the thin extension boundary, bundled runtime paths, MCP input handling, workspace containment, CodeGraph scale, release/archive integrity, CI permissions, dependency licenses, documentation truthfulness, and fail-closed external integrations.

## Findings resolved during review

| Severity | Finding | Resolution and proof |
|---|---|---|
| High | The deterministic ZIP rewrite removed writable permission bits, preventing VS Code from installing the VSIX on Windows. | Normalize files to `0644` and directories to `0755`; archive regression and fresh-install smokes pass on VS Code 1.95.3/1.133.0. |
| High | A tracked final evidence file would change the commit it claimed to attest. | Keep the tracked draft at `NO-GO`; generate external final evidence bound to the checksummed manifest, exact commit, and artifact set. |
| High | Third-party security Actions require immutable references. | OSV and CodeQL v4.36.0 are pinned to verified full commit SHAs and asserted by workflow contract tests. |
| Medium | CodeGraph performed a full prefix scan for every symbol/call and took about 2.4 seconds on 5,000 declarations. | Build one line index and use binary lookup; exact-line and sub-second budget tests pass in tens of milliseconds locally. |
| Medium | MCP accepted undeclared fields and stdio had no request-size bound. | Enforce exact per-tool arguments, cap one request at 1 MiB, reject oversize input, and continue with the next request. |
| Medium | Extension subprocesses had no upper time bound. | Apply a 120-second timeout and regression assertion. |
| Medium | The development-host smoke did not prove the distributed package. | Package, install, and load the VSIX from an isolated extension directory before running all four commands. |
| Medium | The VSIX verifier claimed an allow-list but accepted arbitrary non-sensitive extra entries. | Enforce exactly nine case-insensitive paths and reject extras or case-colliding duplicates. |
| Medium | An explicit version and executable override could produce misleading smoke evidence. | Exact `--version` takes precedence, the actual CLI version is queried and compared, and the report includes the tested VSIX SHA-256. |
| Low | Mutation testing copied the large VS Code cache into its sandbox. | Exclude generated VS Code/build/release caches; the final mutation run cleans its sandbox and retains the same score. |
| High | The core release checker required Hermes even though the product was documented as standalone. | Remove Hermes from required evidence and add a regression proving complete core evidence passes without that field. |
| Medium | CodeGraph resolved every canonical name to the first declaration, so duplicate statics could point into the wrong source file. | Add a dedicated resolver: same-file static wins, cross-file static is inaccessible, and duplicate global targets stay unresolved as ambiguous. |
| Low | Feature branches triggered both push and pull-request copies of the full CI. | Apply GitHub Flow triggers to pull requests into `main` and direct pushes to `main`. |
| Medium | `DbEval` incremented persistent loop depth even though it is a callback function, causing later `GetMV` calls to be reported as inside a loop. | Add a RED regression, restrict `DbEval` CA1003 inspection to its lexical line, document the parser limit, and rerun mutation. |
| High | Bug-review changed files accepted colon-bearing relative strings that can name Windows alternate streams. | Add a RED boundary test and reject every colon-bearing changed-file path before evidence serialization. |
| Medium | The original mutation threshold allowed weak test contracts. | Add direct state-machine, approval lifecycle, security-boundary and evidence tests; reach 95.17% on 870 mutants and enforce a 95% breaking threshold. |

## Accepted alpha boundaries

- CodeGraph is lexical, not a full ADVPL/TLPP grammar.
- No real compiler, AppServer, RPO, Oracle, TDN, Dictionary, hosted model, or production deployment is claimed.
- `@vscode/vsce-sign` is a development-only transitive package under Microsoft terms; it is not executed for signing or redistributed in the VSIX.
- Local `actionlint` is unavailable; GitHub must parse and execute both workflows on the candidate PR.
- The public visibility change, immutable tag, GitHub Release, and named approval remain outside this local PASS.

## Evidence

- 170/170 Node tests pass three consecutive times, with no skips or retries.
- Critical CLI/MCP smoke passes in 496 ms.
- Mutation score is 95.17% overall (99.07% policy, 94.27% review, 88.89% CodeGraph resolver) against a 95% breaking threshold; 0 mutation errors.
- `npm audit --audit-level=high` reports zero vulnerabilities.
- The same packaged VSIX installs and passes all four commands plus native diagnostics on VS Code 1.95.3 and 1.133.0; its exact final hash is emitted outside Git by the commit-bound release manifest.
- Active-worktree publication audit intentionally rejects old locked local mutation state. Exact-commit archive audit is the remaining local publication proof; release mode remains blocked by candidate CI/OSV/public CodeQL, downloaded-asset proof, assistive-technology UAT, live Protheus/Oracle acceptance and named approval.
