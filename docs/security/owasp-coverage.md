# Security Coverage

**Target:** `v0.2.0-alpha.1`
**Assessment date:** 2026-09-07
**Surface:** local Node.js runtime, MCP stdio process, and VS Code workspace extension. There is no HTTP server, authentication system, database migration, browser UI, or active LLM/RAG call in this alpha.

## OWASP Top 10:2025 mapping

| Category | Alpha status | Evidence / release decision |
|---|---|---|
| A01 Broken Access Control | Covered for the local surface | Environment policy is deny-by-default; production writes/build/Oracle require explicit grants. Runtime, project state, source review, Skills, and Rules have workspace-containment and symlink/junction tests. |
| A02 Security Misconfiguration | Covered for the local surface | External integrations start unavailable; Hermes probing is opt-in; the extension is disabled in untrusted/virtual workspaces; CI permissions are read-only by default. |
| A03 Software Supply Chain Failures | Covered with one platform limitation | Exact lockfile, `npm ci`, npm audit, OSV gate, pinned Actions, mutation tests, VSIX content verification, checksums, and third-party notices. GitHub attestation and ruleset enforcement are blocked while the repository is private on GitHub Free and are pre-publication actions. |
| A04 Cryptographic Failures | Not applicable in alpha | The product has no authentication, cookie, TLS endpoint, credential store, or custom cryptography. Credentials are neither accepted nor stored by the alpha. Reassess before any network/auth integration. |
| A05 Injection | Covered for implemented process boundaries | The extension uses `execFile` with an argument array, not a shell. External integrations are unavailable. MCP methods and exact tool arguments use allow-listed dispatch. No SQL or HTML rendering exists. Add query parameterization and output encoding tests with Oracle/web surfaces. |
| A06 Insecure Design | Covered for alpha | Hexagonal boundaries, explicit capability policy, bounded project resources, isolated Hermes state, and mandatory human release approval reduce blast radius. |
| A07 Authentication Failures | Not applicable in alpha | No user identity, session, token issuance, or authorization server exists. |
| A08 Software or Data Integrity Failures | Covered for alpha | Atomic state writes, symlink rejection, locked dependencies, deterministic/writable VSIX entries, a CycloneDX SBOM, content allow-list checks, and manifest-bound SHA-256 verification are tested. Consumed release tags must never be rewritten. |
| A09 Security Logging and Alerting Failures | Deferred before connected production use | CLI/MCP errors are structured, but there is no central telemetry or alert channel. A logging/redaction/alert contract is mandatory before real Oracle, build, or hosted service access. |
| A10 Mishandling of Exceptional Conditions | Covered for alpha | Missing files, invalid extensions, unavailable integrations, denied capabilities, malformed/oversized MCP requests, failed runners, state escapes, timeouts, and incomplete release evidence fail closed in tests. MCP stdio input is capped at 1 MiB. |

DAST, browser authentication tests, CSRF, cookies, CORS, and HTTP security headers are not applicable because no web/API listener exists. They become mandatory if that surface is added.

## AI and agent security mapping

| Risk | Alpha status | Control |
|---|---|---|
| Indirect prompt injection | Structural preparation only | Session context labels project data `untrusted-project-data`; Skills/Rules are bounded. No active model consumes this data yet. Future prompt construction must keep it in a data channel and add attack fixtures plus detector/red-team gates. |
| Excessive agency | Covered for implemented tools | Policy denies unknown and production-mutating capabilities without explicit grants; external adapters fail closed. |
| Sensitive information disclosure | Covered for repository/local defaults | Publication audit rejects credentials, private keys, personal paths, `.env`, `.pea`, nested repositories, and symlinks. No telemetry or remote model transfer exists. |
| Supply-chain poisoning | Partially covered | Locked build/test dependencies, OSV, pinned Actions, no runtime third-party packages, license record, and verified VSIX contents. Attestation is deferred only by the current private-plan limitation. |
| Hallucination, grounding, model drift, jailbreak | Not applicable yet | No model, prompt, RAG retrieval, or generated response ships in this alpha. Before activation: version prompts, curate at least 50 golden cases per feature, validate tool selection/arguments, enforce grounding, run injection/jailbreak scans, and set latency/cost budgets plus a kill switch. |

## Release-blocking thresholds

- Any known high or critical dependency vulnerability: NO-GO.
- Any repository secret/personal path/local-state finding: NO-GO.
- Any workspace-containment, permission, or VSIX-content regression: NO-GO.
- Any unreviewed third-party GitHub Action reference: NO-GO; Actions are pinned to full commit SHAs.
- Any active AI path without its corresponding eval and injection suite: NO-GO.
