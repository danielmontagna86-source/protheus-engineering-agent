# Governed review policy v1 — Specification

**Status:** Implemented locally; release evidence pending
**Research:** `docs/research/market-governed-review-2026-09-12.md`

## Product outcome

Give ADVPL/TLPP teams an offline, deterministic CI gate that distinguishes a raw finding from a documented, time-bound human decision. The same review remains usable without an AI provider, cloud service, Hermes or a replacement IDE.

## Requirements

- **GRP-001:** WHEN changed ADVPL/TLPP code has a finding at the selected threshold, THEN the GitHub Action SHALL fail after emitting review JSON, SARIF and a `review-gate.json` receipt.
- **GRP-002:** WHEN a reviewer records a current waiver for a stable finding fingerprint, THEN only that fingerprint may stop blocking; the raw review and SARIF SHALL continue to contain the finding.
- **GRP-003:** WHEN a waiver is expired, malformed, duplicated, outside the workspace or traverses a link, THEN the action SHALL fail closed and emit no success claim.
- **GRP-004:** WHEN a waiver is used, THEN the receipt SHALL expose its fingerprint, reason, approver and expiry without source excerpts or secrets.
- **GRP-004a:** WHEN a waiver fingerprint matches more than one blocking occurrence, THEN the receipt SHALL classify it as ambiguous and SHALL not waive any occurrence.
- **GRP-005:** WHEN no policy exists, THEN the action SHALL operate with zero waivers and preserve the previous severity-threshold behavior.
- **GRP-006:** WHEN an organization needs a local baseline, THEN a workspace-local `.pea/review-policy.json` SHALL be reviewable as ordinary source-controlled policy; it SHALL not be treated as a secret store.

## Constraints and non-goals

- No automatic false-positive decision, automatic waiver creation or hidden suppression.
- No new model loop, hosted account, database, Electron UI or TDS compiler ownership.
- This is a pre-review gate, not compilation, AppServer, security-audit or human-approval proof.
- Waivers apply to deterministic fingerprints, not line numbers; a changed rule/title/symbol/path creates a new finding identity.

## Acceptance criteria

1. A MAJOR finding fails `fail-on: major` without a policy.
2. A current matching waiver makes that finding non-blocking while `review.json` and SARIF remain unchanged in content.
3. An expired matching waiver remains visible in `expiredWaivers` and fails the gate.
4. Invalid JSON, unknown policy fields, a duplicate fingerprint, invalid timestamp or unsafe policy path fails closed.
5. The Action exposes JSON, SARIF, gate path, blocking, waived and expired counts with no write token or network request.
