# Governed review policy v1 — Tasks

**Design:** `design.md`
**Status:** Done locally; external release gates remain separate

## Execution plan

`GRP-001 -> GRP-002 -> GRP-003 -> GRP-004 -> GRP-005`

### GRP-001 — Research and decision record

- **Status:** Done
- **Files:** research record and this specification
- **Done when:** competitor capabilities and rejected scope are traceable to primary sources.
- **Validation:** source review and claim-boundary check.

### GRP-002 — Test-first pure review gate

- **Status:** Done
- **Files:** `test/evidence.test.mjs`, `packages/evidence/src/index.mjs`
- **Reuses:** stable finding fingerprint and redacted export.
- **Done when:** threshold, current waiver, expiry, duplicate and malformed-policy behavior are covered.
- **Validation:** `node --test test/evidence.test.mjs`.

### GRP-003 — Safe Action integration

- **Status:** Done
- **Files:** `test/ci-review.test.mjs`, `scripts/ci-review.mjs`, `action.yml`
- **Reuses:** path containment and atomic evidence writes.
- **Done when:** Action writes JSON/SARIF/gate before a fail exit and exposes audited outputs.
- **Validation:** `node --test test/ci-review.test.mjs`.

### GRP-004 — Public contract and examples

- **Status:** Done
- **Files:** schemas, `docs/ci/review-policy.md`, README and public contract
- **Done when:** consumers can adopt policy without guessing the waiver lifecycle.
- **Validation:** schema/document checks in the full suite and manual example inspection.

### GRP-005 — Quality and release candidate battery

- **Status:** Done locally
- **Files:** test records and final validation report
- **Done when:** full unit/integration suite, static checks, smoke, mutation and code review are complete for the final commit.
- **Validation:** focused gate tests; `npm run validate`; `npm run smoke`; installed VSIX host/current/minimum/TDS checks; `npm audit --audit-level=moderate`; mutation 95.05%; reproducible release manifest. Stable/Marketplace external gates remain separate.
