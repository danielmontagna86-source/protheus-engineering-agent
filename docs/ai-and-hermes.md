# Provider-neutral AI and optional Hermes

The deterministic product does not require AI. Doctor, CodeGraph, context, review, snapshots and benchmark keep working when no provider is configured.

`createAiGateway` accepts an injected provider instead of embedding a vendor SDK or credential store. Before a request reaches the provider it requires the exact `ai:invoke` capability, keeps project text in a structured `untrusted-project-data` field, redacts common secret-key fields plus detected inline credential assignments, service URIs and Bearer tokens, and applies request, response, timeout and cancellation limits. Only structured output is returned; provider-declared side effects are ignored. Telemetry is disabled in the contract.

The gateway does not claim that prompt injection can be completely solved. Hosts must still restrict tool capabilities, review model output and avoid placing secrets in project context.

Hermes remains an optional ACP/MCP adapter. It receives an isolated workspace-local home and emits the active project profile as `PEA_ENVIRONMENT` in its MCP descriptor. It is neither an AI provider embedded in the product nor a release dependency.
