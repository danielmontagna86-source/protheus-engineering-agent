# Codex/ChatGPT Context Bridge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Add an opt-in, read-only bridge from the VS Code extension to the official local Codex App Server so eligible users can authenticate with ChatGPT instead of providing an API key.

**Architecture:** A dependency-free JSONL client spawns a user-selected local command, verifies the documented App Server handshake, and delegates managed browser/device login to Codex. The existing provider-neutral AI gateway retains redaction, limits and `ai:invoke` authorization; the extension exposes only connection/status and bounded-context entry points.

**Tech Stack:** Node.js 22, VS Code extension API, stdio JSON-RPC 2.0, Node test runner, existing esbuild packaging.

---

### Task 1: Prove the adapter contract before implementation

**Files:**
- Create: `test/codex-app-server.test.mjs`
- Create: `packages/codex-app-server/src/index.mjs`

1. Write fake-child tests for initialize/account, unsupported protocol, managed login, a completed JSON-schema turn, cancellation and redaction boundary.
2. Run `node --test test/codex-app-server.test.mjs`; expect failure because the package is missing.
3. Implement only the JSONL request/notification multiplexer and managed provider surface needed by the tests.
4. Re-run the target file; expect PASS.

### Task 2: Wire the optional VS Code surface

**Files:**
- Modify: `apps/vscode-extension/extension.cjs`
- Modify: `apps/vscode-extension/package.json`
- Modify: `apps/vscode-extension/package.nls.json`
- Modify: `apps/vscode-extension/package.nls.pt-br.json`
- Modify: `scripts/build-extension.mjs`
- Modify: `test/vscode-extension.test.mjs`

1. Add failing tests for command declaration, localized labels, unsupported-probe guidance and no API-key input path.
2. Add the command and provider injection seam; package the dependency-free adapter beside the VSIX.
3. Keep the command disabled/unavailable without a protocol-compatible binary; never use ambient credentials.
4. Re-run targeted tests and package build.

### Task 3: Document, assess and verify

**Files:**
- Modify: `docs/ai-and-hermes.md`
- Modify: `docs/limitations.md`
- Modify: `.specs/project/ROADMAP.md`
- Modify: `.specs/project/STATE.md`

1. Document optionality, official ownership of login, privacy bounds, plan-dependent limits and live-UAT gate.
2. Run AI gateway and adapter injection/redaction tests.
3. Run `npm run validate`, `npm run build:extension`, and `npm run test:vscode:host`.
4. Commit only reviewed product source and docs; no test login/cache or generated secrets.
