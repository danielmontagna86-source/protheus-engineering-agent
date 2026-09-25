# Full project quality review v1 — Specification

## Outcome

Reduce release risk with an evidence-backed review, one runtime resilience fix, a repeatable coverage floor and current operational documentation.

## Requirements

### QR-001 — Optional MCP progress

WHEN an MCP client supplies a progress token but its notification channel rejects,
THEN the requested tool MUST still return its own success or failure result.

### QR-002 — Core coverage gate

WHEN local validation or the protected CI matrix runs,
THEN maintained sources under `packages/**/*.mjs` and `apps/vscode-extension/extension.cjs` MUST meet at least 85% line, 70% branch and 80% function coverage.

### QR-003 — Operational truth

WHEN a maintainer reads the current state, release handoff or Stable ledger,
THEN the documents MUST reflect PR #47 and the initialized dictionary while retaining every unproved human/external gate.

### QR-004 — Dependency compatibility

WHEN an MCP SDK update is considered,
THEN the real stdio lifecycle test MUST pass before the lockfile is changed.

## Non-goals

- Promote version `1.0.0`, disable `preview`, publish to Marketplace or fabricate external receipts.
- Claim positive RPO commit through an upstream API that exposes only diagnostics.
- Refactor the full extension adapter in the same change.
