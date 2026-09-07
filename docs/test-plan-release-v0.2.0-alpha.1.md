# Release v0.2.0-alpha.1 Test Plan

**Candidate date:** 2026-09-07
**Release manager:** Montagna
**QA execution:** Codex using the installed QA Skills playbooks
**Current decision:** NO-GO until candidate CI, final review, clean-commit artifacts, fresh VSIX install, and named approval are complete

## Scope and risk

| Feature | Risk | Test types | Current status |
|---|---|---|---|
| Environment permissions and containment | HIGH | Unit, integration, negative, symlink/junction | Passed locally |
| Project Memory, Journal, Skills, Rules | HIGH | Unit, concurrency, limits, filesystem | Passed locally |
| ADVPL/TLPP CodeGraph and review | HIGH | Unit, encoding, contract, mutation | Passed locally; lexical scope documented |
| MCP stdio and Hermes descriptors | HIGH | Protocol, process, isolated capability probe | Passed locally; real Hermes probe already recorded |
| Thin VS Code extension | HIGH | Unit, packaged VSIX install, real Extension Host | Passed locally on VS Code 1.95.3 and 1.133.0 |
| Public source and VSIX supply chain | HIGH | Secret/path scan, package contents, audit, OSV, checksums | Local checks passed; live OSV/candidate CI pending |
| TDN, Dictionary, Oracle, compiler/AppServer/RPO | HIGH | Fail-closed contract only | Passed as unavailable; live integration explicitly deferred |
| Model/prompt/RAG behavior | HIGH when activated | Golden eval, grounding, tool call, injection, cost/latency | Not applicable: no active LLM path in this alpha |

## Requirements-to-test coverage

| Requirement | Automated proof | Manual/external proof | Exit state |
|---|---|---|---|
| PROD-001 clone/worktree-equivalent publication audit | `test/publication.test.mjs` | Review tracked tree | Covered |
| PROD-002 self-contained VSIX | build + package verifier | Fresh VSIX install | Automated covered; install pending |
| PROD-003 four real VS Code commands | `test:vscode:host`, `test:vscode:minimum` | Minimum line in candidate CI | Packaged fresh install passed locally on minimum/current; CI pending |
| PROD-004 supply-chain/security gates | npm audit, OSV workflow, publication tests | Final security review | npm audit passed; OSV/review pending |
| PROD-005 immutable evidence | release builder/verifier | Named approval and GitHub Release | Implementation pending final clean commit |

## Entry criteria

- [x] Product spec and production-readiness spec are approved.
- [x] Baseline unit/integration suite passes.
- [x] Node.js 22, local VS Code, private GitHub repository, and isolated Hermes probe are available.
- [x] Locked development dependencies install with zero reported npm vulnerabilities.

## Exit criteria

- [ ] All unit, integration, protocol, smoke, mutation, package, and release verification gates pass on the exact candidate commit.
- [ ] Minimum supported VS Code gate passes in Linux CI; minimum/current packaged installs already pass locally.
- [ ] OSV reports no known vulnerability and npm reports no high/critical vulnerability.
- [ ] Complete diff receives correctness and security review with no blocking/high finding.
- [ ] Clean-commit source ZIP, VSIX, and CycloneDX SBOM hashes verify from `release-manifest-v0.2.0-alpha.1.json`.
- [x] Fresh isolated VSIX installation reproduces the four-command smoke locally.
- [ ] No open P0/P1 release defect remains.
- [ ] Named human approver signs the exact commit and authorizes repository visibility/tag/release.

## Explicitly non-applicable tests

DAST, browser cross-compatibility, accessibility, visual regression, HTTP API/auth/session, database migration, production traffic canary, and live AI evals do not match the alpha's local extension/stdio surface. They are not counted as passes. Their gates activate when the corresponding surface is implemented.

## Rollback exercise

Before publication, rollback means rejecting the candidate. After publication, tags are immutable: withdraw the release/VSIX, point users to the last known-good version, publish an advisory if security-related, and fix forward with a higher version. The first public release must record a timed dry run of this procedure.
