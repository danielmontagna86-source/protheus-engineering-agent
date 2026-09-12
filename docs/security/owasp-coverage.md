# Security Coverage

**Target:** `v0.3.0`
**Assessment date:** 2026-09-07
**Surface:** local Node.js runtime, MCP stdio process, VS Code workspace extension, and optional injected Oracle/AI/subagent adapters. There is no HTTP server, authentication system, database migration or browser UI. Connected adapters are unavailable by default.

## OWASP Top 10:2025 mapping

| Category | Alpha status | Evidence / release decision |
|---|---|---|
| A01 Broken Access Control | Covered for the implemented surface | Environment policy is deny-by-default; homologation/production writes, build, Oracle and AI require exact grants. The approval broker denies missing/malformed/timed-out decisions; subagents inherit only an exact tool allowlist. |
| A02 Security Misconfiguration | Covered for the local surface | External integrations start unavailable; Hermes probing is opt-in; the extension is disabled in untrusted/virtual workspaces; CI permissions are read-only by default. |
| A03 Software Supply Chain Failures | Coberto com limites explícitos | Lockfile exato, `npm ci`, npm audit, OSV, CodeQL `security-extended` fixado, Actions fixadas por SHA, mutation tests, verificação do conteúdo do VSIX, checksums e avisos de terceiros. CodeQL já roda no repositório público; atestação e evidência devem ser verificadas no commit/artefato exatos antes de cada promoção. |
| A04 Cryptographic Failures | Not applicable in alpha | The product has no authentication, cookie, TLS endpoint, credential store, or custom cryptography. Credentials are neither accepted nor stored by the alpha. Reassess before any network/auth integration. |
| A05 Injection | Covered for implemented process boundaries | The extension/build runner uses `execFile` with an argument array, not a shell. MCP dispatch is allowlisted. Oracle accepts only trusted named read-only statements plus exact scalar binds; caller-supplied SQL, comments, multiple statements, DDL/DML and `FOR UPDATE` are rejected. No HTML rendering exists. |
| A06 Insecure Design | Covered for alpha | Hexagonal boundaries, explicit capability policy, bounded project resources, isolated Hermes state, and mandatory human release approval reduce blast radius. |
| A07 Authentication Failures | Not applicable in alpha | No user identity, session, token issuance, or authorization server exists. |
| A08 Software or Data Integrity Failures | Covered for alpha | Atomic locked state writes, symlink rejection, durable build plan hashes/idempotency keys, locked dependencies, deterministic/writable VSIX entries, CycloneDX SBOM, content allow-lists and manifest-bound SHA-256 verification are tested. Consumed tags must never be rewritten. |
| A09 Security Logging and Alerting Failures | Deferred before connected production use | CLI/MCP errors are structured, but there is no central telemetry or alert channel. A logging/redaction/alert contract is mandatory before real Oracle, build, or hosted service access. |
| A10 Mishandling of Exceptional Conditions | Covered for alpha | Missing files, invalid extensions, unavailable integrations, denied capabilities, malformed/oversized MCP requests, failed runners, state escapes, timeouts, and incomplete release evidence fail closed in tests. MCP stdio input is capped at 1 MiB. |

DAST, browser authentication tests, CSRF, cookies, CORS, and HTTP security headers are not applicable because no web/API listener exists. They become mandatory if that surface is added.

## AI and agent security mapping

| Risk | Alpha status | Control |
|---|---|---|
| Indirect prompt injection | Covered structurally, residual model risk accepted | The optional AI gateway keeps project content in a structured `untrusted-project-data` field; adversarial instruction text remains data. This reduces confusion but cannot prove a provider will never follow injected content, so tool capabilities remain bounded and output requires review. |
| Excessive agency | Covered for implemented tools | Policy denies unknown/external capabilities without exact grants; subagents have depth/concurrency/time/input/output limits and mutating runs require checkpoint/diff review. |
| Sensitive information disclosure | Covered for repository/local defaults | Publication audit rejects credentials and local state. AI context redacts common secret-key fields and reports no telemetry; Oracle redacts sensitive columns and never returns SQL/binds/driver errors. Hosts must still avoid sending secrets. |
| Supply-chain poisoning | Partially covered | Locked build/test dependencies, OSV, public-repository CodeQL, pinned Actions, no runtime third-party packages, license record, and verified VSIX contents. Attestation is deferred only by the current private-plan limitation. |
| Hallucination, grounding, model drift, jailbreak | Optional contract tested; live-provider quality not claimed | No provider ships. Fake-provider regression covers schema, denial, prompt injection structure, redaction, size, timeout and cancellation. A real provider needs versioned domain evals and explicit activation before its output can support release claims. |

## Release-blocking thresholds

- Any known high or critical dependency vulnerability: NO-GO.
- Any repository secret/personal path/local-state finding: NO-GO.
- Any workspace-containment, permission, or VSIX-content regression: NO-GO.
- Any unreviewed third-party GitHub Action reference: NO-GO; Actions are pinned to full commit SHAs.
- Any active AI path without its corresponding eval and injection suite: NO-GO.
- A public candidate without a green CodeQL `security-extended` analysis: NO-GO.
