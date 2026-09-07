# Production Readiness Specification

**Status:** Approved for implementation; public release remains gated
**Owner:** Montagna
**Target:** `v0.2.0-alpha.1`

## Product outcome

The public alpha must be installable as a VS Code extension, runnable without Hermes or external credentials, and traceable to a reviewed source commit. It must fail closed when an external capability is absent and must not publish local state, Git metadata, credentials, or private project material.

## User stories and acceptance criteria

### PROD-001: Reproducible public tree

As a maintainer, I receive the same publication result from a normal clone and a Git worktree.

- WHEN the repository root contains the legitimate root `.git` directory or worktree pointer THEN the publication audit ignores that root metadata.
- WHEN any nested `.git` file or directory is present THEN the publication audit fails with `NESTED_REPOSITORY`.
- WHEN the tracked source tree is audited THEN no local runtime state, personal path, secret-bearing file, credential marker, or symlink is accepted.

### PROD-002: Installable VS Code artifact

As a user, I can install a GitHub Release VSIX without cloning the monorepo.

- WHEN the extension runtime is built THEN the CLI and MCP entry points are bundled into the extension with no runtime npm dependency.
- WHEN the VSIX is packaged THEN it contains the extension entry point, bundled runtime/MCP files, license, README, and manifest, and excludes tests, source workspaces, `.pea`, Git metadata, and development dependencies.
- WHEN the installed extension runs its four commands THEN each command delegates to the bundled runtime and returns a bounded JSON result or a clear error.

### PROD-003: Real Extension Host gate

As a contributor, I receive automated proof that the extension activates in VS Code.

- WHEN the Extension Host smoke runs THEN it opens an isolated temporary workspace and executes Doctor, Index Workspace, Show Engineering Context, and Review Active File.
- WHEN the smoke completes THEN the four command results are valid and no personal VS Code profile, extension set, or Hermes profile is modified.
- WHEN CI runs the Extension Host gate THEN it uses the minimum supported VS Code line, a clean user-data directory, and a bounded timeout.

### PROD-004: Supply-chain and security gates

As a consumer, I can inspect how source and artifacts were checked.

- WHEN dependencies change THEN the lockfile remains authoritative and dependency scanning reports no high or critical finding.
- WHEN a pull request runs THEN pinned third-party Actions, least-privilege permissions, source checks, mutation testing, publication checks, and the Extension Host gate must pass.
- WHEN the repository is still private on a plan that cannot enable rulesets or attestations THEN the limitation is recorded and the public release remains NO-GO.
- WHEN an actual LLM/RAG path is introduced THEN prompt, grounding, tool-selection, injection, cost, and model regression evals become mandatory; they are not claimed for the deterministic alpha.

### PROD-005: Immutable release evidence

As a release approver, I can reproduce and roll back a published alpha.

- WHEN release artifacts are built from the final candidate commit THEN every artifact has a SHA-256 entry and the source commit is recorded.
- WHEN the candidate changes after artifact creation THEN prior artifact evidence is invalidated and must be regenerated.
- WHEN the release is approved THEN a named approver, final CI URL, code/security review result, VS Code smoke result, three artifact checksums, manifest checksum, and fresh-install result are recorded outside the tracked tree and attached to the release.
- WHEN optional Hermes compatibility evidence is recorded THEN it is isolated and labelled non-gating.
- WHEN final evidence is checked THEN it must match the exact commit and artifact set in the checksummed release manifest.
- WHEN any required proof is missing THEN the release checker returns `BLOCKED` and no tag, release, visibility change, or Marketplace publication is performed.

## Non-functional requirements

- Local deterministic smoke target: under 5 minutes.
- Extension Host smoke target: under 10 minutes in CI.
- Runtime dependencies in the distributed extension: zero third-party packages after bundling.
- Supported development runtime: Node.js 22 and 24 on Windows and Linux.
- Supported VS Code baseline: `1.95.x`; current stable is additionally exercised before a public release.
- Security model: deny by default, workspace containment, bounded untrusted inputs, no implicit network or credential access.

## Explicit non-goals for this alpha

- VS Code Marketplace publication.
- npm package publication.
- Live Oracle, TDN, Dictionary, compiler, AppServer, RPO, paid LLM, or production deployment validation.
- Claiming semantic completeness of the lexical CodeGraph or deterministic reviewer.
- Promptfoo, Ragas, DeepEval, or Garak evidence before a model/prompt/RAG path exists.

## Traceability

| Requirement | Planned proof |
|---|---|
| PROD-001 | publication unit tests + audit in normal clone/worktree |
| PROD-002 | bundle test + VSIX package/contents verification |
| PROD-003 | `@vscode/test-electron` Extension Host smoke locally and in CI |
| PROD-004 | CI, mutation, npm audit, OSV scan, security coverage document |
| PROD-005 | release builder, checksums, release evidence schema, fresh-install checklist |
