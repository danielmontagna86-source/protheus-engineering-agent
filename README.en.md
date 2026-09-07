# Protheus Engineering Agent

An open engineering runtime for ADVPL/TLPP, with VS Code as the primary interface, evidence-backed analysis, and optional integration with engines such as Hermes over ACP/MCP.

> Independent community project in alpha stage. It is not affiliated with, sponsored by, or maintained by TOTVS, the Protheus brand, or the Hermes Agent project. All trademarks belong to their respective owners.

[Português](README.md) · [Positioning](docs/brand-positioning.md) · [Architecture](docs/architecture.md) · [Roadmap](docs/roadmap.md) · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md)

## What runs today

- local ADVPL/TLPP symbol and call indexing;
- deterministic pre-review with file and line evidence;
- bounded, atomic local Project Memory and Journal;
- deny-by-default environment policy;
- build supervisor with an injected runner and capability gate;
- stdio MCP server for doctor, index, review, and engineering context;
- live, bounded project Skills and Rules treated as untrusted data;
- isolated Hermes ACP/MCP session descriptors;
- a thin VS Code extension with four orchestration commands.

The in-extension ACP chat, a real Protheus compiler integration, TDN/Dictionary, Oracle, and parallel subagents are planned and not available yet.

## Run without installing dependencies

Requires Node.js 22 or newer.

```sh
node --test
node scripts/check.mjs
node packages/runtime/src/cli.mjs doctor .
node packages/runtime/src/cli.mjs index /path/to/workspace
node packages/runtime/src/cli.mjs session /path/to/workspace
```

Hermes is not probed by default. Use `--probe-hermes` explicitly and set `PEA_HERMES_COMMAND` when the executable is not on `PATH`. The default Hermes home is isolated under `<workspace>/.pea/hermes`.

## MCP server

```sh
node packages/mcp/src/stdio.mjs
```

The process defaults to the `production` policy. Project Memory writes require an explicit `PEA_GRANTS=context:write` grant. That grant does not authorize build, Oracle, TDN, or Dictionary access.

## VS Code extension

Run `npm ci`, open this repository in VS Code, and start `Run Protheus Engineering Agent Extension`. Its pre-launch task builds the self-contained runtime before opening the Extension Development Host. To produce the audited GitHub Release package, run `npm run package:extension`; the VSIX is written under `release-artifacts/`.

Open an ADVPL/TLPP workspace and run the four `Protheus Agent` commands from the command palette. `npm run test:vscode:host` installs the VSIX and exercises all four commands in an isolated current VS Code instance; `npm run test:vscode:minimum` repeats it on the supported 1.95.3 baseline.

The extension delegates to the runtime. It does not replace VS Code's editor, terminal, explorer, Git, diff, or chat surfaces.

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
