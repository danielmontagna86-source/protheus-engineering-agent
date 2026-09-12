# Protheus Engineering Agent

A standalone VS Code extension for ADVPL/TLPP engineering, backed by an open reusable runtime, evidence-based analysis, and MCP interoperability.

> Independent community project in alpha stage. It is not affiliated with, sponsored by, or maintained by TOTVS, the Protheus brand, or the Hermes Agent project. All trademarks belong to their respective owners.

[Português](README.md) · [Get started](docs/getting-started.en.md) · [AI and Hermes](docs/ai-and-hermes.md) · [Provider UAT](docs/provider-uat.md) · [Public contract](docs/public-contract.md) · [Compatibility](docs/compatibility.md) · [Limitations](docs/limitations.md) · [Roadmap](docs/roadmap.md) · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md)

The primary path requires only the VSIX. It does not require Hermes, an AI account, a model, Python, Oracle, TDN, or AppServer. The deterministic runtime ships inside the extension.

## What runs today

- local ADVPL/TLPP symbols, calls, callers, dependencies, ambiguity, and unresolved-target evidence;
- deterministic pre-review and traceable bug review with source and impact evidence;
- attributed, bounded, atomic Project Memory and Journal with reviewed promotion, hashes, expiry, corruption recovery, and cross-instance locking;
- deny-by-default local/development/test/homologation/production policy and approval broker;
- supervised build evidence with durable idempotent resume;
- licensed/provenanced TDN/Dictionary snapshot onboarding with freshness and SHA-256, plus named read-only Oracle/PostgreSQL adapter contracts;
- bounded MCP subagents and a governed provider-neutral optional AI gateway;
- governed OpenRouter, Anthropic API and Gemini API connections, with a key in VS Code SecretStorage, an explicit model and a bounded analysis route;
- ChatGPT/Codex through managed App Server login, plus manual MCP previews for Cline and OpenCode without reading third-party authentication;
- stdio MCP server for portable runtime capabilities;
- standard project Skills, local Rules, and commit-pinned providers, all bounded and treated as untrusted data;
- an experimental, optional Hermes adapter outside the critical path and release gate;
- a thin VS Code extension with native Engineering Center, deterministic commands, Language Model Tools, and a portable skill.

External adapters are implemented but inactive until a host supplies trusted configuration, authorization and credentials where applicable. No live compiler/AppServer/RPO, Oracle driver or AI provider is embedded, and simulation never counts as compiler proof.

## Local development

Requires Node.js 22 or newer. Tests and packaging use development dependencies locked in `package-lock.json`.

```sh
npm ci
npm run validate
```

The domain runtime remains decoupled; the MCP server uses the packaged official SDK. The CLI can also be called directly:

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

The process defaults to the `production` policy. Project Memory writes require an explicit `PEA_GRANTS=context:write` grant. TDN/Dictionary use configured snapshots; Oracle, AI and build require host adapters plus their own exact grants.

## VS Code extension

Run `npm ci`, open this repository in VS Code, and start `Run Protheus Engineering Agent Extension`. Its pre-launch task builds the self-contained runtime before opening the Extension Development Host. To produce the audited GitHub Release package, run `npm run package:extension`; the VSIX is written under `release-artifacts/`.

Open an ADVPL/TLPP workspace and use Engineering Center or the `Protheus Agent` commands. Active-file review keeps machine-readable JSON in Output and publishes findings to native Problems. Memory/Journal, authorized snapshot onboarding, Git-change review, and supervised-build state use native VS Code flows. `npm run test:vscode:host` installs the VSIX in an isolated current VS Code instance; `npm run test:vscode:minimum` repeats the supported 1.95.3 baseline.

The extension delegates to its bundled runtime. It complements TDS-VSCode and does not replace VS Code language, compiler, debugger, editor, terminal, explorer, Git, diff, or chat surfaces.

### Optional multi-provider AI

Run **Protheus Agent: Configurar conexões de IA** to create an API
connection. The key is requested once and saved in VS Code SecretStorage; the
workspace only receives `.pea/ai-connections.json` with the provider, model,
secret reference and route. The connection creates a read-only analysis route
with input and output bounds. Run **Protheus Agent: Perguntar a provedor de
IA** to choose a route and confirm the transfer of bounded, redacted
context.

| Integration | Supported path | What PEA does not do |
| --- | --- | --- |
| ChatGPT/Codex | Official App Server login | Read a token, cookie, account or API key |
| OpenRouter, Anthropic API, Gemini API | API key in SecretStorage | Store a key in the project, settings, log or VSIX |
| Cline and OpenCode | User-imported MCP preview | Read `auth.json`, automate OAuth or invoke an external host |
| Claude Code and Gemini CLI | Login in the official client | Reuse a session/subscription as an API or run an unapproved runner |

All AI paths are optional. Credential, policy, schema or cancellation failures
do not trigger fallback, and deterministic/offline flows remain available. Read
the [AI guide](docs/ai-and-hermes.md) and [UAT matrix](docs/provider-uat.md)
before using a real account.

## Quality and release status

```sh
npm run validate
npm run smoke
npm run build:release
npm run verify:release
npm run test:vscode:host
npm run test:vscode:minimum
npm run test:vscode:tds
npm run benchmark
npm run benchmark:large
npm run publication:release-check
```

The product is licensed under [Apache-2.0](LICENSE.md). `validate` is the complete local gate, while `smoke` exercises the critical CLI/MCP path in under five minutes. `build:release` requires a clean tree, `verify:release` rebuilds the VSIX from source and requires byte identity, and `publication:release-check` always runs that verifier before evaluating GO. The TDS UAT covers coexistence, multi-root routing and CP1252/LF preservation. Automated coverage does not replace provider-account UAT; Claude Code, Gemini CLI, Cline and OpenCode are not direct PEA runners. The synthetic benchmark does not prove productivity. A technical candidate can be approved while Stable/Marketplace remains NO-GO: publisher, public supply-chain evidence, AppServer, accessibility and human-pilot evidence are separate external gates.

See the [validation report](docs/validation-report.md) and [publication plan](docs/publication-plan.md) for current evidence and open gates.
