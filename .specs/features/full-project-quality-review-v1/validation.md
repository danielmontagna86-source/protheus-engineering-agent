# Full project quality review v1 — Validation

| Requirement | Evidence | Acceptance |
| --- | --- | --- |
| QR-001 | `test/mcp.test.mjs` rejects progress notifications | tool result remains successful; two notifications attempted |
| QR-002 | `npm run test:coverage` | >=85% lines, >=70% branches, >=80% functions |
| QR-003 | state, handoff and Stable ledger diff | PR #47/dictionary READY represented; NO-GO preserved |
| QR-004 | real child-process MCP test on SDK 2.1.0 and 2.0.0 | 2.1.0 rejected; 2.0.0 passes all MCP tests |

## GO rule

This review change is mergeable only when targeted tests, `npm run validate`,
audit, smoke, benchmark, mutation, VSIX packaging/host tests and publication
development audit pass. Stable/Marketplace remains a separate NO-GO decision.
