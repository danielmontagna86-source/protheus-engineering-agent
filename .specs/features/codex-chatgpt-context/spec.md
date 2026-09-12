# Codex/ChatGPT context bridge — Specification

**Status:** Implemented; live official-CLI UAT pending  
**Scope:** P0 connected capability; optional and non-gating

## Outcome

Let a Protheus Engineering Agent user deliberately hand a bounded engineering
context to the official local Codex App Server and use their ChatGPT account
session when that account is entitled to do so. API-key providers remain an
optional host-injected path; deterministic workflows remain available without
any provider.

## Requirements

- **AI-CTX-001:** The product SHALL discover an App Server through a protocol
  probe, not by trusting an executable named `codex`.
- **AI-CTX-002:** ChatGPT authentication SHALL be performed only by the
  official App Server browser or device-code flow. The product SHALL NOT read,
  copy, display, persist, or accept ChatGPT access tokens.
- **AI-CTX-003:** A connection status SHALL expose only an availability state,
  authentication mode and optional plan label. It SHALL NOT expose email,
  token, account identifier, request headers, or authentication URL in logs.
- **AI-CTX-004:** Context sent to a model SHALL be explicitly requested,
  bounded, structured as untrusted project data, and passed through the
  existing secret redaction gateway.
- **AI-CTX-005:** The initial bridge SHALL be read-only: no workspace write,
  build, shell, network, database, MCP mutation, or deployment capability is
  granted by a model response.
- **AI-CTX-006:** Conversation continuity SHALL use an opaque Codex thread ID
  kept only in VS Code global state. Project configuration, source control,
  evidence artifacts and logs SHALL not receive prompts or thread history.
- **AI-CTX-007:** Missing CLI, unsupported protocol, cancelled login, timeout,
  malformed JSON-RPC output and incomplete model output SHALL surface a
  localized, actionable unavailable/error state and leave offline workflows
  intact.
- **AI-CTX-008:** An explicit `ai:invoke` grant and user action are required
  before any model turn. The provider is disabled in test profiles.
- **AI-CTX-009:** API-key providers retain the existing injected gateway
  contract. OAuth/login support for other vendors is deferred until each has a
  documented, reviewable local-client protocol; browser scraping and copied
  session cookies are prohibited.

## Acceptance criteria

1. A fake App Server proves initialize, sanitized account probe, browser login
   start, thread resume/start, structured turn and cancellation handling.
2. A non-App-Server executable is rejected before a login or model request.
3. No test, package, log, schema or documentation contains a bearer token,
   access token, account email, OAuth callback secret or user source fixture.
4. The VS Code command starts only the managed login flow and reports its
   state; it does not ask for an API key.
5. The existing complete regression and installed-VSIX smoke remain green.

## Non-goals

- Circumventing ChatGPT plan limits, rate limits or product terms.
- Sharing one ChatGPT login among users or sending unattended CI work through a
  personal subscription.
- Replacing the official Codex extension, generic chat UI, TDS, or the
  workspace permission broker.
- Claiming lower cost: entitlement, available models, context capacity and
  limits are account- and plan-dependent.
