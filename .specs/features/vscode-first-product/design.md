# Design — VS Code-first standalone product

## Decision

Ship one installable VS Code extension as the primary product. Bundle the reusable deterministic runtime into the VSIX. Keep MCP as a first-class interoperability port and keep Hermes behind an optional adapter.

```text
VS Code extension (primary install and UX)
  -> bundled runtime (memory, journal, CodeGraph, review, policy)
     -> extension tools (P1, editor-aware)
     -> MCP stdio (portable, host-neutral)
     -> external adapters (TDN, Dictionary, Oracle, compiler)
     -> optional orchestrators (Hermes is one adapter, not the engine)
```

## Why not a VS Code-only monolith

Putting domain rules directly in the extension would simplify the first demo but would couple analysis, tests and future CI/MCP use to the Extension Host. The selected shape is therefore distribution-first, not monolithic: one-click VSIX for users, modular runtime internally.

## AI integration order

1. Deterministic commands work offline and without a model.
2. VS Code language-model tools expose editor-aware specialist capabilities when supported by the user's VS Code setup.
3. MCP exposes the same host-neutral capabilities to VS Code and other clients.
4. Hermes and other orchestrators may consume MCP/ACP, but are not required or privileged.

## Compatibility policy

The Hermes adapter remains source-compatible for existing experiments. Its probe is opt-in, uses an isolated home, and is reported as compatibility evidence only. The core release contract is the installed VSIX plus deterministic runtime behavior.
