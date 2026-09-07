# Production Readiness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Turn `v0.2.0-alpha.1` into a reproducible, installable, reviewed release candidate while preserving the explicit human/publication gate.

**Architecture:** Keep the VS Code extension as an adapter. Bundle the existing runtime and MCP entry points into the VSIX at build time, exercise the commands in a real isolated Extension Host, and make release evidence machine-verifiable. External services remain fail-closed.

**Tech Stack:** Node.js 22/24, `node:test`, esbuild, `@vscode/test-electron`, `@vscode/vsce`, GitHub Actions, OSV-Scanner.

---

### Task 1: Make publication audits clone/worktree equivalent

**Files:**
- Modify: `test/publication.test.mjs`
- Modify: `scripts/publication-check.mjs`

1. Add a failing regression test for a legitimate root `.git` file.
2. Add a failing regression test for a nested `.git` file.
3. Ignore only the root Git metadata entry and continue rejecting nested metadata.
4. Run the focused publication tests and full development audit.

### Task 2: Build a self-contained VS Code extension

**Files:**
- Modify: `package.json`, `package-lock.json`
- Modify: `apps/vscode-extension/package.json`
- Modify: `apps/vscode-extension/extension.cjs`
- Create: `apps/vscode-extension/README.md`
- Create: `apps/vscode-extension/.vscodeignore`
- Create: `scripts/build-extension.mjs`
- Create: `scripts/verify-vsix.mjs`
- Modify: `test/vscode-extension.test.mjs`

1. Add failing tests for packaged runtime-path selection and command result contracts.
2. Pin the official build/test/package development dependencies.
3. Bundle CLI and MCP entry points into `apps/vscode-extension/dist`.
4. Package a VSIX with only the required public files.
5. Verify the VSIX archive contents and reject missing/unexpected sensitive entries.

### Task 3: Run all four commands in a real Extension Host

**Files:**
- Create: `scripts/run-vscode-smoke.mjs`
- Create: `integration/vscode-host/index.cjs`
- Modify: `.github/workflows/ci.yml`

1. Create an isolated temporary workspace and user-data/extensions directories.
2. Launch the minimum supported VS Code with other extensions disabled.
3. Execute and validate Doctor, Index Workspace, Show Engineering Context, and Review Active File.
4. Add a bounded Linux CI job using `xvfb-run` and retain local-current-VS-Code support.

### Task 4: Strengthen supply-chain and AI-boundary evidence

**Files:**
- Create: `.github/workflows/security.yml`
- Create: `.github/dependabot.yml`
- Create: `docs/security/owasp-coverage.md`
- Modify: `SECURITY.md`, `THIRD_PARTY_NOTICES.md`
- Modify: `test/publication.test.mjs`

1. Add OSV dependency scanning from the official action pinned to its release commit; use a least-privilege direct job while the private repository cannot grant the reusable workflow's SARIF permission.
2. Add Dependabot for npm and GitHub Actions.
3. Document OWASP 2025 and OWASP LLM/agent coverage, including explicit N/A/deferred rows.
4. Test that untrusted-data and fail-closed claims remain present in the product contract.

### Task 5: Make release artifacts and rollback auditable

**Files:**
- Create: `scripts/build-release.mjs`
- Create: `scripts/verify-release.mjs`
- Modify: `package.json`, `.gitignore`, `.gitattributes`
- Modify: `RELEASE-v0.2.0-alpha.1.md`
- Modify: `release-evidence/v0.2.0-alpha.1.json`
- Modify: `docs/publication-plan.md`, `docs/validation-report.md`, `CHANGELOG.md`

1. Build source ZIP, VSIX, and CycloneDX SBOM artifacts from a clean exact commit.
2. Generate SHA-256 checksums and a machine-readable manifest.
3. Verify archive contents, hashes, version alignment, and clean-source provenance.
4. Document rollback and fresh-install procedures.
5. Keep release evidence `NO-GO` until final CI, reviews, installed-VSIX smoke, and named approval are all real.

### Task 6: Perform independent pre-merge review and live CI

**Files:**
- Review all branch changes and generated evidence.

1. Run focused tests after each implementation task.
2. Run `npm run validate`, smoke, mutation, dependency audit, package verification, Extension Host smoke, and release dry-run from a clean worktree.
3. Review the complete diff for security, correctness, portability, scope, and documentation truthfulness.
4. Push the branch and open a focused pull request.
5. Require live GitHub CI evidence; remediate any finding before merge.
6. Do not change repository visibility or create the release without the final human gate.
