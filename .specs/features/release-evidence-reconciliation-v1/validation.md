# Release evidence reconciliation v1 — Validation

| Requirement | Evidence |
| --- | --- |
| RER-001 | README release URL targets `v0.3.9`. |
| RER-002 | GitHub API asset name/digest/commit values match `RELEASE-v0.3.9.md`. |
| RER-003..005 | Ledger and operations pages retain Preview and `NO-GO` language for external gates. |
| All | `npm run validate` and a focused documentation-diff review pass. |

## Decision rule

This feature is accepted only as documentation truthfulness. It cannot close
any Stable/Marketplace gate or authorize a distribution action.
