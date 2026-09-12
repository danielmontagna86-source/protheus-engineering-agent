# Bounded subagent supervisor

The runtime provides a host-neutral supervisor contract for MCP-capable child agents. It does not ship an autonomous provider or grant shell access.

Every child receives one role, one requested tool, an exact inherited tool allowlist, a parent ID and a bounded depth. Input, output, runtime and concurrency are limited. Unknown tools, excess nesting, malformed data, timeout and cancellation fail closed.

Mutation is disabled unless the host injects both checkpoint and diff adapters. A mutating child must start from a validated snapshot/worktree checkpoint and ends in `awaiting-review` with bounded diff evidence. Failures trigger the injected rollback adapter and record whether restoration succeeded. The supervisor never merges, deploys or expands permissions.

This design lets VS Code, CI or an MCP orchestrator supply its own execution transport while keeping product policy and audit evidence independent of Hermes or any specific model.
