# Architecture

**Main pattern:** Ports and adapters with a reusable local runtime.

## Layers

- `apps/vscode-extension`: presentation and command delegation only.
- `packages/runtime`: composition root and stable CLI contract.
- `packages/mcp`: MCP stdio adapter.
- `packages/hermes-adapter`: ACP process and per-session MCP descriptors.
- `packages/codegraph-advpl`, `review`, `project-context`, `policy`, `build-supervisor`: domain capabilities.
- `packages/integrations`: fail-closed external ports.
- `packages/agent-resources`: live Skills/Rules snapshots.

## Main Flows

1. VS Code calls the runtime CLI and renders JSON in its Output Channel.
2. An ACP client launches Hermes with isolated state and attaches this product MCP to the session.
3. MCP tools call the same runtime modules used by the CLI.
4. Project context is local, bounded and labeled untrusted.

## Non-goals

No Electron shell, editor, terminal, explorer, Git UI, embedded credentials or vendor runtime distribution.
