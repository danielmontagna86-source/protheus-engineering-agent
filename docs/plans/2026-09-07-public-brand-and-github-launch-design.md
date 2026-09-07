# Public Brand and GitHub Launch Design

**Date:** 2026-09-07
**Decision:** retain `Protheus Engineering Agent` as the descriptive public product name and publish from `danielmontagna86-source/protheus-engineering-agent` only after evidence gates pass.

## Approaches considered

1. **Descriptive product name — selected.** Highest audience clarity and search intent, with explicit independent-project and trademark guardrails.
2. **Language-only name (`ADVPL Engineering Agent`).** Lower Protheus product association, but narrower than the planned TLPP, Dictionary, TDN and build scope.
3. **Invented brand/acronym.** More distinctive, but creates avoidable education cost for a pre-public community alpha.

## Launch design

The repository is the first distribution channel. The VS Code Marketplace and npm package publication remain deferred. The README leads with the category and runnable capabilities, then states alpha limitations and independence. Claims are permitted only when backed by a test, source location, CI run or versioned release-evidence record.

The initial remote is created privately from a fresh Git history. A preparation branch runs the Windows/Linux and Node 22/24 matrix. Publication remains NO-GO until the candidate commit has green CI, a repeated code/security review, the automated CLI/MCP smoke, a manual Extension Development Host smoke, an isolated Hermes probe and a verified archive checksum. Public visibility and the immutable tag occur only after the evidence record is complete and signed.

## Error and rollback behavior

Missing evidence is a blocker, never an implicit waiver. Before public visibility, an invalid remote can remain private or be renamed. After a tag is consumed, it is never rewritten: withdraw the release, communicate the issue and publish a corrected version.

## Testing contract

- Unit and integration tests cover domain behavior, adapters, containment and policy.
- The release smoke covers doctor, CodeGraph indexing, source review and MCP initialization/tool discovery.
- GitHub CI repeats the suite and smoke on four OS/runtime combinations.
- Manual smokes cover the real VS Code Extension Development Host and an isolated supported Hermes installation.
- The versioned release evidence is the final auditable GO/NO-GO source.
