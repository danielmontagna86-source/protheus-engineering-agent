# Architecture

**Main pattern:** Ports and adapters with a reusable local runtime.

## Layers

- `apps/vscode-extension`: presentation and command delegation only.
- `packages/runtime`: composition root and stable CLI contract.
- `packages/mcp`: MCP stdio adapter.
- `packages/hermes-adapter`: optional experimental ACP compatibility descriptors.
- `packages/codegraph-advpl`, `review`, `project-context`, `policy`, `build-supervisor`: domain capabilities.
- `packages/integrations`: fail-closed external ports.
- `packages/agent-resources`: live Skills/Rules snapshots.

## Main Flows

1. VS Code calls the runtime CLI and renders JSON in its Output Channel.
2. VS Code packages the runtime and provides the standalone user path without an external engine.
3. MCP tools call the same runtime modules used by the CLI.
4. Project context is local, bounded and labeled untrusted.
5. Optional ACP/MCP hosts, including Hermes, attach without becoming a core dependency.

## Non-goals

No Electron shell, editor, terminal, explorer, Git UI, embedded credentials or vendor runtime distribution.
