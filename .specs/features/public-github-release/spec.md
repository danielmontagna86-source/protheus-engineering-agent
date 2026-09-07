# Public GitHub Release Specification

**Status:** Approved; external release evidence pending
**Owner:** Montagna
**Target:** `v0.2.0-alpha.1`

## User Stories and Acceptance Criteria

### PUB-001: Portable public source tree

As a contributor, I can clone the repository on Windows or Linux without receiving personal files or machine-specific configuration.

- WHEN the publication audit scans tracked product files THEN no personal absolute path, `.env`, credential, `.pea` runtime state or recovered repository state is present.
- WHEN the runtime starts without external configuration THEN TDN, Dictionary, Oracle and build integrations remain unavailable/fail-closed.
- WHEN `.pea`, a reviewed source or a release artifact resolves through a symlink/junction outside the workspace THEN the operation fails closed.

### PUB-002: Independent product identity

As a visitor, I understand what the product does and that it is not an official TOTVS, Protheus or Hermes product.

- WHEN README and legal notices are read THEN the independent-project disclaimer is visible.
- WHEN third-party references are listed THEN their use, license evidence and no-copy boundary are documented.

### PUB-003: Reproducible CI

As a maintainer, I receive fast evidence on every push and pull request.

- WHEN CI runs on Ubuntu and Windows with Node.js 22 and 24 THEN `node --test` and `node scripts/check.mjs` must exit 0.
- WHEN CI runs THEN the dependency-free CLI/MCP smoke must finish in under five minutes and exit 0.
- WHEN multiple commits update the same branch THEN older CI runs are cancelled.
- WHEN CI checks out code THEN token permissions are read-only.

### PUB-004: Contribution and security governance

As a contributor or security researcher, I know how to propose changes and report vulnerabilities.

- WHEN repository policy files are inspected THEN CONTRIBUTING, SECURITY, Code of Conduct and pull-request guidance exist.
- WHEN security issues are reported THEN public issue disclosure is discouraged and GitHub private vulnerability reporting is the primary channel.

### PUB-005: Explicit product license

As a user, I know what rights I have.

- WHEN a public release is created THEN package metadata and LICENSE contain the same approved SPDX license.
- UNTIL the owner chooses a license THEN publication readiness returns NO-GO.

**Resolved decision:** Apache-2.0 selected and applied on 2026-09-07.

### PUB-006: Controlled GitHub release

As a maintainer, I can cut a traceable release without publishing from an unreviewed branch.

- WHEN `v0.2.0-alpha.1` is proposed THEN CI, code review, security review, smoke tests and changelog are complete.
- WHEN artifacts are uploaded THEN checksums and source provenance accompany them.
- WHEN release readiness runs THEN it recalculates the declared artifact SHA-256 and rejects an external, missing or symlinked artifact.
- WHEN main is configured THEN required checks and pull-request review protect it.

### PUB-007: Thin VS Code experience

As a VS Code user, I can run the product without adopting a replacement IDE.

- WHEN the extension is activated THEN it registers only orchestration commands and delegates to the runtime.
- WHEN Show Engineering Context runs THEN memory, journal, Skills, Rules and isolated Hermes descriptors are returned.

### PUB-008: Isolated Hermes integration

As a Hermes user, I can attach the product MCP without altering my everyday profile.

- WHEN session configuration is generated THEN `HERMES_HOME` points under the target workspace.
- WHEN the MCP descriptor is generated THEN its environment defaults to `production` and carries only the authorized workspace.
- WHEN VS Code launches the runtime through Electron THEN the generated MCP descriptor preserves a valid Electron-as-Node contract.

### PUB-009: Public documentation

As a new visitor, I can understand installation, limits, security and roadmap.

- WHEN the alpha is published THEN the primary README is in Portuguese and an English README is available.
- WHEN unsupported integrations are mentioned THEN documentation labels them planned, unavailable or unverified.

### PUB-010: Release evidence

As a release approver, I can reproduce the decision.

- WHEN release readiness is evaluated THEN a versioned checklist records commands, counts, blockers and final GO/NO-GO.

## Edge Cases

- Hermes executable is not on PATH: use `PEA_HERMES_COMMAND`; never hardcode a developer path.
- A Skill directory has no `SKILL.md`: omit it without breaking the snapshot.
- A Skill/Rule exceeds 64 KiB or is a symlink: omit it.
- Fork pull requests are untrusted: CI receives read-only permissions and no secrets.
- License or GitHub owner is missing: publication is blocked, while local development remains allowed.
- A candidate lacks live CI, review, smoke or artifact evidence: release remains NO-GO even when local gates pass.

## Traceability

| Requirement | Proof |
|---|---|
| PUB-001 | publication audit + integration fail-closed tests |
| PUB-002 | README/legal review |
| PUB-003 | CI workflow + local structural validation + first draft PR run |
| PUB-004 | repository policy files review |
| PUB-005 | publication readiness gate |
| PUB-006 | release checklist and GitHub settings evidence |
| PUB-007 | VS Code adapter tests + manual smoke |
| PUB-008 | Hermes adapter/runtime/MCP tests |
| PUB-009 | docs link and content checks |
| PUB-010 | versioned release evidence file |
