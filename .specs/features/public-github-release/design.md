# Public GitHub Release Design

**Spec:** `.specs/features/public-github-release/spec.md`
**Status:** In Progress

## Architecture Overview

The public repository remains a dependency-free Node.js monorepo. Runtime modules own domain behavior; VS Code and Hermes are adapters. Repository policy and CI are a separate release boundary and do not gain access to Protheus environments, credentials or source repositories.

```text
GitHub visitor / contributor
  -> docs + specs + governance
  -> read-only CI matrix (Windows/Linux, Node 22/24)
       -> unit/integration tests + critical-path smoke
       -> structural/publication checks

VS Code -> runtime/CLI -> domain modules
Hermes ACP -> per-session MCP descriptor -> MCP stdio -> runtime
                                       -> .pea project data (untrusted)
```

## Components

### Publication auditor

- Location: `scripts/publication-check.mjs`
- Inputs: repository root and release intent.
- Outputs: structured PASS/FAIL/BLOCKED report.
- Checks: full license consistency, required public files, sensitive paths/material, symlinks/local state, target version consistency and versioned release evidence.
- Release evidence is machine-readable JSON and includes commit, live CI, reviews, VS Code/Hermes smokes, approver and an artifact SHA-256 that the auditor recalculates.
- No network access and no file mutation.

### GitHub CI

- Location: `.github/workflows/ci.yml`.
- Triggers: push and pull request.
- Matrix: Ubuntu/Windows × Node 22/24.
- Permissions: `contents: read`; no secrets; no `pull_request_target`.
- Commands: `node --test`, `node scripts/smoke.mjs`, `node scripts/check.mjs` and the development publication audit on the OS/runtime matrix; a focused mutation and dependency-audit job runs once on Ubuntu/Node 22.
- Concurrency: cancel superseded runs on the same ref.

### Public documentation and governance

- README, English README, SECURITY, CONTRIBUTING, Code of Conduct, CHANGELOG and release checklist.
- Product disclaimer distinguishes independent compatibility tooling from official vendor software.
- Third-party notices preserve evidence without redistributing third-party source.

### Hermes session adapter

- Default `HERMES_HOME`: `<workspace>/.pea/hermes`.
- Executable override: `PEA_HERMES_COMMAND`.
- ACP receives a stdio MCP descriptor for this product with `PEA_ENVIRONMENT=production` and `PEA_WORKSPACE=<workspace>`.
- Skills and Rules are read live for every session snapshot and treated as untrusted project data.
- `.pea` and the Hermes home are rejected when a symlink/junction could escape the workspace.
- VS Code carries its Electron-as-Node executable contract through the generated MCP descriptor.

## Error Handling

- Missing license/owner: publication report is BLOCKED, not silently accepted.
- Missing optional integration: runtime returns unavailable without fallback.
- Invalid project resource: omit bounded resource; do not execute content.
- CI failure: branch remains unmergeable after branch protection is configured.

## Rollback

- Before first public release: delete/rename the unpublished remote or keep it private; no user migration exists.
- After a tagged release: mark affected release as withdrawn, publish a security advisory when applicable, fix forward with a new tag; never rewrite a consumed tag.
- Extension publication is deferred, so the alpha rollback surface is GitHub source/release only.
