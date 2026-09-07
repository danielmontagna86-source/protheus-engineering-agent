# Production Readiness Design

## Decision

Keep the public product as a thin VS Code extension over a reusable, dependency-free runtime. Add build-time dependencies only for bundling, Extension Host testing, mutation testing, and packaging. Do not move domain logic into the extension and do not make Hermes mandatory.

## Release shape

```text
reviewed Git commit
  |-- source archive + SHA-256
  |-- CycloneDX SBOM + SHA-256
  |-- release manifest + external final evidence
  |-- deterministic VSIX + SHA-256
       |-- extension.cjs
       |-- dist/runtime-cli.mjs
       |-- dist/mcp-stdio.mjs
       |-- README / LICENSE / manifest
```

The runtime and MCP entry points are bundled at build time so a VSIX user does not need the monorepo layout. The source modules remain independently executable and testable with Node.js 22/24.

## Trust boundaries

1. VS Code supplies workspace and active-document paths; the runtime revalidates containment and supported extensions.
2. Skills, Rules, source, logs, MCP responses, TDN content, and future RAG chunks are untrusted data, never instructions.
3. Hermes is optional and receives an isolated `HERMES_HOME` under the workspace.
4. External and mutable capabilities remain unavailable until an environment policy and explicit grant both allow them.
5. Build and release tooling reads tracked source and writes only to ignored artifact directories.

## Quality model

- Deterministic layer: unit, integration, protocol, containment, malformed-input, smoke, mutation, syntax, manifest, and artifact-content tests.
- VS Code layer: the packaged VSIX is installed into an isolated extensions directory and a real Extension Host executes all contributed commands on minimum/current versions.
- Supply chain: locked installs, zero high/critical dependency findings, pinned Actions, checksummed artifacts, and a public-repository provenance upgrade once GitHub enables it.
- AI layer: no model is shipped in this alpha, so model-quality claims are forbidden. The first active prompt/model/RAG integration must add a golden dataset, grounding/tool-call evals, prompt-injection tests, budgets, and a kill switch.

## Release gate

The implementation can reach “release candidate ready” automatically, but the public release remains a deliberate two-key decision:

1. Automation proves source, tests, artifact and installation.
2. A named human approves the exact commit and visibility/release action.

The repository remains private until both keys are present. Current GitHub Free private-repository limits prevent enforcing rulesets and artifact attestations; these controls are enabled immediately after visibility becomes public and before accepting general contributions.

## Rollback

- Before publication: abandon the candidate; no user-visible rollback is needed.
- After publication: never rewrite a consumed tag. Withdraw the affected GitHub Release, publish a security advisory when appropriate, and ship a higher version.
- For a bad VSIX: remove it from the release assets, mark the release withdrawn, and direct users to the last known-good version while a fixed version is prepared.
