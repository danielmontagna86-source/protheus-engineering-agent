# TDS Language Model Build Bridge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Trigger the official TDS compiler tool for one explicit approved source and return bounded diagnostics.

**Architecture:** The VSIX owns the bridge because only the Extension Host can call `vscode.lm.invokeTool`. It calls `tds-lm-tools` with fixed input and remains separate from the host-neutral runtime and MCP.

**Tech Stack:** Node.js CommonJS, VS Code Language Model Tools API, TDS-VSCode 2.1.3, Node test runner.

---

### Task 1: Write the failing bridge tests

**Files:**

- Modify: `test/vscode-extension.test.mjs`
- Modify: `apps/vscode-extension/package.json`

**Step 1: Write failing tests** for contained `.prw`, outside file, unavailable tool, malformed output, cancellation, confirmation rejection, manifest and fixed TDS input.

**Step 2: Run to verify red**

Run: `node --test test/vscode-extension.test.mjs`

Expected: failure because the bridge does not exist.

### Task 2: Implement minimal safe bridge

**Files:**

- Modify: `apps/vscode-extension/extension.cjs`
- Test: `test/vscode-extension.test.mjs`

**Step 1: Implement** validation, redaction, output bound, fixed `tds-lm-tools` call and result classification.

**Step 2: Run focused tests**

Run: `node --test test/vscode-extension.test.mjs`

Expected: pass.

### Task 3: Expose the command and document its limit

**Files:**

- Modify: `apps/vscode-extension/extension.cjs`
- Modify: `apps/vscode-extension/package.json`
- Modify: `apps/vscode-extension/package.nls.json`
- Modify: `docs/build-supervisor.md`
- Modify: `docs/getting-started.md`

**Step 1: Implement** localized command, confirmation and cancellable progress.

**Step 2: Document** the prerequisite and `unverified` boundary.

**Step 3: Run regression**

Run: `node --test test/vscode-extension.test.mjs && npm run check`

Expected: pass.

### Task 4: Release battery and lab qualification

**Files:**

- Modify: `docs/qa/live-appserver-tds-homologation-2026-09-13.md`
- Modify: `.specs/features/tds-language-model-build-bridge-v1/tasks.md`

**Step 1: Execute** `npm run validate:release-candidate`.

**Step 2: Install** the VSIX only in the test profile and run the bridge against the authenticated test AppServer.

**Step 3: Record** fixture identity and sanitized diagnostics only; never credentials or RPO token.
