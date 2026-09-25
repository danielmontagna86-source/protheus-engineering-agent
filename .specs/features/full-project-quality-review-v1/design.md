# Full project quality review v1 — Design

## Architecture

The change stays inside existing boundaries. `packages/mcp` treats progress as
best-effort protocol metadata, while the tool result remains authoritative.
Coverage uses Node's native test runner and is applied to source files rather
than generated `dist` bundles. Documentation is reconciled with immutable PR,
commit and receipt references.

## Alternatives considered

1. **Ignore notification failures at the caller:** rejected because every tool handler would need duplicate protection.
2. **Fail the tool when progress fails:** rejected because progress is optional and contains no business result.
3. **Upgrade MCP SDK immediately:** rejected after the real process test lost responses on finite stdin.
4. **Refactor the extension now:** deferred because a large structural diff would obscure the resilience fix and require a separate installed-VSIX parity campaign.

## Security and rollback

- No new capability, credential, network destination or mutable permission is introduced.
- Coverage adds time but no release side effect.
- Rollback is a normal Git revert; there is no data migration.
