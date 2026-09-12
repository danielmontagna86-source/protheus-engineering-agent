# Governed review policy v1 — Validation matrix

| Requirement | Automated evidence | Current state |
| --- | --- | --- |
| GRP-001 | `test/ci-review.test.mjs` threshold fixture | PASS |
| GRP-002 | `test/evidence.test.mjs` raw report preservation and current waiver | PASS |
| GRP-003 | parser negative tests and Action path fixture | PASS |
| GRP-004 | receipt assertions and schema inspection | PASS |
| GRP-005 | Action tests without policy | PASS |

## Final battery

1. Targeted evidence and Action tests.
2. `npm run validate` for the repository contract.
3. `npm run smoke` for the CLI/MCP critical route.
4. `npm run test:mutation` and configured threshold.
5. `npm run test:vscode:host`, minimum and TDS coexistence (a remote Extension Host remains the release authority).
6. `npm run build:release`, `npm run verify:release` and release audit on the final clean commit.

Stable/Marketplace remains NO-GO until the separate exact-commit GitHub, publisher, legal, accessibility and human approval evidence exists. This feature does not weaken those gates.

## Local evidence (2026-09-12)

- focused policy/Action suite: 15 passing tests;
- `npm run validate`: PASS;
- `npm run smoke`: PASS (doctor, index, review, MCP source and bundled MCP);
- installed VSIX smoke: PASS on VS Code 1.137.0 and 1.95.3;
- TDS coexistence: PASS with TOTVS TDS-VSCode 2.1.3, multi-root and CP1252/LF;
- `npm audit --audit-level=moderate`: 0 vulnerabilities;
- mutation: 95.05%, above the 95% gate;
- final source/VSIX/SBOM reproducibility: rerun after the final commit.
