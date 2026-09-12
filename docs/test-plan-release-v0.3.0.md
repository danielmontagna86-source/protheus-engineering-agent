# Release v0.3.0 Test Plan

**Candidate date:** 2026-09-07
**Release manager:** Montagna
**QA execution:** Codex using the installed QA Skills playbooks
**Current decision:** NO-GO until complete P0 execution, candidate CI, final review, clean-commit artifacts, installed-VSIX UAT, and named approval are complete

## Scope and risk

| Feature | Risk | Test types | Current status |
|---|---|---|---|
| Environment permissions and containment | HIGH | Unit, integration, negative, symlink/junction | Existing foundation; rerun required |
| Project Memory, Journal, Skills, Rules/providers | HIGH | Unit, concurrency, limits, filesystem, provenance | Expanded implementation; full gate pending |
| ADVPL/TLPP CodeGraph and review | HIGH | Unit, encoding, contract, mutation | Expanded high-confidence lexical rules pass; semantic coverage remains explicitly deferred |
| MCP stdio and optional host descriptors | HIGH | Protocol, process, contract | Existing foundation; rerun required |
| Thin VS Code extension | HIGH | Contract, packaged install, native Problems, real host | Expanded implementation; host rerun required |
| Public source and VSIX supply chain | HIGH | Secret/path scan, package contents, OSV, SBOM, checksums | Final clean-commit evidence pending |
| TDN, Dictionary, Oracle, compiler/AppServer/RPO | HIGH | Fail-closed contract only for preview | Live integration deferred unless separately authorized |
| Model/prompt/RAG behavior | HIGH when activated | Golden eval, grounding, injection, cost/latency | Not applicable to offline P0; no active model path |

## Entry criteria

- [x] Product and premium leadership specs are accepted.
- [x] Node.js 22/24 and private GitHub repository are available; Hermes is not required.
- [x] Official EngPro provider is pinned with license provenance.
- [ ] All selected P0 tasks are implemented with RED/GREEN evidence.

## Exit criteria

- [ ] All unit, integration, protocol, smoke, mutation, package, and release verification gates pass on the exact candidate commit.
- [ ] Minimum and current VS Code gates pass from the packaged VSIX.
- [ ] OSV and npm report no unresolved high/critical vulnerability.
- [ ] Complete diff receives correctness and security review with no blocker/high finding.
- [ ] Clean-commit source ZIP, VSIX, and CycloneDX SBOM hashes verify from `release-manifest-v0.3.0.json`.
- [ ] Clean-profile UAT validates walkthrough, diagnostics, and first value.
- [ ] No open P0 release defect remains.
- [ ] Named human approver authorizes each external publication action.

## Explicitly deferred tests

DAST, browser cross-compatibility, HTTP auth/session, database migration, production traffic canary, live Oracle/AppServer deployment, and live AI evals do not match the offline P0 surface. They are not counted as passes; their gates activate with the corresponding P1/P2 feature.

## Rollback exercise

Before publication, rollback means rejecting the candidate. After publication, tags remain immutable: withdraw the release/VSIX if necessary, point users to the last known-good version, publish a security advisory when applicable, and fix forward with a higher numeric version. The first public release must record a timed dry run.
