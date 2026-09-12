# Codex/ChatGPT context bridge — Design

## Architecture

```text
VS Code command / Engineering Center
        |
        | explicit user action
        v
Codex App Server adapter (stdio JSON-RPC)
        |-- protocol probe and managed ChatGPT login
        |-- opaque thread id in VS Code global state
        |-- read-only, bounded structured turn
        v
Official local Codex CLI/App Server
        |-- owns ChatGPT OAuth, refresh and rate limits
        v
ChatGPT entitlement or API-key mode selected by Codex
```

The adapter uses only stdio and the documented initialization/account/thread/turn
methods. It never opens a TCP listener, reads `~/.codex`, or accepts externally
managed OAuth tokens. The App Server owns login and credential refresh. A probe
uses `initialize` then `account/read`; only a recognized protocol response may
enable the connection UI.

The extension keeps a provider session in memory and stores just an opaque thread
ID in `ExtensionContext.globalState` after a successful user turn. It does not
store source, prompts, responses, plan label or auth state. Context is prepared
by the existing runtime, redacted by `createAiGateway`, and constrained by its
request/response limits. The initial App Server turn is read-only with restricted
filesystem roots and requests a JSON object matching the existing output schema.

## Security decisions

| Concern | Decision |
| --- | --- |
| Executable shadowing | Capability probe; executable name/path is never identity proof. |
| OAuth | Managed browser/device-code login only; no key or token input surface. |
| Context leakage | Explicit action, gateway redaction, bounded payload, no telemetry. |
| Tool execution | No dynamic tools; read-only sandbox; model output is data only. |
| History | App Server holds conversation history; PEA holds only opaque ID in global state. |
| Unsupported App Server | Fail closed with no fallback to shell, browser scraping or API key. |

## User journey

1. User chooses **Conectar ChatGPT (Codex)**.
2. The extension probes the selected local command. If unavailable, it explains
   that the official Codex CLI/App Server is required and keeps all offline
   features usable.
3. If signed out, Codex returns its managed browser/device-code ceremony. The
   extension opens the official authorization URL; the user completes login.
4. The user chooses **Enviar contexto para Codex**, reviews the scope in the
   native prompt, and grants `ai:invoke` for that operation.
5. PEA sends redacted bounded context, receives schema-validated output, and
   displays it as advisory evidence. No source is edited and no build runs.

## Versioning and rollout

This is experimental until it has a live account-based UAT on a supported Codex
CLI version. The implementation is provider-neutral at the gateway boundary;
only this official local protocol receives a login adapter in P0. Other vendors
remain API/injected-provider integrations pending an equivalent official contract.
