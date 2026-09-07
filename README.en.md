# Protheus Engineering Agent

A standalone VS Code extension for ADVPL/TLPP engineering, backed by an open reusable runtime, evidence-based analysis, and MCP interoperability.

> Independent community project in alpha stage. It is not affiliated with, sponsored by, or maintained by TOTVS, the Protheus brand, or the Hermes Agent project. All trademarks belong to their respective owners.

[Português](README.md) · [Positioning](docs/brand-positioning.md) · [Architecture](docs/architecture.md) · [Rules](docs/rules.md) · [Skills](docs/skills.md) · [Premium research](docs/research/premium-product-leadership-review.md) · [Roadmap](docs/roadmap.md) · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md)

The primary path requires only the VSIX. It does not require Hermes, an AI account, a model, Python, Oracle, TDN, or AppServer. The deterministic runtime ships inside the extension.

## What runs today

- local ADVPL/TLPP symbol and call indexing;
- deterministic pre-review with file and line evidence;
- bounded, atomic local Project Memory and Journal;
- deny-by-default environment policy;
- build supervisor with an injected runner and capability gate;
- stdio MCP server for doctor, index, review, and engineering context;
- standard project Skills, local Rules, and commit-pinned providers, all bounded and treated as untrusted data;
- an experimental, optional Hermes adapter outside the critical path and release gate;
- a thin VS Code extension with four orchestration commands.

VS Code-native tools/chat, a real Protheus compiler integration, TDN/Dictionary, Oracle, and subagents are planned and not available yet.

## Local development

Requires Node.js 22 or newer. Tests and packaging use development dependencies locked in `package-lock.json`.

```sh
npm ci
npm run validate
```

The runtime itself has no mandatory npm runtime dependencies and can also be called directly:

```sh
node packages/runtime/src/cli.mjs doctor .
node packages/runtime/src/cli.mjs index /path/to/workspace
node packages/runtime/src/cli.mjs session /path/to/workspace
```

### Optional Hermes compatibility

Hermes is not part of normal commands or publication criteria. To test the experimental adapter voluntarily, use `doctor . --probe-hermes`. Set `PEA_HERMES_COMMAND` when the executable is not on `PATH`; its isolated home defaults to `<workspace>/.pea/hermes`. This is optional compatibility evidence, not a core gate.

## MCP server

```sh
node packages/mcp/src/stdio.mjs
```

The process defaults to the `production` policy. Project Memory writes require an explicit `PEA_GRANTS=context:write` grant. That grant does not authorize build, Oracle, TDN, or Dictionary access.

## VS Code extension

Run `npm ci`, open this repository in VS Code, and start `Run Protheus Engineering Agent Extension`. Its pre-launch task builds the self-contained runtime before opening the Extension Development Host. To produce the audited GitHub Release package, run `npm run package:extension`; the VSIX is written under `release-artifacts/`.

Open an ADVPL/TLPP workspace and run the four `Protheus Agent` commands from the command palette. Active-file review keeps the machine-readable JSON in the Output channel and publishes findings to native Problems diagnostics. `npm run test:vscode:host` installs the VSIX and exercises all four commands in an isolated current VS Code instance; `npm run test:vscode:minimum` repeats it on the supported 1.95.3 baseline.

The extension delegates to its bundled runtime. It complements TDS-VSCode and does not replace VS Code language, compiler, debugger, editor, terminal, explorer, Git, diff, or chat surfaces.

## Quality and release status

```sh
npm run validate
npm run smoke
npm run package:extension
npm run test:vscode:host
npm run test:vscode:minimum
npm run publication:release-check
```

The product is licensed under [Apache-2.0](LICENSE.md). `validate` is the complete local gate, while `smoke` exercises the critical CLI/MCP path in under five minutes. The release audit remains blocked until real CI, review, and external smoke evidence is complete. External integrations remain fail-closed.

See the [validation report](docs/validation-report.md) and [publication plan](docs/publication-plan.md) for current evidence and open gates.
