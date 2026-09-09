# Stable candidate local validation — 2026-09-09

## Decision

Repository implementation is ready for an exact-commit candidate. Stable 1.0 publication remains `NO-GO` until the external G4-G13 evidence is real and all fourteen gate receipts validate against the same release manifest.

## Fresh local evidence

| Gate | Result |
|---|---|
| Automated suite | PASS — 304 tests, 0 failed, 0 skipped |
| Structural check | PASS — 57 source files and 16 manifests |
| Development publication audit | PASS — 219 publishable files, no finding |
| Dependency audit | PASS — 0 known vulnerabilities |
| Mutation | PASS — 870 mutants; 822 killed, 8 timeout, 40 survived, 0 errors; 95.40% against a 95% gate |
| Critical CLI/MCP smoke | PASS — source and bundled MCP paths, 921 ms |
| Installed VSIX / current VS Code | PASS — VS Code 1.136.2; 19 commands registered; 7 invocations across 5 core commands |
| Installed VSIX / minimum VS Code | PASS — VS Code 1.95.3; same registration and core journey |
| Package lifecycle | PASS locally — isolated install 0.2.0-alpha.1, upgrade to 0.3.0, uninstall, reinstall and rollback on VS Code 1.136.2 |
| TDS coexistence | PASS — TDS 2.1.2, multi-root, CP1252/LF and zero command-ID conflicts |
| Large repository gate | PASS — 1,000 and 10,000 synthetic symbols under timing and sampled peak-RSS budgets |
| Package | PASS — 21-entry VSIX, exact allow-list and legal notices |
| Release integrity code | PASS — source is reproduced from the declared Git commit; the VSIX embeds that commit and is byte-compared with a rebuild inside an isolated extraction of that source archive after a clean `npm ci`; the SBOM reconciles every production package and its npm-resolved edge from the exact lockfile; all hashes are manifest-bound |

The TDS host emitted its own non-blocking Copilot-instructions dialog while running under the VS Code test host. The extension tests still completed with exit code zero; this is recorded as an upstream coexistence observation, not hidden.

## Release evidence contract

- CI, CodeQL and security review require checksummed receipts tied to repository, exact commit and release-manifest SHA-256.
- G0-G13 each require a checksummed, typed receipt and material gate-specific results; generic URLs or free text cannot close a gate.
- G8 and G11 require at least three participants; G12 requires verified attestation and downloaded-artifact verification; G13 requires legal, publisher and named-owner authorization.
- The source ZIP, VSIX and CycloneDX SBOM are the only release payloads, and all three must match the manifest. The attestation workflow also attests and verifies the manifest and `SHA256SUMS` itself.
- Stable security receipts require GitHub API run identity, repository, workflow path, commit, conclusion and attempt for every control; prose cannot close the gate.
- The effectiveness gate enforces the published crossover-study fields, accepted tasks in both conditions, anonymized observations, review, licensing/authorization checks and 95% confidence intervals.
- Persisted build evidence redacts Bearer/Basic authorization, common cloud secrets, database URLs, connection strings and inline URI credentials.

## External evidence still required

- lawful official analyzer, PostgreSQL dialect and licensed AppServer/RPO runs;
- Linux/remote lifecycle repetition (the complete lifecycle already passed locally on Windows);
- keyboard, screen-reader, high-contrast, zoom and three-user timed UAT;
- preregistered representative developer pilot and approved marketing claims;
- exact public GitHub CI, dependency review, OSV, secret scan, CodeQL and provenance attestation;
- downloaded asset reproduction, support drill, legal/publisher readiness and named publication authorization.

Docker was used only as an internal QA option. No Docker image, proprietary TOTVS artifact, database or Hermes installation is a product dependency.
