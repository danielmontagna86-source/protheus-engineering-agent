# Stable Functional Gates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Close every Stable 1.0 gate that can be proven autonomously with the authorized Docker/AppServer laboratory, the installed VS Code/TDS stack, and deterministic repository tests.

**Architecture:** Keep Docker as private QA infrastructure and keep the distributed VSIX independent from it. Strengthen the public TDS bridge with bounded cancellation, expose the already implemented generic named-query port through runtime and MCP host injection, and bind live sanitized receipts to the exact candidate without bundling credentials, drivers, RPO, or proprietary artifacts.

**Tech Stack:** Node.js 22+, VS Code Extension API, VS Code Language Model Tools, MCP TypeScript SDK, `node:test`, Docker Compose, PostgreSQL, TDS-VSCode.

---

### Task 1: Correct the functional AppServer/RPO acceptance contract

**Files:**
- Modify: `.specs/features/stable-1-0-launch/spec.md`
- Modify: `.specs/features/stable-1-0-launch/tasks.md`
- Modify: `.specs/features/stable-1-0-launch/validation.md`
- Modify: `.specs/project/STATE.md`
- Modify: `docs/qa/docker-appserver-pea-homologation-2026-09-24.md`

**Step 1:** Record the owner's attestation that the laboratory RPO came from the official TOTVS portal, without copying or redistributing it.

**Step 2:** Separate functional compatibility from commercial-license status. The lab may prove the supported PEA/TDS behavior but may not be described as official TOTVS certification.

**Step 3:** Keep G6 partial only for unexecuted timeout/cancel/unavailable cases and the future exact Stable artifact.

**Step 4:** Run `git diff --check` and the documentation/source checker with `node scripts/check.mjs`.

**Step 5:** Commit the documentation/spec correction.

### Task 2: Bound and cancel the public TDS compiler bridge

**Files:**
- Modify: `test/vscode-extension.test.mjs`
- Modify: `apps/vscode-extension/extension.cjs`
- Modify: `apps/vscode-extension/package.nls.json`
- Modify: `apps/vscode-extension/package.nls.pt-br.json`
- Modify: `apps/vscode-extension/l10n/bundle.l10n.pt-br.json`

**Step 1: Write failing tests**

Add tests proving that a compiler tool which never settles returns a stable timeout error within an injected short deadline and that in-flight user cancellation returns a cancellation error even when the downstream tool ignores its token.

**Step 2: Verify RED**

Run: `node --test --test-name-pattern="TDS bridge bounds|TDS bridge observes in-flight" test/vscode-extension.test.mjs`

Expected: FAIL because the current bridge can wait forever.

**Step 3: Implement minimal bounded invocation**

Link a product-owned `CancellationTokenSource` to the native progress token, race the public TDS tool invocation against timeout and cancellation, dispose timers/listeners, cancel downstream work, and return redacted stable evidence.

**Step 4: Verify GREEN**

Run the focused tests, then `node --test test/vscode-extension.test.mjs`.

**Step 5:** Commit the timeout/cancellation behavior and tests.

### Task 3: Expose the generic read-only database adapter through runtime and MCP

**Files:**
- Modify: `test/adapters-supervisor.test.mjs`
- Modify: `test/runtime-cli.test.mjs`
- Modify: `test/mcp.test.mjs`
- Modify: `packages/integrations/src/index.mjs`
- Modify: `packages/runtime/src/index.mjs`
- Modify: `packages/mcp/src/server.mjs`
- Modify: `docs/integrations.md`

**Step 1: Write failing tests**

Add tests proving that a host-injected generic adapter is reported as `database`, is callable only by a named-query MCP tool, preserves exact binds, remains unavailable by default, and cannot accept raw SQL.

**Step 2: Verify RED**

Run: `node --test test/adapters-supervisor.test.mjs test/runtime-cli.test.mjs test/mcp.test.mjs`

Expected: FAIL because runtime/MCP currently wire only the legacy Oracle adapter.

**Step 3: Implement minimal host injection**

Register the generic port as `database`, accept `databaseAdapter` in runtime/MCP construction, expose `pea_database_query`, and preserve the legacy `pea_oracle_query` contract.

**Step 4: Verify GREEN**

Run the three focused suites and then `npm run validate`.

**Step 5:** Commit the generic database surface.

### Task 4: Execute live negative TDS/AppServer cases

**Files:**
- Modify outside public repository: `C:/Users/montagna/Documents/Protheus-Teste/pea-tds-homologation/pea-bridge-runner.cjs`
- Create outside public repository: sanitized live receipt under the same laboratory directory
- Modify: `docs/qa/docker-appserver-pea-homologation-2026-09-24.md`

**Step 1:** Build an exact VSIX from the branch and install it with TDS in an isolated profile.

**Step 2:** Run pre-cancelled, in-flight-cancelled and bounded-timeout cases through the public tool bridge.

**Step 3:** Stop only the test AppServer, verify structured unavailable/failure behavior, restore it, and require all services healthy plus WebApp HTTP 200.

**Step 4:** Save only redacted diagnostics and hashes; do not store session tokens, passwords, server configuration, or RPO content.

**Step 5:** Update the evidence ledger and commit the sanitized public record.

### Task 5: Exercise the generic adapter against the Docker PostgreSQL database

**Files:**
- Create outside public repository: a temporary host-driver harness in `C:/Users/montagna/Documents/Protheus-Teste`
- Modify: `docs/qa/docker-appserver-pea-homologation-2026-09-24.md`

**Step 1:** Inject a host-owned PostgreSQL executor into `createReadOnlyNamedQueryAdapter` and the public runtime/MCP surface.

**Step 2:** Prove a named catalog read, exact bind propagation, unknown-query denial, raw-SQL denial, write denial, timeout, cancellation, concurrent reads, result limits, and secret-free evidence.

**Step 3:** Recheck database health, invalid indexes, and container health after the negative cases.

**Step 4:** Record the sanitized receipt hash and update G5.

### Task 6: Close autonomous package, accessibility and support gates

**Files:**
- Modify/create under `test/`, `scripts/`, `docs/qa/`, and `.specs/features/stable-1-0-launch/` as identified by each focused RED test.

**Step 1:** Run automated WCAG/keyboard/high-contrast/zoom checks available in the native extension surface and document items that inherently require a human screen-reader session.

**Step 2:** Detect an available VS Code remote target and execute the installed VSIX matrix if one exists; otherwise preserve an explicit external gate rather than simulate it.

**Step 3:** Execute and time the clean-profile first-value journey, rollback drill and support incident tabletop.

**Step 4:** Update the public release-gate issue with completed evidence and remaining human/external gates.

### Task 7: Prepare—but do not misrepresent—the exact Stable candidate

**Files:**
- Modify only after all prior executable gates pass: package/version manifests, changelog, release evidence and release documentation.

**Step 1:** Run full validation, mutation, security, lifecycle and installed-host matrices.

**Step 2:** If any human or Marketplace gate remains, retain Preview and emit a precise NO-GO receipt.

**Step 3:** Only when every G0-G13 gate is evidenced for one commit, change to `1.0.0`, remove Preview, build source/VSIX/SBOM/manifest/checksums, verify reproducibility, and bind final evidence to that exact commit.

**Step 4:** Publication to Marketplace remains a separate external action followed by download/install/post-publish smoke.
