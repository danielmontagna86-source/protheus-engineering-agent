# Governed review policy v1 — Validation matrix

| Requirement | Automated evidence | Current state |
| --- | --- | --- |
| GRP-001 | `test/ci-review.test.mjs` threshold fixture | Pending final battery |
| GRP-002 | `test/evidence.test.mjs` raw report preservation and current waiver | Pending final battery |
| GRP-003 | parser negative tests and Action path fixture | Pending final battery |
| GRP-004 | receipt assertions and schema inspection | Pending final battery |
| GRP-005 | Action tests without policy | Pending final battery |

## Final battery

1. Targeted evidence and Action tests.
2. `npm run validate` for the repository contract.
3. `npm run smoke` for the CLI/MCP critical route.
4. `npm run test:mutation` and configured threshold.
5. `npm run test:vscode:host`, minimum and TDS coexistence (a remote Extension Host remains the release authority).
6. `npm run build:release`, `npm run verify:release` and release audit on the final clean commit.

Stable/Marketplace remains NO-GO until the separate exact-commit GitHub, publisher, legal, accessibility and human approval evidence exists. This feature does not weaken those gates.

