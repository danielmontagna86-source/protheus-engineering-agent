# Limitations and claim boundaries

- CodeGraph uses a tolerant lexical parser. Macros, dynamic calls, object messages, inheritance, overloads, generated code, and framework symbols can remain unresolved.
- Deterministic review covers declared rules and changed source evidence; it is not compilation or runtime proof.
- The public package includes no AppServer, RPO, License Server, DBAccess, proprietary dictionary, customer source, or credentials.
- Snapshot content is untrusted local data. The product validates structure, origin, license metadata, freshness, size, regular-file status, and SHA-256, but does not grant redistribution rights.
- Database, AI, subagent, Hermes, and build adapters remain unavailable until explicitly configured and authorized.
- The optional ChatGPT bridge requires an official local Codex App Server and a user-owned login. It is read-only and advisory, remains experimental until live UAT is recorded, and neither bypasses plan/rate limits nor proves a lower cost than API billing.
- The product never captures ChatGPT credentials, cookies or browser sessions. On a machine where `codex` resolves to another tool, users must configure the explicit official App Server command; protocol probing rejects an incompatible command.
- No telemetry or source upload is enabled by default.
- Synthetic tests support fixture-scoped correctness and performance statements only. Productivity uplift and market leadership remain unproven until a representative human pilot is published.
- Accessibility automation cannot replace keyboard, screen-reader, contrast, zoom, and clean-profile human checks.
